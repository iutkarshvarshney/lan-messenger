/* ═══════════════════════════════════════════════════════════
   LAN Messenger — Client Application
   ═══════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────
const state = {
    user: null,
    token: null,
    socket: null,
    conversations: [],
    activeConversation: null,
    messages: {},
    typingTimers: {},
    onlineUsers: new Set(),
    selectedGroupMembers: new Set(),
    queuedFiles: [],
    e2eKeys: {},       // conversationId => derived AES key
    e2eReady: false,   // whether our keypair is set up
    hwid: null,        // hardware / device unique identifier
    replyingTo: null,  // message object we are currently replying to
    isSearchActive: false,
    isSelectionMode: false,
    selectedMessages: new Set(),
    forwardingMessages: [],
    pendingOutgoingPlaintext: new Map(),
    presenceAvailable: true,
    presenceInitialized: false,
    presencePermissionRequested: false,
    presenceDetector: null,
    call: {
        active: false,
        incoming: null,
        conversationId: null,
        targetUserId: null,
        peer: null,
        localStream: null,
        remoteStream: null,
        startedAt: null,
        timer: null,
        muted: false,
        makingOffer: false,
        connectedSoundPlayed: false
    },
    recording: {
        active: false,
        recorder: null,
        chunks: [],
        timer: null,
        duration: 0,
        stream: null
    },
    activeSidebarView: 'chats',
    game: {
        active: false,
        opponentId: null,
        conversationId: null,
        board: Array(9).fill(null),
        mySymbol: 'X',
        isMyTurn: false,
        score: { wins_1: 0, wins_2: 0, draws: 0 }
    },
    dotsGame: {
        active: false,
        opponentId: null,
        opponentName: 'Opponent',
        conversationId: null,
        boardSize: 8,
        playerNum: 1,
        isMyTurn: false,
        startsNext: false,
        hLines: [],
        vLines: [],
        boxes: [],
        myScore: 0,
        opponentScore: 0,
        hoveredLine: null
    },
    connectFour: {
        active: false,
        opponentId: null,
        opponentName: 'Opponent',
        conversationId: null,
        playerNum: 1,
        isMyTurn: false,
        startsNext: false,
        board: [],
        myScore: 0,
        opponentScore: 0
    },
    rpsGame: {
        active: false,
        opponentId: null,
        opponentName: 'Opponent',
        conversationId: null,
        playerNum: 1,
        round: 1,
        myScore: 0,
        opponentScore: 0,
        myChoice: null,
        opponentChoice: null
    },
    memoryGame: {
        active: false,
        opponentId: null,
        opponentName: 'Opponent',
        conversationId: null,
        playerNum: 1,
        isMyTurn: false,
        startsNext: false,
        seed: '',
        deck: [],
        matched: [],
        revealed: [],
        locked: false,
        myScore: 0,
        opponentScore: 0
    },
    wordGame: {
        active: false,
        opponentId: null,
        opponentName: 'Opponent',
        conversationId: null,
        playerNum: 1,
        seed: '',
        round: 1,
        maxRounds: 3,
        word: '',
        scrambled: '',
        solved: false,
        myScore: 0,
        opponentScore: 0
    },
    tankDuel: {
        active: false,
        opponentId: null,
        opponentName: 'Opponent',
        conversationId: null,
        playerNum: 1,
        seed: '',
        terrain: [],
        tanks: [],
        isMyTurn: false,
        wind: 0,
        angle: 45,
        power: 68,
        weapon: 'shell',
        turn: 1,
        animating: false,
        shotPath: [],
        explosions: [],
        raf: null,
        winnerId: null
    },
    retroPong: {
        active: false,
        opponentId: null,
        opponentName: 'Opponent',
        conversationId: null,
        playerNum: 1,
        y: 0,
        opponentY: 0,
        ballX: 0,
        ballY: 0,
        ballVx: 1.05,
        ballVy: 0.42,
        score1: 0,
        score2: 0,
        winnerScore: 7,
        serving: false,
        serveAt: 0,
        finished: false,
        keys: {},
        raf: null,
        lastFrame: 0,
        lastSync: 0
    },
    stickFight: {
        active: false,
        opponentId: null,
        opponentName: 'Opponent',
        conversationId: null,
        playerNum: 1,
        seed: '',
        selectedCharacter: null,
        opponentCharacter: null,
        round: 1,
        roundActive: false,
        roundCountdownUntil: 0,
        roundTimer: null,
        maxRoundWins: 2,
        myRoundWins: 0,
        opponentRoundWins: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        stamina: 100,
        superMeter: 0,
        combo: 0,
        comboUntil: 0,
        facing: 1,
        health: 100,
        opponentX: 0,
        opponentY: 0,
        opponentFacing: -1,
        opponentHealth: 100,
        opponentStamina: 100,
        opponentSuperMeter: 0,
        action: 'idle',
        opponentAction: 'idle',
        actionUntil: 0,
        statusUntil: 0,
        hitCooldown: 0,
        hitSparks: [],
        finished: false,
        keys: {},
        three: null,
        raf: null,
        lastFrame: 0,
        lastSync: 0
    },
    ludoGame: {
        active: false,
        conversationId: null,
        players: [],
        playerNum: 1,
        positions: [],
        currentTurnIndex: 0,
        currentTurnPlayerId: null,
        lastRoll: null,
        mustMove: false,
        winners: [],
        consecutiveSixes: [],
        tokenHitAreas: []
    }
};
let isChatUIInitialized = false;

// ─── Request notification permission on load ────────────────
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}


// ─── Constants ──────────────────────────────────────────────
const API = '';
const COLORS = [
    '#00a884', '#53bdeb', '#e9a53a', '#d1607e', '#7c94b6',
    '#b38f41', '#28b5b5', '#a667ab', '#ee6b6e', '#7eb0d5'
];

const SUPER_STICKMEN_ASSETS = {
    mountains: '/games/super-stickmen/assets/images/mountains.png',
    cloud: '/games/super-stickmen/assets/images/cloud.png',
    ninja: '/games/super-stickmen/assets/images/ninja_warrior.png',
    mage: '/games/super-stickmen/assets/images/mage_warrior.png'
};
const superStickmenImages = {};
let stickFightThreePromise = null;
const STICKFIGHT_CHARACTERS = [
    {
        id: 'ryu',
        name: 'Ryu',
        role: 'Balanced striker',
        color: 0x00c49a,
        accent: 0x53bdeb,
        speed: 1,
        power: 1,
        stamina: 1,
        special: 'Rising Palm'
    },
    {
        id: 'jin',
        name: 'Jin',
        role: 'Fast combo rush',
        color: 0xf6c343,
        accent: 0xff5c4d,
        speed: 1.16,
        power: 0.9,
        stamina: 0.95,
        special: 'Lightning Rush'
    },
    {
        id: 'chun',
        name: 'Chun',
        role: 'Agile kicker',
        color: 0x53bdeb,
        accent: 0xf6c343,
        speed: 1.24,
        power: 0.84,
        stamina: 1.12,
        special: 'Spinning Burst'
    },
    {
        id: 'kazu',
        name: 'Kazu',
        role: 'Heavy power',
        color: 0xff5c4d,
        accent: 0xb388ff,
        speed: 0.88,
        power: 1.24,
        stamina: 0.9,
        special: 'Dragon Driver'
    },
    {
        id: 'guile',
        name: 'Guile',
        role: 'Defensive charge',
        color: 0x7bd88f,
        accent: 0xffd166,
        speed: 0.94,
        power: 1.06,
        stamina: 1.18,
        special: 'Sonic Guard'
    },
    {
        id: 'nina',
        name: 'Nina',
        role: 'Precision assassin',
        color: 0xd1607e,
        accent: 0x53bdeb,
        speed: 1.08,
        power: 1.02,
        stamina: 1.02,
        special: 'Needle Strike'
    }
];




// ─── Helpers ────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function $$(sel) { return document.querySelectorAll(sel); }

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function getColor(str) {
    if (!str) return COLORS[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
}

function preloadSuperStickmenAssets() {
    Object.entries(SUPER_STICKMEN_ASSETS).forEach(([key, src]) => {
        if (superStickmenImages[key]) return;
        const img = new Image();
        img.src = src;
        superStickmenImages[key] = img;
    });
}

function getAuthUrl(url) {
    if (!url) return '';
    if (url.startsWith('/api/media/') && state.token) {
        return `${url}${url.includes('?') ? '&' : '?'}token=${state.token}`;
    }
    return url;
}

function setAvatarElement(el, userOrConv, colorId) {
    if (!el || !userOrConv) return;
    const name = typeof userOrConv === 'string' ? userOrConv : (userOrConv.display_name || userOrConv.name || '');
    const avatarUrl = typeof userOrConv === 'string' ? '' : (userOrConv.avatar || '');
    el.textContent = avatarUrl ? '' : getInitials(name);
    if (!avatarUrl && userOrConv.type === 'group') el.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-label="Group"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0"/></svg>';
    if (avatarUrl) {
        el.style.backgroundImage = `url('${getAuthUrl(avatarUrl)}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.style.backgroundColor = 'transparent';
        el.style.color = 'transparent';
    } else {
        el.style.backgroundImage = 'none';
        el.style.background = getColor(colorId);
        el.style.color = '#fff';
    }
}

function getAvatarHtml(userOrConv, colorId, isOnline = false, extraAttrs = '', extraClasses = '') {
    const name = typeof userOrConv === 'string' ? userOrConv : (userOrConv.display_name || userOrConv.name || '');
    const avatarUrl = typeof userOrConv === 'string' ? '' : (userOrConv.avatar || '');
    const initials = getInitials(name);
    const color = getColor(colorId);
    if (!avatarUrl && userOrConv.type === 'group') return `<div class="avatar group-avatar ${extraClasses}" style="background:#174653;${extraAttrs}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" aria-label="Group"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0"/></svg></div>`;
    if (avatarUrl) {
        return `<div class="avatar ${isOnline ? 'online' : ''} ${extraClasses}" style="background-image:url('${getAuthUrl(avatarUrl)}');background-size:cover;background-position:center;color:transparent;${extraAttrs}">${initials}</div>`;
    } else {
        return `<div class="avatar ${isOnline ? 'online' : ''} ${extraClasses}" style="background:${color};color:#fff;${extraAttrs}">${initials}</div>`;
    }
}

function formatTime(dateStr) {
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr) {
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr + (typeof dateStr === 'string' && !dateStr.endsWith('Z') ? 'Z' : ''));
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        if (d.toDateString() === now.toDateString()) return 'Today';
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return '';
    }
}

function showToast(message, isError = false) {
    const container = $('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast${isError ? ' error' : ''}`;
    toast.innerHTML = `<span>${isError ? '⚠️' : '✅'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function isEncryptedMessage(msg) {
    return !!(msg && msg.ciphertext && (msg.iv || msg.dh_pub || msg.auth_tag));
}

function rememberOutgoingPlaintext(conversationId, sendData, plaintext) {
    if (!conversationId || !sendData?.ciphertext || !plaintext) return;
    state.pendingOutgoingPlaintext.set(`${conversationId}:${sendData.ciphertext}`, plaintext);
}

function getRememberedOutgoingPlaintext(message) {
    if (!message || message.sender_id !== state.user?.id) return null;
    const key = `${message.conversation_id}:${message.ciphertext}`;
    const plaintext = state.pendingOutgoingPlaintext.get(key);
    if (plaintext) state.pendingOutgoingPlaintext.delete(key);
    return plaintext || null;
}

function emitWithAck(eventName, payload, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        if (!state.socket?.connected) {
            reject(new Error('Not connected to server'));
            return;
        }

        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error('Server did not confirm the action'));
        }, timeoutMs);

        state.socket.emit(eventName, payload, (response = {}) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            if (response.error) reject(new Error(response.error));
            else resolve(response);
        });
    });
}

async function encryptTextForConversation(conv, convId, content, sendData) {
    if (!state.e2eReady || !content) return false;

    try {
        if (conv.type === 'private') {
            const remoteUserId = conv.other_user?.id;
            if (!remoteUserId) return false;

            if (!Signal.hasSession(remoteUserId)) {
                const bundle = await apiCall('GET', `/api/users/${remoteUserId}/prekey`);
                await Signal.initSessionAsInitiator(remoteUserId, bundle);
            }

            const enc = await Signal.ratchetEncrypt(remoteUserId, content);
            sendData.ciphertext = enc.ciphertext;
            sendData.iv = enc.iv;
            sendData.dhPub = enc.dhPub;
            sendData.messageNumber = enc.messageNumber;
            sendData.authTag = enc.authTag;
            rememberOutgoingPlaintext(convId, sendData, content);
            return true;
        }

        if (conv.type === 'group') {
            const groupKey = state.e2eKeys[convId];
            if (!groupKey || groupKey === true) return false;

            const aesKey = await window.crypto.subtle.importKey('raw', groupKey, 'AES-GCM', false, ['encrypt']);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(content));

            const eArr = new Uint8Array(encrypted);
            let cb64 = ''; for (let i = 0; i < eArr.length; i++) cb64 += String.fromCharCode(eArr[i]);
            let ivB64 = ''; for (let i = 0; i < iv.length; i++) ivB64 += String.fromCharCode(iv[i]);
            sendData.ciphertext = btoa(cb64);
            sendData.iv = btoa(ivB64);
            rememberOutgoingPlaintext(convId, sendData, content);
            return true;
        }
    } catch (err) {
        console.warn('E2E encryption unavailable, sending normally:', err);
    }

    sendData.ciphertext = content;
    sendData.iv = '';
    sendData.dhPub = '';
    sendData.authTag = '';
    sendData.messageNumber = 0;
    return false;
}

async function apiCall(method, url, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (state.token) options.headers['Authorization'] = `Bearer ${state.token}`;
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(API + url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function linkify(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(
        /(https?:\/\/[^\s<]+)/gi,
        '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );
}

function getOrCreateHardwareID() {
    let id = localStorage.getItem('messenger_hwid');
    if (!id) {
        id = 'hw-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
        localStorage.setItem('messenger_hwid', id);
    }
    state.hwid = id;
    return id;
}

// ─── Auth ───────────────────────────────────────────────────
function initAuth() {
    // Tab switching
    $$('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const isLogin = tab.dataset.tab === 'login';
            $('login-form').style.display = isLogin ? 'flex' : 'none';
            $('register-form').style.display = isLogin ? 'none' : 'flex';
            $('reset-form').style.display = 'none';
            $('temp-password-form').style.display = 'none';
            $('auth-error').style.display = 'none';
        });
    });

    // Forgot Password link
    $('forgot-password-link')?.addEventListener('click', () => {
        $('login-form').style.display = 'none';
        $('register-form').style.display = 'none';
        $('reset-form').style.display = 'flex';
        $('temp-password-form').style.display = 'none';
        $('auth-error').style.display = 'none';
    });

    // Back to Login
    $('back-to-login')?.addEventListener('click', () => {
        $('login-form').style.display = 'flex';
        $('register-form').style.display = 'none';
        $('reset-form').style.display = 'none';
        $('temp-password-form').style.display = 'none';
    });

    // Login
    $('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = $('login-username').value.trim();
        const password = $('login-password').value;
        if (!username || !password) return showAuthError('Please fill in all fields');

        try {
            $('login-btn').textContent = 'Signing in...';
            $('login-btn').disabled = true;
            const data = await apiCall('POST', '/api/auth/login', { username, password });
            handleAuthSuccess(data);
        } catch (err) {
            showAuthError(err.message);
        } finally {
            $('login-btn').textContent = 'Sign In';
            $('login-btn').disabled = false;
        }
    });

    // Register
    $('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = $('reg-display-name').value.trim();
        const username = $('reg-username').value.trim();
        const password = $('reg-password').value;
        if (!displayName || !username || !password) return showAuthError('Please fill in all fields');

        try {
            $('register-btn').textContent = 'Creating account...';
            $('register-btn').disabled = true;

            let avatarUrl = '';
            const avatarFile = $('reg-avatar').files[0];
            if (avatarFile) {
                const formData = new FormData();
                formData.append('file', avatarFile);
                const uploadRes = await fetch(API + '/api/upload', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                if (uploadRes.ok && uploadData.file_url) {
                    avatarUrl = uploadData.file_url;
                }
            }

            const data = await apiCall('POST', '/api/auth/register', {
                username,
                displayName,
                password,
                avatar: avatarUrl,
                deviceBinding: getOrCreateHardwareID()
            });
            handleAuthSuccess(data);
        } catch (err) {
            showAuthError(err.message);
        } finally {
            $('register-btn').textContent = 'Create Account';
            $('register-btn').disabled = false;
        }
    });

    $('temp-password-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = $('temp-new-password').value;
        const confirmPassword = $('temp-confirm-password').value;
        if (!newPassword || !confirmPassword) return showAuthError('Please fill in all fields');
        if (newPassword !== confirmPassword) return showAuthError('Passwords do not match');

        try {
            $('temp-password-btn').textContent = 'Updating...';
            $('temp-password-btn').disabled = true;
            const data = await apiCall('POST', '/api/auth/complete-temp-password', { newPassword });
            state.user = data.user;
            state.token = data.token;
            const session = { user: state.user, token: state.token };
            localStorage.setItem('messenger_session', JSON.stringify(session));
            showToast(data.message || 'Password updated');
            showApp();
        } catch (err) {
            showAuthError(err.message);
        } finally {
            $('temp-password-btn').textContent = 'Update Password';
            $('temp-password-btn').disabled = false;
        }
    });

    // Check saved session
    const saved = localStorage.getItem('messenger_session');
    if (saved) {
        try {
            const session = JSON.parse(saved);
            handleAuthSuccess(session);
        } catch (e) {
            localStorage.removeItem('messenger_session');
            $('auth-screen').style.display = 'flex';
        }
    } else {
        $('auth-screen').style.display = 'flex';
    }
}

function showAuthError(message) {
    const el = $('auth-error');
    el.textContent = message;
    el.style.display = 'block';
}

function handleAuthSuccess(data) {
    state.user = data.user;
    state.token = data.token;
    if (state.user?.password_must_change) {
        localStorage.removeItem('messenger_session');
        $('login-form').style.display = 'none';
        $('register-form').style.display = 'none';
        $('reset-form').style.display = 'none';
        $('temp-password-form').style.display = 'flex';
        $('auth-screen').style.display = 'flex';
        $('app-screen').style.display = 'none';
        $('auth-error').style.display = 'none';
        $('temp-new-password').value = '';
        $('temp-confirm-password').value = '';
        $('temp-new-password').focus();
        return;
    }
    localStorage.setItem('messenger_session', JSON.stringify(data));
    showApp();
}

async function setupE2E() {
    try {
        await Signal.init();
        const bundle = await Signal.getPrekeyBundle();
        await apiCall('PUT', '/api/users/prekeys', bundle);
        state.e2eReady = true;
        console.log('🔒 E2E encryption ready (Signal Protocol)');
    } catch (e) {
        console.error('E2E setup failed:', e);
    }
}

function logout() {
    window.MessengerRecovery?.clear();
    window.MessengerArcade?.reset();
    endCurrentCall(false);
    closeLudoGame(false);
    window.MessengerNative?.closeDuel();
    state.user = null;
    state.token = null;
    state.socket?.disconnect();
    state.socket = null;
    state.conversations = [];
    state.activeConversation = null;
    state.messages = {};
    localStorage.removeItem('messenger_session');
    $('auth-screen').style.display = 'flex';
    $('app-screen').style.display = 'none';
    $('login-username').value = '';
    $('login-password').value = '';
    $('auth-error').style.display = 'none';

    // Clear UI state completely
    const chatLists = $$('.chat-list');
    if (chatLists) chatLists.forEach(l => {
        if (l.id === 'chat-list' && window.MessengerNative) window.MessengerNative.clearInbox();
        else l.innerHTML = '';
    });
    const msgContainer = $('messages-container');
    if (msgContainer) msgContainer.innerHTML = '';
    const activeChat = $('active-chat');
    if (activeChat) {
        activeChat.classList.remove('active');
        activeChat.style.display = 'none';
    }
}

// ─── App Init ───────────────────────────────────────────────
function showApp() {
    $('auth-screen').style.display = 'none';
    $('app-screen').style.display = 'block';
    $('sidebar-user-name').textContent = state.user.display_name;
    setAvatarElement($('sidebar-avatar'), state.user, state.user.id);

    connectSocket();
    setupScreenLockPresence();
    loadConversations();
    initChatUI();
    setupE2E();

    // Refresh "last seen" status every 30 seconds
    if (state.statusInterval) clearInterval(state.statusInterval);
    state.statusInterval = setInterval(updateOnlineStatus, 30000);
}

// ─── Socket.IO ──────────────────────────────────────────────
function connectSocket() {
    state.socket = io({ auth: { token: state.token, available: state.presenceAvailable } });
    window.MessengerArcade?.attachSocket(state.socket);

    state.socket.on('connect', () => {
        console.log('🟢 Connected to server');
        state.socket.emit('presence:state', { available: state.presenceAvailable });
    });

    state.socket.on('auth:revoked', () => { logout(); showAuthError('Your password changed. Sign in again with your new password.'); });

    state.socket.on('connect_error', (err) => {
        console.error('Socket error:', err.message);
        if (err.message === 'Authentication error') {
            logout();
            showAuthError('Session expired. Please login again.');
        }
    });

    state.socket.on('message:new', (message) => {
        handleNewMessage(message);
    });

    state.socket.on('inbox:hidden', ({ conversationId }) => removeChatFromInbox(conversationId));
    state.socket.on('inbox:restored', () => loadConversations());
    state.socket.on('duel:error', data => {
        showToast(data.message || 'Could not update game', true);
        window.MessengerNative?.duelError();
    });
    state.socket.on('duel:state', game => {
        if (!window.MessengerNative) return;
        closeLudoGame(false);
        window.MessengerNative.showDuel(game, {
            onMove: cell => state.socket.emit('duel:move', { conversationId: game.conversationId, cell }),
            onForfeit: () => state.socket.emit('duel:leave', { conversationId: game.conversationId })
        });
    });

    state.socket.on('conversation:cleared', (data) => {
        if (state.messages[data.conversationId]) {
            state.messages[data.conversationId] = [];
        }
        if (state.activeConversation === data.conversationId) {
            $('messages-container').innerHTML = '';
            // add a system message locally
            const div = document.createElement('div');
            div.className = 'message system';
            const text = data.clearedBy === state.user.id ? 'You cleared the chat history' : 'Chat history was cleared';
            div.innerHTML = `<div class="message-content">${text}</div>`;
            $('messages-container').appendChild(div);
        }
        // Force chat list to update to remove the 'last message' text
        loadConversations();
    });

    state.socket.on('message:read', (data) => {
        if (state.activeConversation === data.conversationId) {
            $$('.message.outgoing .message-status').forEach(el => {
                el.textContent = '✓✓';
                el.classList.add('read');
            });
        }
    });

    state.socket.on('typing:indicator', (data) => {
        handleTypingIndicator(data);
    });

    state.socket.on('user:online', ({ userId }) => {
        state.onlineUsers.add(userId);
        state.conversations.forEach(conv => {
            if (conv.type === 'private' && conv.other_user && conv.other_user.id === userId) {
                conv.other_user.is_online = 1;
            }
        });
        updateOnlineStatus();
    });

    state.socket.on('user:offline', ({ userId, lastSeen }) => {
        state.onlineUsers.delete(userId);

        // Update last seen in conversation objects
        state.conversations.forEach(conv => {
            if (conv.type === 'private' && conv.other_user && conv.other_user.id === userId) {
                conv.other_user.last_seen = lastSeen;
                conv.other_user.is_online = 0;
            }
        });

        updateOnlineStatus();
    });

    state.socket.on('group:created', (conv) => {
        if (conv && !state.conversations.find(c => c.id === conv.id)) {
            state.conversations.unshift(conv);
            renderChatList();
            showToast(`You were added to "${conv.name}"`);
        }
    });

    state.socket.on('message:deleted', ({ messageId, conversationId }) => {
        // Always update sidebar preview first
        const conv = state.conversations.find(c => c.id === conversationId);
        if (conv && conv.last_message_id === messageId) {
            conv.last_message = 'This message was deleted';
            conv.last_message_type = 'system';
            conv.last_message_encrypted = false;
            renderChatList();
        }

        // Update in-memory messages if loaded
        const msgs = state.messages[conversationId] || [];
        const msg = msgs.find(m => m.id === messageId);
        if (msg) {
            msg.content = 'This message was deleted';
            msg.message_type = 'system';
            msg._decrypted = 'This message was deleted';
            msg.is_encrypted = false;
            if (state.activeConversation === conversationId) {
                renderMessages(conversationId);
            }
        }
    });

    state.socket.on('message:deleted:bulk', ({ messageIds, conversationId }) => {
        const msgs = state.messages[conversationId] || [];
        messageIds.forEach(id => {
            const msg = msgs.find(m => m.id === id);
            if (msg) {
                msg.content = 'This message was deleted';
                msg.message_type = 'system';
                msg._decrypted = 'This message was deleted';
                msg.is_encrypted = false;
            }
        });

        // Always update conversation list preview
        const conv = state.conversations.find(c => c.id === conversationId);
        if (conv && messageIds.includes(conv.last_message_id)) {
            conv.last_message = 'Messages were deleted';
            conv.last_message_type = 'system';
            conv.last_message_encrypted = false;
            renderChatList();
        }

        if (state.activeConversation === conversationId) {
            renderMessages(conversationId);
        }
    });

    state.socket.on('group:updated', (data) => {
        const conv = state.conversations.find(c => c.id === data.conversationId);
        if (conv) {
            if (data.name) conv.name = data.name;
            if (data.members) conv.members = data.members;
            renderChatList();
            if (state.activeConversation === data.conversationId) {
                $('chat-name').textContent = conv.name;
            }
        }
    });

    state.socket.on('group:removed', (data) => {
        state.conversations = state.conversations.filter(c => c.id !== data.conversationId);
        if (state.activeConversation === data.conversationId) {
            closeChat();
        }
        renderChatList();
        showToast('You were removed from a group');
    });

    state.socket.on('call:offer', handleIncomingCallOffer);
    state.socket.on('call:answer', handleCallAnswer);
    state.socket.on('call:ice-candidate', handleCallIceCandidate);
    state.socket.on('call:reject', handleCallRejected);
    state.socket.on('call:end', handleRemoteCallEnded);

    state.socket.on('message:reaction', (data) => {
        const { messageId, conversationId, reactions } = data;
        const msgs = state.messages[conversationId] || [];
        const msg = msgs.find(m => m.id === messageId);
        if (msg) {
            msg.reactions = reactions;
            if (state.activeConversation === conversationId) {
                renderMessages(conversationId, false);
            }
        }
    });

    state.socket.on('status:new', (data) => {
        if (state.activeSidebarView === 'status') loadStatuses();
    });

    // ─── Game Events ──────────
    state.socket.on('game:request', (data) => {
        const { fromUserId, fromUsername, conversationId, gameType, boardSize } = data;
        const toast = $('game-request-toast');
        const type = gameType || 'tictactoe';
        const size = boardSize || 8;
        const gameTitleName = getGameTitle(type, size);

        $('game-request-title').textContent = `Game Invite: ${gameTitleName}`;
        $('game-request-msg').textContent = `${fromUsername} wants to play ${gameTitleName}!`;
        toast.style.display = 'flex';

        $('game-accept-btn').onclick = () => {
            state.socket.emit('game:accept', { targetUserId: fromUserId, conversationId, gameType: type, boardSize: size });
            toast.style.display = 'none';
        };
        $('game-decline-btn').onclick = () => {
            state.socket.emit('game:decline', { targetUserId: fromUserId, conversationId });
            toast.style.display = 'none';
        };
    });

    state.socket.on('game:started', (data) => {
        const { opponentId, opponentName, conversationId, gameType, boardSize, symbol, starts, playerNum, gameSeed } = data;
        const legacyKey = ({tictactoe:'game',dotsandboxes:'dotsGame',connectfour:'connectFour',rockpaperscissors:'rpsGame',retropong:'retroPong',stickfight:'stickFight'})[gameType || 'tictactoe'];
        if(legacyKey){state[legacyKey].sessionId=data.sessionId;state[legacyKey].opponentName=opponentName;}
        if (gameType === 'dotsandboxes') {
            closeGame();
            closeConnectFour();
            closeRpsGame();
            closeMemoryGame();
            closeWordGame();
            closeTankDuel();
            closeRetroPong();
            closeStickFight();
            closeLudoGame(false);
            initDotsGame(opponentId, opponentName || 'Opponent', conversationId, boardSize, playerNum, starts);
        } else if (gameType === 'connectfour') {
            closeGame();
            closeDotsGame();
            closeRpsGame();
            closeMemoryGame();
            closeWordGame();
            closeTankDuel();
            closeRetroPong();
            closeStickFight();
            closeLudoGame(false);
            initConnectFour(opponentId, opponentName || 'Opponent', conversationId, playerNum, starts);
        } else if (gameType === 'rockpaperscissors') {
            closeGame();
            closeDotsGame();
            closeConnectFour();
            closeMemoryGame();
            closeWordGame();
            closeTankDuel();
            closeRetroPong();
            closeStickFight();
            closeLudoGame(false);
            initRpsGame(opponentId, opponentName || 'Opponent', conversationId, playerNum);
        } else if (gameType === 'memorymatch') {
            closeGame();
            closeDotsGame();
            closeConnectFour();
            closeRpsGame();
            closeWordGame();
            closeTankDuel();
            closeRetroPong();
            closeStickFight();
            closeLudoGame(false);
            initMemoryGame(opponentId, opponentName || 'Opponent', conversationId, playerNum, starts, gameSeed);
        } else if (gameType === 'wordscramble') {
            closeGame();
            closeDotsGame();
            closeConnectFour();
            closeRpsGame();
            closeMemoryGame();
            closeTankDuel();
            closeRetroPong();
            closeStickFight();
            closeLudoGame(false);
            initWordGame(opponentId, opponentName || 'Opponent', conversationId, playerNum, gameSeed);
        } else if (gameType === 'retropong') {
            closeGame();
            closeDotsGame();
            closeConnectFour();
            closeRpsGame();
            closeMemoryGame();
            closeWordGame();
            closeTankDuel();
            closeStickFight();
            closeLudoGame(false);
            initRetroPong(opponentId, opponentName || 'Opponent', conversationId, playerNum, gameSeed);
        } else if (gameType === 'stickfight') {
            closeGame();
            closeDotsGame();
            closeConnectFour();
            closeRpsGame();
            closeMemoryGame();
            closeWordGame();
            closeTankDuel();
            closeRetroPong();
            closeLudoGame(false);
            initStickFight(opponentId, opponentName || 'Opponent', conversationId, playerNum, gameSeed);
        } else {
            closeDotsGame();
            closeConnectFour();
            closeRpsGame();
            closeMemoryGame();
            closeWordGame();
            closeTankDuel();
            closeRetroPong();
            closeStickFight();
            closeLudoGame(false);
            initGame(opponentId, conversationId, symbol, starts);
        }
    });

    state.socket.on('game:declined', (data) => {
        showToast('Game request declined', true);
    });

    state.socket.on('game:move', (data) => {
        const { index, symbol, moveData } = data;
        if (moveData?.gameType === 'connectfour') {
            handleRemoteConnectMove(moveData);
        } else if (moveData?.gameType === 'rockpaperscissors') {
            handleRemoteRpsChoice(moveData);
        } else if (moveData?.gameType === 'memorymatch') {
            handleRemoteMemoryMove(moveData);
        } else if (moveData?.gameType === 'wordscramble') {
            handleRemoteWordSolve(moveData);
        } else if (moveData?.gameType === 'retropong') {
            handleRemoteRetroPongMove(moveData);
        } else if (moveData?.gameType === 'stickfight') {
            handleRemoteStickFightMove(moveData);
        } else if (moveData) {
            handleRemoteDotsMove(moveData);
        } else {
            handleRemoteMove(index, symbol);
        }
    });

    state.socket.on('game:ended', (data) => {
        const { winnerId, score } = data;
        window.MessengerArcade?.legacyResult(winnerId);

        if (state.game && state.game.active) {
            state.game.score = score;
            updateScoreCard();

            let msg = '';
            if (winnerId === 'draw') msg = "It's a draw!";
            else if (winnerId === state.user.id) msg = "You won! 🎉";
            else msg = "You lost. 💀";

            $('game-status-text').textContent = msg;
            state.game.isMyTurn = false;

        } else if (state.dotsGame && state.dotsGame.active) {
            let msg = '';
            if (winnerId === 'draw') msg = "It's a tie game! 🤝";
            else if (winnerId === state.user.id) msg = `You won (${state.dotsGame.myScore} - ${state.dotsGame.opponentScore})! 🎉`;
            else msg = `Opponent won (${state.dotsGame.opponentScore} - ${state.dotsGame.myScore}). 💀`;

            $('dots-status-text').textContent = msg;
            state.dotsGame.isMyTurn = false;

        } else if (state.connectFour && state.connectFour.active) {
            let msg = '';
            if (winnerId === 'draw') msg = "It's a draw!";
            else if (winnerId === state.user.id) msg = `You won (${state.connectFour.myScore} - ${state.connectFour.opponentScore})! 🎉`;
            else msg = `${state.connectFour.opponentName} won (${state.connectFour.opponentScore} - ${state.connectFour.myScore}).`;

            $('connect-status-text').textContent = msg;
            state.connectFour.isMyTurn = false;

        } else if (state.retroPong && state.retroPong.active) {
            state.retroPong.finished = true;
            const won = winnerId === state.user.id;
            $('retropong-status').textContent = won ? 'You win' : `${state.retroPong.opponentName} wins`;
        } else if (state.stickFight && state.stickFight.active) {
            state.stickFight.finished = true;
            const won = winnerId === state.user.id;
            $('stickfight-status-text').textContent = won ? 'You won the match!' : `${state.stickFight.opponentName} won the match`;
        } else if (state.tankDuel && state.tankDuel.active) {
            state.tankDuel.winnerId = winnerId;
            state.tankDuel.animating = false;
            updateTankDuelHud();
        }
    });

    state.socket.on('game:invite_closed', (data) => {
        $('game-request-toast').style.display = 'none';
    });


    state.socket.on('game:score', (data) => {
        state.game.score = data.score;
        updateScoreCard();
    });

    state.socket.on('ludo:started', (data) => {
        closeGame();
        closeDotsGame();
        closeConnectFour();
        closeRpsGame();
        closeMemoryGame();
        closeWordGame();
        closeTankDuel();
        closeRetroPong();
        closeStickFight();
        initLudoGame(data);
    });

    state.socket.on('ludo:rolling', data => {
        if (data.conversationId === state.ludoGame.conversationId) startLudoRollAnimation(data.playerId);
    });

    state.socket.on('ludo:state', (data) => {
        updateLudoGame(data);
    });

    state.socket.on('ludo:ended', (data) => {
        const lg = state.ludoGame;
        if (lg.active && (!data?.conversationId || data.conversationId === lg.conversationId)) {
            cancelAnimationFrame(lg.motionFrame);
            clearTimeout(lg.rollPresentationTimer);
            clearTimeout(lg.rollRecoveryTimer);
            const final = lg.pendingMoveStates?.at(-1) || lg.pendingRollState;
            lg.tokenMotion = null;
            lg.pendingMoveStates = [];
            lg.pendingRollState = null;
            lg.rollingUntil = 0;
            if (final) updateLudoGame(final, false);
            showToast('Ludo game ended');
            closeLudoGame(false);
        }
    });

    state.socket.on('ludo:error', (data) => {
        showToast(data.message || 'Could not start Ludo', true);
    });

    // ─── Scribble Events ─────────────
    state.socket.on('scribble:invite', (data) => {
        const { conversationId, hostName, hostId } = data;
        if (hostId === state.user.id) return; // Host doesn't see their own invite

        // Show invite toast
        const toast = $('game-request-toast');
        $('game-request-title').textContent = `🎨 Scribble Invite`;
        $('game-request-msg').textContent = `${hostName} wants to play Scribble!`;
        toast.style.display = 'flex';

        $('game-accept-btn').onclick = () => {
            state.socket.emit('scribble:join', { conversationId });
            toast.style.display = 'none';
        };
        $('game-decline-btn').onclick = () => {
            toast.style.display = 'none';
        };
    });

    state.socket.on('scribble:invite_closed', (data) => {
        $('game-request-toast').style.display = 'none';
    });

    state.socket.on('scribble:lobby', (data) => {
        const { conversationId, players, isHost } = data;
        state.scribble = { active: false, conversationId, isDrawer: false, drawerId: null, players, isHost };
        showScribbleLobby(players, isHost);
    });

    state.socket.on('scribble:error', (data) => {
        showToast(data.message, true);
    });

    state.socket.on('scribble:game_started', (data) => {
        $('game-request-toast').style.display = 'none';
        const { conversationId, players } = data;
        state.scribble = { active: true, conversationId, isDrawer: false, drawerId: null, players, isHost: false };
        showScribbleGame();
        updateScribbleLeaderboard(players);
        addScribbleChat('🎨 Game started! Get ready...', 'system');
    });

    state.socket.on('scribble:status', (data) => {
        if (!state.scribble) return;
        state.scribble.drawerId = data.drawerId;
        state.scribble.isDrawer = (data.drawerId === state.user.id);
        $('scribble-status-title').textContent = state.scribble.isDrawer
            ? 'Your turn! Choose a word...'
            : `${data.drawerUsername} is choosing a word...`;
    });

    state.socket.on('scribble:choose_word', (data) => {
        if (!state.scribble) return;
        state.scribble.isDrawer = true;
        const picker = $('scribble-word-picker');
        const options = $('scribble-word-options');
        options.innerHTML = data.words.map(w =>
            `<button class="word-btn" data-word="${w}">${w}</button>`
        ).join('');
        picker.style.display = 'flex';
        $('scribble-round-overlay').style.display = 'none';

        options.querySelectorAll('.word-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.socket.emit('scribble:word_selected', {
                    conversationId: state.scribble.conversationId,
                    word: btn.dataset.word
                });
                picker.style.display = 'none';
            });
        });
    });

    state.socket.on('scribble:drawing_started', (data) => {
        if (!state.scribble) return;
        state.scribble.drawerId = data.drawerId;
        state.scribble.isDrawer = (data.drawerId === state.user.id);

        clearScribbleCanvas();
        $('scribble-round-overlay').style.display = 'none';
        $('scribble-word-picker').style.display = 'none';
        $('scribble-timer').textContent = data.timeLeft + 's';

        if (state.scribble.isDrawer) {
            $('scribble-toolbar').style.display = 'flex';
            $('scribble-guess-input').disabled = true;
            $('scribble-guess-input').placeholder = "You're drawing!";
            $('scribble-guess-btn').disabled = true;
            $('scribble-word-hint').textContent = data.word;
            $('scribble-status-title').textContent = `Draw: ${data.word}`;
        } else {
            $('scribble-toolbar').style.display = 'none';
            $('scribble-guess-input').disabled = false;
            $('scribble-guess-input').placeholder = 'Type your guess...';
            $('scribble-guess-btn').disabled = false;
            $('scribble-word-hint').textContent = '_ '.repeat(data.wordLength).trim();
            $('scribble-status-title').textContent = `${data.drawerUsername} is drawing! Guess the word!`;
        }
        initScribbleCanvas();
        addScribbleChat(`🖌️ ${data.drawerUsername} is now drawing!`, 'system');
    });

    state.socket.on('scribble:canvas', data => {
        if(state.scribble?.conversationId===data.conversationId) for(const draw of data.draws||[]) applyDrawData(draw);
    });
    state.socket.on('scribble:draw', (data) => {
        if (!state.scribble || state.scribble.isDrawer) return;
        applyDrawData(data.drawData);
    });

    state.socket.on('scribble:timer', (data) => {
        if (!state.scribble) return;
        $('scribble-timer').textContent = data.timeLeft + 's';
        if (data.timeLeft <= 10) {
            $('scribble-timer').style.color = '#ff5c4d';
        } else {
            $('scribble-timer').style.color = '';
        }
    });

    state.socket.on('scribble:correct_guess', (data) => {
        if (!state.scribble) return;
        state.scribble.players = data.players;
        updateScribbleLeaderboard(data.players);
        addScribbleChat(`✅ ${data.username} guessed correctly!`, 'correct');
    });

    state.socket.on('scribble:guess_msg', (data) => {
        if (!state.scribble) return;
        addScribbleChat(`${data.username}: ${data.guess}`);
    });

    state.socket.on('scribble:round_ended', (data) => {
        if (!state.scribble) return;
        state.scribble.players = data.players;
        updateScribbleLeaderboard(data.players);
        $('scribble-toolbar').style.display = 'none';
        $('scribble-guess-input').disabled = true;
        $('round-result-word').innerHTML = `The word was: <strong>${escapeHtml(data.word)}</strong>`;
        $('scribble-round-overlay').style.display = 'flex';
        $('scribble-status-title').textContent = 'Round over! Next round shortly…';
        addScribbleChat(`📝 The word was: ${data.word}`, 'system');
    });

    state.socket.on('scribble:game_over', (data) => {
        if (!state.scribble) return;
        if (data.players && data.players.length > 0) {
            const sorted = [...data.players].sort((a, b) => b.score - a.score);
            updateScribbleLeaderboard(sorted);
            const top = sorted.filter(p => p.score === sorted[0].score);
            window.MessengerArcade?.result({winnerName: top.length > 1 ? 'Draw' : top[0].username, draw: top.length > 1, reason: 'Scribble · ' + sorted[0].score + ' points'});
            $('scribble-status-title').textContent = `🏆 Game Over! ${sorted[0]?.username || 'Unknown'} wins!`;
            addScribbleChat(`🏆 Game Over! Winner: ${sorted[0]?.username} with ${sorted[0]?.score} points!`, 'system');
            $('scribble-toolbar').style.display = 'none';
            $('scribble-guess-input').disabled = true;
            $('scribble-round-overlay').style.display = 'none';
        } else {
            $('scribble-overlay').style.display = 'none';
            showToast('Scribble game was closed by the host', true);
            state.scribble = null;
        }
        if (state.scribble) state.scribble.active = false;
    });
}

function setPresenceAvailable(available) {
    const nextAvailability = Boolean(available);
    if (state.presenceAvailable === nextAvailability) return;
    state.presenceAvailable = nextAvailability;
    if (state.socket) state.socket.auth.available = nextAvailability;
    if (state.socket?.connected) {
        state.socket.emit('presence:state', { available: nextAvailability });
    }
}

function handlePresenceVisibilityChange() {
    const screenState = state.presenceDetector?.screenState || 'unlocked';
    setPresenceAvailable(PresenceVisibility.getPresenceAvailability(document.visibilityState, screenState));
}

async function startIdleScreenLockDetection() {
    if (state.presencePermissionRequested || !('IdleDetector' in window)) return;
    state.presencePermissionRequested = true;
    try {
        const permission = await IdleDetector.requestPermission();
        if (permission !== 'granted') return;
        const detector = new IdleDetector();
        detector.addEventListener('change', () => {
            setPresenceAvailable(PresenceVisibility.getPresenceAvailability(document.visibilityState, detector.screenState));
        });
        await detector.start({ threshold: 60000 });
        state.presenceDetector = detector;
        handlePresenceVisibilityChange();
    } catch (err) {
        console.warn('Screen-lock presence detection unavailable:', err.message);
    }
}

function setupScreenLockPresence() {
    if (!state.presenceInitialized) {
        state.presenceInitialized = true;
        document.addEventListener('visibilitychange', handlePresenceVisibilityChange);
        window.addEventListener('pagehide', () => setPresenceAvailable(false));
        window.addEventListener('pageshow', handlePresenceVisibilityChange);
        document.addEventListener('pointerdown', startIdleScreenLockDetection, { once: true });
        document.addEventListener('keydown', startIdleScreenLockDetection, { once: true });
    }
    handlePresenceVisibilityChange();
}

// ─── Conversations ──────────────────────────────────────────
async function loadConversations() {
    try {
        state.conversations = await apiCall('GET', '/api/conversations');
        // Populate initial online status
        state.onlineUsers.clear();
        state.conversations.forEach(conv => {
            if (conv.type === 'private' && conv.other_user && conv.other_user.is_online) {
                state.onlineUsers.add(conv.other_user.id);
            }
        });
        updateOnlineStatus();
    } catch (err) {
        console.error('Failed to load conversations:', err);
    }
}

function removeChatFromInbox(conversationId) {
    if (state.activeConversation === conversationId) closeChat();
    state.conversations = state.conversations.filter(conv => conv.id !== conversationId);
    renderChatList();
}

async function deleteChatFromInbox(conversationId) {
    await apiCall('DELETE', `/api/conversations/${encodeURIComponent(conversationId)}/inbox`);
    removeChatFromInbox(conversationId);
    showToast('Chat removed from your inbox');
}

function renderChatList(filter = $('search-input')?.value.trim() || '') {
    const list = $('chat-list');
    let convs = state.conversations;

    const unreadTotal = state.conversations.reduce((acc, c) => acc + Number(c.unread_count || 0), 0);
    const badge = $('total-unread-badge');
    if (badge) {
        badge.textContent = unreadTotal > 99 ? '99+' : unreadTotal;
        badge.style.display = unreadTotal > 0 ? 'flex' : 'none';
    }

    if (filter) {
        const q = filter.toLowerCase();
        convs = convs.filter(c => {
            const name = c.type === 'private' ? (c.other_user?.display_name || '') : c.name;
            return name.toLowerCase().includes(q);
        });
    }

    if (window.MessengerNative) {
        const items = convs.map(conv => {
            const group = conv.type === 'group';
            const name = group ? conv.name : conv.other_user?.display_name || 'Unknown';
            let preview = conv.last_message || '';
            if (conv.last_message_encrypted) preview = 'Encrypted message';
            else if (['image','file','video','audio'].includes(conv.last_message_type)) preview = {image:'Photo',file:'File',video:'Video',audio:'Voice message'}[conv.last_message_type];
            else if (preview.startsWith('__IMGSTICKER__') || preview.startsWith('__STICKER__')) preview = 'Sticker';
            return { id: conv.id, name, preview, group, avatar: conv.avatar || conv.other_user?.avatar || '', initials: getInitials(name), color: getColor(group ? conv.id : conv.other_user?.id || conv.id), online: !group && state.onlineUsers.has(conv.other_user?.id), time: conv.last_message_time ? formatTime(conv.last_message_time) : '', unread: Number(conv.unread_count || 0) };
        });
        window.MessengerNative.renderInbox({ items, activeId: state.activeConversation, onOpen: openConversation, onDelete: deleteChatFromInbox, searching: Boolean(filter) });
        return;
    }

    if (convs.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${filter ? '🔍' : '💬'}</div>
                <h4>${filter ? 'No results found' : 'No conversations yet'}</h4>
                <p>${filter ? 'Try a different search' : 'Start a new chat or create a group!'}</p>
            </div>`;
        return;
    }

    list.innerHTML = convs.map(conv => {
        const isGroup = conv.type === 'group';
        const name = isGroup ? conv.name : (conv.other_user?.display_name || 'Unknown');
        const isOnline = !isGroup && conv.other_user && state.onlineUsers.has(conv.other_user.id);
        const initials = getInitials(name);
        const color = getColor(isGroup ? conv.id : (conv.other_user?.id || conv.id));
        const isActive = state.activeConversation === conv.id;

        let preview = conv.last_message || '';
        if (conv.last_message_encrypted) preview = '🔒 Encrypted message';
        else if (conv.last_message_type === 'image') preview = '📷 Photo';
        else if (conv.last_message_type === 'file') preview = '📎 File';
        else if (conv.last_message_type === 'video') preview = '🎬 Video';
        else if (conv.last_message_type === 'audio') preview = '🎵 Audio';
        else if (conv.last_message_type === 'system') preview = conv.last_message;
        else if (preview.startsWith('__IMGSTICKER__') || preview.startsWith('__STICKER__')) preview = '🎨 Sticker';

        const time = conv.last_message_time ? formatTime(conv.last_message_time) : '';
        const unread = conv.unread_count || 0;

        return `
            <div class="chat-item${isActive ? ' active' : ''}" data-id="${conv.id}" onclick="openConversation('${conv.id}')">
                ${getAvatarHtml(conv, (isGroup ? conv.id : (conv.other_user?.id || conv.id)), isOnline, '', isGroup ? 'group-avatar' : '')}
                <div class="chat-item-info">
                    <div class="chat-item-top">
                        <span class="chat-item-name">${escapeHtml(name)}</span>
                        <span class="chat-item-time${unread > 0 ? ' unread' : ''}">${time}</span>
                    </div>
                    <div class="chat-item-bottom">
                        <span class="chat-item-preview">${escapeHtml(preview)}</span>
                        ${unread > 0 ? `<span class="chat-item-unread">${unread}</span>` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
}

function updateOnlineStatus() {
    renderChatList();
    if (state.activeConversation) {
        const conv = state.conversations.find(c => c.id === state.activeConversation);
        if (conv && conv.type === 'private' && conv.other_user) {
            const isOnline = state.onlineUsers.has(conv.other_user.id);
            if (isOnline) {
                $('chat-status').textContent = 'online';
                $('chat-status').classList.add('online');
            } else {
                $('chat-status').textContent = formatLastSeen(conv.other_user.last_seen);
                $('chat-status').classList.remove('online');
            }
            const avatar = $('chat-avatar');
            if (isOnline) avatar.classList.add('online');
            else avatar.classList.remove('online');
            if ($('profile-panel').classList.contains('open') && $('profile-panel').dataset.conversationId === conv.id) {
                const chip = $('contact-presence-chip');
                if (chip) {
                    chip.classList.toggle('is-online', isOnline);
                    chip.querySelector('b').textContent = isOnline ? 'Online now' : 'Offline';
                }
                const detail = $('contact-presence-detail');
                if (detail) detail.textContent = isOnline ? 'Available on LAN Messenger' : formatLastSeen(conv.other_user.last_seen);
            }
        }
    }
}

function formatLastSeen(dateStr) {
    if (!dateStr) return 'last seen recently';
    try {
        const d = new Date(dateStr + (typeof dateStr === 'string' && !dateStr.endsWith('Z') ? 'Z' : ''));
        if (isNaN(d.getTime())) return 'last seen recently';
        const now = new Date();
        const diff = now - d;

        if (diff < 60000) return 'last seen just now';
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `last seen ${mins}m ago`;
        }

        if (d.toDateString() === now.toDateString()) {
            return 'last seen at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) {
            return 'last seen yesterday at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return 'last seen on ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
        return 'last seen recently';
    }
}

// ─── Open Conversation ──────────────────────────────────────
async function openConversation(conversationId) {
    state.activeConversation = conversationId;
    const conv = state.conversations.find(c => c.id === conversationId);
    if (!conv) return;

    // Show appropriate game button
    if (conv.type === 'group') {
        $('scribble-btn').style.display = 'flex';
        $('game-btn').style.display = 'flex';
    } else {
        $('scribble-btn').style.display = 'none';
        $('game-btn').style.display = 'flex';
    }

    // Join socket room
    state.socket.emit('conversation:join', { conversationId });

    // Update UI
    $('welcome-screen').style.display = 'none';
    $('active-chat').style.display = 'flex';
    $('profile-panel').classList.remove('open');

    const isGroup = conv.type === 'group';
    const name = isGroup ? conv.name : (conv.other_user?.display_name || 'Unknown');
    const color = getColor(isGroup ? conv.id : (conv.other_user?.id || conv.id));
    const isOnline = !isGroup && conv.other_user && state.onlineUsers.has(conv.other_user.id);

    $('chat-name').textContent = name;
    setAvatarElement($('chat-avatar'), conv, color);
    $('chat-avatar').className = `avatar${isOnline ? ' online' : ''}${isGroup ? ' group-avatar' : ''}`;

    if (isGroup) {
        try {
            const members = await apiCall('GET', `/api/conversations/${conversationId}/members`);
            $('chat-status').textContent = `${members.length} members`;
            // Derive group symmetric key
            const memberKeys = members.map(m => m.public_identity_key).filter(Boolean);
            if (memberKeys.length > 0 && state.e2eReady) {
                const key = await Signal.getGroupSymmetricKey(memberKeys);
                if (key) state.e2eKeys[conversationId] = key;
            }
        } catch (e) {
            $('chat-status').textContent = 'Group';
        }
    } else {
        if (isOnline) {
            $('chat-status').textContent = 'online';
            $('chat-status').classList.add('online');
        } else {
            $('chat-status').textContent = formatLastSeen(conv.other_user?.last_seen);
            $('chat-status').classList.remove('online');
        }
        // Signal uses true E2E session state, no static pairwise symmetric key here
        state.e2eKeys[conversationId] = true;
    }

    updateCallButton();

    // Show E2E badge
    const e2eBadge = $('e2e-badge');
    if (e2eBadge) e2eBadge.style.display = state.e2eKeys[conversationId] ? 'inline-flex' : 'none';

    syncResponsiveLayout();

    // Load messages
    await loadMessages(conversationId);

    // Mark as read
    state.socket.emit('message:read', { conversationId });
    conv.unread_count = 0;
    renderChatList();

    // Focus input
    $('message-input').focus();
}

async function loadMessages(conversationId, before = null) {
    try {
        const url = before
            ? `/api/conversations/${conversationId}/messages?before=${before}&limit=50`
            : `/api/conversations/${conversationId}/messages?limit=50`;
        const messages = await apiCall('GET', url);

        // Decrypt all messages
        const conv = state.conversations.find(c => c.id === conversationId);
        const remoteUserId = conv.type === 'private' ? conv.other_user?.id : null;

        for (const msg of messages) {
            msg._decrypted = msg.ciphertext || msg.content;
            if (isEncryptedMessage(msg) && msg.message_type !== 'system' && state.e2eReady) {
                try {
                    if (conv.type === 'group' && state.e2eKeys[conversationId]) {
                        const groupKey = state.e2eKeys[conversationId];
                        const aesKey = await window.crypto.subtle.importKey('raw', groupKey, 'AES-GCM', false, ['decrypt']);
                        // Helper to decode b64 manually
                        const binary = atob(msg.iv);
                        const iv = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) iv[i] = binary.charCodeAt(i);

                        const cbin = atob(msg.ciphertext);
                        const cArr = new Uint8Array(cbin.length);
                        for (let i = 0; i < cbin.length; i++) cArr[i] = cbin.charCodeAt(i);

                        const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cArr.buffer);
                        msg._decrypted = new TextDecoder().decode(decrypted);

                    } else if (remoteUserId) {
                        // Double Ratchet Decrypt
                        if (!Signal.hasSession(remoteUserId) && msg.sender_id === remoteUserId) {
                            const theirIk = conv.other_user.public_identity_key;
                            await Signal.initSessionAsResponder(remoteUserId, msg.dh_pub, theirIk, null);
                        }
                        const header = { iv: msg.iv, dhPub: msg.dh_pub, messageNumber: msg.message_number || 0 };
                        msg._decrypted = await Signal.ratchetDecrypt(remoteUserId, header, msg.ciphertext);
                    }
                } catch (e) {
                    console.warn(e);
                    msg._decrypted = '🔒 Encrypted message';
                }
            }

            // Parse file payload JSON globally
            if (msg.message_type !== 'text' && msg.message_type !== 'system' && typeof msg._decrypted === 'string') {
                try {
                    const parsed = JSON.parse(msg._decrypted);
                    msg._decrypted = parsed.caption || '';
                    msg._fileKeyStore = parsed.fileKeyStore;
                } catch (e) { }
            }
        }

        if (!before) {
            state.messages[conversationId] = messages;
        } else {
            state.messages[conversationId] = [...messages, ...state.messages[conversationId]];
        }

        renderMessages(conversationId, !before);
    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

function renderMessages(conversationId, scrollToBottom = true) {
    const container = $('messages-container');
    const messages = state.messages[conversationId] || [];

    if (messages.length === 0) {
        container.innerHTML = `
        <div class="empty-state" style="height:100%;">
            <div class="empty-state-icon">📨</div>
            <h4>No messages yet</h4>
            <p>Start the conversation!</p>
        </div>`;
        return;
    }

    let html = '';
    let lastDate = '';

    let lastSenderId = null;
    messages.forEach((msg, index) => {
        const msgDate = formatDate(msg.created_at);
        if (msgDate !== lastDate) {
            lastDate = msgDate;
            html += `<div class="message-date-divider"><span>${msgDate}</span></div>`;
            lastSenderId = null; // Reset on date change
        }

        const isOutgoing = msg.sender_id === state.user.id;
        const isSystem = msg.message_type === 'system';

        // Determine if this is the start of a new message block from the same sender
        const isFirstInSequence = msg.sender_id !== lastSenderId;
        lastSenderId = msg.sender_id;

        if (isSystem) {
            html += `
            <div class="message system">
                <div class="message-bubble">
                    <div class="message-content">${escapeHtml(msg.content)}</div>
                    <div class="message-meta"><span class="message-time">${formatMessageTime(msg.created_at)}</span></div>
                </div>
            </div>`;
            return;
        }
        html += renderMessage(msg, null, isFirstInSequence);
    });

    container.innerHTML = html;
    if (scrollToBottom) {
        container.scrollTop = container.scrollHeight;
    }

    // Attach menu actions to each message bubble
    if (!state.isSelectionMode) {
        $$('.action-reply').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                setReply(btn.dataset.id);
            };
        });

        $$('.action-delete').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Delete this message for everyone?')) {
                    socketDeleteMessage(btn.dataset.id);
                }
            };
        });

        $$('.action-forward').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                openForwardModal([btn.dataset.id]);
            };
        });
    } else {
        // Selection mode click handlers
        $$('.message').forEach(el => {
            el.onclick = () => toggleMessageSelection(el.dataset.id);
        });
    }

    // Handle scroll-to-reference for replies
    $$('.replied-message-box').forEach(box => {
        box.onclick = () => {
            const targetId = box.dataset.ref;
            const targetEl = document.querySelector(`.message[data-id="${targetId}"]`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetEl.classList.add('highlight');
                setTimeout(() => targetEl.classList.remove('highlight'), 2000);
            }
        };
    });

    initReactionHandlers();
}

function renderMessage(msg, highlightQuery, isFirstInSequence = false) {
    const isOutgoing = msg.sender_id === state.user.id;
    const isSystem = msg.message_type === 'system';

    if (isSystem) {
        return `
        <div class="message system" data-id="${msg.id}">
            <div class="message-bubble">
                <div class="message-content">${escapeHtml(msg.content)}</div>
            </div>
        </div>
    `;
    }

    const content = typeof msg._decrypted === 'string' ? msg._decrypted : (isEncryptedMessage(msg) ? '🔒 Encrypted message' : msg.content);
    const time = formatMessageTime(msg.created_at);

    // Show sender name for incoming group messages
    const conv = state.conversations.find(c => c.id === state.activeConversation);
    const isGroup = conv && conv.type === 'group';
    let senderMarkup = '';
    if (isGroup && !isOutgoing) {
        const senderName = msg.sender_name || msg.sender_username || 'Unknown';
        const senderColor = getColor(msg.sender_id);
        senderMarkup = `<div class="message-sender" style="color:${senderColor}">${escapeHtml(senderName)}</div>`;
    }

    // Reply markup
    let replyMarkup = '';
    if (msg.reply_to) {
        const repliedMsg = (state.messages[state.activeConversation] || []).find(m => m.id === msg.reply_to);
        const repliedText = repliedMsg ? (repliedMsg._decrypted || repliedMsg.content || 'Attached file') : 'Message reference';
        const repliedSender = repliedMsg ? (repliedMsg.sender_name || 'User') : 'Previous message';
        replyMarkup = `
        <div class="replied-message-box" data-ref="${msg.reply_to}">
            <div class="replied-sender">${escapeHtml(repliedSender)}</div>
            <div class="replied-text">${escapeHtml(repliedText)}</div>
        </div>
    `;
    }

    // Action buttons (only show delete for outgoing)
    const actions = `
    <div class="message-actions">
        <button class="action-btn action-reply" data-id="${msg.id}" title="Reply">↩️</button>
        <button class="action-btn action-forward" data-id="${msg.id}" title="Forward">➡️</button>
        ${isOutgoing ? `<button class="action-btn action-delete" data-id="${msg.id}" title="Delete for everyone">🗑️</button>` : ''}
    </div>
`;

    const isSelected = state.selectedMessages.has(msg.id);
    const trimmedForEmoji = content.trim();
    const isSingleEmoji = msg.message_type === 'text' && /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|[\u200D\uFE0F\u{1F3FB}-\u{1F3FF}])+$/u.test(trimmedForEmoji) && Array.from(trimmedForEmoji).length <= 5;

    const mediaSrc = getAuthUrl(msg.file_url);
    const mediaClass = '';

    // Content with optional search highlight
    let displayContent = content ? linkify(content) : '';
    if (highlightQuery && content) {
        const escaped = escapeHtml(content);
        const regex = new RegExp(`(${highlightQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        displayContent = escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    // Sticker message
    const stickerData = parseStickerMessage(content);
    if (stickerData) {
        let stickerHtml = '';
        if (stickerData.type === 'image') {
            stickerHtml = `<img class="message-sticker" src="${escapeHtml(stickerData.src)}" alt="${escapeHtml(stickerData.label)}" title="${escapeHtml(stickerData.label)}">`;
        } else {
            stickerHtml = `<span class="message-sticker-emoji" title="${escapeHtml(stickerData.label)}">${stickerData.emoji}</span>`;
        }
        return `
    <div class="message ${isOutgoing ? 'outgoing' : 'incoming'} sticker-message ${state.isSelectionMode ? 'selectable' : ''}" data-id="${msg.id}">
        ${state.isSelectionMode ? '' : actions}
        <div class="message-bubble">
            ${senderMarkup}
            ${stickerHtml}
            <div class="message-meta">
                <span class="message-time">${time}</span>
                ${isOutgoing ? `<span class="message-status ${msg.is_read ? 'read' : ''}">${msg.is_read ? '✓✓' : '✓'}</span>` : ''}
            </div>
        </div>
        ${renderReactions(msg)}
    </div>
`;
    }

    return `
    <div class="message ${isOutgoing ? 'outgoing' : 'incoming'} ${isFirstInSequence ? 'first-in-sequence' : ''} ${state.isSelectionMode ? 'selectable' : ''} ${isSelected ? 'selected' : ''}" data-id="${msg.id}">
        ${state.isSelectionMode ? '' : actions}
        <div class="message-bubble ${isSingleEmoji ? 'emoji-only' : ''}">
            ${senderMarkup}
            ${replyMarkup}
            ${msg.message_type === 'image' ? `
                <div class="message-image" onclick="viewImage('${mediaSrc}')">
                    <img class="${mediaClass}" data-msg-id="${msg.id}" src="${mediaSrc}" alt="image" loading="lazy">
                </div>
            ` : ''}
            ${msg.message_type === 'video' ? `
                <div class="message-video">
                    <div class="video-preview-container" onclick="openVideoViewer('${mediaSrc}')">
                        <video class="${mediaClass}" data-msg-id="${msg.id}" src="${mediaSrc}" preload="metadata" muted></video>
                        <div class="video-play-overlay">
                            <div class="video-play-btn">▶</div>
                        </div>
                    </div>
                    ${msg.file_name ? `<div class="video-file-info"><span class="video-file-name">${escapeHtml(msg.file_name)}</span><span class="video-file-size">${formatFileSize(msg.file_size)}</span></div>` : ''}
                </div>
            ` : ''}
            ${msg.message_type === 'audio' ? `
                <div class="voice-message">
                    <div class="play-btn" onclick="toggleAudioPlayer(this, '${mediaSrc}')">▶</div>
                    <div class="voice-waveform">
                        ${Array(25).fill(0).map(() => `<div class="wave-bar" style="height:${10 + Math.random() * 80}%"></div>`).join('')}
                    </div>
                    <div class="message-meta">
                        <span class="message-time">${time}</span>
                        ${isOutgoing ? `<span class="message-status ${msg.is_read ? 'read' : ''}">${msg.is_read ? '✓✓' : '✓'}</span>` : ''}
                    </div>
                </div>
            ` : ''}
            ${msg.message_type === 'file' ? `
                <div class="message-file">
                    <div class="file-icon">📄</div>
                    <div class="file-info">
                        <div class="file-name">${escapeHtml(msg.file_name || 'Document')}</div>
                        <div class="file-size">${formatFileSize(msg.file_size)}</div>
                    </div>
                    <a href="${mediaSrc}" download="${escapeHtml(msg.file_name || 'file')}" class="file-download-btn ${mediaClass}-btn" data-msg-id="${msg.id}" onclick="event.stopPropagation()">⬇️</a>
                </div>
            ` : ''}
            ${displayContent ? `<div class="message-content">${displayContent}</div>` : ''}
            <div class="message-meta">
                <span class="message-time">${time}</span>
                ${isOutgoing ? `<span class="message-status ${msg.is_read ? 'read' : ''}">${msg.is_read ? '✓✓' : '✓'}</span>` : ''}
            </div>
        </div>
        ${renderReactions(msg)}
    </div>
`;
}

function renderReactions(msg) {
    if (!msg.reactions || msg.reactions.length === 0) return '';

    // Group reactions by emoji
    const groups = {};
    msg.reactions.forEach(r => {
        groups[r.reaction] = (groups[r.reaction] || 0) + 1;
    });

    let html = '<div class="message-reactions">';
    for (const [emoji, count] of Object.entries(groups)) {
        html += `<div class="reaction-item" title="${count} people reacted with ${emoji}">${emoji} ${count > 1 ? `<span class="reaction-count">${count}</span>` : ''}</div>`;
    }
    html += '</div>';
    return html;
}

function initReactionHandlers() {
    // Bubble interaction (Context menu & Long press)
    $$('.message-bubble').forEach(bubble => {
        const msgEl = bubble.closest('.message');
        const msgId = msgEl.dataset.id;
        const isOutgoing = msgEl.classList.contains('outgoing');

        bubble.oncontextmenu = (e) => {
            e.preventDefault();
            showMessageContextMenu(msgId, e.clientX, e.clientY, isOutgoing);
        };

        let pressTimer;
        bubble.ontouchstart = (e) => {
            pressTimer = setTimeout(() => {
                const touch = e.touches[0];
                showReactionPicker(msgId, touch.clientX, touch.clientY, isOutgoing);
            }, 600);
        };
        bubble.ontouchend = () => clearTimeout(pressTimer);
        bubble.ontouchmove = () => clearTimeout(pressTimer);
    });

    // Reaction list interaction
    $$('.message-reactions').forEach(list => {
        list.onclick = (e) => {
            e.stopPropagation();
            const msgId = list.closest('.message').dataset.id;
            const isOutgoing = list.closest('.message').classList.contains('outgoing');
            showReactionPicker(msgId, e.clientX, e.clientY, isOutgoing);
        };
    });
}

function showReactionPicker(messageId, x, y, isOutgoing) {
    $$('.reaction-picker').forEach(p => p.remove());

    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    const msg = (state.messages[state.activeConversation] || []).find(m => m.id === messageId);
    emojis.forEach(emoji => {
        const item = document.createElement('div');
        item.className = 'reaction-picker-item';
        item.textContent = emoji;

        const myReaction = msg?.reactions?.find(r => r.user_id === state.user.id);
        if (myReaction && myReaction.reaction === emoji) {
            item.classList.add('active');
        }

        item.onclick = (e) => {
            e.stopPropagation();
            if (myReaction && myReaction.reaction === emoji) {
                state.socket.emit('message:reaction:remove', { messageId, conversationId: state.activeConversation });
            } else {
                state.socket.emit('message:reaction', { messageId, conversationId: state.activeConversation, reaction: emoji });
            }
            picker.remove();
        };
        picker.appendChild(item);
    });

    document.body.appendChild(picker);

    // Position logic
    const pickerWidth = 260;
    const pickerHeight = 50;
    let finalX = isOutgoing ? x - pickerWidth : x;
    let finalY = y - pickerHeight - 20;

    // Viewport boundaries
    if (finalX < 10) finalX = 10;
    if (finalX + pickerWidth > window.innerWidth) finalX = window.innerWidth - pickerWidth - 10;
    if (finalY < 10) finalY = y + 20;

    picker.style.left = `${finalX}px`;
    picker.style.top = `${finalY}px`;

    const closePicker = (e) => {
        if (!picker.contains(e.target)) {
            picker.remove();
            document.removeEventListener('click', closePicker);
        }
    };
    setTimeout(() => document.addEventListener('click', closePicker), 10);
}

// ─── Send Message ───────────────────────────────────────────
async function sendMessage() {
    const input = $('message-input');
    const content = $('message-input').value.trim();
    if (!content && state.queuedFiles.length === 0) return;

    try {
        const convId = state.activeConversation;
        const replyToId = state.replyingTo ? state.replyingTo.id : null;

        if (state.queuedFiles.length > 0) {
            sendQueuedFiles(content, replyToId);
            return;
        }

        const conv = state.conversations.find(c => c.id === convId);
        if (!conv) return;

        let sendData = {
            conversationId: convId,
            replyTo: replyToId,
            messageType: 'text',
            ciphertext: content // fallback
        };

        await encryptTextForConversation(conv, convId, content, sendData);

        await emitWithAck('message:send', sendData);

        input.value = '';
        updateMessageInputUI();
        input.focus();
        cancelReply();
        state.socket.emit('typing:stop', { conversationId: convId });
    } catch (err) {
        showToast(`Failed to send message: ${err.message}`, true);
    }
}

function handleFilesSelected(files, autoSend = false) {
    if (!files || files.length === 0) return;

    for (const file of files) {
        if (file.size > 5 * 1024 * 1024 * 1024) {
            showToast(`File "${file.name}" too large (max 5GB)`, true);
            continue;
        }
        state.queuedFiles.push(file);
    }

    renderQueuedFiles();

    // If autoSend is true and input is empty, send immediately
    if (autoSend && $('message-input').value.trim() === '') {
        sendQueuedFiles();
    }
}

function renderQueuedFiles() {
    const list = $('preview-list');
    const container = $('multi-file-preview');
    const countLabel = $('preview-count');

    if (state.queuedFiles.length === 0) {
        container.classList.remove('active');
        return;
    }

    container.classList.add('active');
    countLabel.textContent = `${state.queuedFiles.length} file${state.queuedFiles.length > 1 ? 's' : ''} selected`;

    list.innerHTML = state.queuedFiles.map((file, index) => {
        const isImage = file.type.startsWith('image/');
        const url = isImage ? URL.createObjectURL(file) : '';
        return `
            <div class="preview-item">
                ${isImage ? `<img src="${url}" alt="preview">` : `<div class="file-icon">📄</div>`}
                <div class="remove-preview" onclick="removeQueuedFile(${index})">✕</div>
            </div>
        `;
    }).join('');
}

function removeQueuedFile(index) {
    state.queuedFiles.splice(index, 1);
    renderQueuedFiles();
    updateMessageInputUI();
}

function clearQueuedFiles() {
    state.queuedFiles = [];
    renderQueuedFiles();
    updateMessageInputUI();
    $('file-input').value = '';
}

function updateMessageInputUI() {
    const input = $('message-input');
    if (!input) return;

    // Auto resize
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';

    const hasContent = input.value.trim().length > 0 || state.queuedFiles.length > 0;
    const sendBtn = $('send-btn');
    const voiceBtn = $('voice-rec-btn');

    if (hasContent) {
        if (sendBtn) sendBtn.style.display = 'flex';
        if (voiceBtn) voiceBtn.style.display = 'none';
    } else {
        if (sendBtn) sendBtn.style.display = 'none';
        if (voiceBtn) voiceBtn.style.display = 'flex';
    }
}

async function sendQueuedFiles(caption = '', replyTo = null) {
    if (state.queuedFiles.length === 0 || !state.activeConversation) return;

    const convId = state.activeConversation;
    const filesToSend = [...state.queuedFiles];
    clearQueuedFiles();

    $('upload-progress').classList.add('active');

    for (let i = 0; i < filesToSend.length; i++) {
        const file = filesToSend[i];
        const pctBase = (i / filesToSend.length) * 100;
        const pctStep = 100 / filesToSend.length;

        try {
            const formData = new FormData();
            formData.append('file', file, file.name);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/upload');
            xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);

            const uploadPromise = new Promise((resolve, reject) => {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const filePct = (e.loaded / e.total) * pctStep;
                        $('upload-progress-bar').style.width = (pctBase + filePct) + '%';
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
                    else reject(new Error('Upload failed'));
                };
                xhr.onerror = () => reject(new Error('Upload failed'));
            });

            xhr.send(formData);
            const fileData = await uploadPromise;

            const payloadStr = JSON.stringify({ caption: i === 0 ? caption : '', fileKeyStore: null });
            const sendData = {
                conversationId: convId,
                replyTo: i === 0 ? replyTo : null,
                messageType: fileData.message_type,
                fileData: {
                    fileUrl: fileData.file_url,
                    fileName: fileData.file_name,
                    fileSize: fileData.file_size
                },
                ciphertext: payloadStr
            };

            rememberOutgoingPlaintext(convId, sendData, payloadStr);
            await emitWithAck('message:send', sendData);
        } catch (err) {
            showToast(`Failed to send "${file.name}": ${err.message}`, true);
        }
    }

    $('upload-progress').classList.remove('active');
    $('message-input').value = '';
    cancelReply();
}


// ─── Handle New Message ─────────────────────────────────────
async function handleNewMessage(message) {
    const convId = message.conversation_id;
    let conv = state.conversations.find(c => c.id === convId);
    let refreshedForMessage = false;

    if (!conv) {
        // Conversation not found in cache, reload list
        await loadConversations();
        refreshedForMessage = true;
        conv = state.conversations.find(c => c.id === convId);
    }

    if (!conv) return; // Still not found, ignore

    const remoteUserId = conv.type === 'private' ? conv.other_user?.id : null;
    message._decrypted = getRememberedOutgoingPlaintext(message) || message.ciphertext || message.content;

    // E2E decrypt if encrypted
    if (isEncryptedMessage(message) && message.message_type !== 'system' && state.e2eReady) {
        try {
            if (conv.type === 'group' && state.e2eKeys[convId]) {
                const groupKey = state.e2eKeys[convId];
                const aesKey = await window.crypto.subtle.importKey('raw', groupKey, 'AES-GCM', false, ['decrypt']);

                const binary = atob(message.iv);
                const iv = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) iv[i] = binary.charCodeAt(i);

                const cbin = atob(message.ciphertext);
                const cArr = new Uint8Array(cbin.length);
                for (let i = 0; i < cbin.length; i++) cArr[i] = cbin.charCodeAt(i);

                const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cArr.buffer);
                message._decrypted = new TextDecoder().decode(decrypted);

            } else if (remoteUserId && message.sender_id !== state.user.id) {
                // Double Ratchet Decrypt (only if it's not sent by us)
                if (!Signal.hasSession(remoteUserId)) {
                    const theirIk = conv.other_user.public_identity_key;
                    await Signal.initSessionAsResponder(remoteUserId, message.dh_pub, theirIk, null);
                }
                const header = { iv: message.iv, dhPub: message.dh_pub, messageNumber: message.message_number || 0 };
                message._decrypted = await Signal.ratchetDecrypt(remoteUserId, header, message.ciphertext);
            }
        } catch (e) {
            console.warn(e);
            message._decrypted = '🔒 Encrypted message';
        }
    }

    // Parse file payload JSON globally
    if (message.message_type !== 'text' && message.message_type !== 'system' && typeof message._decrypted === 'string') {
        try {
            const parsed = JSON.parse(message._decrypted);
            message._decrypted = parsed.caption || '';
            message._fileKeyStore = parsed.fileKeyStore;
        } catch (e) { }
    }

    // Add to messages array
    if (!state.messages[convId]) state.messages[convId] = [];
    message.reactions = [];
    state.messages[convId].push(message);

    // Update conversation list
    if (conv) {
        conv.last_message = isEncryptedMessage(message) ? '🔒 Encrypted' : message._decrypted;
        conv.last_message_encrypted = isEncryptedMessage(message);
        conv.last_message_id = message.id;
        conv.last_message_time = message.created_at;
        conv.last_message_sender = message.sender_id;
        conv.last_message_type = message.message_type;

        if (!refreshedForMessage && state.activeConversation !== convId && message.sender_id !== state.user.id) {
            conv.unread_count = Number(conv.unread_count || 0) + 1;
        }

        // Move to top
        const updatedConvIndex = state.conversations.findIndex(c => c.id === convId);
        if (updatedConvIndex > -1) {
            state.conversations.splice(updatedConvIndex, 1);
            state.conversations.unshift(conv);
        }
    } else {
        // New conversation, reload list
        loadConversations();
    }

    renderChatList();

    // Render message if active
    if (state.activeConversation === convId) {
        renderMessages(convId, true);
        state.socket.emit('message:read', { conversationId: convId });
    }

    // Desktop notification + sound for incoming messages
    if (message.sender_id !== state.user.id && (state.activeConversation !== convId || document.visibilityState === 'hidden')) {
        const notification = NotificationPrivacy.buildPrivateMessageNotification(message);

        // In-app notification ticker
        showNotificationTicker(notification.title, notification.body);

        // Play notification sound
        playNotificationSound();

        // Browser notification
        showBrowserNotification(notification.title, {
            body: notification.body,
            tag: convId
        }, () => openConversation(convId));
    }
}

function showNotificationTicker(senderName, preview) {
    const ticker = document.createElement('div');
    ticker.className = 'notification-ticker';
    ticker.innerHTML = `
    <div class="ticker-avatar" style="background:${getColor(senderName)}">${getInitials(senderName)}</div>
    <div class="ticker-content">
        <div class="ticker-sender">${escapeHtml(senderName)}</div>
        <div class="ticker-text">${escapeHtml(preview)}</div>
    </div>
    <button class="ticker-close" onclick="this.parentElement.remove()">✕</button>
`;
    document.body.appendChild(ticker);
    requestAnimationFrame(() => ticker.classList.add('show'));
    setTimeout(() => {
        ticker.classList.remove('show');
        setTimeout(() => ticker.remove(), 400);
    }, 4000);
}

function showBrowserNotification(title, options, onClick) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        const notif = new Notification(title, {
            icon: '💬',
            silent: true,
            ...options
        });
        notif.onclick = () => {
            window.focus();
            if (onClick) onClick();
            notif.close();
        };
        if (!options.requireInteraction) {
            setTimeout(() => notif.close(), 5000);
        }
    } catch (e) { }
}

// ─── Notification Sound ─────────────────────────────────────
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) { }
}

// ─── Typing Indicator ──────────────────────────────────────
function handleTypingIndicator(data) {
    if (data.conversationId !== state.activeConversation) return;
    if (data.userId === state.user.id) return;

    const statusEl = $('chat-status');
    if (data.typing) {
        statusEl.innerHTML = `<span class="typing">${escapeHtml(data.username)} is typing<span class="typing-dots"><span></span><span></span><span></span></span></span>`;
        statusEl.classList.add('typing');
    } else {
        statusEl.classList.remove('typing');
        const conv = state.conversations.find(c => c.id === state.activeConversation);
        if (conv?.type === 'private' && conv.other_user) {
            statusEl.textContent = state.onlineUsers.has(conv.other_user.id) ? 'online' : 'last seen recently';
        }
    }
}

// ─── Chat UI Init ───────────────────────────────────────────
function initChatUI() {
    if (isChatUIInitialized) return;
    isChatUIInitialized = true;

    // Send message
    $('send-btn').addEventListener('click', sendMessage);
    $('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Chat Search Buttons
    $('voice-call-btn')?.addEventListener('click', startVoiceCall);
    $('chat-search-btn')?.addEventListener('click', toggleChatSearch);
    $('chat-search-close')?.addEventListener('click', toggleChatSearch);
    $('chat-search-input')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterMessagesLocally(query);
    });

    initGameUI();
    initScribbleUI();

    // Reply Close
    $('reply-close-btn')?.addEventListener('click', cancelReply);

    // Voice recording
    const voiceBtn = $('voice-rec-btn');
    if (voiceBtn) {
        let pressTimer;
        const start = (e) => {
            e.preventDefault();
            pressTimer = setTimeout(startVoiceRecording, 500);
        };
        const stop = (e) => {
            e.preventDefault();
            clearTimeout(pressTimer);
            if (state.recording.active) stopVoiceRecording();
        };

        voiceBtn.addEventListener('mousedown', start);
        voiceBtn.addEventListener('mouseup', stop);
        voiceBtn.addEventListener('mouseleave', stop);
        voiceBtn.addEventListener('touchstart', start);
        voiceBtn.addEventListener('touchend', stop);
    }

    // Auto resize textarea
    $('message-input').addEventListener('input', () => {
        updateMessageInputUI();

        // Typing indicator
        if (state.activeConversation) {
            state.socket.emit('typing:start', { conversationId: state.activeConversation });
            clearTimeout(state.typingTimers[state.activeConversation]);
            state.typingTimers[state.activeConversation] = setTimeout(() => {
                state.socket.emit('typing:stop', { conversationId: state.activeConversation });
            }, 2000);
        }
    });

    // Sidebar Tabs
    // Global context menu for reactions
    document.addEventListener('contextmenu', (e) => {
        const reactions = e.target.closest('.message-reactions');
        if (reactions) {
            e.preventDefault();
            e.stopPropagation();
            const msg = reactions.closest('.message');
            if (msg) {
                const msgId = msg.dataset.id;
                const isOutgoing = msg.classList.contains('outgoing');
                showMessageContextMenu(msgId, e.clientX, e.clientY, isOutgoing);
            }
            return;
        }
    });

    $('nav-chats').onclick = () => switchSidebarView('chats');
    $('nav-status').onclick = () => switchSidebarView('status');

    // Status Feature
    $('view-status-manager-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const myIndex = statusUsers.findIndex(u => u.id === state.user.id);
        if (myIndex > -1) {
            openStatusViewer(myIndex);
            // Auto-open seen panel after a short delay for the viewer to initialize
            setTimeout(() => {
                openStatusSeenPanel();
            }, 100);
        }
    });

    $('add-status-plus-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        $('status-input')?.click();
    });
    $('add-status-text-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openTextStatusModal();
    });
    $('add-status-btn')?.addEventListener('click', () => {
        const myStatusUser = statusUsers.find(user => user.id === state.user.id);
        if (myStatusUser && myStatusUser.statuses.length > 0) {
            showMyStatusViewers();
        } else {
            $('status-input')?.click();
        }
    });

    $('status-delete-btn')?.addEventListener('click', () => {
        const user = statusUsers[currentStatusUserIndex];
        const status = user?.statuses?.[currentStatusIndex];
        if (status) confirmDeleteStatus(status.id);
    });

    $('change-status-bg')?.addEventListener('click', cycleStatusBg);
    $('post-text-status')?.addEventListener('click', postTextStatus);
    $('status-input')?.addEventListener('change', (e) => uploadStatus(e.target.files[0]));
    $('status-close')?.addEventListener('click', closeStatusViewer);
    $('status-prev')?.addEventListener('click', prevStatus);
    $('status-next')?.addEventListener('click', nextStatus);
    $('status-reply-send')?.addEventListener('click', sendStatusReply);
    $('status-reply-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendStatusReply();
        }
    });
    $('status-seen-btn')?.addEventListener('click', openStatusSeenPanel);
    $('status-seen-close')?.addEventListener('click', () => $('status-seen-panel')?.classList.remove('open'));

    // File attachment
    $('attach-btn').addEventListener('click', () => $('file-input').click());
    $('file-input').addEventListener('change', (e) => {
        handleFilesSelected(e.target.files);
    });

    $('clear-all-previews').addEventListener('click', clearQueuedFiles);

    // Paste Image Support
    $('message-input').addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        const files = [];
        for (const item of items) {
            if (item.kind === 'file') {
                files.push(item.getAsFile());
            }
        }
        if (files.length > 0) {
            handleFilesSelected(files, false); // Show preview first, don't auto-send
        }
    });

    // Drag and Drop Support
    const dragOverlay = $('drag-drop-overlay');

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (state.activeConversation) dragOverlay.classList.add('active');
    });

    dragOverlay.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragOverlay.classList.remove('active');
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragOverlay.classList.remove('active');
        if (state.activeConversation && e.dataTransfer.files.length > 0) {
            handleFilesSelected(e.dataTransfer.files, false); // Show preview first, don't auto-send
        }
    });

    // Search
    $('search-input').addEventListener('input', (e) => {
        renderChatList(e.target.value.trim());
    });

    // New Chat
    $('new-chat-btn').addEventListener('click', openNewChatModal);
    $('close-new-chat').addEventListener('click', () => $('new-chat-modal').classList.remove('active'));

    // New Group
    $('new-group-btn').addEventListener('click', openNewGroupModal);
    $('menu-new-group').addEventListener('click', () => { closeMenu(); openNewGroupModal(); });
    $('close-new-group').addEventListener('click', () => $('new-group-modal').classList.remove('active'));
    $('cancel-group-btn').addEventListener('click', () => $('new-group-modal').classList.remove('active'));
    $('create-group-btn').addEventListener('click', createGroup);

    // Profile
    $('menu-profile').addEventListener('click', () => { closeMenu(); openMyProfile(); });
    $('close-my-profile').addEventListener('click', () => $('my-profile-modal').classList.remove('active'));
    $('cancel-profile-btn').addEventListener('click', () => $('my-profile-modal').classList.remove('active'));
    $('save-profile-btn').addEventListener('click', saveProfile);

    // Logout
    $('menu-logout').addEventListener('click', () => { closeMenu(); logout(); });

    // Menu toggle
    $('menu-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = !$('main-menu').classList.contains('open');
        closeMenu();
        if (opening) $('main-menu').classList.add('open');
        $('menu-btn').setAttribute('aria-expanded', String(opening));
    });

    $('chat-menu-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = !$('chat-menu').classList.contains('open');
        closeMenu();
        if (opening) $('chat-menu').classList.add('open');
        $('chat-menu-btn').setAttribute('aria-expanded', String(opening));
    });

    // Close menus on click outside
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (event) => {
        const open = document.querySelector('.dropdown-menu.open');
        if (!open) return;
        if (event.key === 'Escape') {
            const trigger = open.parentElement.querySelector('[aria-controls]');
            closeMenu();
            trigger?.focus();
            event.preventDefault();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const items = [...open.querySelectorAll('[role="menuitem"]')];
            const current = items.indexOf(document.activeElement);
            const next = event.key === 'ArrowDown' ? (current + 1) % items.length : (current <= 0 ? items.length - 1 : current - 1);
            items[next]?.focus();
            event.preventDefault();
        }
    });

    // Chat header info (open profile panel)
    $('chat-header-info').addEventListener('click', openContactInfo);
    $('chat-header-info').querySelector('.chat-header-details').addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openContactInfo();
        }
    });
    $('chat-menu-info')?.addEventListener('click', () => { closeMenu(); openContactInfo(); });
    $('close-profile-panel').addEventListener('click', () => $('profile-panel').classList.remove('open'));

    // Back button (mobile)
    $('back-btn').addEventListener('click', closeChat);

    // Image viewer
    $('image-viewer').addEventListener('click', () => $('image-viewer').classList.remove('active'));
    $('close-image-viewer').addEventListener('click', () => $('image-viewer').classList.remove('active'));

    // Modal overlays close on click
    $$('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // Add member modal
    $('close-add-member').addEventListener('click', () => $('add-member-modal').classList.remove('active'));

    // New chat search
    $('new-chat-search').addEventListener('input', (e) => {
        renderNewChatUserList(e.target.value.trim());
    });

    // Group member search
    $('group-member-search').addEventListener('input', (e) => {
        renderGroupUserList(e.target.value.trim());
    });

    // Add member search
    $('add-member-search')?.addEventListener('input', (e) => {
        renderAddMemberUserList(e.target.value.trim());
    });

    // Emoji Picker Events
    initEmojiEvents();
    // Sticker Picker Events
    initStickerEvents();

    // Clear Chat
    const clearChatBtn = $('chat-menu-clear');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            closeMenu();
            clearChat(state.activeConversation);
        });
    }

    // Selection Mode
    $('chat-menu-select')?.addEventListener('click', () => {
        closeMenu();
        enterSelectionMode();
    });

    $('close-selection-btn')?.addEventListener('click', exitSelectionMode);
    $('forward-selected-btn')?.addEventListener('click', () => {
        if (state.selectedMessages.size === 0) return showToast('Select messages to forward', true);
        openForwardModal([...state.selectedMessages]);
    });
    $('delete-selected-btn')?.addEventListener('click', deleteSelectedMessages);
    $('close-forward-modal')?.addEventListener('click', () => $('forward-modal').classList.remove('active'));
    $('forward-search')?.addEventListener('input', (e) => renderForwardList(e.target.value.trim()));
    $('incoming-accept-btn')?.addEventListener('click', acceptIncomingCall);
    $('incoming-reject-btn')?.addEventListener('click', rejectIncomingCall);
    $('call-end-btn')?.addEventListener('click', () => endCurrentCall(true, 'hangup'));
    $('call-mute-btn')?.addEventListener('click', toggleMuteCall);
    $('request-mic-btn')?.addEventListener('click', requestMicPermission);
    initCallCardDragging();
}

async function clearChat(convId) {
    if (!convId) return;
    if (!confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) return;

    try {
        await apiCall('DELETE', `/api/conversations/${convId}/messages`);
        showToast('Chat cleared');
    } catch (err) {
        showToast('Failed to clear chat: ' + err.message, true);
    }
}

function closeMenu() {
    $$('.dropdown-menu').forEach(m => m.classList.remove('open'));
    $('menu-btn')?.setAttribute('aria-expanded', 'false');
    $('chat-menu-btn')?.setAttribute('aria-expanded', 'false');
}

// ─── Message Forwarding ─────────────────────────────────────
function getForwardableMessages(messageIds) {
    const msgs = state.messages[state.activeConversation] || [];
    return messageIds
        .map(id => msgs.find(m => m.id === id))
        .filter(msg => msg && msg.message_type !== 'system');
}

function openForwardModal(messageIds) {
    state.forwardingMessages = getForwardableMessages(messageIds);
    if (state.forwardingMessages.length === 0) return showToast('No forwardable messages selected', true);
    $('forward-modal').classList.add('active');
    $('forward-search').value = '';
    renderForwardList();
}

function renderForwardList(filter = '') {
    const list = $('forward-list');
    if (!list) return;
    let convs = state.conversations.filter(c => c.id !== state.activeConversation);
    if (filter) {
        const q = filter.toLowerCase();
        convs = convs.filter(c => (c.name || '').toLowerCase().includes(q));
    }

    if (convs.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">➡️</div><h4>No chats found</h4></div>';
        return;
    }

    list.innerHTML = convs.map(conv => `
        <div class="user-item" onclick="forwardMessagesToConversation('${conv.id}')">
            ${getAvatarHtml(conv, conv.id, conv.type === 'private' && state.onlineUsers.has(conv.other_user?.id), '', conv.type === 'group' ? 'group-avatar' : '')}
            <div class="user-item-info">
                <div class="user-item-name">${escapeHtml(conv.name || 'Chat')}</div>
                <div class="user-item-status">${conv.type === 'group' ? 'Group chat' : 'Private chat'}</div>
            </div>
        </div>
    `).join('');
}

async function forwardMessagesToConversation(conversationId) {
    const conv = state.conversations.find(c => c.id === conversationId);
    if (!conv || state.forwardingMessages.length === 0) return;

    try {
        for (const msg of state.forwardingMessages) {
            const content = getForwardContent(msg);
            const sendData = {
                conversationId,
                replyTo: null,
                messageType: msg.message_type || 'text',
                fileData: msg.file_url ? {
                    fileUrl: msg.file_url,
                    fileName: msg.file_name || '',
                    fileSize: msg.file_size || 0
                } : {},
                ciphertext: content
            };

            if (sendData.messageType === 'text') {
                await encryptTextForConversation(conv, conversationId, content, sendData);
            }

            await emitWithAck('message:send', sendData);
        }

        $('forward-modal').classList.remove('active');
        state.forwardingMessages = [];
        showToast('Message forwarded');
    } catch (err) {
        showToast('Forward failed: ' + err.message, true);
    }
}

function getForwardContent(msg) {
    const readable = typeof msg._decrypted === 'string' ? msg._decrypted : (msg.content || msg.ciphertext || '');
    if (msg.message_type === 'text') return readable;
    if (readable) return readable;
    return JSON.stringify({ caption: '', fileKeyStore: null });
}

function syncResponsiveLayout() {
    const mobile = window.matchMedia('(max-width: 900px)').matches;
    const chat = Boolean(state.activeConversation);
    document.querySelector('.app-wrapper')?.classList.toggle('mobile-chat',mobile && chat);
    $('chat-area')?.classList.toggle('active',mobile && chat);
    if($('back-btn'))$('back-btn').style.display = mobile && chat ? 'flex' : 'none';
}
window.addEventListener('resize',syncResponsiveLayout);

function emitLegacyGame(event, data) {
    const mapping={tictactoe:'game',dotsandboxes:'dotsGame',connectfour:'connectFour',rockpaperscissors:'rpsGame',retropong:'retroPong',stickfight:'stickFight'};
    const type=data.moveData?.gameType;
    const game=type?state[mapping[type]]:[state.game,state.dotsGame,state.connectFour,state.rpsGame,state.retroPong,state.stickFight].find(g=>g.active&&g.conversationId===data.conversationId);
    state.socket?.emit(event,{...data,sessionId:game?.sessionId});
}
function leaveLegacyGame(game,type){
    if(game.active&&game.sessionId)state.socket?.emit('game:leave',{conversationId:game.conversationId,gameType:type,sessionId:game.sessionId});
    game.sessionId=null;
}

function closeChat() {
    exitSelectionMode();
    state.activeConversation = null;
    $('welcome-screen').style.display = 'flex';
    $('active-chat').style.display = 'none';
    $('chat-area').classList.remove('active');
    syncResponsiveLayout();
    $('profile-panel').classList.remove('open');
    renderChatList();
    updateCallButton();
}

// ─── Voice Calls ────────────────────────────────────────────
const rtcConfig = { iceServers: [] };
const callSounds = CallSounds.createCallSoundManager();

function initializeCallSounds() {
    const unlock = () => callSounds.unlock();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
}

function getActivePrivateCallTarget() {
    const conv = state.conversations.find(c => c.id === state.activeConversation);
    if (!conv || conv.type !== 'private' || !conv.other_user) return null;
    return { conv, user: conv.other_user };
}

function updateCallButton() {
    const btn = $('voice-call-btn');
    if (!btn) return;
    const target = getActivePrivateCallTarget();
    btn.style.display = target ? 'flex' : 'none';
    btn.disabled = !target || state.call.active;
    btn.classList.toggle('active-call', state.call.active);
}

function resetCallState() {
    clearInterval(state.call.timer);
    callSounds.stop();
    state.call = {
        active: false,
        incoming: null,
        conversationId: null,
        targetUserId: null,
        peer: null,
        localStream: null,
        remoteStream: null,
        startedAt: null,
        timer: null,
        muted: false,
        makingOffer: false,
        connectedSoundPlayed: false
    };
    updateCallButton();
}

function setCallStatus(text) {
    const el = $('call-status');
    if (el) el.textContent = text;
}

function showCallOverlay(name, userId, status) {
    $('call-name').textContent = name || 'Voice call';
    $('call-status').textContent = status || 'Connecting...';
    $('call-timer').textContent = '00:00';
    setAvatarElement($('call-avatar'), { display_name: name || 'Voice call' }, userId || name || 'call');
    $('call-overlay').classList.add('active');
    restoreCallCardPosition();
}

function hideCallOverlay() {
    $('call-overlay')?.classList.remove('active');
    $('call-incoming')?.classList.remove('active');
}

function startCallTimer() {
    clearInterval(state.call.timer);
    state.call.startedAt = Date.now();
    state.call.timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.call.startedAt) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        $('call-timer').textContent = `${mins}:${secs}`;
    }, 1000);
}

function setCallCardPosition(left, top, save = false) {
    const overlay = $('call-overlay');
    if (!overlay) return;
    const maxLeft = Math.max(8, window.innerWidth - overlay.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - overlay.offsetHeight - 8);
    const safeLeft = Math.min(Math.max(8, left), maxLeft);
    const safeTop = Math.min(Math.max(8, top), maxTop);
    overlay.style.left = `${safeLeft}px`;
    overlay.style.top = `${safeTop}px`;
    overlay.style.right = 'auto';
    overlay.style.bottom = 'auto';
    if (save) {
        localStorage.setItem('messenger_call_card_position', JSON.stringify({ left: safeLeft, top: safeTop }));
    }
}

function restoreCallCardPosition() {
    const saved = localStorage.getItem('messenger_call_card_position');
    if (!saved) return;
    requestAnimationFrame(() => {
        try {
            const position = JSON.parse(saved);
            if (Number.isFinite(position.left) && Number.isFinite(position.top)) {
                setCallCardPosition(position.left, position.top);
            }
        } catch (e) {
            localStorage.removeItem('messenger_call_card_position');
        }
    });
}

function initCallCardDragging() {
    const overlay = $('call-overlay');
    const handle = $('call-drag-handle');
    if (!overlay || !handle) return;
    let dragOffset = null;

    handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const rect = overlay.getBoundingClientRect();
        dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
    });

    handle.addEventListener('pointermove', (event) => {
        if (!dragOffset) return;
        setCallCardPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y);
    });

    const finishDrag = (event) => {
        if (!dragOffset) return;
        const rect = overlay.getBoundingClientRect();
        dragOffset = null;
        setCallCardPosition(rect.left, rect.top, true);
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };

    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);
    window.addEventListener('resize', () => {
        if (!overlay.classList.contains('active')) return;
        const rect = overlay.getBoundingClientRect();
        setCallCardPosition(rect.left, rect.top, true);
    });
}

function markCallConnected() {
    setCallStatus('Connected');
    if (!state.call.connectedSoundPlayed) {
        state.call.connectedSoundPlayed = true;
        callSounds.playConnected();
    }
    if (!state.call.startedAt) startCallTimer();
}

async function getCallMedia() {
    // getUserMedia requires a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
        const httpsUrl = window.location.href.replace(/^http:/, 'https:').replace(/:3000/, ':3443');
        throw new Error(
            `Voice calls require HTTPS. Please open: ${httpsUrl}`
        );
    }
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Your browser does not support voice calls or microphone access.');
    }
    if (state.recording.active) throw new Error('Finish your voice recording before starting a call.');
    return AudioInput.openMicrophone(navigator.mediaDevices);
}

async function checkMicPermission() {
    const statusText = $('mic-permission-status')?.querySelector('.status-text');
    const grantBtn = $('request-mic-btn');
    if (!statusText || !grantBtn) return;

    // First check: is the page on a secure context?
    if (!window.isSecureContext) {
        const httpsUrl = window.location.href.replace(/^http:/, 'https:').replace(/:3000\b/, ':3443');
        statusText.textContent = `⚠️ Voice calls need HTTPS — open: ${httpsUrl}`;
        statusText.style.color = 'var(--warning, #f59e0b)';
        grantBtn.style.display = 'none';
        return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        statusText.textContent = 'Microphone: Not supported / Not secure';
        grantBtn.style.display = 'none';
        return;
    }

    try {
        // Use Permissions API if available (not in Safari for mic)
        if (navigator.permissions?.query) {
            const result = await navigator.permissions.query({ name: 'microphone' });
            updateMicUI(result.state);
            result.onchange = () => updateMicUI(result.state);
        } else {
            // Fallback for Safari/older browsers
            statusText.textContent = 'Microphone: Click Grant to enable';
            grantBtn.style.display = 'inline-block';
        }
    } catch (e) {
        statusText.textContent = 'Microphone: Click Grant to enable';
        grantBtn.style.display = 'inline-block';
    }
}

function updateMicUI(state) {
    const statusText = $('mic-permission-status')?.querySelector('.status-text');
    const grantBtn = $('request-mic-btn');
    if (!statusText || !grantBtn) return;

    if (state === 'granted') {
        statusText.textContent = 'Microphone: Access granted';
        statusText.style.color = 'var(--success)';
        grantBtn.style.display = 'none';
    } else if (state === 'denied') {
        statusText.textContent = 'Microphone: Access denied';
        statusText.style.color = 'var(--danger)';
        grantBtn.style.display = 'inline-block';
        grantBtn.textContent = 'Fix';
    } else {
        statusText.textContent = 'Microphone: Access required';
        grantBtn.style.display = 'inline-block';
        grantBtn.textContent = 'Grant';
    }
}

async function requestMicPermission() {
    try {
        const stream = await getCallMedia();
        // If successful, stop the tracks immediately
        stream.getTracks().forEach(track => track.stop());
        updateMicUI('granted');
        showToast('Microphone access granted');
    } catch (err) {
        showToast(err.message, true);
        updateMicUI('denied');
    }
}

function createPeerConnection(targetUserId, conversationId) {
    const peer = new RTCPeerConnection(rtcConfig);
    state.call.remoteStream = new MediaStream();
    $('remote-audio').srcObject = state.call.remoteStream;

    peer.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => state.call.remoteStream.addTrack(track));
        markCallConnected();
    };

    peer.onicecandidate = (event) => {
        if (event.candidate) {
            state.socket.emit('call:ice-candidate', {
                conversationId,
                targetUserId,
                candidate: event.candidate
            });
        }
    };

    peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') {
            markCallConnected();
        }
        if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
            if (state.call.active) endCurrentCall(peer.connectionState !== 'closed');
        }
    };

    state.call.localStream.getTracks().forEach(track => peer.addTrack(track, state.call.localStream));
    return peer;
}

async function startVoiceCall() {
    const target = getActivePrivateCallTarget();
    if (!target) return showToast('Voice calls are available in private chats only', true);
    if (state.call.active) return showToast('A call is already active', true);

    // Guard: must be on HTTPS (or localhost) for getUserMedia to work
    if (!window.isSecureContext) {
        const httpsUrl = window.location.href.replace(/^http:/, 'https:').replace(/:3000(\b|$)/, ':3443');
        showToast(`Voice calls need HTTPS. Click: ${httpsUrl}`, true, 8000);
        return;
    }

    try {
        state.call.active = true;
        state.call.conversationId = target.conv.id;
        state.call.targetUserId = target.user.id;
        showCallOverlay(target.user.display_name, target.user.id, 'Calling...');

        const callConversationId = target.conv.id;
        const stream = await getCallMedia();
        if (!state.call.active || state.call.conversationId !== callConversationId) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }
        state.call.localStream = stream;
        state.call.peer = createPeerConnection(target.user.id, target.conv.id);
        state.call.makingOffer = true;
        const offer = await state.call.peer.createOffer();
        await state.call.peer.setLocalDescription(offer);
        state.socket.emit('call:offer', {
            conversationId: target.conv.id,
            targetUserId: target.user.id,
            offer
        }, (res) => {
            if (res?.error) {
                showToast(res.error, true);
                endCurrentCall(false);
            }
        });
        setCallStatus('Ringing...');
        callSounds.playOutgoing();
    } catch (err) {
        showToast(err.message || 'Could not start voice call', true);
        endCurrentCall(false);
    } finally {
        state.call.makingOffer = false;
    }
}

async function handleIncomingCallOffer(data) {
    let conv = state.conversations.find(c => c.id === data.conversationId);
    if (!conv) {
        await loadConversations();
        conv = state.conversations.find(c => c.id === data.conversationId);
    }
    if (!conv || conv.type !== 'private') return;

    if (state.call.active) {
        state.socket.emit('call:reject', {
            conversationId: data.conversationId,
            targetUserId: data.fromUserId,
            reason: 'busy'
        });
        return;
    }

    const caller = conv.other_user?.id === data.fromUserId ? conv.other_user : { id: data.fromUserId, display_name: data.fromUsername || 'Someone' };
    state.call.incoming = { ...data, caller };
    $('incoming-call-name').textContent = `${caller.display_name || data.fromUsername || 'Someone'} is calling`;
    $('incoming-call-status').textContent = 'Ringing...';
    $('call-incoming').classList.add('active');
    callSounds.playIncoming();

    // Browser notification for call
    showBrowserNotification(`${caller.display_name || data.fromUsername || 'Someone'} is calling`, {
        body: 'Click to answer',
        tag: 'incoming-call',
        requireInteraction: true
    }, () => {
        $('call-incoming').classList.add('active');
    });
}

async function acceptIncomingCall() {
    const incoming = state.call.incoming;
    if (!incoming) return;

    try {
        callSounds.stop();
        state.call.active = true;
        state.call.conversationId = incoming.conversationId;
        state.call.targetUserId = incoming.fromUserId;
        state.call.localStream = await getCallMedia();
        $('call-incoming').classList.remove('active');
        showCallOverlay(incoming.caller?.display_name || incoming.fromUsername, incoming.fromUserId, 'Connecting...');

        state.call.peer = createPeerConnection(incoming.fromUserId, incoming.conversationId);
        await state.call.peer.setRemoteDescription(new RTCSessionDescription(incoming.offer));
        const answer = await state.call.peer.createAnswer();
        await state.call.peer.setLocalDescription(answer);
        state.socket.emit('call:answer', {
            conversationId: incoming.conversationId,
            targetUserId: incoming.fromUserId,
            answer
        });
        state.call.incoming = null;
    } catch (err) {
        showToast(err.message || 'Could not answer call', true);
        rejectIncomingCall();
    }
}

function rejectIncomingCall() {
    const incoming = state.call.incoming;
    if (incoming) {
        state.socket.emit('call:reject', {
            conversationId: incoming.conversationId,
            targetUserId: incoming.fromUserId,
            reason: 'declined'
        });
    }
    $('call-incoming').classList.remove('active');
    resetCallState();
}

async function handleCallAnswer(data) {
    if (!state.call.peer || data.conversationId !== state.call.conversationId) return;
    await state.call.peer.setRemoteDescription(new RTCSessionDescription(data.answer));
    markCallConnected();
}

async function handleCallIceCandidate(data) {
    if (!state.call.peer || data.conversationId !== state.call.conversationId || !data.candidate) return;
    try {
        await state.call.peer.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
        console.warn('Failed to add ICE candidate', err);
    }
}

function handleCallRejected(data) {
    if (data.conversationId !== state.call.conversationId) return;
    showToast(data.reason === 'busy' ? 'User is busy on another call' : 'Call declined');
    endCurrentCall(false, 'declined');
}

function handleRemoteCallEnded(data) {
    const isActiveCall = data.conversationId === state.call.conversationId;
    const isIncomingCall = data.conversationId === state.call.incoming?.conversationId;
    if (!isActiveCall && !isIncomingCall) return;
    showToast('Call ended');
    endCurrentCall(false, 'ended');
}

function endCurrentCall(notifyPeer = true, completionTone = null) {
    const { peer, localStream, remoteStream, conversationId, targetUserId, active } = state.call;
    if (notifyPeer && active && conversationId && targetUserId && state.socket?.connected) {
        state.socket.emit('call:end', { conversationId, targetUserId });
    }
    peer?.close();
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    const audio = $('remote-audio');
    if (audio) audio.srcObject = null;
    hideCallOverlay();
    resetCallState();
    if (completionTone === 'hangup') callSounds.playHangup();
    if (completionTone === 'ended') callSounds.playEnded();
    if (completionTone === 'declined') callSounds.playDeclined();
}

function toggleMuteCall() {
    if (!state.call.localStream) return;
    state.call.muted = !state.call.muted;
    state.call.localStream.getAudioTracks().forEach(track => {
        track.enabled = !state.call.muted;
    });
    $('call-mute-btn').classList.toggle('muted', state.call.muted);
    $('call-mute-btn').title = state.call.muted ? 'Unmute microphone' : 'Mute microphone';
}

// ─── Selection Mode Functions ───────────────────────────────
function enterSelectionMode() {
    state.isSelectionMode = true;
    state.selectedMessages.clear();
    $('selection-bar').style.display = 'flex';
    $('selection-count').textContent = '0 selected';
    renderMessages(state.activeConversation, false);
}

function exitSelectionMode() {
    state.isSelectionMode = false;
    state.selectedMessages.clear();
    $('selection-bar').style.display = 'none';
    if (state.activeConversation) {
        renderMessages(state.activeConversation, false);
    }
}

function toggleMessageSelection(messageId) {
    if (!state.isSelectionMode) return;

    if (state.selectedMessages.has(messageId)) {
        state.selectedMessages.delete(messageId);
    } else {
        state.selectedMessages.add(messageId);
    }

    $('selection-count').textContent = `${state.selectedMessages.size} selected`;

    // Update the UI for this specific message without full re-render
    const el = document.querySelector(`.message[data-id="${messageId}"]`);
    if (el) {
        el.classList.toggle('selected');
    }
}

async function deleteSelectedMessages() {
    if (state.selectedMessages.size === 0) return;

    const count = state.selectedMessages.size;
    if (!confirm(`Delete ${count} message${count > 1 ? 's' : ''} for everyone?`)) return;

    const messageIds = Array.from(state.selectedMessages);

    try {
        // We can either emit multiple deletes or a bulk delete
        // Let's emit multiple for now as the server already handles it, 
        // or add a bulk delete event to the server.
        // Actually, let's just use the existing message:delete in a loop for simplicity,
        // but it's better to add bulk delete to server.

        messageIds.forEach(id => {
            state.socket.emit('message:delete', { messageId: id, conversationId: state.activeConversation });
        });

        exitSelectionMode();
        showToast(`${count} message${count > 1 ? 's' : ''} deleted`);
    } catch (err) {
        showToast('Failed to delete messages', true);
    }
}

// ─── New Chat Modal ─────────────────────────────────────────
let allUsers = [];

async function openNewChatModal() {
    $('new-chat-modal').classList.add('active');
    $('new-chat-search').value = '';
    try {
        allUsers = await apiCall('GET', '/api/users');
        renderNewChatUserList();
    } catch (err) {
        showToast('Failed to load users', true);
    }
}

function renderNewChatUserList(filter = '') {
    const list = $('new-chat-user-list');
    let users = allUsers;
    if (filter) {
        const q = filter.toLowerCase();
        users = users.filter(u => u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    }

    if (users.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👤</div><h4>No users found</h4></div>';
        return;
    }

    list.innerHTML = users.map(u => `
    <div class="user-item" onclick="startPrivateChat('${u.id}')">
        ${getAvatarHtml(u, u.id, state.onlineUsers.has(u.id))}
        <div class="user-item-info">
            <div class="user-item-name">${escapeHtml(u.display_name)}</div>
            <div class="user-item-status">${escapeHtml(u.status || u.username)}</div>
        </div>
    </div>
`).join('');
}

async function startPrivateChat(userId) {
    try {
        const conv = await getOrCreatePrivateConversation(userId);
        $('new-chat-modal').classList.remove('active');
        openConversation(conv.id);
    } catch (err) {
        showToast('Failed to start chat: ' + err.message, true);
    }
}

// ─── New Group Modal ────────────────────────────────────────
async function openNewGroupModal() {
    $('new-group-modal').classList.add('active');
    $('group-name-input').value = '';
    $('group-member-search').value = '';
    state.selectedGroupMembers.clear();
    renderSelectedTags();

    try {
        allUsers = await apiCall('GET', '/api/users');
        renderGroupUserList();
    } catch (err) {
        showToast('Failed to load users', true);
    }
}

function renderGroupUserList(filter = '') {
    const list = $('group-user-list');
    let users = allUsers;
    if (filter) {
        const q = filter.toLowerCase();
        users = users.filter(u => u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    }

    list.innerHTML = users.map(u => `
    <div class="user-item${state.selectedGroupMembers.has(u.id) ? ' selected' : ''}" onclick="toggleGroupMember('${u.id}', '${escapeHtml(u.display_name)}')">
        ${getAvatarHtml(u, u.id, false)}
        <div class="user-item-info">
            <div class="user-item-name">${escapeHtml(u.display_name)}</div>
            <div class="user-item-status">@${escapeHtml(u.username)}</div>
        </div>
        <div class="checkbox"></div>
    </div>
`).join('');
}

function toggleGroupMember(userId, name) {
    if (state.selectedGroupMembers.has(userId)) {
        state.selectedGroupMembers.delete(userId);
    } else {
        state.selectedGroupMembers.add(userId);
    }
    renderSelectedTags();
    renderGroupUserList($('group-member-search').value.trim());
}

function renderSelectedTags() {
    const container = $('selected-members-tags');
    const tags = [];
    state.selectedGroupMembers.forEach(id => {
        const user = allUsers.find(u => u.id === id);
        if (user) {
            tags.push(`
            <div class="selected-tag">
                ${escapeHtml(user.display_name)}
                <span class="remove-tag" onclick="event.stopPropagation(); toggleGroupMember('${id}', '')">✕</span>
            </div>`);
        }
    });
    container.innerHTML = tags.join('');
}

async function createGroup() {
    const name = $('group-name-input').value.trim();
    if (!name) return showToast('Please enter a group name', true);
    if (state.selectedGroupMembers.size === 0) return showToast('Please select at least one member', true);

    try {
        $('create-group-btn').textContent = 'Creating...';
        $('create-group-btn').disabled = true;

        const conv = await apiCall('POST', '/api/groups', {
            name,
            memberIds: [...state.selectedGroupMembers]
        });

        $('new-group-modal').classList.remove('active');

        const existingIndex = state.conversations.findIndex(c => c.id === conv.id);
        if (existingIndex > -1) {
            state.conversations[existingIndex] = conv;
        } else {
            state.conversations.unshift(conv);
        }

        renderChatList();
        openConversation(conv.id);
        showToast(`Group "${name}" created!`);
    } catch (err) {
        showToast('Failed to create group: ' + err.message, true);
    } finally {
        $('create-group-btn').textContent = 'Create Group';
        $('create-group-btn').disabled = false;
    }
}

// ─── Contact / Group Info Panel ─────────────────────────────
async function openContactInfo() {
    const conv = state.conversations.find(c => c.id === state.activeConversation);
    if (!conv) return;

    const panel = $('profile-panel');
    const body = $('profile-panel-body');
    panel.dataset.conversationId = conv.id;

    if (conv.type === 'private') {
        $('profile-panel-title').textContent = 'Contact Info';
        const user = conv.other_user;
        if (!user) return;

        body.innerHTML = `
        <div class="profile-avatar-section contact-hero">
            <span class="contact-type-label">CONTACT</span>
            <div class="contact-avatar-ring">${getAvatarHtml(user, user.id, false)}</div>
            <h2>${escapeHtml(user.display_name)}</h2>
            <p class="contact-handle">@${escapeHtml(user.username)}</p>
            <div class="contact-presence-chip${state.onlineUsers.has(user.id) ? ' is-online' : ''}" id="contact-presence-chip"><span></span><b>${state.onlineUsers.has(user.id) ? 'Online now' : 'Offline'}</b></div>
        </div>
        <div class="profile-section contact-about-card">
            <div class="profile-section-label"><span data-ui-icon="chat"></span>About</div>
            <div class="profile-section-value">${escapeHtml(user.status || 'Hey there!')}</div>
        </div>
        <div class="profile-section contact-availability-card">
            <div class="profile-section-label"><span data-ui-icon="status"></span>Availability</div>
            <div class="profile-section-value" id="contact-presence-detail">${state.onlineUsers.has(user.id) ? 'Available on LAN Messenger' : escapeHtml(formatLastSeen(user.last_seen))}</div>
        </div>
        <div class="contact-panel-footer">LAN Messenger<span>Contact details</span></div>`;
    } else {
        $('profile-panel-title').textContent = 'Group Info';
        try {
            const members = await apiCall('GET', `/api/conversations/${conv.id}/members`);
            body.innerHTML = `
            <div class="profile-avatar-section contact-hero">
                <span class="contact-type-label">GROUP</span>
                <div class="contact-avatar-ring">${getAvatarHtml(conv, conv.id, false, '', 'group-avatar')}</div>
                <h2>${escapeHtml(conv.name)}</h2>
                <p class="contact-handle">${members.length} members</p>
            </div>
            <div class="profile-section">
                <div class="profile-section-label"><span data-ui-icon="info"></span>About this group</div>
                <div class="profile-section-value">Group created on ${new Date(conv.created_at + 'Z').toLocaleDateString()}</div>
            </div>
            <div class="group-members-section">
                <div class="group-members-header">
                    <span>${members.length} members</span>
                    ${conv.created_by === state.user.id ? '<button class="btn btn-secondary" onclick="openAddMemberModal()" style="padding:6px 12px;font-size:12px;">+ Add</button>' : ''}
                </div>
                ${members.map(m => `
                    <div class="member-item">
                        ${getAvatarHtml(m, m.id, state.onlineUsers.has(m.id))}
                        <div class="member-item-info">
                            <div class="member-item-name">${escapeHtml(m.display_name)}${m.id === state.user.id ? ' (You)' : ''}</div>
                            <div class="member-item-role${m.role === 'admin' ? ' is-admin' : ''}">${m.role === 'admin' ? 'Admin' : 'Member'}</div>
                        </div>
                        ${(conv.created_by === state.user.id && m.id !== state.user.id) ? `<button class="remove-member" onclick="removeMemberFromGroup('${conv.id}', '${m.id}')" title="Remove member">✕</button>` : ''}
                    </div>
                `).join('')}
            </div>`;
        } catch (err) {
            body.innerHTML = '<p style="color:var(--text-muted);">Failed to load group info</p>';
        }
    }

    panel.classList.add('open');
}

// ─── Add Member to Group ────────────────────────────────────
async function openAddMemberModal() {
    $('add-member-modal').classList.add('active');
    $('add-member-search').value = '';
    try {
        const members = await apiCall('GET', `/api/conversations/${state.activeConversation}/members`);
        const memberIds = new Set(members.map(m => m.id));
        allUsers = (await apiCall('GET', '/api/users')).filter(u => !memberIds.has(u.id));
        renderAddMemberUserList();
    } catch (err) {
        showToast('Failed to load users', true);
    }
}

function renderAddMemberUserList(filter = '') {
    const list = $('add-member-user-list');
    let users = allUsers;
    if (filter) {
        const q = filter.toLowerCase();
        users = users.filter(u => u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    }

    if (users.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👤</div><h4>No users to add</h4></div>';
        return;
    }

    list.innerHTML = users.map(u => `
    <div class="user-item" onclick="addMemberToGroup('${u.id}')">
        ${getAvatarHtml(u, u.id, false)}
        <div class="user-item-info">
            <div class="user-item-name">${escapeHtml(u.display_name)}</div>
            <div class="user-item-status">@${escapeHtml(u.username)}</div>
        </div>
    </div>
`).join('');
}

async function addMemberToGroup(userId) {
    try {
        await apiCall('POST', `/api/groups/${state.activeConversation}/members`, { userId });
        $('add-member-modal').classList.remove('active');
        showToast('Member added');
        openContactInfo(); // refresh
    } catch (err) {
        showToast('Failed to add member: ' + err.message, true);
    }
}

async function removeMemberFromGroup(convId, userId) {
    if (!confirm('Remove this member from the group?')) return;
    try {
        await apiCall('DELETE', `/api/groups/${convId}/members/${userId}`);
        showToast('Member removed');
        openContactInfo(); // refresh
    } catch (err) {
        showToast('Failed to remove member: ' + err.message, true);
    }
}

// ─── My Profile ─────────────────────────────────────────────
let tempProfileAvatarUrl = '';

function openMyProfile() {
    $('my-profile-modal').classList.add('active');
    $('my-display-name').value = state.user.display_name;
    $('my-status').value = state.user.status || '';
    tempProfileAvatarUrl = state.user.avatar || '';
    setAvatarElement($('my-profile-avatar'), state.user, state.user.id);
    checkMicPermission();
}

// Attach avatar upload listener once
if ($('my-profile-avatar') && !$('my-profile-avatar').dataset.bound) {
    $('my-profile-avatar').dataset.bound = 'true';
    $('my-profile-avatar').addEventListener('click', () => $('my-profile-avatar-input').click());
    $('my-profile-avatar-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(API + '/api/upload', { method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${state.token}` } });
            const data = await res.json();
            if (res.ok && data.file_url) {
                tempProfileAvatarUrl = data.file_url;
                setAvatarElement($('my-profile-avatar'), { display_name: state.user.display_name, avatar: tempProfileAvatarUrl }, state.user.id);
            }
        } catch (err) {
            showToast('Failed to upload image', true);
        }
    });
}

async function saveProfile() {
    const displayName = $('my-display-name').value.trim();
    const status = $('my-status').value.trim();
    if (!displayName) return showToast('Display name is required', true);

    try {
        $('save-profile-btn').textContent = 'Saving...';
        $('save-profile-btn').disabled = true;
        const updatedUser = await apiCall('PUT', '/api/users/profile', { displayName, status, avatar: tempProfileAvatarUrl });
        state.user.display_name = updatedUser.display_name;
        state.user.status = updatedUser.status;
        state.user.avatar = updatedUser.avatar;
        localStorage.setItem('messenger_session', JSON.stringify({ user: state.user, token: state.token }));
        $('sidebar-user-name').textContent = state.user.display_name;
        setAvatarElement($('sidebar-avatar'), state.user, state.user.id);
        $('my-profile-modal').classList.remove('active');
        showToast('Profile updated!');
    } catch (err) {
        showToast('Failed to update profile: ' + err.message, true);
    } finally {
        $('save-profile-btn').textContent = 'Save';
        $('save-profile-btn').disabled = false;
    }
}

// ─── Media Viewers ──────────────────────────────────────────
function viewImage(url) {
    // Hide video, show image
    $('image-viewer-img').style.display = 'block';
    const vid = document.getElementById('image-viewer-video');
    if (vid) { vid.style.display = 'none'; vid.pause(); vid.src = ''; }
    $('image-viewer-img').src = url;
    $('image-viewer').classList.add('active');
}

function openVideoViewer(url) {
    // Hide image, show video
    $('image-viewer-img').style.display = 'none';
    let vid = document.getElementById('image-viewer-video');
    if (!vid) {
        vid = document.createElement('video');
        vid.id = 'image-viewer-video';
        vid.controls = true;
        vid.autoplay = true;
        vid.style.maxWidth = '90%';
        vid.style.maxHeight = '90%';
        vid.style.borderRadius = '8px';
        vid.style.outline = 'none';
        vid.onclick = (e) => e.stopPropagation();
        $('image-viewer').appendChild(vid);
    }
    vid.style.display = 'block';
    vid.src = url;
    vid.play().catch(() => { });
    $('image-viewer').classList.add('active');
}

// ─── Emoji Picker ───────────────────────────────────────────
// ─── Sticker Picker ─────────────────────────────────────────
function initStickerEvents() {
    const toggleBtn = $('sticker-toggle-btn');
    const picker = $('sticker-picker');
    if (!toggleBtn || !picker) return;

    // Render all pack tabs
    const tabBar = $('sticker-tab-bar');
    const allPacks = [...IMAGE_STICKER_PACKS];
    tabBar.innerHTML = allPacks.map((pack, i) =>
        `<button class="sticker-tab-btn${i === 0 ? ' active' : ''}" data-pack="${pack.id}" title="${pack.name}">${pack.icon} ${pack.name}</button>`
    ).join('');

    // Pre-render all stickers
    const body = $('sticker-picker-body');
    const allStickersHtml = [];
    allPacks.forEach(pack => {
        const isImagePack = IMAGE_STICKER_PACKS.some(p => p.id === pack.id);
        pack.stickers.forEach(s => {
            if (isImagePack) {
                allStickersHtml.push(`
            <div class="sticker-item" data-pack="${pack.id}" data-sticker="${s.id}" data-type="image" title="${escapeHtml(s.label)}">
                <img class="sticker-img-display" src="${escapeHtml(s.src)}" alt="${escapeHtml(s.label)}">
                <span class="sticker-label">${escapeHtml(s.label)}</span>
            </div>`);
            } else {
                allStickersHtml.push(`
            <div class="sticker-item" data-pack="${pack.id}" data-sticker="${s.id}" data-type="emoji" title="${escapeHtml(s.label)}">
                <span class="sticker-emoji-display">${s.emoji}</span>
                <span class="sticker-label">${escapeHtml(s.label)}</span>
            </div>`);
            }
        });
    });
    if (body) body.innerHTML = allStickersHtml.join('');

    // Initial render
    renderStickerGrid(allPacks[0].id);

    // Toggle picker
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        picker.classList.toggle('open');
        toggleBtn.classList.toggle('active');
        // Close emoji picker if open
        if (picker.classList.contains('open')) {
            $('emoji-picker')?.classList.remove('open');
            $('emoji-toggle-btn')?.classList.remove('active');
        }
    });

    // Tab switching
    tabBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.sticker-tab-btn');
        if (!btn) return;
        $$('.sticker-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderStickerGrid(btn.dataset.pack);
    });

    // Sticker click in grid
    $('sticker-picker-body').addEventListener('click', (e) => {
        const item = e.target.closest('.sticker-item');
        if (!item) return;
        const packId = item.dataset.pack;
        const stickerId = item.dataset.sticker;
        const stickerType = item.dataset.type;
        sendSticker(packId, stickerId, stickerType);
        picker.classList.remove('open');
        toggleBtn.classList.remove('active');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && e.target !== toggleBtn) {
            picker.classList.remove('open');
            toggleBtn.classList.remove('active');
        }
    });
}

function renderStickerGrid(packId) {
    const body = $('sticker-picker-body');
    if (!body) return;
    const items = body.querySelectorAll('.sticker-item');
    items.forEach(item => {
        if (item.dataset.pack === packId) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

async function sendSticker(packId, stickerId, stickerType) {
    if (!state.activeConversation) return;
    const prefix = stickerType === 'image' ? '__IMGSTICKER__' : '__STICKER__';
    const content = `${prefix}:${packId}:${stickerId}`;
    const convId = state.activeConversation;
    const conv = state.conversations.find(c => c.id === convId);
    if (!conv) return;

    let sendData = {
        conversationId: convId,
        replyTo: null,
        messageType: 'text',
        ciphertext: content
    };

    try {
        await encryptTextForConversation(conv, convId, content, sendData);
        await emitWithAck('message:send', sendData);
    } catch (err) {
        showToast(`Failed to send sticker: ${err.message}`, true);
    }
}

function initEmojiEvents() {
    const toggleBtn = $('emoji-toggle-btn');
    const picker = $('emoji-picker');
    const searchInput = $('emoji-search');
    const categories = $('emoji-categories');
    const messageInput = $('message-input');

    if (!toggleBtn || !picker) return;

    // Toggle picker
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        picker.classList.toggle('open');
        toggleBtn.classList.toggle('active');
        if (picker.classList.contains('open')) {
            // Close sticker picker
            $('sticker-picker')?.classList.remove('open');
            $('sticker-toggle-btn')?.classList.remove('active');
            renderEmojiGrid('smileys');
            loadRecentEmojis();
            searchInput.focus();
        }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && e.target !== toggleBtn) {
            picker.classList.remove('open');
            toggleBtn.classList.remove('active');
        }
    });

    // Switch categories
    categories.addEventListener('click', (e) => {
        const btn = e.target.closest('.emoji-cat-btn');
        if (!btn) return;

        $$('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const cat = btn.dataset.category;
        renderEmojiGrid(cat);

        // Scroll body to top
        $('emoji-picker-body').scrollTop = 0;
    });

    // Search emojis
    searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length > 0) {
            renderEmojiSearch(q);
        } else {
            const activeCats = $$('.emoji-cat-btn.active');
            const activeCat = activeCats.length > 0 ? activeCats[0].dataset.category : 'smileys';
            renderEmojiGrid(activeCat);
        }
    });

    // Insert emoji on click
    $('emoji-picker-body').addEventListener('click', (e) => {
        const btn = e.target.closest('.emoji-item');
        if (!btn) return;

        const emoji = btn.textContent;
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const text = messageInput.value;

        messageInput.value = text.substring(0, start) + emoji + text.substring(end);
        messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
        messageInput.focus();

        saveRecentEmoji(emoji);

        // Auto-resize textarea
        messageInput.dispatchEvent(new Event('input'));
    });

    // Recent emojis insert
    $('emoji-recent').addEventListener('click', (e) => {
        const btn = e.target.closest('.emoji-item');
        if (!btn) return;
        const emoji = btn.textContent;
        const start = messageInput.selectionStart;
        messageInput.value = messageInput.value.substring(0, start) + emoji + messageInput.value.substring(messageInput.selectionEnd);
        messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
        messageInput.focus();
        messageInput.dispatchEvent(new Event('input'));
    });
}

function renderEmojiGrid(category) {
    const grid = $('emoji-grid');
    const label = $('emoji-category-label');
    const emojis = EMOJI_DATA[category] || [];

    const categoryNames = {
        smileys: 'Smileys & Emotion',
        people: 'People & Body',
        animals: 'Animals & Nature',
        food: 'Food & Drink',
        travel: 'Travel & Places',
        activities: 'Activities',
        objects: 'Objects',
        symbols: 'Symbols',
        flags: 'Flags'
    };

    label.textContent = categoryNames[category] || category;
    grid.innerHTML = emojis.map(emoji => `
    <button class="emoji-item" title="${emoji}">${emoji}</button>
`).join('');
}

function renderEmojiSearch(query) {
    const grid = $('emoji-grid');
    const label = $('emoji-category-label');
    label.textContent = 'Search Results';

    const results = [];
    for (const cat in EMOJI_DATA) {
        results.push(...EMOJI_DATA[cat].filter(e => e.includes(query) || query === ''));
    }

    if (results.length === 0) {
        grid.innerHTML = `
        <div class="emoji-no-results">
            <div class="emoji-no-icon">😕</div>
            <p>No results found</p>
        </div>`;
    } else {
        grid.innerHTML = results.slice(0, 80).map(emoji => `
        <button class="emoji-item" title="${emoji}">${emoji}</button>
    `).join('');
    }
}

function saveRecentEmoji(emoji) {
    let recent = JSON.parse(localStorage.getItem('recent_emojis') || '[]');
    recent = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 16);
    localStorage.setItem('recent_emojis', JSON.stringify(recent));
    loadRecentEmojis();
}

function loadRecentEmojis() {
    const container = $('emoji-recent');
    const recent = JSON.parse(localStorage.getItem('recent_emojis') || '[]');
    if (recent.length === 0) {
        $('emoji-recent-label').style.display = 'none';
        container.innerHTML = '';
        return;
    }
    $('emoji-recent-label').style.display = 'block';
    container.innerHTML = recent.map(emoji => `
    <button class="emoji-item" title="${emoji}">${emoji}</button>
`).join('');
}

// ─── Reply & Delete & Search Helpers ───────────────────────
function setReply(msgId) {
    const messages = state.messages[state.activeConversation] || [];
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    state.replyingTo = msg;
    $('reply-sender-name').textContent = msg.sender_name || 'User';

    // Get snippet of content
    let text = msg._decrypted || msg.content || '';
    if (msg.message_type === 'image') text = '📷 Image';
    if (msg.message_type === 'file') text = '📄 File: ' + (msg.file_name || '');

    $('reply-msg-text').textContent = text;
    $('reply-preview-bar').classList.add('active');
    $('message-input').focus();
}

function cancelReply() {
    state.replyingTo = null;
    $('reply-preview-bar')?.classList.remove('active');
}

function socketDeleteMessage(msgId) {
    state.socket.emit('message:delete', {
        messageId: msgId,
        conversationId: state.activeConversation
    });
}

function toggleChatSearch() {
    const container = $('chat-search-container');
    const headerInfo = $('chat-header-info');
    const headerActions = headerInfo.parentElement.querySelector('.header-actions');
    const avatar = $('chat-avatar');
    const details = headerInfo.querySelector('.chat-header-details');

    if (container.style.display === 'none') {
        state.isSearchActive = true;
        container.style.display = 'flex';
        if (avatar) avatar.style.display = 'none';
        if (details) details.style.display = 'none';
        if (headerActions) headerActions.style.display = 'none';
        $('chat-search-input').focus();
    } else {
        state.isSearchActive = false;
        container.style.display = 'none';
        if (avatar) avatar.style.display = '';
        if (details) details.style.display = '';
        if (headerActions) headerActions.style.display = '';
        $('chat-search-input').value = '';
        renderMessages(state.activeConversation);
    }
}

function filterMessagesLocally(query) {
    const messages = state.messages[state.activeConversation] || [];
    const container = $('messages-container');

    if (!query) {
        renderMessages(state.activeConversation);
        return;
    }

    const filtered = messages.filter(msg => {
        if (msg.message_type === 'system') return false;
        const text = (msg._decrypted || msg.content || '').toLowerCase();
        return text.includes(query);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state" style="height:100%;"><div class="empty-state-icon">🔍</div><h4>No messages found</h4><p>Try a different search term</p></div>';
        return;
    }

    let html = `<div class="search-results-header">${filtered.length} result${filtered.length !== 1 ? 's' : ''} found</div>`;
    let lastDate = '';
    filtered.forEach(msg => {
        const msgDate = formatDate(msg.created_at);
        if (msgDate !== lastDate) {
            lastDate = msgDate;
            html += `<div class="message-date-divider"><span>${msgDate}</span></div>`;
        }
        html += renderMessage(msg, query);
    });

    container.innerHTML = html;

    // Re-attach action handlers for search results
    $$('.action-reply').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); setReply(btn.dataset.id); };
    });
    $$('.action-delete').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Delete this message for everyone?')) socketDeleteMessage(btn.dataset.id);
        };
    });
    $$('.action-forward').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            openForwardModal([btn.dataset.id]);
        };
    });
    $$('.replied-message-box').forEach(box => {
        box.onclick = () => {
            const targetEl = document.querySelector(`.message[data-id="${box.dataset.ref}"]`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetEl.classList.add('highlight');
                setTimeout(() => targetEl.classList.remove('highlight'), 2000);
            }
        };
    });
}

// ─── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initializeCallSounds();
    initAuth();
});

function toggleAudioPlayer(btn, url) {
    let audio = btn._audio;
    if (!audio) {
        audio = new Audio(url);
        btn._audio = audio;

        audio.onended = () => {
            btn.textContent = '▶';
            clearInterval(btn._interval);
            btn.closest('.voice-message').querySelectorAll('.wave-bar').forEach(b => b.classList.remove('played'));
        };

        audio.onplay = () => {
            btn.textContent = '⏸';
            const bars = btn.closest('.voice-message').querySelectorAll('.wave-bar');
            btn._interval = setInterval(() => {
                const pct = audio.currentTime / audio.duration;
                const playedCount = Math.floor(pct * bars.length);
                bars.forEach((b, i) => {
                    if (i < playedCount) b.classList.add('played');
                    else b.classList.remove('played');
                });
            }, 100);
        };

        audio.onpause = () => {
            btn.textContent = '▶';
            clearInterval(btn._interval);
        };
    }

    if (audio.paused) {
        // Stop all other audio players
        $$('.play-btn').forEach(b => {
            if (b !== btn && b._audio && !b._audio.paused) b._audio.pause();
        });
        audio.play();
    } else {
        audio.pause();
    }
}

function showMessageContextMenu(messageId, x, y, isOutgoing) {
    $$('.context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu';

    // Adjust position if too close to edges
    const menuWidth = 180;
    const menuHeight = 250;
    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    const items = [
        { label: 'Reply', icon: '↩️', action: () => setReply(messageId) },
        { label: 'Copy Text', icon: '📋', action: () => copyMessageText(messageId) },
        { label: 'Star', icon: '⭐', action: () => showToast('Feature coming soon') },
        { label: 'Forward', icon: '➡️', action: () => openForwardModal([messageId]) },
        { label: 'Delete', icon: '🗑️', action: () => { if (confirm('Delete message for everyone?')) socketDeleteMessage(messageId); }, danger: true }
    ];

    // Add quick reactions row at the top
    const emojiRow = document.createElement('div');
    emojiRow.className = 'context-menu-emojis';
    ['👍', '❤️', '😂', '😮', '😢', '🙏'].forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.title = emoji;
        span.onclick = (e) => {
            e.stopPropagation();
            state.socket.emit('message:reaction', { messageId, conversationId: state.activeConversation, reaction: emoji });
            menu.remove();
        };
        emojiRow.appendChild(span);
    });
    menu.appendChild(emojiRow);

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = `context-menu-item ${item.danger ? 'danger' : ''}`;
        el.innerHTML = `<span>${item.icon}</span> ${item.label}`;
        el.onclick = () => {
            item.action();
            menu.remove();
        };
        menu.appendChild(el);
    });

    document.body.appendChild(menu);

    const close = () => {
        menu.remove();
        document.removeEventListener('click', close);
    };
    setTimeout(() => document.addEventListener('click', close), 10);
}

function copyMessageText(messageId) {
    const msgs = state.messages[state.activeConversation] || [];
    const msg = msgs.find(m => m.id === messageId);
    if (msg) {
        const text = msg._decrypted || msg.content || '';
        if (text) {
            navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard'));
        }
    }
}


// ─── Status Feature Logic ───────────────────────────────────
let statusUsers = [];
let currentStatusUserIndex = -1;
let currentStatusIndex = -1;
let statusTimer = null;
let currentStatusViewers = [];

function switchSidebarView(view) {
    state.activeSidebarView = view;
    $$('.sidebar-view').forEach(v => v.style.display = 'none');
    $$('.nav-item').forEach(n => n.classList.remove('active'));

    $(`view-${view}`).style.display = 'block';
    $(`nav-${view}`).classList.add('active');

    if (view === 'status') loadStatuses();
}

async function loadStatuses() {
    try {
        const res = await fetch(API + '/api/status', {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to load statuses');
        }
        statusUsers = await res.json();

        // Filter out expired statuses (older than 24 hours)
        const now = new Date();
        statusUsers = statusUsers.map(user => ({
            ...user,
            statuses: user.statuses.filter(status => {
                const statusTime = new Date(status.created_at);
                const ageHours = (now - statusTime) / (1000 * 60 * 60);
                return ageHours < 24;
            })
        })).filter(user => user.statuses.length > 0);

        renderStatusList();
    } catch (err) {
        console.error('Failed to load statuses', err);
    }
}

function renderStatusList() {
    const list = $('status-list');
    const myAvatar = $('my-status-avatar');

    const myStatusUser = statusUsers.find(user => user.id === state.user.id);
    const myStatusTime = document.querySelector('#add-status-btn .status-time');

    // Preview in My Status
    if (myStatusUser && myStatusUser.statuses.length > 0) {
        const lastStatus = myStatusUser.statuses[1] || myStatusUser.statuses[0];
        if (lastStatus.type === 'image' || lastStatus.type === 'video') {
            const url = getAuthUrl(lastStatus.content);
            myAvatar.innerHTML = `<img src="${url}" class="status-preview">`;
        } else {
            setAvatarElement(myAvatar, state.user, state.user.id);
        }

        // Seen count
        const totalViews = myStatusUser.statuses.reduce((acc, s) => acc + (s.view_count || 0), 0);
        if (myStatusTime) {
            myStatusTime.innerHTML = `
                <div>${myStatusUser.statuses.length} update${myStatusUser.statuses.length > 1 ? 's' : ''} posted</div>
                <div class="my-status-seen" onclick="event.stopPropagation(); showMyStatusViewers();" style="cursor:pointer;">👁️ Seen by ${totalViews}</div>
            `;
        }
        $('view-status-manager-btn').style.display = 'inline-flex';
    } else {
        setAvatarElement(myAvatar, state.user, state.user.id);
        if (myStatusTime) {
            myStatusTime.textContent = 'Tap to add status update';
        }
        $('view-status-manager-btn').style.display = 'none';
    }

    const recentUsers = statusUsers.filter(user => user.id !== state.user.id);

    if (!recentUsers || recentUsers.length === 0) {
        list.innerHTML = '<div class="empty-state" style="padding:20px;text-align:center;color:var(--text-muted);">No status updates in the last 24 hours</div>';
        return;
    }

    list.innerHTML = recentUsers.map((user) => {
        const idx = statusUsers.findIndex(statusUser => statusUser.id === user.id);
        const status = user.statuses[0];
        const now = new Date();
        const statusTime = new Date(status.created_at);
        const ageHours = Math.floor((now - statusTime) / (1000 * 60 * 60));
        const ageMinutes = Math.floor(((now - statusTime) % (1000 * 60 * 60)) / (1000 * 60));

        let timeText = 'just now';
        if (ageHours > 0) {
            timeText = `${ageHours}h ago`;
        } else if (ageMinutes > 0) {
            timeText = `${ageMinutes}m ago`;
        }

        const expiresIn = 24 - ageHours;
        const expireText = expiresIn <= 1 ? `Expires in ${Math.floor((24 - (ageHours + ageMinutes / 60)) * 60)}m` : `Expires in ${expiresIn}h`;

        return `
        <div class="status-item" onclick="openStatusViewer(${idx})" title="${expireText}">
            <div class="status-avatar-wrapper">
                ${getAvatarHtml({ display_name: user.name || user.username, avatar: user.avatar }, user.id, false, '', 'avatar-lg')}
            </div>
            <div class="status-info">
                <div class="status-name">${escapeHtml(user.name)}</div>
                <div class="status-time" style="font-size:11px;color:var(--text-muted);">${timeText} • ${user.statuses.length} update${user.statuses.length > 1 ? 's' : ''}</div>
            </div>
        </div>
    `}).join('');
}

async function uploadStatus(file) {
    if (!file) return;
    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(API + '/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` },
            body: formData
        });
        const fileData = await res.json();
        if (!res.ok) throw new Error(fileData.error || 'Upload failed');

        const statusRes = await fetch(API + '/api/status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: fileData.file_url,
                type: fileData.message_type === 'video' ? 'video' : 'image'
            })
        });
        const statusData = await statusRes.json().catch(() => ({}));
        if (!statusRes.ok) throw new Error(statusData.error || 'Status update failed');

        showToast('Status updated!');
        $('status-input').value = '';
        loadStatuses();
    } catch (err) {
        showToast(`Failed to update status: ${err.message}`, true);
    }
}

const statusBgs = ['#00a884', '#128c7e', '#34b7f1', '#ece5dd', '#60d174', '#1f2c33', '#e26ab3', '#6bc0f8'];
let currentStatusBgIdx = 0;

function openTextStatusModal() {
    const modal = $('text-status-modal');
    const input = $('status-text-input');
    if (!modal || !input) return;
    modal.style.display = 'flex';
    input.value = '';
    input.focus();
    $('text-status-bg').style.background = statusBgs[currentStatusBgIdx];
}

function cycleStatusBg() {
    currentStatusBgIdx = (currentStatusBgIdx + 1) % statusBgs.length;
    $('text-status-bg').style.background = statusBgs[currentStatusBgIdx];
}

async function postTextStatus() {
    const text = $('status-text-input').value.trim();
    if (!text) return;

    try {
        const bgColor = statusBgs[currentStatusBgIdx];
        const content = JSON.stringify({ text, bgColor });

        const res = await fetch(API + '/api/status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content, type: 'text' })
        });

        if (!res.ok) throw new Error('Failed to post status');

        $('text-status-modal').style.display = 'none';
        showToast('Status updated');
        loadStatuses();
    } catch (err) {
        showToast(`Error: ${err.message}`, true);
    }
}

function openStatusViewer(userIndex) {
    currentStatusUserIndex = userIndex;
    currentStatusIndex = 0;
    $('status-viewer').style.display = 'flex';
    showStatus();
}

function closeStatusViewer() {
    $('status-viewer').style.display = 'none';
    const media = $('status-media');
    if (media) media.innerHTML = '';
    $('status-seen-panel')?.classList.remove('open');
    if ($('status-reply-input')) $('status-reply-input').value = '';
    clearTimeout(statusTimer);
}

function showStatus() {
    clearTimeout(statusTimer);
    const user = statusUsers[currentStatusUserIndex];
    if (!user || !user.statuses || !user.statuses[currentStatusIndex]) {
        closeStatusViewer();
        return;
    }
    const status = user.statuses[currentStatusIndex];
    const isMine = user.id === state.user.id;

    $('status-view-avatar').style.backgroundImage = `url(${getAuthUrl(user.avatar)})`;
    $('status-view-name').textContent = user.name;

    // Calculate time info
    const now = new Date();
    const statusTime = new Date(status.created_at);
    const ageHours = Math.floor((now - statusTime) / (1000 * 60 * 60));
    const ageMinutes = Math.floor(((now - statusTime) % (1000 * 60 * 60)) / (1000 * 60));

    let timeText = 'just now';
    if (ageHours > 0) {
        timeText = `${ageHours}h ago`;
    } else if (ageMinutes > 0) {
        timeText = `${ageMinutes}m ago`;
    }

    const uploadTime = statusTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const expiresIn = 24 - (ageHours + ageMinutes / 60);
    const expireText = expiresIn <= 1
        ? `Expires in ${Math.floor(expiresIn * 60)}m`
        : `Expires in ${Math.floor(expiresIn)}h`;

    $('status-view-time').textContent = `${uploadTime} • ${expireText}`;
    updateStatusViewerControls(user, status, isMine);

    const media = $('status-media');
    if (!media) return;
    if (status.type === 'video') {
        media.innerHTML = `<video src="${getAuthUrl(status.content)}" autoplay></video>`;
    } else if (status.type === 'text') {
        try {
            const data = JSON.parse(status.content);
            media.innerHTML = `
                <div class="text-status-view" style="background:${data.bgColor};">
                    ${escapeHtml(data.text)}
                </div>
            `;
        } catch (e) {
            media.innerHTML = `<div class="text-status-view" style="background:var(--accent);">${escapeHtml(status.content)}</div>`;
        }
    } else {
        media.innerHTML = `<img src="${getAuthUrl(status.content)}">`;
    }

    renderStatusProgress();

    if (status.type === 'video') {
        const video = media.querySelector('video');
        video.onended = nextStatus;
    } else {
        statusTimer = setTimeout(nextStatus, 5000);
    }
}

async function updateStatusViewerControls(user, status, isMine) {
    $('status-seen-panel')?.classList.remove('open');
    const replyBox = $('status-reply-box');
    const seenBtn = $('status-seen-btn');

    if (replyBox) replyBox.style.display = isMine ? 'none' : 'flex';
    if (seenBtn) {
        seenBtn.style.display = isMine ? 'inline-flex' : 'none';
        seenBtn.innerHTML = `👁️ Seen by ${status.view_count || 0}`;
    }

    const deleteBtn = $('status-delete-btn');
    if (deleteBtn) deleteBtn.style.display = isMine ? 'inline-flex' : 'none';

    if (!isMine) {
        try {
            await apiCall('POST', `/api/status/${status.id}/view`, {});
        } catch (err) {
            console.warn('Failed to mark status viewed:', err);
        }
        return;
    }

    try {
        currentStatusViewers = await apiCall('GET', `/api/status/${status.id}/viewers`);
        if (seenBtn) seenBtn.innerHTML = `👁️ Seen by ${currentStatusViewers.length}`;
    } catch (err) {
        currentStatusViewers = [];
    }
}

async function getOrCreatePrivateConversation(userId) {
    const conv = await apiCall('POST', '/api/conversations', { userId });
    const existingIndex = state.conversations.findIndex(c => c.id === conv.id);
    if (existingIndex > -1) {
        state.conversations[existingIndex] = conv;
    } else {
        state.conversations.unshift(conv);
    }
    renderChatList();
    return conv;
}

async function sendStatusReply() {
    const input = $('status-reply-input');
    const text = input?.value.trim();
    if (!text) return;

    const user = statusUsers[currentStatusUserIndex];
    const status = user?.statuses?.[currentStatusIndex];
    if (!user || !status || user.id === state.user.id) return;

    try {
        const conv = await getOrCreatePrivateConversation(user.id);
        const content = `↩️ Replied to your status\n${text}`;
        const sendData = {
            conversationId: conv.id,
            replyTo: null,
            messageType: 'text',
            ciphertext: content
        };

        await encryptTextForConversation(conv, conv.id, content, sendData);
        await emitWithAck('message:send', sendData);
        input.value = '';
        closeStatusViewer();
        openConversation(conv.id);
        showToast('Status reply sent');
    } catch (err) {
        showToast(`Failed to reply to status: ${err.message}`, true);
    }
}

function openStatusSeenPanel() {
    const panel = $('status-seen-panel');
    const list = $('status-seen-list');
    if (!panel || !list) return;

    if (!currentStatusViewers.length) {
        list.innerHTML = '<div class="empty-state" style="padding:16px;color:rgba(255,255,255,.7);">No views yet</div>';
    } else {
        list.innerHTML = currentStatusViewers.map(viewer => `
            <div class="status-seen-row">
                ${getAvatarHtml({ display_name: viewer.display_name, avatar: viewer.avatar }, viewer.id)}
                <div>
                    <div class="status-seen-name">${escapeHtml(viewer.display_name || viewer.username)}</div>
                    <div class="status-seen-time">${formatTime(viewer.viewed_at)}</div>
                </div>
            </div>
        `).join('');
    }

    panel.classList.add('open');
}

async function showMyStatusViewers() {
    const modal = $('my-status-details');
    const list = $('my-status-updates-list');
    if (!modal || !list) return;

    modal.style.display = 'flex';
    list.innerHTML = '<div class="loading" style="padding:20px; text-align:center;">Loading updates...</div>';

    const myStatusUser = statusUsers.find(user => user.id === state.user.id);
    if (!myStatusUser || !myStatusUser.statuses.length) {
        list.innerHTML = '<div class="empty-state" style="padding:20px; text-align:center; color:var(--text-muted);">No active statuses</div>';
        return;
    }

    let html = '';
    for (const status of myStatusUser.statuses) {
        try {
            const res = await fetch(`${API}/api/status/${status.id}/viewers`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            const viewers = await res.json();

            const time = formatTime(status.created_at);
            const mediaUrl = getAuthUrl(status.content);
            const mediaHtml = status.type === 'image'
                ? `<img src="${mediaUrl}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">`
                : `<video src="${mediaUrl}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;"></video>`;

            html += `
                <div class="my-status-update-item" style="margin-bottom:24px; background:rgba(255,255,255,0.05); padding:12px; border-radius:12px;">
                    <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
                        ${mediaHtml}
                        <div>
                            <div style="font-weight:600; color:var(--text-primary);">${time}</div>
                            <div style="font-size:12px; color:var(--text-muted);">${viewers.length} views</div>
                        </div>
                        <button class="icon-btn danger" onclick="confirmDeleteStatus('${status.id}')" style="margin-left:auto;">🗑️</button>
                    </div>
                    <div class="viewers-list" style="padding-left:12px; border-left:2px solid var(--accent);">
                        ${viewers.length === 0 ? '<div style="font-size:12px; color:var(--text-muted);">No views yet</div>' : viewers.map(v => `
                            <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                                ${getAvatarHtml({ display_name: v.display_name, avatar: v.avatar }, v.id, false, '', 'avatar-xs')}
                                <div style="flex:1;">
                                    <div style="font-size:13px; color:var(--text-primary);">${escapeHtml(v.display_name || v.username)}</div>
                                    <div style="font-size:11px; color:var(--text-muted);">${formatTime(v.viewed_at)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Failed to load viewers for status', status.id, err);
        }
    }
    list.innerHTML = html || '<div class="empty-state">Failed to load status details</div>';
}

async function confirmDeleteStatus(statusId) {
    if (!confirm('Are you sure you want to delete this status?')) return;

    try {
        await apiCall('DELETE', `/api/status/${statusId}`);
        showToast('Status deleted');
        closeStatusViewer();
        $('my-status-details').style.display = 'none';
        loadStatuses();
    } catch (err) {
        showToast(`Failed to delete status: ${err.message}`, true);
    }
}

function renderStatusProgress() {
    const container = $('status-progress');
    const user = statusUsers[currentStatusUserIndex];

    container.innerHTML = user.statuses.map((s, i) => `
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${i < currentStatusIndex ? '100%' : (i === currentStatusIndex ? '0%' : '0%')}"></div>
        </div>
    `).join('');

    if (user.statuses[currentStatusIndex].type !== 'video') {
        const fill = container.querySelectorAll('.progress-fill')[currentStatusIndex];
        fill.style.transition = 'width 5s linear';
        setTimeout(() => fill.style.width = '100%', 50);
    }
}

function nextStatus() {
    const user = statusUsers[currentStatusUserIndex];
    if (currentStatusIndex < user.statuses.length - 1) {
        currentStatusIndex++;
        showStatus();
    } else if (currentStatusUserIndex < statusUsers.length - 1) {
        currentStatusUserIndex++;
        currentStatusIndex = 0;
        showStatus();
    } else {
        closeStatusViewer();
    }
}

function prevStatus() {
    if (currentStatusIndex > 0) {
        currentStatusIndex--;
        showStatus();
    } else if (currentStatusUserIndex > 0) {
        currentStatusUserIndex--;
        currentStatusIndex = statusUsers[currentStatusUserIndex].statuses.length - 1;
        showStatus();
    }
}

// ─── Voice Recording Functions ──────────────────────────────
async function startVoiceRecording() {
    if (state.recording.active) return;
    if (state.call.active) return showToast('Finish your call before recording a voice message.', true);

    try {
        if (!window.isSecureContext) {
            const httpsUrl = window.location.href.replace(/^http:/, 'https:').replace(/:3000(\b|$)/, ':3443');
            showToast(`Voice recording needs HTTPS. Visit: ${httpsUrl}`, true, 8000);
            return;
        }

        state.recording.stream = await AudioInput.openMicrophone(navigator.mediaDevices);
        state.recording.recorder = new MediaRecorder(state.recording.stream);
        state.recording.chunks = [];
        state.recording.active = true;
        state.recording.duration = 0;

        state.recording.recorder.ondataavailable = (e) => {
            state.recording.chunks.push(e.data);
        };

        state.recording.recorder.onstop = () => {
            const blob = new Blob(state.recording.chunks, { type: 'audio/webm' });
            sendVoiceMessage(blob);
        };

        state.recording.recorder.start();
        $('voice-recording-ui').style.display = 'flex';

        state.recording.timer = setInterval(() => {
            state.recording.duration++;
            const mins = Math.floor(state.recording.duration / 60);
            const secs = state.recording.duration % 60;
            $('recording-timer').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (state.recording.duration > 180) {
                stopVoiceRecording();
            }
        }, 1000);

        showToast('🎙️ Recording... Hold to continue, release to send');
    } catch (err) {
        state.recording.stream?.getTracks().forEach(track => track.stop());
        showToast(err.message || 'Could not start the microphone', true);
    }
}

function stopVoiceRecording() {
    if (!state.recording.active || !state.recording.recorder) return;

    state.recording.active = false;
    clearInterval(state.recording.timer);
    $('voice-recording-ui').style.display = 'none';

    state.recording.recorder.stop();
    state.recording.stream?.getTracks().forEach(track => track.stop());
}

async function sendVoiceMessage(blob) {
    if (!state.activeConversation) {
        showToast('No conversation selected', true);
        return;
    }

    try {
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(API + '/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` },
            body: formData
        });

        const fileData = await res.json();
        if (!res.ok) throw new Error(fileData.error || 'Upload failed');

        const sendData = {
            conversationId: state.activeConversation,
            replyTo: state.replyingTo?.id || null,
            messageType: 'audio',
            fileData: {
                fileUrl: fileData.file_url,
                fileName: fileData.file_name,
                fileSize: fileData.file_size
            },
            ciphertext: JSON.stringify({ caption: '' })
        };

        state.socket.emit('message:send', sendData);
        showToast('🎙️ Voice message sent!');
        cancelReply();
    } catch (err) {
        showToast('Failed to send voice message: ' + err.message, true);
    } finally {
        state.recording = {
            active: false,
            recorder: null,
            chunks: [],
            timer: null,
            duration: 0,
            stream: null
        };
    }
}

function checkMicPermission() {
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' }).then(result => {
            const btn = $('request-mic-btn');
            if (btn) {
                btn.style.display = result.state === 'granted' ? 'none' : 'block';
                btn.textContent = result.state === 'denied' ? '🎙️ Microphone blocked' : '🎙️ Enable Microphone';
            }
        }).catch(err => console.warn('Microphone permission query failed', err));
    }
}

async function requestMicPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        const btn = $('request-mic-btn');
        if (btn) btn.style.display = 'none';
        showToast('✅ Microphone enabled');
    } catch (err) {
        showToast('Microphone access denied. Enable it in browser settings.', true);
    }
}

// ─── Tic Tac Toe Game Functions ────────────────────────────
function initGame(opponentId, conversationId, symbol, starts) {
    state.game.active = true;
    state.game.opponentId = opponentId;
    state.game.conversationId = conversationId;
    state.game.mySymbol = symbol;
    state.game.board = Array(9).fill(null);
    state.game.isMyTurn = starts;
    state.game.startsNext = !starts; // Swap for next round if play again

    const opponent = state.conversations.find(c => c.id === conversationId)?.other_user;
    const p2El = $('score-player2');
    if (p2El) p2El.textContent = opponent ? opponent.display_name : 'Opponent';
    const p1El = $('score-player1');
    if (p1El) p1El.textContent = 'You';

    const overlay = $('game-overlay');
    if (overlay) overlay.style.display = 'flex';
    resetGameBoard();

    state.socket.emit('game:score:get', { targetUserId: opponentId });
}

function resetGameBoard() {
    state.game.board = Array(9).fill(null);
    const cells = $$('.game-cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken');
        cell.removeAttribute('data-symbol');
    });

    state.game.isMyTurn = state.game.startsNext;
    state.game.startsNext = !state.game.startsNext;
    updateGameStatus();
}

function updateGameStatus() {
    const text = state.game.isMyTurn ? `Your turn (${state.game.mySymbol})` : "Opponent's turn...";
    const el = $('game-status-text');
    if (el) el.textContent = text;
}

function handleCellClick(e) {
    if (!state.game.active || !state.game.isMyTurn) return;

    const cell = e.target;
    const index = parseInt(cell.dataset.index);

    if (state.game.board[index]) return;

    makeMove(index, state.game.mySymbol);

    emitLegacyGame('game:move', {
        targetUserId: state.game.opponentId,
        conversationId: state.game.conversationId,
        index,
        symbol: state.game.mySymbol
    });

    checkGameEnd();
}

function makeMove(index, symbol) {
    state.game.board[index] = symbol;
    const cell = document.querySelector(`.game-cell[data-index="${index}"]`);
    if (cell) {
        cell.classList.add('taken');
        cell.setAttribute('data-symbol', symbol);
    }
    state.game.isMyTurn = !state.game.isMyTurn;
    updateGameStatus();
}

function handleRemoteMove(index, symbol) {
    if (!state.game.active) return;
    makeMove(index, symbol);
}

function checkGameEnd() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    let winner = null;
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (state.game.board[a] && state.game.board[a] === state.game.board[b] && state.game.board[a] === state.game.board[c]) {
            winner = state.game.board[a];
            break;
        }
    }

    if (winner) {
        emitLegacyGame('game:end', {
            targetUserId: state.game.opponentId,
            conversationId: state.game.conversationId,
            winnerId: winner === state.game.mySymbol ? state.user.id : state.game.opponentId
        });
    } else if (state.game.board.every(cell => cell !== null)) {
        emitLegacyGame('game:end', {
            targetUserId: state.game.opponentId,
            conversationId: state.game.conversationId,
            winnerId: 'draw'
        });
    }
}

function updateScoreCard() {
    const score = state.game.score;
    const u1 = score.user_id_1;
    const isU1Me = (u1 === state.user.id);

    const s1 = $('score-val1');
    if (s1) s1.textContent = isU1Me ? score.wins_1 : score.wins_2;
    const s2 = $('score-val2');
    if (s2) s2.textContent = isU1Me ? score.wins_2 : score.wins_1;
    const sd = $('score-draws');
    if (sd) sd.textContent = score.draws;
}

function closeGame() {
    leaveLegacyGame(state.game, 'tictactoe');
    state.game.active = false;
    const overlay = $('game-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ─── Dots & Boxes Game Functions ───────────────────────────
function initDotsGame(opponentId, opponentName, conversationId, boardSize, playerNum, starts) {
    state.dotsGame.active = true;
    state.dotsGame.opponentId = opponentId;
    state.dotsGame.opponentName = opponentName;
    state.dotsGame.conversationId = conversationId;
    state.dotsGame.boardSize = parseInt(boardSize) || 8;
    state.dotsGame.playerNum = playerNum;
    state.dotsGame.isMyTurn = starts;
    state.dotsGame.startsNext = !starts;
    state.dotsGame.myScore = 0;
    state.dotsGame.opponentScore = 0;
    state.dotsGame.hoveredLine = null;

    const N = state.dotsGame.boardSize;
    state.dotsGame.hLines = Array(N + 1).fill(null).map(() => Array(N).fill(null));
    state.dotsGame.vLines = Array(N).fill(null).map(() => Array(N + 1).fill(null));
    state.dotsGame.boxes  = Array(N).fill(null).map(() => Array(N).fill(null));

    if (playerNum === 1) {
        $('dots-player1-name').textContent = 'You (Red)';
        $('dots-player2-name').textContent = `${opponentName} (Blue)`;
    } else {
        $('dots-player1-name').textContent = `${opponentName} (Red)`;
        $('dots-player2-name').textContent = 'You (Blue)';
    }

    const overlay = $('dots-overlay');
    if (overlay) overlay.style.display = 'flex';

    updateDotsGameUI();
}

function updateDotsGameUI() {
    const dg = state.dotsGame;
    $('dots-player1-score').textContent = dg.playerNum === 1 ? dg.myScore : dg.opponentScore;
    $('dots-player2-score').textContent = dg.playerNum === 2 ? dg.myScore : dg.opponentScore;
    $('dots-status-text').textContent = dg.isMyTurn ? 'Your turn' : `${dg.opponentName}'s turn...`;
    drawDotsBoard();
}

function drawDotsBoard() {
    const canvas = $('dots-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dg  = state.dotsGame;
    const N   = dg.boardSize;

    // Resize canvas dynamically so it always fits
    const containerW = canvas.parentElement ? canvas.parentElement.clientWidth - 24 : 460;
    const size = Math.min(containerW, 500);
    canvas.width  = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    const padding    = Math.max(20, Math.floor(size * 0.07));
    const boardW     = size - 2 * padding;
    const dotSpacing = boardW / N;

    // 1. Filled boxes
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const owner = dg.boxes[r][c];
            if (owner === null) continue;
            const isMe = owner === dg.playerNum;
            ctx.fillStyle = isMe ? 'rgba(255,92,77,0.18)' : 'rgba(83,189,235,0.18)';
            const bx = padding + c * dotSpacing + 3;
            const by = padding + r * dotSpacing + 3;
            ctx.fillRect(bx, by, dotSpacing - 6, dotSpacing - 6);

            ctx.fillStyle = isMe ? '#ff5c4d' : '#53bdeb';
            const fs = Math.max(10, Math.floor(dotSpacing * 0.38));
            ctx.font = `bold ${fs}px Inter,sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isMe ? 'R' : 'B', padding + c * dotSpacing + dotSpacing / 2, padding + r * dotSpacing + dotSpacing / 2);
        }
    }

    const canDraw = dg.isMyTurn;
    const myColor  = dg.playerNum === 1 ? '#ff5c4d' : '#53bdeb';
    const oppColor = dg.playerNum === 1 ? '#53bdeb' : '#ff5c4d';

    // 2. Horizontal lines
    for (let r = 0; r <= N; r++) {
        for (let c = 0; c < N; c++) {
            const owner = dg.hLines[r][c];
            const hovered = dg.hoveredLine && dg.hoveredLine.type === 'h' && dg.hoveredLine.r === r && dg.hoveredLine.c === c;
            const x1 = padding + c * dotSpacing;
            const x2 = x1 + dotSpacing;
            const y  = padding + r * dotSpacing;
            if (owner !== null) {
                ctx.strokeStyle = owner === dg.playerNum ? myColor : oppColor;
                ctx.lineWidth   = Math.max(3, dotSpacing * 0.1);
            } else if (hovered && canDraw) {
                ctx.strokeStyle = myColor.replace(')', ',0.45)').replace('rgb', 'rgba');
                ctx.lineWidth   = Math.max(3, dotSpacing * 0.1);
            } else {
                ctx.strokeStyle = '#38444d';
                ctx.lineWidth   = 2;
            }
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1 + 3, y);
            ctx.lineTo(x2 - 3, y);
            ctx.stroke();
        }
    }

    // 3. Vertical lines
    for (let r = 0; r < N; r++) {
        for (let c = 0; c <= N; c++) {
            const owner = dg.vLines[r][c];
            const hovered = dg.hoveredLine && dg.hoveredLine.type === 'v' && dg.hoveredLine.r === r && dg.hoveredLine.c === c;
            const x  = padding + c * dotSpacing;
            const y1 = padding + r * dotSpacing;
            const y2 = y1 + dotSpacing;
            if (owner !== null) {
                ctx.strokeStyle = owner === dg.playerNum ? myColor : oppColor;
                ctx.lineWidth   = Math.max(3, dotSpacing * 0.1);
            } else if (hovered && canDraw) {
                ctx.strokeStyle = myColor.replace(')', ',0.45)').replace('rgb', 'rgba');
                ctx.lineWidth   = Math.max(3, dotSpacing * 0.1);
            } else {
                ctx.strokeStyle = '#38444d';
                ctx.lineWidth   = 2;
            }
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y1 + 3);
            ctx.lineTo(x, y2 - 3);
            ctx.stroke();
        }
    }

    // 4. Dots
    const dotRadius = Math.max(4, dotSpacing * 0.12);
    for (let r = 0; r <= N; r++) {
        for (let c = 0; c <= N; c++) {
            ctx.fillStyle = '#e9edef';
            ctx.beginPath();
            ctx.arc(padding + c * dotSpacing, padding + r * dotSpacing, dotRadius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

function findClosestLine(mx, my) {
    const canvas = $('dots-canvas');
    if (!canvas) return null;
    const dg = state.dotsGame;
    const N  = dg.boardSize;
    const padding    = Math.max(20, Math.floor(canvas.width * 0.07));
    const dotSpacing = (canvas.width - 2 * padding) / N;
    const threshold  = dotSpacing * 0.42;

    let best = null, minD = Infinity;

    for (let r = 0; r <= N; r++) {
        for (let c = 0; c < N; c++) {
            if (dg.hLines[r][c] !== null) continue;
            const x1 = padding + c * dotSpacing, x2 = x1 + dotSpacing;
            const y  = padding + r * dotSpacing;
            const d  = mx >= x1 && mx <= x2 ? Math.abs(my - y)
                     : Math.min(Math.hypot(mx - x1, my - y), Math.hypot(mx - x2, my - y));
            if (d < minD) { minD = d; best = { type:'h', r, c }; }
        }
    }
    for (let r = 0; r < N; r++) {
        for (let c = 0; c <= N; c++) {
            if (dg.vLines[r][c] !== null) continue;
            const x  = padding + c * dotSpacing;
            const y1 = padding + r * dotSpacing, y2 = y1 + dotSpacing;
            const d  = my >= y1 && my <= y2 ? Math.abs(mx - x)
                     : Math.min(Math.hypot(mx - x, my - y1), Math.hypot(mx - x, my - y2));
            if (d < minD) { minD = d; best = { type:'v', r, c }; }
        }
    }
    return minD < threshold ? best : null;
}

function checkCompletedBoxes(type, r, c, playerNum) {
    const dg = state.dotsGame, N = dg.boardSize;
    let gotBox = false;

    const complete = (row, col) =>
        row >= 0 && row < N && col >= 0 && col < N &&
        dg.hLines[row][col] !== null &&
        dg.hLines[row+1][col] !== null &&
        dg.vLines[row][col] !== null &&
        dg.vLines[row][col+1] !== null;

    const claim = (row, col) => {
        if (dg.boxes[row][col] !== null) return;
        dg.boxes[row][col] = playerNum;
        gotBox = true;
        if (playerNum === dg.playerNum) dg.myScore++;
        else dg.opponentScore++;
    };

    if (type === 'h') {
        if (r < N   && complete(r,   c)) claim(r,   c);
        if (r > 0   && complete(r-1, c)) claim(r-1, c);
    } else {
        if (c < N   && complete(r, c  )) claim(r, c  );
        if (c > 0   && complete(r, c-1)) claim(r, c-1);
    }
    return gotBox;
}

function makeDotsMove(type, r, c) {
    const dg = state.dotsGame;
    if (type === 'h') dg.hLines[r][c] = dg.playerNum;
    else              dg.vLines[r][c] = dg.playerNum;

    const gotBox = checkCompletedBoxes(type, r, c, dg.playerNum);
    dg.hoveredLine = null;

    emitLegacyGame('game:move', {
        targetUserId: dg.opponentId,
        conversationId: dg.conversationId,
        moveData: { type, r, c, playerNum: dg.playerNum }
    });

    // If a box was completed, same player keeps their turn
    dg.isMyTurn = gotBox;
    updateDotsGameUI();
    checkDotsGameEnd();
}

function handleRemoteDotsMove(moveData) {
    if (!state.dotsGame.active) return;
    const dg = state.dotsGame;
    const { type, r, c, playerNum } = moveData;

    if (type === 'h') dg.hLines[r][c] = playerNum;
    else              dg.vLines[r][c] = playerNum;

    const gotBox = checkCompletedBoxes(type, r, c, playerNum);
    // If opponent completed a box, they keep their turn
    dg.isMyTurn = !gotBox;
    updateDotsGameUI();
    checkDotsGameEnd();
}

function checkDotsGameEnd() {
    const dg = state.dotsGame, N = dg.boardSize;
    for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
            if (dg.boxes[r][c] === null) return;

    // All boxes filled
    dg.active = false;
    const winner = dg.myScore > dg.opponentScore ? state.user.id
                 : dg.opponentScore > dg.myScore ? dg.opponentId
                 : 'draw';
    emitLegacyGame('game:end', {
        targetUserId: dg.opponentId,
        conversationId: dg.conversationId,
        winnerId: winner
    });
}

function resetDotsGameBoard() {
    const dg = state.dotsGame, N = dg.boardSize;
    dg.hLines = Array(N + 1).fill(null).map(() => Array(N).fill(null));
    dg.vLines = Array(N).fill(null).map(() => Array(N + 1).fill(null));
    dg.boxes  = Array(N).fill(null).map(() => Array(N).fill(null));
    dg.myScore = dg.opponentScore = 0;
    dg.hoveredLine = null;
    dg.active  = true;
    dg.isMyTurn     = dg.startsNext;
    dg.startsNext   = !dg.startsNext;
    updateDotsGameUI();
}

function closeDotsGame() {
    leaveLegacyGame(state.dotsGame, 'dotsandboxes');
    state.dotsGame.active = false;
    const overlay = $('dots-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ─── Extra Game Helpers ────────────────────────────────────
function getGameTitle(type, size = 8) {
    const titles = {
        tictactoe: 'Tic Tac Toe',
        dotsandboxes: `Dots & Boxes (${size}x${size})`,
        connectfour: 'Connect Four',
        rockpaperscissors: 'RPS Lizard Spock',
        memorymatch: 'Memory Match',
        wordscramble: 'Word Scramble',
        tankduel: 'Tank Duel',
        wizardchess: 'Wizard Chess',
        rallyclub: 'Rally Club',
        retropong: 'Retro Pong 77',
        stickfight: 'Street Arena 3D',
        reversi: 'Reversi',
        gomoku: 'Gomoku',
        ludo: 'Ludo'
    };
    return titles[type] || 'Game';
}

// ─── Connect Four Game Functions ───────────────────────────
function initConnectFour(opponentId, opponentName, conversationId, playerNum, starts) {
    state.connectFour.active = true;
    state.connectFour.opponentId = opponentId;
    state.connectFour.opponentName = opponentName;
    state.connectFour.conversationId = conversationId;
    state.connectFour.playerNum = playerNum || 1;
    state.connectFour.isMyTurn = starts;
    state.connectFour.startsNext = !starts;
    state.connectFour.myScore = 0;
    state.connectFour.opponentScore = 0;
    resetConnectFourBoard(false);

    if (state.connectFour.playerNum === 1) {
        $('connect-player1-name').textContent = 'You (Red)';
        $('connect-player2-name').textContent = `${opponentName} (Yellow)`;
    } else {
        $('connect-player1-name').textContent = `${opponentName} (Red)`;
        $('connect-player2-name').textContent = 'You (Yellow)';
    }

    const overlay = $('connect-overlay');
    if (overlay) overlay.style.display = 'flex';
    renderConnectFourBoard();
    updateConnectFourUI();
}

function resetConnectFourBoard(rotateStarter = true) {
    state.connectFour.board = Array(6).fill(null).map(() => Array(7).fill(null));
    if (rotateStarter) {
        state.connectFour.isMyTurn = state.connectFour.startsNext;
        state.connectFour.startsNext = !state.connectFour.startsNext;
    }
    renderConnectFourBoard();
    updateConnectFourUI();
}

function renderConnectFourBoard() {
    const board = $('connect-board');
    if (!board) return;
    board.innerHTML = '';
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'connect-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            const owner = state.connectFour.board[r][c];
            if (owner) cell.dataset.owner = owner;
            board.appendChild(cell);
        }
    }
}

function updateConnectFourUI() {
    const cf = state.connectFour;
    const p1Score = $('connect-player1-score');
    const p2Score = $('connect-player2-score');
    if (p1Score) p1Score.textContent = cf.playerNum === 1 ? cf.myScore : cf.opponentScore;
    if (p2Score) p2Score.textContent = cf.playerNum === 2 ? cf.myScore : cf.opponentScore;
    const status = $('connect-status-text');
    if (status) status.textContent = cf.isMyTurn ? 'Your turn' : `${cf.opponentName}'s turn...`;
}

function getConnectDropRow(col) {
    for (let r = 5; r >= 0; r--) {
        if (!state.connectFour.board[r][col]) return r;
    }
    return -1;
}

function makeConnectMove(col, playerNum, isRemote = false) {
    const cf = state.connectFour;
    const row = getConnectDropRow(col);
    if (row < 0) return false;

    cf.board[row][col] = playerNum;
    const winner = getConnectWinner(row, col, playerNum);
    if (winner) {
        if (playerNum === cf.playerNum) cf.myScore++;
        else cf.opponentScore++;
    }

    cf.isMyTurn = isRemote;
    renderConnectFourBoard();
    updateConnectFourUI();

    if (!isRemote) {
        emitLegacyGame('game:move', {
            targetUserId: cf.opponentId,
            conversationId: cf.conversationId,
            moveData: { gameType: 'connectfour', col, playerNum }
        });
    }

    if (winner && !isRemote) {
        emitLegacyGame('game:end', {
            targetUserId: cf.opponentId,
            conversationId: cf.conversationId,
            winnerId: state.user.id
        });
    } else if (isConnectBoardFull() && !isRemote) {
        emitLegacyGame('game:end', {
            targetUserId: cf.opponentId,
            conversationId: cf.conversationId,
            winnerId: 'draw'
        });
    }
    return true;
}

function getConnectWinner(row, col, playerNum) {
    const board = state.connectFour.board;
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    return dirs.some(([dr, dc]) => {
        let total = 1;
        for (const dir of [-1, 1]) {
            let r = row + dr * dir;
            let c = col + dc * dir;
            while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === playerNum) {
                total++;
                r += dr * dir;
                c += dc * dir;
            }
        }
        return total >= 4;
    });
}

function isConnectBoardFull() {
    return state.connectFour.board[0].every(Boolean);
}

function handleConnectClick(e) {
    const cell = e.target.closest('.connect-cell');
    if (!cell || !state.connectFour.active || !state.connectFour.isMyTurn) return;
    makeConnectMove(parseInt(cell.dataset.col), state.connectFour.playerNum);
}

function handleRemoteConnectMove(moveData) {
    if (!state.connectFour.active) return;
    makeConnectMove(parseInt(moveData.col), moveData.playerNum, true);
}

function closeConnectFour() {
    leaveLegacyGame(state.connectFour, 'connectfour');
    state.connectFour.active = false;
    const overlay = $('connect-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ─── Rock Paper Scissors Lizard Spock Game Functions ───────
function initRpsGame(opponentId, opponentName, conversationId, playerNum) {
    state.rpsGame.active = true;
    state.rpsGame.opponentId = opponentId;
    state.rpsGame.opponentName = opponentName;
    state.rpsGame.conversationId = conversationId;
    state.rpsGame.playerNum = playerNum || 1;
    state.rpsGame.round = 1;
    state.rpsGame.myScore = 0;
    state.rpsGame.opponentScore = 0;
    resetRpsRound();

    $('rps-opponent-name').textContent = opponentName;
    const overlay = $('rps-overlay');
    if (overlay) overlay.style.display = 'flex';
    updateRpsUI('Choose your move');
}

function resetRpsRound() {
    state.rpsGame.myChoice = null;
    state.rpsGame.opponentChoice = null;
    $$('.rps-choice').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('active');
    });
    const myChoice = $('rps-my-choice');
    const opponentChoice = $('rps-opponent-choice');
    if (myChoice) myChoice.textContent = '?';
    if (opponentChoice) opponentChoice.textContent = '?';
}

function updateRpsUI(statusText) {
    $('rps-my-score').textContent = state.rpsGame.myScore;
    $('rps-opponent-score').textContent = state.rpsGame.opponentScore;
    $('rps-round').textContent = state.rpsGame.round;
    $('rps-status-text').textContent = statusText;
}

function chooseRps(choice) {
    const rps = state.rpsGame;
    if (!rps.active || rps.myChoice) return;

    rps.myChoice = choice;
    $$('.rps-choice').forEach(btn => {
        btn.disabled = true;
        btn.classList.toggle('active', btn.dataset.choice === choice);
    });
    $('rps-my-choice').textContent = getRpsIcon(choice);
    updateRpsUI(rps.opponentChoice ? 'Revealing...' : `Waiting for ${rps.opponentName}...`);

    emitLegacyGame('game:move', {
        targetUserId: rps.opponentId,
        conversationId: rps.conversationId,
        moveData: { gameType: 'rockpaperscissors', choice, round: rps.round }
    });
    resolveRpsRoundIfReady();
}

function handleRemoteRpsChoice(moveData) {
    const rps = state.rpsGame;
    if (!rps.active || moveData.round !== rps.round) return;
    rps.opponentChoice = moveData.choice;
    $('rps-opponent-choice').textContent = rps.myChoice ? getRpsIcon(moveData.choice) : '?';
    updateRpsUI(rps.myChoice ? 'Revealing...' : `${rps.opponentName} has chosen. Your move.`);
    resolveRpsRoundIfReady();
}

function resolveRpsRoundIfReady() {
    const rps = state.rpsGame;
    if (!rps.myChoice || !rps.opponentChoice) return;

    $('rps-opponent-choice').textContent = getRpsIcon(rps.opponentChoice);
    const result = getRpsResult(rps.myChoice, rps.opponentChoice);
    if (result === 'win') {
        rps.myScore++;
        updateRpsUI(`You win: ${getRpsRuleText(rps.myChoice, rps.opponentChoice)}`);
    } else if (result === 'lose') {
        rps.opponentScore++;
        updateRpsUI(`${rps.opponentName} wins: ${getRpsRuleText(rps.opponentChoice, rps.myChoice)}`);
    } else {
        updateRpsUI('Round draw');
    }

    if (rps.myScore >= 3 || rps.opponentScore >= 3) {
        const won = rps.myScore > rps.opponentScore;
        updateRpsUI(won ? `You won ${rps.myScore} - ${rps.opponentScore}!` : `${rps.opponentName} won ${rps.opponentScore} - ${rps.myScore}`);
        emitLegacyGame('game:end',{targetUserId:rps.opponentId,conversationId:rps.conversationId,winnerId:won?state.user.id:rps.opponentId});
        $$('.rps-choice').forEach(btn => { btn.disabled = true; });
        return;
    }

    setTimeout(() => {
        if (!rps.active) return;
        rps.round++;
        resetRpsRound();
        updateRpsUI('Choose your move');
    }, 1100);
}

function getRpsResult(myChoice, opponentChoice) {
    if (myChoice === opponentChoice) return 'draw';
    return RPSLS_RULES[myChoice]?.[opponentChoice] ? 'win' : 'lose';
}

const RPSLS_RULES = {
    rock: {
        scissors: 'rock crushes scissors',
        lizard: 'rock crushes lizard'
    },
    paper: {
        rock: 'paper covers rock',
        spock: 'paper disproves Spock'
    },
    scissors: {
        paper: 'scissors cuts paper',
        lizard: 'scissors decapitates lizard'
    },
    lizard: {
        spock: 'lizard poisons Spock',
        paper: 'lizard eats paper'
    },
    spock: {
        scissors: 'Spock smashes scissors',
        rock: 'Spock vaporizes rock'
    }
};

function getRpsRuleText(winnerChoice, loserChoice) {
    return RPSLS_RULES[winnerChoice]?.[loserChoice] || `${getRpsName(winnerChoice)} beats ${getRpsName(loserChoice)}`;
}

function getRpsIcon(choice) {
    return {
        rock: '✊',
        paper: '✋',
        scissors: '✌',
        lizard: '🦎',
        spock: '🖖'
    }[choice] || '?';
}

function getRpsName(choice) {
    return {
        rock: 'rock',
        paper: 'paper',
        scissors: 'scissors',
        lizard: 'lizard',
        spock: 'Spock'
    }[choice] || choice;
}

function closeRpsGame() {
    leaveLegacyGame(state.rpsGame, 'rockpaperscissors');
    state.rpsGame.active = false;
    const overlay = $('rps-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ─── Memory Match Game Functions ───────────────────────────
function seededRandom(seedText) {
    let seed = 0;
    for (let i = 0; i < seedText.length; i++) {
        seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
    }
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}

function seededShuffle(items, seedText) {
    const rand = seededRandom(seedText || 'lan-game');
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function initMemoryGame() { showToast('Please send a fresh Memory Match invitation.'); }
function closeMemoryGame() { state.memoryGame.active = false; $('memory-overlay').style.display = 'none'; }
function handleMemoryClick() {}
function handleRemoteMemoryMove() {}
function initWordGame() { showToast('Please send a fresh Word Guess invitation.'); }
function closeWordGame() { state.wordGame.active = false; $('word-overlay').style.display = 'none'; }
function submitWordAnswer() {}
function handleRemoteWordSolve() {}

function closeTankDuel() { state.tankDuel.active = false; }

// ─── Retro Pong Game Functions ─────────────────────────────
function initRetroPong(opponentId, opponentName, conversationId, playerNum, gameSeed) {
    const rp = state.retroPong;
    if (rp.raf) cancelAnimationFrame(rp.raf);
    rp.active = true;
    rp.opponentId = opponentId;
    rp.opponentName = opponentName;
    rp.conversationId = conversationId;
    rp.playerNum = playerNum || 1;
    rp.seed = gameSeed || String(Date.now());
    rp.y = 0;
    rp.opponentY = 0;
    rp.ballX = 0;
    rp.ballY = 0;
    rp.ballVx = rp.playerNum === 1 ? 1.05 : 0;
    rp.ballVy = 0.42;
    rp.score1 = 0;
    rp.score2 = 0;
    rp.serving = rp.playerNum === 1;
    rp.serveAt = performance.now() + 1200;
    rp.finished = false;
    rp.keys = {};
    rp.lastFrame = performance.now();
    rp.lastSync = 0;

    $('retropong-rival-name').textContent = opponentName;
    $('retropong-status').textContent = rp.playerNum === 1 ? 'Serve in 3' : 'Waiting for serve';
    updateRetroPongHud();
    const overlay = $('retropong-overlay');
    if (overlay) overlay.style.display = 'flex';

    rp.raf = requestAnimationFrame(retroPongLoop);
}

function retroPongLoop(now) {
    const rp = state.retroPong;
    if (!rp.active) return;

    const dt = Math.min(0.05, (now - (rp.lastFrame || now)) / 1000);
    rp.lastFrame = now;
    updateRetroPong(dt, now);
    drawRetroPong(now);
    updateRetroPongHud();

    if (now - rp.lastSync > 45) {
        rp.lastSync = now;
        sendRetroPongState();
    }

    rp.raf = requestAnimationFrame(retroPongLoop);
}

function updateRetroPong(dt, now) {
    const rp = state.retroPong;
    if (rp.finished) return;

    const up = rp.keys.up || rp.keys.ArrowUp || rp.keys.KeyW;
    const down = rp.keys.down || rp.keys.ArrowDown || rp.keys.KeyS;
    const speed = 1.55;
    if (up && !down) rp.y -= speed * dt;
    if (down && !up) rp.y += speed * dt;
    rp.y = Math.max(-0.78, Math.min(0.78, rp.y));

    if (rp.playerNum !== 1) return;

    if (rp.serving) {
        const remaining = Math.max(0, Math.ceil((rp.serveAt - now) / 400));
        $('retropong-status').textContent = remaining ? `Serve in ${remaining}` : 'Play';
        if (now < rp.serveAt) return;
        rp.serving = false;
    }

    rp.ballX += rp.ballVx * dt;
    rp.ballY += rp.ballVy * dt;

    if (rp.ballY <= -0.94 || rp.ballY >= 0.94) {
        rp.ballY = Math.max(-0.94, Math.min(0.94, rp.ballY));
        rp.ballVy *= -1;
    }

    const paddleHalf = 0.22;
    const leftHit = rp.ballVx < 0 && rp.ballX <= -0.82 && rp.ballX >= -0.9 && Math.abs(rp.ballY - rp.y) <= paddleHalf;
    const rightHit = rp.ballVx > 0 && rp.ballX >= 0.82 && rp.ballX <= 0.9 && Math.abs(rp.ballY - rp.opponentY) <= paddleHalf;
    if (leftHit || rightHit) {
        const paddleY = leftHit ? rp.y : rp.opponentY;
        const offset = (rp.ballY - paddleY) / paddleHalf;
        rp.ballX = leftHit ? -0.82 : 0.82;
        rp.ballVx = Math.abs(rp.ballVx) * (leftHit ? 1 : -1) * 1.045;
        rp.ballVx = Math.max(-1.9, Math.min(1.9, rp.ballVx));
        rp.ballVy = offset * 1.05;
        $('retropong-status').textContent = 'Rally';
    }

    if (rp.ballX < -1.08) {
        retroPongPoint(2);
    } else if (rp.ballX > 1.08) {
        retroPongPoint(1);
    }
}

function retroPongPoint(playerNum) {
    const rp = state.retroPong;
    if (playerNum === 1) rp.score1++;
    else rp.score2++;

    const winner = rp.score1 >= rp.winnerScore ? 1 : rp.score2 >= rp.winnerScore ? 2 : 0;
    if (winner) {
        rp.finished = true;
        emitLegacyGame('game:end', {
            targetUserId: rp.opponentId,
            conversationId: rp.conversationId,
            winnerId: winner === rp.playerNum ? state.user.id : rp.opponentId
        });
        return;
    }

    rp.ballX = 0;
    rp.ballY = 0;
    rp.ballVx = (playerNum === 1 ? -1 : 1) * 1.05;
    rp.ballVy = (Math.random() > 0.5 ? 1 : -1) * (0.28 + Math.random() * 0.3);
    rp.serving = true;
    rp.serveAt = performance.now() + 1000;
    $('retropong-status').textContent = `Point P${playerNum}`;
}

function sendRetroPongState() {
    const rp = state.retroPong;
    if (!rp.active) return;
    const moveData = {
        gameType: 'retropong',
        action: rp.playerNum === 1 ? 'sync' : 'paddle',
        y: rp.y
    };
    if (rp.playerNum === 1) {
        Object.assign(moveData, {
            opponentY: rp.opponentY,
            ballX: rp.ballX,
            ballY: rp.ballY,
            score1: rp.score1,
            score2: rp.score2,
            serving: rp.serving,
            finished: rp.finished
        });
    }
    emitLegacyGame('game:move', {
        targetUserId: rp.opponentId,
        conversationId: rp.conversationId,
        moveData
    });
}

function handleRemoteRetroPongMove(moveData) {
    const rp = state.retroPong;
    if (!rp.active) return;
    if (moveData.action === 'paddle') {
        rp.opponentY = Math.max(-0.78, Math.min(0.78, Number(moveData.y) || 0));
        return;
    }

    if (moveData.action === 'sync') {
        rp.opponentY = Math.max(-0.78, Math.min(0.78, Number(moveData.y) || 0));
        rp.ballX = Number(moveData.ballX) || 0;
        rp.ballY = Number(moveData.ballY) || 0;
        rp.score1 = Number(moveData.score1) || 0;
        rp.score2 = Number(moveData.score2) || 0;
        rp.serving = Boolean(moveData.serving);
        rp.finished = Boolean(moveData.finished);
        $('retropong-status').textContent = rp.serving ? 'Incoming serve' : 'Rally';
    }
}

function updateRetroPongHud() {
    const rp = state.retroPong;
    const myScore = rp.playerNum === 1 ? rp.score1 : rp.score2;
    const rivalScore = rp.playerNum === 1 ? rp.score2 : rp.score1;
    const myEl = $('retropong-my-score');
    const rivalEl = $('retropong-rival-score');
    if (myEl) myEl.textContent = myScore;
    if (rivalEl) rivalEl.textContent = rivalScore;
}

function drawRetroPong(now) {
    const canvas = $('retropong-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(360, Math.floor(rect.width * dpr));
    const height = Math.max(230, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    const rp = state.retroPong;
    const w = canvas.width;
    const h = canvas.height;
    const toX = x => (x + 1) * 0.5 * w;
    const toY = y => (y + 1) * 0.5 * h;
    const leftY = rp.playerNum === 1 ? rp.y : rp.opponentY;
    const rightY = rp.playerNum === 1 ? rp.opponentY : rp.y;

    ctx.fillStyle = '#020407';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(83, 189, 235, 0.08)';
    for (let y = 0; y < h; y += 22 * dpr) ctx.fillRect(w / 2 - 3 * dpr, y, 6 * dpr, 12 * dpr);

    ctx.strokeStyle = 'rgba(246, 195, 67, 0.22)';
    ctx.lineWidth = 2 * dpr;
    ctx.strokeRect(12 * dpr, 12 * dpr, w - 24 * dpr, h - 24 * dpr);

    const scan = Math.sin(now / 90) * 0.03 + 0.08;
    ctx.fillStyle = `rgba(255,255,255,${scan})`;
    for (let y = 0; y < h; y += 4 * dpr) ctx.fillRect(0, y, w, 1 * dpr);

    drawRetroPongPaddle(ctx, toX(-0.9), toY(leftY), dpr, '#53bdeb');
    drawRetroPongPaddle(ctx, toX(0.9), toY(rightY), dpr, '#f6c343');

    const ballSize = 13 * dpr;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12 * dpr;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(toX(rp.ballX) - ballSize / 2, toY(rp.ballY) - ballSize / 2, ballSize, ballSize);
    ctx.shadowBlur = 0;
}

function drawRetroPongPaddle(ctx, x, y, dpr, color) {
    const width = 12 * dpr;
    const height = 92 * dpr;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14 * dpr;
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y - height / 2, width, height);
    ctx.shadowBlur = 0;
}

function setRetroPongKey(code, active) {
    const rp = state.retroPong;
    if (!rp.active) return;
    if (code === 'ArrowUp' || code === 'KeyW' || code === 'up') rp.keys.up = active;
    if (code === 'ArrowDown' || code === 'KeyS' || code === 'down') rp.keys.down = active;
}

function closeRetroPong() {
    leaveLegacyGame(state.retroPong, 'retropong');
    const rp = state.retroPong;
    rp.active = false;
    rp.keys = {};
    if (rp.raf) cancelAnimationFrame(rp.raf);
    rp.raf = null;
    const overlay = $('retropong-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ─── Stickman Fighting Game Functions ──────────────────────
function initStickFight(opponentId, opponentName, conversationId, playerNum, gameSeed) {
    const sf = state.stickFight;
    if (sf.raf) cancelAnimationFrame(sf.raf);
    sf.active = true;
    sf.opponentId = opponentId;
    sf.opponentName = opponentName;
    sf.conversationId = conversationId;
    sf.playerNum = playerNum || 1;
    sf.seed = gameSeed || String(Date.now());
    sf.selectedCharacter = null;
    sf.opponentCharacter = null;
    sf.round = 1;
    sf.roundActive = false;
    sf.roundCountdownUntil = 0;
    if (sf.roundTimer) clearTimeout(sf.roundTimer);
    sf.roundTimer = null;
    sf.maxRoundWins = 2;
    sf.myRoundWins = 0;
    sf.opponentRoundWins = 0;
    sf.finished = false;
    sf.keys = {};
    resetStickFightRoundState();
    sf.lastFrame = performance.now();
    sf.lastSync = 0;

    $('stickfight-rival-name').textContent = opponentName;
    setStickFightStatus('Loading 3D arena...', 1200);
    renderStickFightRoster();
    showStickFightCharacterSelect(true);
    updateStickFightHud(performance.now());
    const overlay = $('stickfight-overlay');
    if (overlay) overlay.style.display = 'flex';

    prepareStickFight3D()
        .then(() => {
            if (!sf.active) return;
            applyStickFightCharacterSkins();
            setStickFightStatus('Choose your fighter', 1200);
            sf.lastFrame = performance.now();
            sf.raf = requestAnimationFrame(stickFightLoop);
        })
        .catch(() => {
            setStickFightStatus('3D renderer failed to load.', 3000);
        });
}

function stickFightLoop(now) {
    const sf = state.stickFight;
    if (!sf.active) return;

    const dt = Math.min(0.05, (now - (sf.lastFrame || now)) / 1000);
    sf.lastFrame = now;
    updateStickFightPhysics(dt, now);
    drawStickFightScene(now);
    updateStickFightHud(now);

    if (sf.roundActive && now - sf.lastSync > 60) {
        sf.lastSync = now;
        sendStickFightState();
    }

    sf.raf = requestAnimationFrame(stickFightLoop);
}

function updateStickFightPhysics(dt, now) {
    const sf = state.stickFight;
    if (sf.finished || !sf.roundActive) return;

    const left = sf.keys.ArrowLeft || sf.keys.KeyA;
    const right = sf.keys.ArrowRight || sf.keys.KeyD;
    const jump = sf.keys.ArrowUp || sf.keys.KeyW;
    const block = sf.keys.KeyL || sf.keys.ShiftLeft || sf.keys.ShiftRight;
    const stats = getStickFightCharacter(sf.selectedCharacter);
    const speed = stats.speed || 1;
    const staminaScale = stats.stamina || 1;

    if (left && !right) {
        sf.vx = -1.45 * speed;
        sf.facing = -1;
    } else if (right && !left) {
        sf.vx = 1.45 * speed;
        sf.facing = 1;
    } else {
        sf.vx *= 0.82;
    }

    if (jump && sf.y <= 0.001 && sf.stamina >= 10) {
        sf.vy = 3.2;
        sf.stamina -= 8 / staminaScale;
    }

    sf.vy -= 7.4 * dt;
    sf.x += sf.vx * dt;
    sf.y += sf.vy * dt;
    if (sf.y < 0) {
        sf.y = 0;
        sf.vy = 0;
    }
    sf.x = Math.max(-1.08, Math.min(1.08, sf.x));

    if (block && sf.stamina > 0) {
        sf.action = 'block';
        sf.actionUntil = now + 80;
        sf.stamina = Math.max(0, sf.stamina - (13 / staminaScale) * dt);
    } else if (now > sf.actionUntil && sf.action !== 'idle') {
        sf.action = Math.abs(sf.vx) > 0.1 ? 'run' : 'idle';
    } else if (sf.action === 'idle' || sf.action === 'run') {
        sf.action = Math.abs(sf.vx) > 0.1 ? 'run' : 'idle';
    }

    const staminaRegen = (sf.action === 'idle' || sf.action === 'run' ? 19 : 8) * staminaScale;
    sf.stamina = Math.min(100, sf.stamina + staminaRegen * dt);
    sf.superMeter = Math.min(100, sf.superMeter + 2.2 * dt);
    if (sf.combo && now > sf.comboUntil) sf.combo = 0;
    if (sf.hitCooldown > 0) sf.hitCooldown -= dt;
}

function triggerStickFightAction(action) {
    const sf = state.stickFight;
    if (!sf.active || sf.finished || !sf.roundActive) return;
    const now = performance.now();
    if (now < sf.actionUntil && (sf.action === 'punch' || sf.action === 'kick')) return;
    const staminaCost = action === 'kick' ? 18 : action === 'special' ? 24 : 10;
    if (sf.stamina < staminaCost || (action === 'special' && sf.superMeter < 35)) {
        setStickFightStatus('Not enough meter', 700);
        return;
    }

    sf.stamina = Math.max(0, sf.stamina - staminaCost);
    if (action === 'special') sf.superMeter = Math.max(0, sf.superMeter - 35);
    sf.action = action;
    sf.actionUntil = now + (action === 'special' ? 520 : action === 'kick' ? 360 : 240);
    tryStickFightHit(action);
    sendStickFightState();
}

function tryStickFightHit(action) {
    const sf = state.stickFight;
    if (sf.hitCooldown > 0) return;
    const dx = sf.opponentX - sf.x;
    const dy = Math.abs(sf.opponentY - sf.y);
    const range = action === 'special' ? 0.58 : action === 'kick' ? 0.42 : 0.3;
    const inFront = Math.sign(dx || sf.facing) === sf.facing;
    if (!inFront || Math.abs(dx) > range || dy > 0.3) return;

    const blocked = sf.opponentAction === 'block' && Math.sign(-dx || sf.opponentFacing) === sf.opponentFacing;
    const baseDamage = action === 'special' ? 20 : action === 'kick' ? 12 : 8;
    const power = getStickFightCharacter(sf.selectedCharacter).power || 1;
    const damage = blocked ? Math.ceil(baseDamage * power * 0.25) : Math.ceil(baseDamage * power);
    sf.opponentHealth = Math.max(0, sf.opponentHealth - damage);
    sf.superMeter = Math.min(100, sf.superMeter + (blocked ? 6 : 12));
    sf.combo = blocked ? 0 : Math.min(9, sf.combo + 1);
    sf.comboUntil = performance.now() + 1400;
    sf.hitCooldown = 0.28;
    setStickFightStatus(blocked ? 'Blocked!' : `${getStickFightActionName(action)} landed`, 900);
    spawnStickFightSpark((sf.x + sf.opponentX) / 2, 1.35 + sf.opponentY, blocked ? '#53bdeb' : '#f6c343');

    if (sf.opponentHealth <= 0 && !sf.finished) {
        finishStickFightRound('me');
    }
}

function sendStickFightState() {
    const sf = state.stickFight;
    if (!sf.active) return;
    emitLegacyGame('game:move', {
        targetUserId: sf.opponentId,
        conversationId: sf.conversationId,
        moveData: {
            gameType: 'stickfight',
            x: sf.x,
            y: sf.y,
            facing: sf.facing,
            health: sf.health,
            stamina: sf.stamina,
            superMeter: sf.superMeter,
            opponentHealth: sf.opponentHealth,
            action: sf.action,
            selectedCharacter: sf.selectedCharacter,
            round: sf.round,
            roundActive: sf.roundActive,
            finished: sf.finished
        }
    });
}

function handleRemoteStickFightMove(moveData) {
    const sf = state.stickFight;
    if (!sf.active) return;
    if (moveData.actionType === 'character_select') {
        sf.opponentCharacter = moveData.characterId;
        renderStickFightRoster();
        maybeStartStickFightMatch();
        return;
    }
    if (moveData.actionType === 'round_end') {
        applyRemoteStickFightRoundEnd(moveData);
        return;
    }
    sf.opponentX = Number(moveData.x) || 0;
    sf.opponentY = Number(moveData.y) || 0;
    sf.opponentFacing = Number(moveData.facing) || -1;
    sf.opponentAction = moveData.action || 'idle';
    if (moveData.selectedCharacter) sf.opponentCharacter = moveData.selectedCharacter;
    if (moveData.round) sf.round = Number(moveData.round) || sf.round;
    if (typeof moveData.roundActive === 'boolean') sf.roundActive = moveData.roundActive;
    sf.opponentStamina = Math.max(0, Math.min(100, Number(moveData.stamina ?? sf.opponentStamina)));
    sf.opponentSuperMeter = Math.max(0, Math.min(100, Number(moveData.superMeter ?? sf.opponentSuperMeter)));
    sf.health = Math.max(0, Math.min(100, Number(moveData.opponentHealth ?? sf.health)));
    sf.opponentHealth = Math.max(0, Math.min(100, Number(moveData.health ?? sf.opponentHealth)));
    if (moveData.finished) sf.finished = true;
}

function updateStickFightHud(now = performance.now()) {
    const sf = state.stickFight;
    const myBar = $('stickfight-my-health');
    const rivalBar = $('stickfight-rival-health');
    const myStamina = $('stickfight-my-stamina');
    const rivalStamina = $('stickfight-rival-stamina');
    const mySuper = $('stickfight-my-super');
    const rivalSuper = $('stickfight-rival-super');
    const combo = $('stickfight-combo');
    const roundLabel = $('stickfight-round-label');
    if (myBar) myBar.style.width = `${sf.health}%`;
    if (rivalBar) rivalBar.style.width = `${sf.opponentHealth}%`;
    if (myStamina) myStamina.style.width = `${sf.stamina}%`;
    if (rivalStamina) rivalStamina.style.width = `${sf.opponentStamina}%`;
    if (mySuper) mySuper.style.width = `${sf.superMeter}%`;
    if (rivalSuper) rivalSuper.style.width = `${sf.opponentSuperMeter}%`;
    if (combo) {
        combo.textContent = sf.combo > 1 ? `Combo x${sf.combo}` : 'Combo x0';
        combo.classList.toggle('active', sf.combo > 1);
    }
    if (roundLabel) roundLabel.textContent = `Round ${sf.round} | First to ${sf.maxRoundWins}`;
    renderStickFightRoundPips('stickfight-my-rounds', sf.myRoundWins);
    renderStickFightRoundPips('stickfight-rival-rounds', sf.opponentRoundWins);
    if (!sf.finished && sf.statusUntil && now > sf.statusUntil) {
        $('stickfight-status-text').textContent = sf.roundActive ? 'Fight!' : 'Choose your fighter';
        sf.statusUntil = 0;
    }
    if (!sf.finished && sf.health <= 0) {
        finishStickFightRound('opponent');
    }
}

function getStickFightCharacter(id) {
    return STICKFIGHT_CHARACTERS.find(character => character.id === id) || STICKFIGHT_CHARACTERS[0];
}

function renderStickFightRoster() {
    const roster = $('stickfight-roster');
    if (!roster) return;
    const sf = state.stickFight;
    roster.innerHTML = STICKFIGHT_CHARACTERS.map(character => {
        const selected = sf.selectedCharacter === character.id ? ' selected' : '';
        const rival = sf.opponentCharacter === character.id ? ' rival' : '';
        const color = `#${character.color.toString(16).padStart(6, '0')}`;
        const accent = `#${character.accent.toString(16).padStart(6, '0')}`;
        return `
            <button type="button" class="fighter-card${selected}${rival}" data-character="${character.id}" style="--fighter-color:${color};--fighter-accent:${accent};">
                <span class="fighter-portrait"></span>
                <span class="fighter-name">${character.name}</span>
                <span class="fighter-role">${character.role}</span>
                <span class="fighter-special">${character.special}</span>
            </button>
        `;
    }).join('');
    $$('.fighter-card').forEach(card => {
        card.addEventListener('click', () => selectStickFightCharacter(card.dataset.character));
    });
    updateStickFightSelectStatus();
}

function selectStickFightCharacter(characterId) {
    const sf = state.stickFight;
    if (!sf.active || sf.roundActive) return;
    sf.selectedCharacter = characterId;
    applyStickFightCharacterSkins();
    renderStickFightRoster();
    emitLegacyGame('game:move', {
        targetUserId: sf.opponentId,
        conversationId: sf.conversationId,
        moveData: {
            gameType: 'stickfight',
            actionType: 'character_select',
            characterId
        }
    });
    maybeStartStickFightMatch();
}

function updateStickFightSelectStatus() {
    const sf = state.stickFight;
    const el = $('stickfight-select-status');
    if (!el) return;
    if (sf.selectedCharacter && sf.opponentCharacter) {
        const mine = getStickFightCharacter(sf.selectedCharacter).name;
        const rival = getStickFightCharacter(sf.opponentCharacter).name;
        el.textContent = `${mine} vs ${rival}`;
    } else if (sf.selectedCharacter) {
        el.textContent = 'Waiting for rival selection';
    } else if (sf.opponentCharacter) {
        el.textContent = `${sf.opponentName} selected. Pick your fighter.`;
    } else {
        el.textContent = 'Pick a fighter to lock in';
    }
}

function showStickFightCharacterSelect(show) {
    const select = $('stickfight-select');
    const canvas = $('stickfight-canvas');
    if (select) select.style.display = show ? 'block' : 'none';
    if (canvas) canvas.classList.toggle('selecting', show);
    updateStickFightSelectStatus();
}

function maybeStartStickFightMatch() {
    const sf = state.stickFight;
    if (!sf.active || sf.roundActive || sf.finished) return;
    updateStickFightSelectStatus();
    if (!sf.selectedCharacter || !sf.opponentCharacter) return;
    showStickFightCharacterSelect(false);
    applyStickFightCharacterSkins();
    startStickFightRoundCountdown();
}

function startStickFightRoundCountdown() {
    const sf = state.stickFight;
    if (sf.roundTimer) clearTimeout(sf.roundTimer);
    resetStickFightRoundState();
    sf.roundCountdownUntil = performance.now() + 1200;
    setStickFightStatus(`Round ${sf.round}`, 1100);
    sf.roundTimer = setTimeout(() => {
        if (!sf.active || sf.finished) return;
        sf.roundActive = true;
        sf.keys = {};
        setStickFightStatus('Fight!', 1000);
    }, 1200);
}

function resetStickFightRoundState() {
    const sf = state.stickFight;
    sf.x = sf.playerNum === 1 ? -0.62 : 0.62;
    sf.y = 0;
    sf.vx = 0;
    sf.vy = 0;
    sf.facing = sf.playerNum === 1 ? 1 : -1;
    sf.health = 100;
    sf.stamina = 100;
    sf.superMeter = Math.min(100, sf.superMeter || 0);
    sf.combo = 0;
    sf.comboUntil = 0;
    sf.opponentX = sf.playerNum === 1 ? 0.62 : -0.62;
    sf.opponentY = 0;
    sf.opponentFacing = sf.playerNum === 1 ? -1 : 1;
    sf.opponentHealth = 100;
    sf.opponentStamina = 100;
    sf.opponentSuperMeter = Math.min(100, sf.opponentSuperMeter || 0);
    sf.action = 'idle';
    sf.opponentAction = 'idle';
    sf.actionUntil = 0;
    sf.statusUntil = 0;
    sf.hitCooldown = 0;
    sf.hitSparks = [];
    sf.roundActive = false;
}

function finishStickFightRound(winner) {
    const sf = state.stickFight;
    if (!sf.active || sf.finished || !sf.roundActive) return;
    sf.roundActive = false;
    sf.keys = {};

    if (winner === 'me') sf.myRoundWins += 1;
    if (winner === 'opponent') sf.opponentRoundWins += 1;

    const winnerId = winner === 'me' ? state.user.id : sf.opponentId;
    const matchOver = sf.myRoundWins >= sf.maxRoundWins || sf.opponentRoundWins >= sf.maxRoundWins;
    setStickFightStatus(winner === 'me' ? `Round ${sf.round} won` : `${sf.opponentName} wins round ${sf.round}`, 1800);

    emitLegacyGame('game:move', {
        targetUserId: sf.opponentId,
        conversationId: sf.conversationId,
        moveData: {
            gameType: 'stickfight',
            actionType: 'round_end',
            winnerId,
            round: sf.round,
            myRoundWins: sf.myRoundWins,
            opponentRoundWins: sf.opponentRoundWins,
            matchOver
        }
    });

    if (matchOver) {
        sf.finished = true;
        emitLegacyGame('game:end', {
            targetUserId: sf.opponentId,
            conversationId: sf.conversationId,
            winnerId
        });
        return;
    }

    sf.round += 1;
    sf.roundTimer = setTimeout(() => {
        if (sf.active && !sf.finished) startStickFightRoundCountdown();
    }, 1900);
}

function applyRemoteStickFightRoundEnd(moveData) {
    const sf = state.stickFight;
    if (!sf.active) return;
    sf.roundActive = false;
    sf.keys = {};
    const remoteWinnerIsMe = moveData.winnerId === state.user.id;
    sf.myRoundWins = Math.max(sf.myRoundWins, Number(moveData.opponentRoundWins ?? sf.myRoundWins));
    sf.opponentRoundWins = Math.max(sf.opponentRoundWins, Number(moveData.myRoundWins ?? sf.opponentRoundWins));
    setStickFightStatus(remoteWinnerIsMe ? `Round ${sf.round} won` : `${sf.opponentName} wins round ${sf.round}`, 1800);

    if (moveData.matchOver) {
        sf.finished = true;
        return;
    }

    sf.round = Math.max(sf.round, Number(moveData.round || sf.round) + 1);
    if (sf.roundTimer) clearTimeout(sf.roundTimer);
    sf.roundTimer = setTimeout(() => {
        if (sf.active && !sf.finished) startStickFightRoundCountdown();
    }, 1900);
}

function renderStickFightRoundPips(id, wins) {
    const el = $(id);
    if (!el) return;
    const sf = state.stickFight;
    let html = '';
    for (let i = 0; i < sf.maxRoundWins; i++) {
        html += `<span class="${i < wins ? 'won' : ''}"></span>`;
    }
    el.innerHTML = html;
}

function applyStickFightCharacterSkins() {
    const sf = state.stickFight;
    const world = sf.three;
    if (!world?.fighters) return;
    setStickFightFighterMaterials(world.fighters.player, getStickFightCharacter(sf.selectedCharacter));
    setStickFightFighterMaterials(world.fighters.opponent, getStickFightCharacter(sf.opponentCharacter));
}

function setStickFightFighterMaterials(fighter, character) {
    if (!fighter?.parts || !state.stickFight.three?.THREE) return;
    const THREE = state.stickFight.three.THREE;
    const mainColor = new THREE.Color(character.color);
    const accentColor = new THREE.Color(character.accent);
    ['torso', 'frontArm', 'backArm', 'frontForearm', 'backForearm', 'frontLeg', 'backLeg', 'frontShin', 'backShin', 'head', 'backFist'].forEach(key => {
        const mat = fighter.parts[key]?.material;
        if (mat?.color) mat.color.copy(mainColor);
    });
    ['chest', 'frontFist', 'shield'].forEach(key => {
        const mat = fighter.parts[key]?.material;
        if (!mat) return;
        if (mat.color) mat.color.copy(accentColor);
        if (mat.emissive) mat.emissive.copy(accentColor);
    });
    const aura = fighter.parts.aura?.material;
    if (aura?.color) aura.color.copy(accentColor);
}

function drawStickFightScene(now) {
    drawStickFight3D(now);
}

function loadStickFightThree() {
    if (!stickFightThreePromise) {
        stickFightThreePromise = import('/vendor/three/three.module.js');
    }
    return stickFightThreePromise;
}

async function prepareStickFight3D() {
    const canvas = $('stickfight-canvas');
    if (!canvas) return;
    const sf = state.stickFight;
    if (sf.three?.renderer) return;

    const THREE = await loadStickFightThree();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09131a);
    scene.fog = new THREE.Fog(0x09131a, 7, 15);

    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 80);
    camera.position.set(0, 2.7, 7.2);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const hemi = new THREE.HemisphereLight(0xb7e3ff, 0x152027, 1.5);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(-3.6, 6, 4.2);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    scene.add(key);

    const rim = new THREE.PointLight(0xf6c343, 18, 12, 1.8);
    rim.position.set(3.7, 2.8, -2.4);
    scene.add(rim);

    const arena = new THREE.Group();
    scene.add(arena);

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x26343a, roughness: 0.78, metalness: 0.12 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.18, 5.8), floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    arena.add(floor);

    const matA = new THREE.MeshStandardMaterial({ color: 0x31515b, roughness: 0.65, metalness: 0.2 });
    const matB = new THREE.MeshStandardMaterial({ color: 0x0f1e25, roughness: 0.85, metalness: 0.1 });
    for (let i = -5; i <= 5; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 5.4), i % 2 ? matA : matB);
        stripe.position.set(i, 0.02, 0);
        arena.add(stripe);
    }

    const grid = new THREE.GridHelper(11, 22, 0x53bdeb, 0x24414b);
    grid.position.y = 0.035;
    arena.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x13232b, roughness: 0.9, metalness: 0.08 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(11.4, 2.6, 0.2), wallMat);
    backWall.position.set(0, 1.25, -3.05);
    backWall.receiveShadow = true;
    arena.add(backWall);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00c49a });
    for (let i = 0; i < 4; i++) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.035, 0.035), lineMat);
        rail.position.set(0, 0.52 + i * 0.35, -2.72);
        arena.add(rail);
    }

    const postMat = new THREE.MeshStandardMaterial({ color: 0xf6c343, roughness: 0.42, metalness: 0.45 });
    [-5.2, 5.2].forEach(x => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.9, 16), postMat);
        post.position.set(x, 0.95, -2.72);
        post.castShadow = true;
        arena.add(post);
    });

    const player = createStickFightFighter(THREE, 0x00c49a, 0x53bdeb);
    const opponent = createStickFightFighter(THREE, 0xf6c343, 0xff5c4d);
    scene.add(player.group, opponent.group);

    sf.three = {
        THREE,
        scene,
        camera,
        renderer,
        fighters: { player, opponent },
        sparks: [],
        lastWidth: 0,
        lastHeight: 0
    };
    drawStickFight3D(performance.now());
}

function createStickFightFighter(THREE, color, accent) {
    const group = new THREE.Group();
    const main = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.18 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b1419, roughness: 0.62, metalness: 0.1 });
    const glow = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.25, roughness: 0.25 });
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
    const parts = {};

    const makeCylinder = (name, radius, material = main) => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 14), material);
        mesh.castShadow = true;
        group.add(mesh);
        parts[name] = mesh;
        return mesh;
    };

    ['torso', 'frontArm', 'backArm', 'frontForearm', 'backForearm', 'frontLeg', 'backLeg', 'frontShin', 'backShin'].forEach(name => {
        makeCylinder(name, name.includes('Leg') || name.includes('Shin') ? 0.075 : 0.065);
    });

    parts.head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), main);
    parts.head.castShadow = true;
    group.add(parts.head);

    parts.chest = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12), glow);
    parts.chest.castShadow = true;
    group.add(parts.chest);

    parts.frontFist = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), glow);
    parts.backFist = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), main);
    parts.frontFoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.16), dark);
    parts.backFoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.16), dark);
    [parts.frontFist, parts.backFist, parts.frontFoot, parts.backFoot].forEach(mesh => {
        mesh.castShadow = true;
        group.add(mesh);
    });

    parts.shield = new THREE.Mesh(
        new THREE.TorusGeometry(0.33, 0.035, 12, 36),
        new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.35, transparent: true, opacity: 0.55 })
    );
    parts.shield.visible = false;
    group.add(parts.shield);

    parts.aura = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 24, 18),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.16 })
    );
    parts.aura.visible = false;
    group.add(parts.aura);

    parts.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), shadowMat);
    parts.shadow.rotation.x = -Math.PI / 2;
    group.add(parts.shadow);

    return { group, parts };
}

function drawStickFight3D(now) {
    const sf = state.stickFight;
    const world = sf.three;
    if (!world?.renderer) return;

    resizeStickFightRenderer(world);
    updateStickFightFighterMesh(world.fighters.player, sf.x, sf.y, sf.facing, sf.action, now, true);
    updateStickFightFighterMesh(world.fighters.opponent, sf.opponentX, sf.opponentY, sf.opponentFacing, sf.opponentAction, now, false);
    updateStickFightSparks(world, now);

    const centerX = ((sf.x + sf.opponentX) / 2) * 4.4;
    const gap = Math.abs(sf.x - sf.opponentX);
    world.camera.position.set(centerX, 2.65 + Math.min(gap, 1.2) * 0.18, 6.4 + gap * 0.7);
    world.camera.lookAt(centerX, 1.1, 0);
    world.renderer.render(world.scene, world.camera);
}

function resizeStickFightRenderer(world) {
    const canvas = $('stickfight-canvas');
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(360, Math.floor(rect.width));
    const height = Math.max(230, Math.floor(rect.height));
    if (world.lastWidth !== width || world.lastHeight !== height) {
        world.lastWidth = width;
        world.lastHeight = height;
        world.renderer.setSize(width, height, false);
        world.camera.aspect = width / height;
        world.camera.updateProjectionMatrix();
    }
}

function updateStickFightFighterMesh(fighter, x, y, facing, action, now, isPlayer) {
    const { group, parts } = fighter;
    const worldX = x * 4.4;
    const jumpY = y * 1.55;
    group.position.set(worldX, jumpY, isPlayer ? 0.06 : -0.06);

    const f = facing >= 0 ? 1 : -1;
    const run = action === 'run' ? Math.sin(now / 75) : 0;
    const idle = Math.sin(now / 320) * 0.03;
    const hipY = 0.88 + idle;
    const shoulderY = 1.46 + idle;
    const headY = 1.9 + idle;
    const frontPunch = action === 'punch' || action === 'special';
    const frontKick = action === 'kick';

    placeStickFightSegment(parts.torso, 0, hipY, 0, shoulderY + 0.06, 0);
    parts.head.position.set(0, headY, 0.01);
    parts.chest.position.set(0, shoulderY - 0.14, 0.05);

    let frontHand = { x: f * (frontPunch ? 0.68 : 0.28), y: shoulderY + (frontPunch ? 0.02 : -0.28), z: 0.07 };
    let backHand = { x: -f * 0.28, y: shoulderY - 0.32, z: -0.08 };
    if (action === 'block') {
        frontHand = { x: f * 0.28, y: shoulderY - 0.04, z: 0.14 };
        backHand = { x: f * 0.16, y: shoulderY - 0.32, z: 0.16 };
    }

    const frontElbow = { x: f * (frontPunch ? 0.42 : 0.2), y: shoulderY - (frontPunch ? 0 : 0.16), z: 0.05 };
    const backElbow = { x: -f * 0.18, y: shoulderY - 0.17, z: -0.04 };
    placeStickFightSegment(parts.frontArm, f * 0.13, shoulderY, frontElbow.x, frontElbow.y, frontElbow.z);
    placeStickFightSegment(parts.frontForearm, frontElbow.x, frontElbow.y, frontHand.x, frontHand.y, frontHand.z);
    placeStickFightSegment(parts.backArm, -f * 0.12, shoulderY - 0.02, backElbow.x, backElbow.y, backElbow.z);
    placeStickFightSegment(parts.backForearm, backElbow.x, backElbow.y, backHand.x, backHand.y, backHand.z);
    parts.frontFist.position.set(frontHand.x, frontHand.y, frontHand.z);
    parts.backFist.position.set(backHand.x, backHand.y, backHand.z);

    const stride = run * 0.16;
    const frontKnee = { x: f * (frontKick ? 0.48 : 0.14 + stride), y: frontKick ? 0.66 : 0.42, z: 0.05 };
    const frontFoot = { x: f * (frontKick ? 0.88 : 0.28 + stride), y: frontKick ? 0.52 : 0.06, z: 0.08 };
    const backKnee = { x: -f * (0.18 + stride), y: 0.42, z: -0.06 };
    const backFoot = { x: -f * (0.34 + stride), y: 0.06, z: -0.08 };
    placeStickFightSegment(parts.frontLeg, f * 0.08, hipY, frontKnee.x, frontKnee.y, frontKnee.z);
    placeStickFightSegment(parts.frontShin, frontKnee.x, frontKnee.y, frontFoot.x, frontFoot.y, frontFoot.z);
    placeStickFightSegment(parts.backLeg, -f * 0.08, hipY, backKnee.x, backKnee.y, backKnee.z);
    placeStickFightSegment(parts.backShin, backKnee.x, backKnee.y, backFoot.x, backFoot.y, backFoot.z);
    parts.frontFoot.position.set(frontFoot.x, frontFoot.y, frontFoot.z);
    parts.backFoot.position.set(backFoot.x, backFoot.y, backFoot.z);

    parts.shield.visible = action === 'block';
    parts.shield.position.set(f * 0.33, 1.23, 0.19);
    parts.shield.rotation.set(Math.PI / 2, 0, 0);
    parts.aura.visible = action === 'special';
    parts.aura.position.set(f * 0.5, 1.42, 0.03);
    parts.aura.scale.setScalar(1 + Math.sin(now / 45) * 0.08);
    parts.shadow.position.set(0, -jumpY + 0.01, 0);
    parts.shadow.scale.setScalar(Math.max(0.5, 1 - y * 0.35));
}

function placeStickFightSegment(mesh, x1, y1, x2, y2, z = 0) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
    mesh.scale.set(1, length, 1);
    mesh.rotation.set(0, 0, -Math.atan2(dx, dy));
}

function spawnStickFightSpark(x, y, color) {
    const world = state.stickFight.three;
    if (!world?.THREE) return;
    const THREE = world.THREE;
    for (let i = 0; i < 8; i++) {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.035 + Math.random() * 0.025, 10, 8),
            new THREE.MeshBasicMaterial({ color })
        );
        mesh.position.set(x * 4.4, y, 0.12);
        world.scene.add(mesh);
        world.sparks.push({
            mesh,
            life: 0.32 + Math.random() * 0.18,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.4, (Math.random() - 0.5) * 0.9)
        });
    }
}

function updateStickFightSparks(world) {
    for (let i = world.sparks.length - 1; i >= 0; i--) {
        const spark = world.sparks[i];
        spark.life -= 0.016;
        spark.mesh.position.addScaledVector(spark.velocity, 0.016);
        spark.velocity.y -= 2.8 * 0.016;
        spark.mesh.material.opacity = Math.max(0, spark.life / 0.4);
        spark.mesh.material.transparent = true;
        if (spark.life <= 0) {
            world.scene.remove(spark.mesh);
            spark.mesh.geometry.dispose();
            spark.mesh.material.dispose();
            world.sparks.splice(i, 1);
        }
    }
}

function setStickFightStatus(text, duration = 900) {
    const sf = state.stickFight;
    const el = $('stickfight-status-text');
    if (el) el.textContent = text;
    sf.statusUntil = performance.now() + duration;
}

function getStickFightActionName(action) {
    if (action === 'special') return 'Special';
    if (action === 'kick') return 'Kick';
    return 'Punch';
}

function setStickFightKey(code, active) {
    if (!state.stickFight.active) return;
    state.stickFight.keys[code] = active;
    if (active && (code === 'KeyJ' || code === 'KeyK' || code === 'KeyI')) {
        triggerStickFightAction(code === 'KeyI' ? 'special' : code === 'KeyK' ? 'kick' : 'punch');
    }
}

function closeStickFight() {
    leaveLegacyGame(state.stickFight, 'stickfight');
    const sf = state.stickFight;
    sf.active = false;
    sf.keys = {};
    if (sf.roundTimer) clearTimeout(sf.roundTimer);
    sf.roundTimer = null;
    if (sf.raf) cancelAnimationFrame(sf.raf);
    sf.raf = null;
    const overlay = $('stickfight-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ─── Ludo Game Functions ───────────────────────────────────
const LUDO_TRACK = LudoBoard.track;
const LUDO_SLOTS = LudoBoard.slots;

function getLudoPlayerName(player) {
    return player?.display_name || player?.username || 'Player';
}

function getLudoSlot(playerIndex) {
    return state.ludoGame.players[playerIndex]?.slot ?? playerIndex;
}

function getLudoAbsSquare(playerIndex, progress) {
    if (progress < 0 || progress >= 51) return null;
    const offset = (getLudoSlot(playerIndex) * 13) % 52;
    return (offset + progress) % 52;
}

function getLudoStackAt(playerIndex, progress) {
    const absSquare = getLudoAbsSquare(playerIndex, progress);
    if (absSquare === null) return [];
    const stack = [];
    state.ludoGame.positions.forEach((tokens, otherIndex) => {
        tokens.forEach((tokenProgress, tokenIndex) => {
            if (getLudoAbsSquare(otherIndex, tokenProgress) === absSquare) {
                stack.push({ playerIndex: otherIndex, tokenIndex });
            }
        });
    });
    return stack;
}

function ludoHomePathBlocked(tokens, current, target, tokenIndex) {
    if (target < 51) return false;
    const from = Math.max(51, current + 1);
    return tokens.some((progress, index) =>
        index !== tokenIndex &&
        progress >= from &&
        progress <= target &&
        progress < 56
    );
}

function getLudoMovableTokens() {
    const lg = state.ludoGame;
    const myIndex = lg.playerNum - 1;
    const roll = lg.lastRoll;
    if (!lg.active || lg.tokenMotion || !roll || lg.currentTurnPlayerId !== state.user.id) return [];
    return LudoRules.movable(lg, myIndex, roll);
}

function initLudoGame(data) {
    if (!state.ludoGame.active || state.ludoGame.conversationId !== data.conversationId) {
        state.ludoGame.players = [];
        state.ludoGame.positions = [];
    }
    state.ludoGame.resultShown = false;
    state.ludoGame.active = true;
    state.ludoGame.conversationId = data.conversationId;
    updateLudoGame(data);
    const overlay = $('ludo-overlay');
    if (overlay) overlay.style.display = 'flex';
    setTimeout(drawLudoBoard, 50);
}

function updateLudoGame(data, animate = true) {
    const lg = state.ludoGame;
    if (!data || !lg.active || data.conversationId !== lg.conversationId) return;
    if (lg.tokenMotion) {
        lg.pendingMoveStates = [...(lg.pendingMoveStates || []), data];
        return;
    }
    if (lg.rollingUntil && performance.now() < lg.rollingUntil) {
        lg.pendingRollState = data;
        clearTimeout(lg.rollPresentationTimer);
        lg.rollPresentationTimer = setTimeout(() => {
            const pending = lg.pendingRollState;
            lg.pendingRollState = null;
            lg.rollingUntil = 0;
            if (lg.active && pending?.conversationId === lg.conversationId) updateLudoGame(pending);
        }, Math.max(0, lg.rollingUntil - performance.now()));
        return;
    }

    const motions = animate ? LudoBoard.motions(lg, data) : [];
    lg.active = true;
    lg.conversationId = data.conversationId;
    lg.players = data.players || [];
    lg.playerNum = data.playerNum || lg.playerNum || 1;
    lg.positions = data.positions || [];
    lg.currentTurnIndex = data.currentTurnIndex || 0;
    lg.currentTurnPlayerId = data.currentTurnPlayerId || lg.players[lg.currentTurnIndex]?.id || null;
    lg.lastRoll = data.lastRoll || null;
    lg.mustMove = !!data.mustMove;
    lg.winners = data.winners || [];
    lg.consecutiveSixes = data.consecutiveSixes || [];
    lg.lastDice = data.lastDice || lg.lastRoll || null;
    lg.diceByPlayer = data.diceByPlayer || {};
    lg.lastRollPlayerId = data.lastRollPlayerId || null;
    lg.rollingPlayerId = null;
    lg.notice = data.notice || '';

    if (motions.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        lg.tokenMotion = { paths: new Map(motions.map(path => [path.key, path])), started: performance.now(),
            duration: Math.max(...motions.map(path => path.delay + (path.points.length - 1) * path.stepMs)) };
        lg.motionFrame = requestAnimationFrame(animateLudoTokens);
    }

    renderLudoScorebar();
    updateLudoStatus();
    drawLudoBoard();
    window.MessengerNative?.renderDice({ rolling: false, value: lg.lastDice });
    if (!lg.tokenMotion && lg.pendingMoveStates?.length) updateLudoGame(lg.pendingMoveStates.shift());
}

function animateLudoTokens(now) {
    const lg = state.ludoGame;
    if (!lg.active || !lg.tokenMotion) return;
    if (now - lg.tokenMotion.started < lg.tokenMotion.duration) {
        drawLudoBoard();
        lg.motionFrame = requestAnimationFrame(animateLudoTokens);
        return;
    }
    lg.tokenMotion = null;
    lg.motionFrame = null;
    const next = lg.pendingMoveStates?.shift();
    if (next) updateLudoGame(next);
    else { renderLudoScorebar(); updateLudoStatus(); drawLudoBoard(); }
}

function renderLudoScorebar() {
    const lg = state.ludoGame;
    window.MessengerNative?.renderLudoSeats({
        players:lg.players.map((player,index)=>({id:player.id,name:getLudoPlayerName(player),slot:player.slot??index,color:(LUDO_SLOTS[player.slot??index]||LUDO_SLOTS[0]).color,home:(lg.positions[index]||[]).filter(p=>p>=56).length,rank:lg.winners.indexOf(player.id)+1})),
        myId:state.user.id,turnId:lg.currentTurnPlayerId,rolls:lg.diceByPlayer||{},rollingId:lg.rollingPlayerId,
        canRoll:!lg.tokenMotion && !lg.lastRoll && !(lg.rollingUntil>performance.now()),onRoll:rollLudoDice
    });
}

function updateLudoStatus() {
    const lg = state.ludoGame;
    const myFinished = lg.winners.includes(state.user.id);
    const turnPlayer = lg.players[lg.currentTurnIndex];
    const turnName = turnPlayer?.id === state.user.id ? 'Your' : `${getLudoPlayerName(turnPlayer)}'s`;
    const status = $('ludo-status-text');
    const rollBtn = $('ludo-roll-btn');
    const hint = $('ludo-hint');
    const isMyTurn = lg.currentTurnPlayerId === state.user.id && !myFinished;
    const movable = getLudoMovableTokens();
    const notice = $('ludo-notice');
    if (notice) notice.textContent = lg.notice;
    const choices = $('ludo-legal-moves');
    if (lg.tokenMotion) {
        choices?.replaceChildren();
        if (status) status.textContent = 'Moving token…';
        if (rollBtn) { rollBtn.disabled = true; rollBtn.textContent = 'Moving…'; }
        if (hint) hint.textContent = 'Following the board, one square at a time.';
        return;
    }
    if (choices) {
        choices.replaceChildren();
        movable.forEach(tokenIndex => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `Move token ${tokenIndex + 1}`;
            button.onclick = () => state.socket.emit('ludo:move', { conversationId: lg.conversationId, tokenIndex });
            choices.append(button);
        });
    }

    if (lg.winners.length >= lg.players.length) {
        const winner = lg.players.find(player => player.id === lg.winners[0]);
        if (status) status.textContent = `${getLudoPlayerName(winner)} wins the Ludo game`;
        if (!lg.resultShown) { lg.resultShown = true; window.MessengerArcade?.result({winnerName:getLudoPlayerName(winner),reason:'Ludo · First to bring every token home'}); }
    } else if (myFinished) {
        if (status) status.textContent = 'You finished. Waiting for the remaining players.';
    } else if (isMyTurn && lg.lastRoll && movable.length) {
        if (status) status.textContent = `You rolled ${lg.lastRoll}. Move a token.`;
    } else if (isMyTurn && lg.lastRoll) {
        if (status) status.textContent = `You rolled ${lg.lastRoll}.`;
    } else {
        if (status) status.textContent = `${turnName} turn`;
    }

    if (rollBtn) {
        rollBtn.disabled = !isMyTurn || !!lg.lastRoll;
        rollBtn.textContent = lg.lastRoll ? `⚄ ${lg.lastRoll}` : `Roll${lg.lastDice ? ` · last ${lg.lastDice}` : ''}`;
    }

    if (hint) {
        if (isMyTurn && lg.lastRoll && movable.length) {
            hint.textContent = 'Click one of your highlighted tokens to move.';
        } else if (isMyTurn && lg.lastRoll === 6 && !movable.length) {
            hint.textContent = 'Third six or no legal move. Turn passes.';
        } else if (isMyTurn) {
            hint.textContent = 'Roll the dice. A 6 brings a token out of base.';
        } else {
            hint.textContent = 'Stars and starts are safe. Capture or reach home for a bonus roll. Finish with an exact roll.';
        }
    }
}

function drawLudoBoard() {
    const canvas = $('ludo-canvas');
    if (!canvas || !state.ludoGame.active) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const style = getComputedStyle(canvas);
    const border = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
    const cssSize = Math.max(1, Math.round(rect.width - border || 680));
    const size = Math.floor(cssSize * dpr);
    if (canvas.width !== size || canvas.height !== size) { canvas.width = size; canvas.height = size; }
    const ctx = canvas.getContext('2d');
    const lg = state.ludoGame;
    const unit = size / 15;
    const tokenRadius = unit * 0.33;
    const movable = new Set(getLudoMovableTokens());
    lg.tokenHitAreas = [];

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#f5f7fb';
    ctx.fillRect(0, 0, size, size);

    LUDO_SLOTS.forEach(slot => {
        const [row, col, rows, cols] = slot.yardBox;
        drawLudoRect(ctx, col * unit, row * unit, cols * unit, rows * unit, slot.light, '#d1d5db', unit * 0.18);
        drawLudoRect(ctx, (col + 1) * unit, (row + 1) * unit, 4 * unit, 4 * unit, '#ffffff', slot.color, unit * 0.16);
        slot.yard.forEach(([yardRow, yardCol]) => {
            drawLudoCircle(ctx, (yardCol + 0.5) * unit, (yardRow + 0.5) * unit, unit * 0.34, slot.light, slot.color, 2 * dpr);
        });
    });

    LUDO_TRACK.forEach(([row, col], square) => {
        drawLudoCell(ctx, row, col, unit, '#ffffff', '#cbd5e1');
        if ([0, 13, 26, 39].includes(square)) {
            const slot = LUDO_SLOTS[square / 13];
            drawLudoCell(ctx, row, col, unit, slot.color, '#ffffff');
        }
        if (LudoRules.SAFE.includes(square)) {
            ctx.fillStyle = [0,13,26,39].includes(square) ? '#ffffff' : '#64748b';
            ctx.font = `${unit * .6}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('★', (col+.5)*unit, (row+.5)*unit);
        }
    });

    LUDO_SLOTS.forEach(slot => {
        slot.homeLane.forEach(([row, col]) => drawLudoCell(ctx, row, col, unit, slot.light, slot.color));
    });

    drawLudoFinish(ctx, unit);

    const grouped = new Map();
    lg.positions.forEach((tokens, playerIndex) => {
        tokens.forEach((progress, tokenIndex) => {
            let point = ludoTokenPoint(playerIndex, tokenIndex, progress, unit);
            const motion = lg.tokenMotion?.paths.get(`${lg.players[playerIndex].id}:${tokenIndex}`);
            if (motion) {
                const frame = LudoBoard.sample(motion, performance.now() - lg.tokenMotion.started);
                point = { x: frame.x * unit, y: (frame.y - frame.lift) * unit };
            }
            const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push({ playerIndex, tokenIndex, progress, point });
        });
    });

    grouped.forEach(group => {
        group.forEach((token, groupIndex) => {
            const point = offsetLudoGroupedPoint(token.point, groupIndex, group.length, unit);
            const slot = LUDO_SLOTS[getLudoSlot(token.playerIndex)] || LUDO_SLOTS[0];
            const color = slot.color;
            const isMine = token.playerIndex === lg.playerNum - 1;
            const canMove = isMine && movable.has(token.tokenIndex);
            const radius = token.progress >= 56 ? unit * .17 : tokenRadius;

            ctx.shadowColor = canMove ? color : 'transparent';
            ctx.shadowBlur = canMove ? 14 : 0;
            ctx.fillStyle = color;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = canMove ? 4 : 2;
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${Math.floor(radius * 1.1)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(token.tokenIndex + 1), point.x, point.y);

            if (isMine) {
                lg.tokenHitAreas.push({
                    tokenIndex: token.tokenIndex,
                    x: point.x,
                    y: point.y,
                    radius: tokenRadius * 1.6
                });
            }
        });
    });
}

function drawLudoCell(ctx, row, col, unit, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, unit * 0.025);
    ctx.fillRect(col * unit, row * unit, unit, unit);
    ctx.strokeRect(col * unit, row * unit, unit, unit);
}

function drawLudoRect(ctx, x, y, width, height, fill, stroke, radius) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, width * 0.006);
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    ctx.stroke();
}

function drawLudoCircle(ctx, x, y, radius, fill, stroke, lineWidth) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function drawLudoFinish(ctx, unit) {
    const cx = 7.5 * unit;
    const cy = 7.5 * unit;
    const points = {
        top: [[6,6], [9,6], [7.5,7.5]],
        right: [[9,6], [9,9], [7.5,7.5]],
        bottom: [[9,9], [6,9], [7.5,7.5]],
        left: [[6,9], [6,6], [7.5,7.5]]
    };
    const colors = [LUDO_SLOTS[1].color, LUDO_SLOTS[2].color, LUDO_SLOTS[3].color, LUDO_SLOTS[0].color];
    Object.values(points).forEach((triangle, index) => {
        ctx.fillStyle = colors[index];
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, unit * 0.04);
        ctx.beginPath();
        triangle.forEach(([col, row], pointIndex) => {
            const x = col * unit;
            const y = row * unit;
            if (pointIndex === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.floor(unit * 0.42)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HOME', cx, cy);
}

function ludoTokenPoint(playerIndex, tokenIndex, progress, unit) {
    return LudoBoard.point(getLudoSlot(playerIndex), tokenIndex, progress, unit);
}

function offsetLudoGroupedPoint(point, groupIndex, groupLength, unit) {
    if (groupLength <= 1) return point;
    const angle = Math.PI * 2 * groupIndex / groupLength;
    const spread = unit * 0.18;
    return {
        x: point.x + Math.cos(angle) * spread,
        y: point.y + Math.sin(angle) * spread
    };
}

function rollLudoDice() {
    const lg = state.ludoGame;
    if (!lg.active || lg.tokenMotion || lg.currentTurnPlayerId !== state.user.id || lg.lastRoll || lg.rollingUntil > performance.now()) return;
    startLudoRollAnimation();
    state.socket.emit('ludo:roll', { conversationId: lg.conversationId });
}

function startLudoRollAnimation(playerId) {
    const lg = state.ludoGame;
    if (!lg.active || lg.tokenMotion || lg.rollingUntil > performance.now()) return;
    lg.rollingPlayerId = playerId || lg.currentTurnPlayerId;
    lg.rollingUntil = performance.now() + (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 750);
    $('ludo-roll-btn').disabled = true;
    $('ludo-legal-moves')?.replaceChildren();
    renderLudoScorebar();
    clearTimeout(lg.rollRecoveryTimer);
    lg.rollRecoveryTimer = setTimeout(() => {
        if (!lg.active || lg.pendingRollState) return;
        lg.rollingUntil = 0;
        lg.rollingPlayerId = null;
        renderLudoScorebar();
        updateLudoStatus();
        window.MessengerNative?.renderDice({ rolling: false, value: lg.lastDice });
    }, 5000);
}

function handleLudoCanvasClick(e) {
    const lg = state.ludoGame;
    if (lg.tokenMotion || lg.rollingUntil > performance.now()) return;
    if (!lg.active || lg.currentTurnPlayerId !== state.user.id || !lg.lastRoll) return;
    const canvas = $('ludo-canvas');
    const rect = canvas.getBoundingClientRect();
    const style = getComputedStyle(canvas);
    const left = parseFloat(style.borderLeftWidth) || 0;
    const top = parseFloat(style.borderTopWidth) || 0;
    const sx = canvas.width / (rect.width - left - (parseFloat(style.borderRightWidth) || 0));
    const sy = canvas.height / (rect.height - top - (parseFloat(style.borderBottomWidth) || 0));
    const x = (e.clientX - rect.left - left) * sx;
    const y = (e.clientY - rect.top - top) * sy;
    const movable = new Set(getLudoMovableTokens());
    const hit = lg.tokenHitAreas.find(area =>
        movable.has(area.tokenIndex) && Math.hypot(x - area.x, y - area.y) <= area.radius
    );
    if (hit) {
        state.socket.emit('ludo:move', {
            conversationId: lg.conversationId,
            tokenIndex: hit.tokenIndex
        });
    }
}

function closeLudoGame(notifyServer = true) {
    cancelAnimationFrame(state.ludoGame.motionFrame);
    state.ludoGame.motionFrame = null;
    state.ludoGame.tokenMotion = null;
    state.ludoGame.pendingMoveStates = [];
    window.MessengerNative?.renderLudoSeats({players:[]});
    clearTimeout(state.ludoGame.rollPresentationTimer);
    clearTimeout(state.ludoGame.rollRecoveryTimer);
    state.ludoGame.rollingUntil = 0;
    state.ludoGame.pendingRollState = null;
    const conversationId = state.ludoGame.conversationId;
    if (notifyServer && state.ludoGame.active && conversationId) {
        state.socket.emit('ludo:leave', { conversationId });
    }
    state.ludoGame.active = false;
    state.ludoGame.conversationId = null;
    state.ludoGame.players = [];
    state.ludoGame.positions = [];
    state.ludoGame.tokenHitAreas = [];
    const overlay = $('ludo-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ─── Initialize Game UI ────────────────────────────────────
let isGameUIInitialized = false;
function initGameUI() {
    if (isGameUIInitialized) return;
    isGameUIInitialized = true;

    // ── Game Selection Modal ──
    $('game-btn')?.addEventListener('click', () => {
        const conv = state.conversations.find(c => c.id === state.activeConversation);
        if (!conv) { showToast('No active conversation', true); return; }
        $('game-selection-modal').style.display = 'flex';
    });

    $('close-game-selection')?.addEventListener('click',  () => { $('game-selection-modal').style.display = 'none'; });
    $('cancel-game-selection')?.addEventListener('click', () => { $('game-selection-modal').style.display = 'none'; });

    // Toggle game-type buttons
    $$('.game-select-option').forEach(opt => {
        opt.addEventListener('click', () => {
            $$('.game-select-option').forEach(o => {o.classList.remove('active');o.setAttribute('aria-pressed','false');});
            opt.classList.add('active');opt.setAttribute('aria-pressed','true');
            const gameType = opt.dataset.game;
            $('dots-size-group').style.display = gameType === 'dotsandboxes' ? 'block' : 'none';
            $('ludo-player-group').style.display = gameType === 'ludo' ? 'block' : 'none';
            const sendBtn = $('send-game-invite');
            if (sendBtn) sendBtn.textContent = gameType === 'ludo' ? 'Start Ludo' : 'Send Invite';
        });
    });

    // Toggle size buttons
    $$('.size-select-option').forEach(opt => {
        opt.addEventListener('click', () => {
            $$('.size-select-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    // Toggle Ludo player count buttons
    $$('.ludo-player-option').forEach(opt => {
        opt.addEventListener('click', () => {
            $$('.ludo-player-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    // Send invite
    $('send-game-invite')?.addEventListener('click', () => {
        const conv = state.conversations.find(c => c.id === state.activeConversation);
        if (!conv) return;

        const activeGameOpt = document.querySelector('.game-select-option.active');
        const gameType = activeGameOpt ? activeGameOpt.dataset.game : 'tictactoe';
        if (gameType === 'ludo') {
            const activePlayerOpt = document.querySelector('.ludo-player-option.active');
            const playerCount = conv.type === 'private' ? 2 : (activePlayerOpt ? parseInt(activePlayerOpt.dataset.players) : 4);
            state.socket.emit('ludo:start', { conversationId: conv.id, playerCount });
            $('game-selection-modal').style.display = 'none';
            showToast(`Starting Ludo`);
            return;
        }

        let boardSize = 8;
        if (gameType === 'dotsandboxes') {
            const activeSizeOpt = document.querySelector('.size-select-option.active');
            boardSize = activeSizeOpt ? parseInt(activeSizeOpt.dataset.size) : 8;
        }

        const targetUserId = conv.type === 'private' ? conv.other_user.id : null;
        state.socket.emit('game:request', { targetUserId, conversationId: conv.id, gameType, boardSize });

        $('game-selection-modal').style.display = 'none';
        showToast(conv.type === 'private' ? 'Game invite sent!' : 'Game invite broadcast to group!');
    });

    // ── Tic Tac Toe ──
    $('close-game-btn')?.addEventListener('click', closeGame);
    $$('.game-cell').forEach(cell => cell.addEventListener('click', handleCellClick));

    // ── Dots & Boxes ──
    $('close-dots-btn')?.addEventListener('click', closeDotsGame);

    const canvas = $('dots-canvas');
    canvas?.addEventListener('mousemove', e => {
        if (!state.dotsGame.active || !state.dotsGame.isMyTurn) return;
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
        const line = findClosestLine((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
        if (JSON.stringify(line) !== JSON.stringify(state.dotsGame.hoveredLine)) {
            state.dotsGame.hoveredLine = line;
            drawDotsBoard();
        }
    });

    canvas?.addEventListener('click', e => {
        if (!state.dotsGame.active || !state.dotsGame.isMyTurn) return;
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
        const line = findClosestLine((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
        if (line) makeDotsMove(line.type, line.r, line.c);
    });

    canvas?.addEventListener('mouseleave', () => {
        state.dotsGame.hoveredLine = null;
        drawDotsBoard();
    });

    // ── Connect Four ──
    $('close-connect-btn')?.addEventListener('click', closeConnectFour);
    $('connect-board')?.addEventListener('click', handleConnectClick);

    // ── Rock Paper Scissors ──
    $('close-rps-btn')?.addEventListener('click', closeRpsGame);
    $$('.rps-choice').forEach(btn => {
        btn.addEventListener('click', () => chooseRps(btn.dataset.choice));
    });

    // ── Memory Match ──
    $('close-memory-btn')?.addEventListener('click', closeMemoryGame);
    $('memory-board')?.addEventListener('click', handleMemoryClick);

    // ── Word Scramble ──
    $('close-word-btn')?.addEventListener('click', closeWordGame);
    $('word-submit-btn')?.addEventListener('click', submitWordAnswer);
    $('word-answer-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitWordAnswer();
        }
    });

    // ── Retro Pong ──
    $('close-retropong-btn')?.addEventListener('click', closeRetroPong);
    window.addEventListener('keydown', e => {
        if (!state.retroPong.active) return;
        if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
            e.preventDefault();
            setRetroPongKey(e.code, true);
        }
    });
    window.addEventListener('keyup', e => {
        if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
            setRetroPongKey(e.code, false);
        }
    });
    $$('.retropong-control').forEach(btn => {
        const activate = e => {
            e.preventDefault();
            setRetroPongKey(btn.dataset.key, true);
        };
        const deactivate = e => {
            e.preventDefault();
            setRetroPongKey(btn.dataset.key, false);
        };
        btn.addEventListener('pointerdown', activate);
        btn.addEventListener('pointerup', deactivate);
        btn.addEventListener('pointerleave', deactivate);
        btn.addEventListener('pointercancel', deactivate);
    });

    // ── Stickman Fight ──
    $('close-stickfight-btn')?.addEventListener('click', closeStickFight);
    window.addEventListener('keydown', e => {
        if (!state.stickFight.active) return;
        if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyD', 'KeyJ', 'KeyK', 'KeyI', 'KeyL', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
            e.preventDefault();
            setStickFightKey(e.code, true);
        }
    });
    window.addEventListener('keyup', e => {
        if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyD', 'KeyJ', 'KeyK', 'KeyI', 'KeyL', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
            setStickFightKey(e.code, false);
        }
    });
    $$('.stickfight-control').forEach(btn => {
        const activate = e => {
            e.preventDefault();
            setStickFightKey(btn.dataset.key, true);
        };
        const deactivate = e => {
            e.preventDefault();
            setStickFightKey(btn.dataset.key, false);
        };
        btn.addEventListener('pointerdown', activate);
        btn.addEventListener('pointerup', deactivate);
        btn.addEventListener('pointerleave', deactivate);
        btn.addEventListener('pointercancel', deactivate);
    });

    // ── Ludo ──
    $('minimise-ludo-btn')?.addEventListener('click', () => $('ludo-overlay').style.display='none');
    $('close-ludo-btn')?.addEventListener('click', () => closeLudoGame(true));
    $('ludo-roll-btn')?.addEventListener('click', rollLudoDice);
    $('ludo-canvas')?.addEventListener('click', handleLudoCanvasClick);
    window.addEventListener('resize', () => {
        if (state.ludoGame.active) drawLudoBoard();
    });
}



// ─── Scribble Game Functions ───────────────────────────────
function showScribbleLobby(players, isHost) {
    $('scribble-overlay').style.display = 'flex';
    $('scribble-status-title').textContent = 'Lobby — Waiting for players';
    $('scribble-toolbar').style.display = 'none';
    $('scribble-guess-input').disabled = true;
    $('scribble-round-overlay').style.display = 'none';
    $('scribble-word-picker').style.display = 'none';
    $('scribble-timer').textContent = '';
    $('scribble-word-hint').textContent = '';
    $('scribble-chat-log').innerHTML = '';
    clearScribbleCanvas();

    const canvas = $('scribble-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for players to join...', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '18px Inter, sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText(players.length + ' player(s) in lobby', canvas.width / 2, canvas.height / 2 + 20);
        if (isHost) {
            ctx.fillStyle = '#00a884';
            ctx.fillText('You are the host. Click "Start Game" when ready!', canvas.width / 2, canvas.height / 2 + 60);
        }
    }

    updateScribbleLeaderboard(players);
    addScribbleChat('🎨 Scribble lobby! Waiting for players...', 'system');

    const startBtn = $('scribble-start-btn');
    if (startBtn) {
        startBtn.style.display = isHost ? 'block' : 'none';
        startBtn.onclick = () => {
            state.socket.emit('scribble:start_game', { conversationId: state.scribble.conversationId });
        };
    }
}

function showScribbleGame() {
    $('scribble-overlay').style.display = 'flex';
    $('scribble-round-overlay').style.display = 'none';
    $('scribble-word-picker').style.display = 'none';
    clearScribbleCanvas();
    const startBtn = $('scribble-start-btn');
    if (startBtn) startBtn.style.display = 'none';
}

function clearScribbleCanvas() {
    const canvas = $('scribble-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function updateScribbleLeaderboard(players) {
    const lb = $('scribble-leaderboard');
    if (!lb) return;
    const sorted = [...players].sort((a, b) => b.score - a.score);
    lb.innerHTML = sorted.map((p, i) => {
        const isDrawer = state.scribble?.drawerId === p.id;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        return `
            <div class="scribble-player-row ${isDrawer ? 'is-drawer' : ''}">
                <span>${medal}</span>
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${escapeHtml(p.username)}${isDrawer ? ' 🖌️' : ''}${p.id === state.user.id ? ' (You)' : ''}
                </span>
                <span style="font-weight:700;color:var(--accent);">${p.score}</span>
            </div>
        `;
    }).join('');
}

function addScribbleChat(text, type = '') {
    const log = $('scribble-chat-log');
    if (!log) return;
    const div = document.createElement('div');
    div.style.padding = '4px 0';
    div.style.borderBottom = '1px solid var(--border-light)';
    if (type === 'correct') {
        div.style.color = '#25d366';
        div.style.fontWeight = '600';
    } else if (type === 'system') {
        div.style.color = 'var(--accent)';
        div.style.fontStyle = 'italic';
    } else {
        div.style.color = 'var(--text-secondary)';
    }
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

let scribbleDrawing = false;
let scribbleLastPos = null;
let scribbleTool = 'brush';
let scribbleColor = '#000000';
let scribbleBrushSize = 5;
let scribbleLastDrawAt = 0;

function getScribbleCanvasPos(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * scaleY))
    };
}

function stopScribbleDrawing() {
    scribbleDrawing = false;
    scribbleLastPos = null;
}

function initScribbleCanvas() {
    const canvas = $('scribble-canvas');
    if (!canvas || !state.scribble) return;

    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);

    const ctx = newCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    if (!state.scribble.isDrawer) return;

    newCanvas.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        scribbleDrawing = true;
        scribbleLastDrawAt = 0;
        newCanvas.setPointerCapture?.(e.pointerId);
        scribbleLastPos = getScribbleCanvasPos(newCanvas, e);
    });

    newCanvas.addEventListener('pointermove', (e) => {
        if (!scribbleDrawing || !scribbleLastPos) return;
        if (e.timeStamp - scribbleLastDrawAt < 16) return;
        scribbleLastDrawAt = e.timeStamp;
        e.preventDefault();
        const pos = getScribbleCanvasPos(newCanvas, e);
        const drawData = {
            type: 'line',
            from: scribbleLastPos,
            to: pos,
            color: scribbleTool === 'eraser' ? '#ffffff' : scribbleColor,
            size: scribbleTool === 'eraser' ? 20 : scribbleBrushSize
        };
        drawLine(ctx, drawData);
        state.socket.emit('scribble:draw', {
            conversationId: state.scribble.conversationId,
            drawData
        });
        scribbleLastPos = pos;
    });

    newCanvas.addEventListener('pointerup', stopScribbleDrawing);
    newCanvas.addEventListener('pointercancel', stopScribbleDrawing);
    newCanvas.addEventListener('pointerleave', stopScribbleDrawing);
}

function drawLine(ctx, data) {
    ctx.beginPath();
    ctx.moveTo(data.from.x, data.from.y);
    ctx.lineTo(data.to.x, data.to.y);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function applyDrawData(drawData) {
    const canvas = $('scribble-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (drawData.type === 'line') {
        drawLine(ctx, drawData);
    } else if (drawData.type === 'clear') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function initScribbleUI() {
    $('scribble-btn')?.addEventListener('click', () => {
        const conv = state.conversations.find(c => c.id === state.activeConversation);
        if (!conv || conv.type !== 'group') {
            showToast('Scribble is only for group chats', true);
            return;
        }
        state.socket.emit('scribble:create', { conversationId: conv.id });
        showToast('🎨 Creating Scribble lobby...');
    });

    $('close-scribble-btn')?.addEventListener('click', () => {
        if (state.scribble?.conversationId) {
            state.socket.emit('scribble:leave', { conversationId: state.scribble.conversationId });
        }
        $('scribble-overlay').style.display = 'none';
        state.scribble = null;
    });

    const guessInput = $('scribble-guess-input');
    const guessBtn = $('scribble-guess-btn');

    const submitGuess = () => {
        const guess = guessInput?.value.trim();
        if (!guess || !state.scribble?.conversationId) return;
        state.socket.emit('scribble:guess', {
            conversationId: state.scribble.conversationId,
            guess
        });
        guessInput.value = '';
    };

    guessBtn?.addEventListener('click', submitGuess);
    guessInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitGuess();
    });

    $$('.tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            scribbleTool = btn.dataset.tool;
        });
    });

    $$('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            $$('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            scribbleColor = swatch.dataset.color;
        });
    });

    $('brush-size')?.addEventListener('input', (e) => {
        scribbleBrushSize = parseInt(e.target.value);
    });

    $('scribble-clear')?.addEventListener('click', () => {
        clearScribbleCanvas();
        if (state.scribble) {
            state.socket.emit('scribble:draw', {
                conversationId: state.scribble.conversationId,
                drawData: { type: 'clear' }
            });
        }
    });
}
