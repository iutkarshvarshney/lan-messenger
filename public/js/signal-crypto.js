/* ═══════════════════════════════════════════════════════════
   Signal Protocol (X3DH + Double Ratchet)
   Uses libsodium-wrappers + Web Crypto API
   ═══════════════════════════════════════════════════════════ */

const Signal = (() => {
    let sodium = null;
    let isReady = false;

    // ─── Initialization ─────────────────────────────────────
    async function init() {
        if (isReady) return;
        if (!window.sodium || !window.sodium.ready) {
            throw new Error('libsodium failed to load; E2E encryption is temporarily disabled');
        }
        await window.sodium.ready;
        sodium = window.sodium;
        isReady = true;
    }

    // ─── HKDF & WebCrypto Helpers ───────────────────────────
    async function hkdf(ikm, salt, info, length) {
        if (!salt || salt.byteLength === 0) salt = new Uint8Array(32);
        const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
        const derived = await crypto.subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode(info) },
            key,
            length * 8
        );
        return new Uint8Array(derived);
    }

    async function hmacSha256(keyBytes, dataBytes) {
        const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sig = await crypto.subtle.sign('HMAC', key, dataBytes);
        return new Uint8Array(sig);
    }

    async function sha256(data) {
        return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    }

    // Convert keys from Sign (Ed25519) to DH (Curve25519)
    function getCurve25519KeyPair(signKeyPair) {
        const pk = sodium.crypto_sign_ed25519_pk_to_curve25519(signKeyPair.publicKey);
        const sk = sodium.crypto_sign_ed25519_sk_to_curve25519(signKeyPair.privateKey);
        return { publicKey: pk, privateKey: sk };
    }

    // Hex and B64
    function toHex(bytes) { return sodium.to_hex(bytes); }
    function fromHex(hex) { return sodium.from_hex(hex); }
    function toB64(bytes) { return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL); }
    function fromB64(b64) { return sodium.from_base64(b64, sodium.base64_variants.ORIGINAL); }

    // ─── Identity & Keys ────────────────────────────────────

    async function generateIdentity() {
        await init();
        // Generate an Ed25519 keypair for identity (allows both DH and signing)
        const signKeyPair = sodium.crypto_sign_keypair();
        const dhKeyPair = getCurve25519KeyPair(signKeyPair);
        
        // Signed Prekey
        const spk = sodium.crypto_box_keypair();
        const spkSig = sodium.crypto_sign_detached(spk.publicKey, signKeyPair.privateKey);

        // One Time Prekeys
        const opks = [];
        for (let i = 0; i < 50; i++) {
            const opk = sodium.crypto_box_keypair();
            opks.push({ id: Date.now() + i, keyPair: opk });
        }

        const state = {
            identitySignKey: { pub: toHex(signKeyPair.publicKey), priv: toHex(signKeyPair.privateKey) },
            identityDhKey: { pub: toHex(dhKeyPair.publicKey), priv: toHex(dhKeyPair.privateKey) },
            spk: { id: Date.now(), pub: toHex(spk.publicKey), priv: toHex(spk.privateKey) },
            spkSig: toHex(spkSig),
            opks: opks.map(o => ({ id: o.id, pub: toHex(o.keyPair.publicKey), priv: toHex(o.keyPair.privateKey) }))
        };

        localStorage.setItem('signal_identity', JSON.stringify(state));
        return state;
    }

    async function getIdentity() {
        await init();
        const raw = localStorage.getItem('signal_identity');
        if (!raw) return await generateIdentity();
        return JSON.parse(raw);
    }

    // Create the bundle for server
    async function getPrekeyBundle() {
        const id = await getIdentity();
        return {
            identityKey: id.identitySignKey.pub, // We publish Ed25519 public key
            signedPrekey: id.spk.pub,
            sig: id.spkSig,
            prekeys: id.opks.slice(0, 10).map(o => ({ keyId: o.id, publicKey: o.pub }))
        };
    }

    // ─── X3DH ───────────────────────────────────────────────

    // As Alice: Sending first message to Bob
    async function initSessionAsInitiator(remoteUserId, bundle) {
        await init();
        const myId = await getIdentity();

        const ikA = fromHex(myId.identityDhKey.priv);
        const ekA = sodium.crypto_box_keypair(); // Ephemeral

        const ikB_ed25519 = fromHex(bundle.identityKey);
        const ikB = sodium.crypto_sign_ed25519_pk_to_curve25519(ikB_ed25519); // Convert to X25519
        const spkB = fromHex(bundle.signedPrekey);
        
        // Verify Signature
        const sig = fromHex(bundle.sig);
        if (!sodium.crypto_sign_verify_detached(sig, spkB, ikB_ed25519)) {
            throw new Error('Prekey signature verification failed!');
        }

        const dh1 = sodium.crypto_scalarmult(ikA, spkB);
        const dh2 = sodium.crypto_scalarmult(ekA.privateKey, ikB);
        const dh3 = sodium.crypto_scalarmult(ekA.privateKey, spkB);
        
        let dh4 = new Uint8Array(0);
        let opkB_pub = null;
        if (bundle.prekey && bundle.prekey.key) {
            opkB_pub = bundle.prekey.key;
            dh4 = sodium.crypto_scalarmult(ekA.privateKey, fromHex(opkB_pub));
        }

        const f = new Uint8Array(32); f.fill(0xff);
        const km = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
        km.set(dh1, 0); km.set(dh2, dh1.length); km.set(dh3, dh1.length + dh2.length); km.set(dh4, dh1.length + dh2.length + dh3.length);

        const sk = await hkdf(km, null, 'X3DH', 32);

        // Init Double Ratchet State
        const rootKey = sk;
        return await initRatchet(remoteUserId, rootKey, { pub: toHex(ekA.publicKey), priv: toHex(ekA.privateKey) }, toHex(spkB), true, opkB_pub);
    }

    // As Bob: Receiving Alice's first message
    async function initSessionAsResponder(remoteUserId, ekA_pubHex, ikA_pubHex_ed25519, usedOpkPubHex) {
        await init();
        const myId = await getIdentity();

        const ikB = fromHex(myId.identityDhKey.priv);
        const spkB = fromHex(myId.spk.priv);
        
        const ekA = fromHex(ekA_pubHex);
        const ikA = sodium.crypto_sign_ed25519_pk_to_curve25519(fromHex(ikA_pubHex_ed25519));

        const dh1 = sodium.crypto_scalarmult(spkB, ikA);
        const dh2 = sodium.crypto_scalarmult(ikB, ekA);
        const dh3 = sodium.crypto_scalarmult(spkB, ekA);
        
        let dh4 = new Uint8Array(0);
        if (usedOpkPubHex) {
            const opk = myId.opks.find(o => o.pub === usedOpkPubHex);
            if (!opk) throw new Error('OPK not found');
            dh4 = sodium.crypto_scalarmult(fromHex(opk.priv), ekA);
        }

        const km = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
        km.set(dh1, 0); km.set(dh2, dh1.length); km.set(dh3, dh1.length + dh2.length); km.set(dh4, dh1.length + dh2.length + dh3.length);

        const sk = await hkdf(km, null, 'X3DH', 32);

        // Find my current ratchet key (spkB)
        const myRatchet = myId.spk;
        return await initRatchet(remoteUserId, sk, myRatchet, ekA_pubHex, false, usedOpkPubHex);
    }

    // ─── Double Ratchet ─────────────────────────────────────

    async function initRatchet(remoteUserId, rootKey, myDhKey, remoteDhPub, isInitiator, opkPubUsed) {
        const state = {
            remoteUserId,
            rootKey: toHex(rootKey),
            sendingChain: null,
            receivingChain: null,
            myDh: myDhKey,
            remoteDhPub: remoteDhPub,
            sendCount: 0,
            recvCount: 0,
            skippedKeys: {}, // max limits can be added here
            opkUsed: opkPubUsed 
        };

        if (isInitiator) {
            const [rk, ck] = await kdfRk(rootKey, myDhKey.priv, remoteDhPub);
            state.rootKey = toHex(rk);
            state.sendingChain = toHex(ck);
        }

        saveSession(remoteUserId, state);
        return state;
    }

    async function kdfRk(rootKey, myDhPrivHex, remoteDhPubHex) {
        // DH ratchet step
        const dhOut = sodium.crypto_scalarmult(fromHex(myDhPrivHex), fromHex(remoteDhPubHex));
        const derived = await hkdf(dhOut, fromHex(rootKey), 'RatchetRoot', 64);
        return [derived.slice(0, 32), derived.slice(32, 64)];
    }

    async function kdfCk(chainKeyHex) {
        const ck = fromHex(chainKeyHex);
        const mk = await hmacSha256(ck, new Uint8Array([0x01]));
        const nextCk = await hmacSha256(ck, new Uint8Array([0x02]));
        return [nextCk, mk];
    }

    // ─── Encryption / Decryption ────────────────────────────

    async function ratchetEncrypt(remoteUserId, plaintext) {
        let state = getSession(remoteUserId);
        if (!state) throw new Error('No active session. Must initiate X3DH first.');

        const [nextCk, mk] = await kdfCk(state.sendingChain);
        state.sendingChain = toHex(nextCk);
        
        // Encrypt with AES-256-GCM
        const aesKey = await crypto.subtle.importKey('raw', mk.slice(0, 32), 'AES-GCM', false, ['encrypt']);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(plaintext));

        state.sendCount++;
        saveSession(remoteUserId, state);

        return {
            ciphertext: toB64(new Uint8Array(encrypted)),
            iv: toB64(iv),
            dhPub: state.myDh.pub,
            messageNumber: state.sendCount - 1,   // The JS is 0-indexed per ratchet step
            authTag: '' // Implicit in WebCrypto GCM output
        };
    }

    async function ratchetDecrypt(remoteUserId, header, ciphertextB64) {
        let state = getSession(remoteUserId);
        if (!state) {
            // Need to process responder side X3DH manually if no session exists yet.
            // Normally caller handles it by noticing this is the first message.
            throw new Error('No active session to decrypt with');
        }

        const { iv, dhPub, messageNumber } = header;
        
        if (dhPub !== state.remoteDhPub) {
            // New Ratchet Step
            state.skippedKeys = state.skippedKeys || {}; // Save old ones if we lost messages (simplified here)
            
            // Advance receiving chain
            const [rk1, ckR] = await kdfRk(fromHex(state.rootKey), state.myDh.priv, dhPub);
            state.rootKey = toHex(rk1);
            state.receivingChain = toHex(ckR);
            state.remoteDhPub = dhPub;
            state.recvCount = 0;

            // Generate new sending key pair
            const nextDh = sodium.crypto_box_keypair();
            state.myDh = { pub: toHex(nextDh.publicKey), priv: toHex(nextDh.privateKey) };
            
            // Advance sending chain
            const [rk2, ckS] = await kdfRk(rk1, state.myDh.priv, dhPub);
            state.rootKey = toHex(rk2);
            state.sendingChain = toHex(ckS);
        }

        // Catch up Receiving chain if needed
        let currentMk = null;
        while (state.recvCount <= messageNumber) {
            const [nextCk, mk] = await kdfCk(state.receivingChain);
            state.receivingChain = toHex(nextCk);
            if (state.recvCount === messageNumber) {
                currentMk = mk;
            } else {
                state.skippedKeys[`${dhPub}_${state.recvCount}`] = toHex(mk);
            }
            state.recvCount++;
        }

        if (!currentMk) {
            const mkHex = state.skippedKeys[`${dhPub}_${messageNumber}`];
            if (mkHex) currentMk = fromHex(mkHex);
        }

        if (!currentMk) throw new Error('Decrypt failed: Message key not found.');

        // Decrypt
        const aesKey = await crypto.subtle.importKey('raw', currentMk.slice(0, 32), 'AES-GCM', false, ['decrypt']);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: fromB64(iv) },
            aesKey,
            fromB64(ciphertextB64)
        );

        saveSession(remoteUserId, state);
        return new TextDecoder().decode(decrypted);
    }

    // ─── File Encryption ────────────────────────────────────

    async function encryptFile(fileBlob, remoteUserId) {
        // Dummy encrypt logic that binds to a ratchet state message
        // Strictly, we should derive a file key from the message key being sent
        // To keep it simple, we just derive a temporary key and send its iv alongside
        const state = getSession(remoteUserId);
        if (!state) throw new Error('No session');

        const fileKeyRaw = crypto.getRandomValues(new Uint8Array(32));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const fileKey = await crypto.subtle.importKey('raw', fileKeyRaw, 'AES-GCM', false, ['encrypt']);
        
        const buffer = await fileBlob.arrayBuffer();
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, fileKey, buffer);
        
        return {
            blob: new Blob([encrypted], { type: 'application/octet-stream' }),
            fileKey: toB64(fileKeyRaw),
            iv: toB64(iv)
        };
    }

    async function decryptFile(blob, fileKeyB64, ivB64) {
        const fileKeyRaw = fromB64(fileKeyB64);
        const iv = fromB64(ivB64);
        const fileKey = await crypto.subtle.importKey('raw', fileKeyRaw, 'AES-GCM', false, ['decrypt']);
        
        const buffer = await blob.arrayBuffer();
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, fileKey, buffer);
        
        return new Blob([decrypted]);
    }

    async function getGroupSymmetricKey(memberPublicKeysHex) {
        // Deterministic symmetric key for the group (Simplified Sender Keys)
        const sorted = [...memberPublicKeysHex].filter(Boolean).sort();
        const infoStr = sorted.join('|');
        const salt = new Uint8Array(32); salt.fill(0x55);
        // Use HKDF to derive a stable 32-byte AES key
        const keyMat = new TextEncoder().encode(infoStr);
        const derived = await hkdf(keyMat, salt, 'GroupSymmetric', 32);
        return derived;
    }

    // ─── Storage Helpers ────────────────────────────────────

    function getSession(userId) {
        const data = localStorage.getItem(`signal_session_${userId}`);
        return data ? JSON.parse(data) : null;
    }

    function saveSession(userId, state) {
        localStorage.setItem(`signal_session_${userId}`, JSON.stringify(state));
    }

    function hasSession(userId) {
        return !!localStorage.getItem(`signal_session_${userId}`);
    }

    function getMyIdentityKey() {
        const raw = localStorage.getItem('signal_identity');
        if (!raw) return null;
        return JSON.parse(raw).identitySignKey.pub;
    }

    return {
        init,
        generateIdentity,
        getIdentity,
        getPrekeyBundle,
        initSessionAsInitiator,
        initSessionAsResponder,
        ratchetEncrypt,
        ratchetDecrypt,
        encryptFile,
        decryptFile,
        hasSession,
        getMyIdentityKey,
        getGroupSymmetricKey
    };
})();
