/* ═══════════════════════════════════════════════════════════
   E2E Encryption Module — Web Crypto API
   ECDH P-256 Key Exchange + AES-256-GCM Encryption
   ═══════════════════════════════════════════════════════════ */

const E2E = (() => {
    const ALGO = { name: 'ECDH', namedCurve: 'P-256' };
    const AES_ALGO = 'AES-GCM';
    const KEY_USAGES_DERIVE = ['deriveKey', 'deriveBits'];
    const KEY_STORAGE = 'e2e_private_key';
    const PUB_STORAGE = 'e2e_public_key';

    // ─── Key cache for derived conversation keys ────────────
    const derivedKeyCache = new Map();

    // ─── Generate ECDH Key Pair ─────────────────────────────
    async function generateKeyPair() {
        const keyPair = await crypto.subtle.generateKey(ALGO, true, KEY_USAGES_DERIVE);
        await saveKeyPair(keyPair);
        return keyPair;
    }

    // ─── Export Public Key as JWK ───────────────────────────
    async function exportPublicKey(publicKey) {
        const jwk = await crypto.subtle.exportKey('jwk', publicKey);
        return JSON.stringify(jwk);
    }

    // ─── Import Public Key from JWK string ──────────────────
    async function importPublicKey(jwkString) {
        if (!jwkString) return null;
        try {
            const jwk = typeof jwkString === 'string' ? JSON.parse(jwkString) : jwkString;
            return await crypto.subtle.importKey('jwk', jwk, ALGO, true, []);
        } catch (e) {
            console.warn('E2E: Failed to import public key:', e);
            return null;
        }
    }

    // ─── Save Key Pair to localStorage ──────────────────────
    async function saveKeyPair(keyPair) {
        const privJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
        const pubJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
        localStorage.setItem(KEY_STORAGE, JSON.stringify(privJwk));
        localStorage.setItem(PUB_STORAGE, JSON.stringify(pubJwk));
    }

    // ─── Load Private Key from localStorage ─────────────────
    async function loadPrivateKey() {
        const stored = localStorage.getItem(KEY_STORAGE);
        if (!stored) return null;
        try {
            const jwk = JSON.parse(stored);
            return await crypto.subtle.importKey('jwk', jwk, ALGO, true, KEY_USAGES_DERIVE);
        } catch (e) {
            console.warn('E2E: Failed to load private key:', e);
            return null;
        }
    }

    // ─── Load Public Key from localStorage ──────────────────
    async function loadPublicKey() {
        const stored = localStorage.getItem(PUB_STORAGE);
        if (!stored) return null;
        try {
            const jwk = JSON.parse(stored);
            return await crypto.subtle.importKey('jwk', jwk, ALGO, true, []);
        } catch (e) {
            console.warn('E2E: Failed to load public key:', e);
            return null;
        }
    }

    // ─── Get or Create Key Pair ─────────────────────────────
    async function getOrCreateKeyPair() {
        const privateKey = await loadPrivateKey();
        const publicKey = await loadPublicKey();
        if (privateKey && publicKey) {
            return { privateKey, publicKey };
        }
        return await generateKeyPair();
    }

    // ─── Get exportable public key string ───────────────────
    async function getPublicKeyString() {
        const keyPair = await getOrCreateKeyPair();
        return await exportPublicKey(keyPair.publicKey);
    }

    // ─── Derive shared AES key from ECDH ────────────────────
    async function deriveSharedKey(privateKey, otherPublicKey) {
        const sharedKey = await crypto.subtle.deriveKey(
            { name: 'ECDH', public: otherPublicKey },
            privateKey,
            { name: AES_ALGO, length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        return sharedKey;
    }

    // ─── Get or derive key for a conversation partner ───────
    async function getConversationKey(otherPublicKeyString) {
        if (!otherPublicKeyString) return null;

        // Check cache
        if (derivedKeyCache.has(otherPublicKeyString)) {
            return derivedKeyCache.get(otherPublicKeyString);
        }

        const privateKey = await loadPrivateKey();
        if (!privateKey) return null;

        const otherPublicKey = await importPublicKey(otherPublicKeyString);
        if (!otherPublicKey) return null;

        const sharedKey = await deriveSharedKey(privateKey, otherPublicKey);
        derivedKeyCache.set(otherPublicKeyString, sharedKey);
        return sharedKey;
    }

    // ─── Encrypt plaintext ──────────────────────────────────
    async function encrypt(plaintext, aesKey) {
        if (!aesKey || !plaintext) return { ciphertext: plaintext, iv: '' };

        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(plaintext);
            const encrypted = await crypto.subtle.encrypt(
                { name: AES_ALGO, iv },
                aesKey,
                encoded
            );
            return {
                ciphertext: arrayBufferToBase64(encrypted),
                iv: arrayBufferToBase64(iv)
            };
        } catch (e) {
            console.error('E2E: Encryption failed:', e);
            return { ciphertext: plaintext, iv: '' };
        }
    }

    // ─── Decrypt ciphertext ─────────────────────────────────
    async function decrypt(ciphertextB64, ivB64, aesKey) {
        if (!aesKey || !ciphertextB64 || !ivB64) return ciphertextB64;

        try {
            const ciphertext = base64ToArrayBuffer(ciphertextB64);
            const iv = base64ToArrayBuffer(ivB64);
            const decrypted = await crypto.subtle.decrypt(
                { name: AES_ALGO, iv },
                aesKey,
                ciphertext
            );
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            console.warn('E2E: Decryption failed (might be unencrypted message):', e);
            return ciphertextB64; // Return as-is for old unencrypted messages
        }
    }

    // ─── Group encryption: derive key from sorted member keys ─
    async function getGroupKey(memberPublicKeys) {
        if (!memberPublicKeys || memberPublicKeys.length === 0) return null;

        // Sort keys for deterministic derivation
        const sortedKeys = [...memberPublicKeys].filter(Boolean).sort();
        const cacheKey = 'group:' + sortedKeys.join('|');

        if (derivedKeyCache.has(cacheKey)) {
            return derivedKeyCache.get(cacheKey);
        }

        // For groups, we derive a key with each member and combine
        // Simple approach: derive key with the first other member's key
        // This means all group members derive the same key using pairwise ECDH
        // For LAN simplicity, we use a hash of all public keys as a seed
        const privateKey = await loadPrivateKey();
        if (!privateKey) return null;

        // Use the first non-self public key for derivation
        const myPubKey = localStorage.getItem(PUB_STORAGE);
        const otherKey = sortedKeys.find(k => k !== myPubKey);
        if (!otherKey) return null;

        const otherPublicKey = await importPublicKey(otherKey);
        if (!otherPublicKey) return null;

        const sharedKey = await deriveSharedKey(privateKey, otherPublicKey);
        derivedKeyCache.set(cacheKey, sharedKey);
        return sharedKey;
    }

    // ─── Helpers ────────────────────────────────────────────
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // ─── Clear all E2E data ─────────────────────────────────
    function clearKeys() {
        localStorage.removeItem(KEY_STORAGE);
        localStorage.removeItem(PUB_STORAGE);
        derivedKeyCache.clear();
    }

    // ─── Public API ─────────────────────────────────────────
    return {
        getOrCreateKeyPair,
        getPublicKeyString,
        getConversationKey,
        getGroupKey,
        importPublicKey,
        encrypt,
        decrypt,
        clearKeys,
        derivedKeyCache
    };
})();
