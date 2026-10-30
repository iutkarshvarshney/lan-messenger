const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./database');
const LudoRules = require('./public/js/ludo-rules');
const duels = require('./duel-service');
const tables = require('./table-service');
const ScribbleRules = require('./scribble-rules');
const {validId,validIds} = require('./game-input');
const {sessions:gameSessions} = require('./game-sessions');
const legacyGamesService = require('./legacy-game-service');
const scenes = require('./scene-service');
const PresenceTracker = require('./presence-tracker');
const {CallRelay} = require('./call-service');
const {AttemptLimiter} = require('./account-recovery');

// ─── Config ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const ADMIN_PORT = process.env.ADMIN_PORT || 3090;
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw Error('JWT_SECRET is required in production'); })() : crypto.randomBytes(32).toString('hex'));
const ADMIN_PANEL_PASSWORD = process.env.ADMIN_PANEL_PASSWORD || crypto.randomBytes(32).toString('hex');
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const CERT_DIR = process.env.CERT_DIR || path.join(__dirname, 'certs');
// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── Storage Cleaner Service ─────────────────────────────────
const MAX_STORAGE_SIZE = 200 * 1024 * 1024 * 1024; // 200 GB

function enforceStorageLimit() {
    try {
        if (!fs.existsSync(UPLOAD_DIR)) return;

        let files = fs.readdirSync(UPLOAD_DIR).map(fileName => {
            const filePath = path.join(UPLOAD_DIR, fileName);
            try {
                const stats = fs.statSync(filePath);
                return {
                    name: fileName,
                    path: filePath,
                    size: stats.size,
                    mtime: stats.mtime.getTime(),
                    isFile: stats.isFile()
                };
            } catch (e) {
                return null;
            }
        }).filter(f => f !== null && f.isFile);

        let totalSize = files.reduce((acc, f) => acc + f.size, 0);

        if (totalSize > MAX_STORAGE_SIZE) {
            console.log(`🧹 Storage limit exceeded (${(totalSize / 1024 / 1024 / 1024).toFixed(2)}GB / 200GB). Cleaning up...`);
            // Sort by oldest first
            files.sort((a, b) => a.mtime - b.mtime);

            for (const file of files) {
                if (totalSize <= MAX_STORAGE_SIZE) break;
                try {
                    fs.unlinkSync(file.path);
                    totalSize -= file.size;
                    console.log(`🗑️ Deleted ${file.name} to free up space.`);
                } catch (e) {
                    console.error('Failed to delete file during cleanup:', e);
                }
            }
            console.log(`🧹 Cleanup finished. Current size: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)}GB`);
        }
    } catch (err) {
        console.error('Storage cleaner failed:', err);
    }
}

function cleanupExpiredData() {
    try {
        db.cleanupExpiredStatuses();
    } catch (err) {
        console.error('Data cleanup failed:', err);
    }
}

// Run cleaner every hour (3600000 ms) and once on startup
setInterval(enforceStorageLimit, 3600000);
setTimeout(enforceStorageLimit, 5000);

// Run data cleanup every 30 minutes
setInterval(cleanupExpiredData, 1800000);
setTimeout(cleanupExpiredData, 10000);


// ─── Initialize ─────────────────────────────────────────────
db.initDatabase();

const app = express();
const adminApp = express();

// ─── Redirect HTTP → HTTPS for LAN clients ───────────────────
// We keep HTTP alive too so local tools/healthchecks still work,
// but browsers that hit HTTP get a friendly notice to use HTTPS.
// ─── Scribble Game State ────────────────────────────────────
const scribbleGames = {};
const scribblePending = {}; // { conversationId: { hostId, hostName, players: [] } }
const activeGroupGameInvites = {}; // { conversationId: { hostId, hostName, gameType, boardSize } }
const ludoGames = {}; // { conversationId: { players, positions, currentTurnIndex, lastRoll, mustMove, winners } }
const scribbleWords = [
    // Animals
    'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'butterfly', 'eagle', 'shark', 'rabbit',
    'kangaroo', 'zebra', 'lion', 'tiger', 'monkey', 'snake', 'whale', 'octopus', 'parrot', 'turtle',
    'frog', 'bear', 'wolf', 'fox', 'deer', 'horse', 'cow', 'pig', 'chicken', 'duck',
    'panda', 'koala', 'cheetah', 'hedgehog', 'flamingo', 'hamster', 'squirrel', 'crocodile', 'platypus', 'sloth',
    'chameleon', 'beaver', 'peacock', 'owl', 'badger', 'walrus',
    'goat', 'sheep', 'donkey', 'camel', 'llama', 'alpaca', 'rhinoceros', 'hippo', 'gorilla', 'chimpanzee',
    'leopard', 'jaguar', 'panther', 'moose', 'reindeer', 'raccoon', 'otter', 'meerkat', 'porcupine', 'armadillo',
    'lobster', 'crab', 'jellyfish', 'seahorse', 'starfish', 'stingray', 'seal', 'pelican', 'turkey', 'goose',
    // Food
    'pizza', 'hamburger', 'ice cream', 'sushi', 'taco', 'pancake', 'donut', 'cookie', 'sandwich', 'pasta',
    'banana', 'apple', 'watermelon', 'grapes', 'strawberry', 'chocolate', 'popcorn', 'bread', 'cheese', 'egg',
    'cake', 'pie', 'soup', 'salad', 'rice', 'noodles', 'french fries', 'hot dog', 'burrito', 'waffle',
    'spaghetti', 'cupcake', 'bagel', 'pretzel', 'marshmallow', 'croissant', 'avocado', 'pineapple', 'mango', 'coconut',
    'garlic', 'onion', 'broccoli',
    'carrot', 'potato', 'tomato', 'cucumber', 'corn', 'pumpkin', 'mushroom soup', 'honey', 'jam', 'cereal',
    'toast', 'omelette', 'bacon', 'sausage', 'meatball', 'steak', 'fish and chips', 'ramen', 'dumpling', 'spring roll',
    'nachos', 'quesadilla', 'milkshake', 'lemonade', 'coffee', 'tea', 'smoothie', 'pickle', 'olive', 'cherry',
    // Objects
    'guitar', 'piano', 'television', 'camera', 'umbrella', 'bicycle', 'airplane', 'rocket', 'telescope', 'microscope',
    'keyboard', 'laptop', 'phone', 'headphones', 'microphone', 'lamp', 'clock', 'mirror', 'scissors', 'hammer',
    'key', 'lock', 'candle', 'book', 'pencil', 'paintbrush', 'backpack', 'wallet', 'sunglasses', 'crown',
    'sword', 'shield', 'trophy', 'medal', 'compass', 'map', 'globe', 'flag', 'bell', 'drum',
    'flashlight', 'hourglass', 'calculator', 'clipboard', 'stapler', 'dumbbell', 'violin', 'trumpet', 'skateboard', 'suitcase',
    'keychain',
    'toothbrush', 'toothpaste', 'comb', 'remote control', 'video game', 'controller', 'joystick', 'speaker', 'router', 'charger',
    'battery pack', 'fan', 'air conditioner', 'washing machine', 'refrigerator', 'stove', 'toaster', 'mug', 'plate', 'fork',
    'spoon', 'knife', 'broom', 'bucket', 'ladder', 'rope', 'nail', 'screwdriver', 'wrench', 'saw',
    'paint bucket', 'tape', 'glue', 'magazine', 'newspaper', 'envelope', 'stamp', 'calendar', 'notebook', 'whiteboard',
    // Nature
    'mountain', 'volcano', 'ocean', 'river', 'waterfall', 'island', 'desert', 'forest', 'rainbow', 'lightning',
    'tornado', 'snowflake', 'sun', 'moon', 'star', 'cloud', 'rain', 'tree', 'flower', 'cactus',
    'mushroom', 'leaf', 'wave', 'fire', 'earthquake', 'sunrise', 'sunset', 'beach', 'cave', 'glacier',
    'canyon', 'swamp', 'meadow', 'geyser', 'jungle', 'cliff', 'pebble', 'acorn', 'bamboo', 'seaweed',
    'coral', 'meteor', 'constellation', 'eclipse', 'oasis',
    'rainforest', 'orchard', 'valley', 'hill', 'pond', 'lake', 'stream', 'hurricane', 'fog', 'mist',
    'thunderstorm', 'hail', 'iceberg', 'lagoon', 'reef', 'vine', 'rose', 'tulip', 'sunflower', 'lotus',
    'pine tree', 'palm tree', 'willow tree', 'snowman', 'sand dune', 'mud puddle', 'comet', 'planet', 'saturn', 'milky way',
    // Places & Buildings
    'castle', 'lighthouse', 'hospital', 'school', 'church', 'prison', 'bridge', 'pyramid', 'windmill', 'igloo',
    'tent', 'barn', 'skyscraper', 'stadium', 'museum', 'library', 'restaurant', 'hotel', 'airport', 'train station',
    'observatory', 'aquarium', 'supermarket', 'bakery', 'greenhouse', 'cottage', 'mansion', 'palace', 'warehouse', 'garage',
    'subway', 'theater', 'arcade',
    'post office', 'police station', 'fire station', 'bank', 'cinema', 'circus', 'zoo', 'farm', 'factory', 'office',
    'bookstore', 'coffee shop', 'temple', 'mosque', 'mosque dome', 'courtroom', 'playground', 'park', 'market', 'mall',
    'harbor', 'dock', 'pier', 'bus stop', 'parking lot', 'gas station', 'treehouse', 'cabin', 'fort', 'tower',
    // Body & People
    'skeleton', 'brain', 'heart', 'muscle', 'eye', 'hand', 'finger', 'nose', 'mouth', 'ear',
    'pirate', 'ninja', 'astronaut', 'robot', 'zombie', 'witch', 'wizard', 'knight', 'queen', 'king',
    'clown', 'angel', 'devil', 'mermaid', 'vampire', 'ghost', 'alien', 'superhero', 'detective', 'chef',
    'soldier', 'farmer', 'teacher', 'doctor', 'firefighter', 'police officer', 'scientist', 'artist', 'jester', 'barber',
    'mechanic', 'dentist', 'pilot',
    'judge', 'lawyer', 'nurse', 'engineer', 'programmer', 'guard', 'mail carrier', 'waiter', 'dancer', 'singer',
    'magician', 'referee', 'coach', 'athlete', 'runner', 'skater', 'baby', 'grandma', 'grandpa', 'tourist',
    'miner', 'plumber', 'electrician', 'photographer', 'news reporter', 'librarian', 'cashier', 'tailor', 'lifeguard', 'captain',
    // Actions & Concepts
    'sleeping', 'dancing', 'running', 'swimming', 'flying', 'fishing', 'cooking', 'painting', 'singing', 'crying',
    'laughing', 'sneezing', 'juggling', 'surfing', 'skiing', 'boxing', 'wrestling', 'yoga', 'karate', 'archery',
    'reading', 'writing', 'climbing', 'jumping', 'digging', 'driving', 'sailing', 'thinking', 'whispering', 'screaming',
    'building', 'cleaning',
    'shopping', 'gardening', 'brushing teeth', 'taking selfie', 'typing', 'texting', 'sleepwalking', 'meditating', 'praying', 'cheering',
    'hiking', 'camping', 'diving', 'snorkeling', 'rowing', 'skating', 'bowling', 'throwing', 'catching', 'lifting weights',
    'sewing', 'knitting', 'washing dishes', 'vacuuming', 'repairing', 'watering plants', 'riding horse', 'playing cards', 'playing chess', 'blowing bubbles',
    // Transportation
    'car', 'bus', 'train', 'submarine', 'helicopter', 'motorcycle', 'sailboat', 'spaceship', 'ambulance', 'taxi',
    'tractor', 'scooter', 'hot air balloon', 'tank', 'canoe', 'jet ski', 'sled', 'wagon', 'trolley',
    'cruise ship', 'unicycle', 'carriage', 'blimp', 'ferry', 'gondola', 'hovercraft', 'cable car', 'segway', 'rowboat',
    'fire truck', 'police car', 'garbage truck', 'delivery van', 'pickup truck', 'limousine', 'sports car', 'race car', 'bulldozer', 'excavator',
    'crane truck', 'forklift', 'metro train', 'monorail', 'bullet train', 'tram', 'rickshaw', 'auto rickshaw', 'bicycle helmet', 'traffic light',
    // Clothing
    'hat', 'shoe', 'glove', 'scarf', 'belt', 'tie', 'dress', 'jacket', 'boots', 'helmet',
    'socks', 'slippers', 'pajamas', 'glasses', 'earrings', 'necklace', 'ring', 'pocket',
    'sari', 'kurta', 'sweater', 'hoodie', 'raincoat', 'uniform', 'apron', 'backwards cap', 'bow tie', 'watch',
    'bracelet', 'cufflinks', 'mittens', 'sandals', 'high heels', 'sneakers', 'shorts', 'jeans', 'crown jewels', 'mask',
    // Sports & Games
    'football', 'basketball', 'cricket bat', 'cricket wicket', 'tennis racket', 'badminton racket', 'baseball', 'golf club', 'hockey stick', 'goal post',
    'boxing gloves', 'chess board', 'ludo', 'carrom board', 'dartboard', 'pool table', 'dice tower', 'jigsaw puzzle', 'yo yo',
    'kite', 'frisbee', 'seesaw', 'slide', 'swing set', 'trampoline', 'roller skates', 'surfboard', 'snowboard', 'ski lift',
    // Indian & Everyday Fun
    'rickshaw driver', 'chai cup', 'street vendor', 'samosa', 'jalebi', 'gulab jamun', 'dosa', 'idli', 'biryani', 'pani puri',
    'rangoli', 'diya lamp', 'tabla', 'sitar', 'dhol', 'lotus temple', 'gateway of india', 'taj mahal', 'cricket stadium', 'monsoon rain',
    'school bus', 'tiffin box', 'pressure cooker', 'ceiling fan', 'water bottle', 'lunch box', 'market cart', 'wedding cake', 'dance floor', 'movie ticket',
    // Misc
    'diamond', 'treasure', 'fireworks', 'magnet', 'battery', 'anchor', 'parachute', 'boomerang', 'dice', 'domino',
    'bubble', 'shadow', 'puzzle', 'maze', 'balloon', 'feather', 'fountain', 'ribbon',
    'zipper', 'button', 'paperclip', 'safety pin', 'gift box', 'party hat', 'confetti', 'snow globe', 'traffic cone', 'stop sign',
    'road sign', 'treasure map', 'magic wand', 'crystal ball', 'time machine', 'portal', 'robot vacuum', 'solar panel', 'wind turbine', 'satellite dish',
    'barcode', 'qr code', 'password', 'wifi signal', 'notification bell', 'shopping cart', 'cash register', 'first aid kit', 'medicine bottle', 'thermometer'
];

app.use((req, res, next) => {
    // If already secure (HTTPS) or localhost, pass through
    if (req.secure || req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
        return next();
    }
    // Otherwise redirect to HTTPS port
    const httpsUrl = `https://${req.hostname}:${HTTPS_PORT}${req.url}`;
    res.redirect(301, httpsUrl);
});

const httpServer = http.createServer(app);
const adminServer = http.createServer(adminApp);

// ─── HTTPS Server ────────────────────────────────────────────
let httpsServer = null;
const certKeyPath = path.join(CERT_DIR, 'server.key');
const certCrtPath = path.join(CERT_DIR, 'server.crt');

try {
    if (fs.existsSync(certKeyPath) && fs.existsSync(certCrtPath)) {
        const sslOptions = {
            key: fs.readFileSync(certKeyPath),
            cert: fs.readFileSync(certCrtPath)
        };
        httpsServer = https.createServer(sslOptions, app);
        console.log('🔒 HTTPS server created successfully');
    } else {
        console.warn('⚠️  TLS certificates not found. HTTPS server will not start.');
        console.warn(`   Expected: ${certKeyPath}`);
    }
} catch (e) {
    console.error('❌ Failed to create HTTPS server:', e.message);
}

// Attach Socket.IO to both servers
const server = httpServer; // primary reference kept for backward compat
const io = new Server({
    cors: { origin: '*' },
    maxHttpBufferSize: MAX_FILE_SIZE
});
io.attach(httpServer);
if (httpsServer) io.attach(httpsServer);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// app.use('/uploads', express.static(UPLOAD_DIR)); removed to enforce /api/media

adminApp.use(express.urlencoded({ extended: false }));
adminApp.use(express.json({ limit: '1mb' }));

function escapeAdminHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderUserList(users = []) {
    if (!users.length) return '<p class="empty">No users found.</p>';
    return `<div class="user-list">${users.map(user => {
        const tempState = user.password_must_change
            ? `Temporary password until ${escapeAdminHtml(new Date(user.temp_password_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}`
            : 'Normal password';
        return `<div class="user-row">
            <div>
                <strong>${escapeAdminHtml(user.display_name)}</strong>
                <span>@${escapeAdminHtml(user.username)}</span>
            </div>
            <small>${user.is_online ? 'Online' : 'Offline'} · ${tempState}</small>
        </div>`;
    }).join('')}</div>`;
}

function renderAdminPortal(message = '', isError = false, users = null) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LAN Messenger Control Panel</title>
    <style>
        :root { color-scheme: dark; font-family: Arial, sans-serif; background: #111b21; color: #e9edef; }
        body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
        main { width: min(760px, 100%); background: #202c33; border: 1px solid #2a3942; border-radius: 8px; padding: 24px; box-shadow: 0 16px 40px rgba(0,0,0,.28); }
        h1 { margin: 0 0 8px; font-size: 24px; }
        p { margin: 0 0 20px; color: #aebac1; line-height: 1.45; }
        section { padding: 18px 0; border-top: 1px solid #2a3942; }
        section:first-of-type { border-top: 0; padding-top: 0; }
        h2 { margin: 0 0 4px; font-size: 17px; }
        label { display: block; margin: 14px 0 6px; color: #aebac1; font-size: 13px; }
        input { width: 100%; box-sizing: border-box; background: #111b21; color: #e9edef; border: 1px solid #3b4a54; border-radius: 8px; padding: 12px; font-size: 15px; }
        input:focus { outline: 2px solid #00a884; border-color: transparent; }
        button { width: 100%; margin-top: 18px; border: 0; border-radius: 8px; padding: 12px 14px; background: #00a884; color: white; font-size: 15px; font-weight: 700; cursor: pointer; }
        button.danger { background: #ea4335; }
        button.secondary { background: #3b4a54; }
        .message { margin: 0 0 16px; padding: 12px; border-radius: 8px; background: #123c32; color: #d8fdd2; }
        .message.error { background: #3b1f24; color: #ffd7dc; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
        .user-list { display: grid; gap: 8px; max-height: 320px; overflow: auto; padding-right: 4px; }
        .user-row { background: #111b21; border: 1px solid #3b4a54; border-radius: 8px; padding: 12px; }
        .user-row div { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
        .user-row span, .user-row small, .empty { color: #aebac1; }
        .user-row small { display: block; margin-top: 6px; }
        .privacy { margin-top: 18px; font-size: 12px; color: #8696a0; }
        @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <main>
        <h1>Control Panel</h1>
        <p>Manage LAN Messenger accounts by username. This panel does not show chats, files, or message history.</p>
        ${message ? `<div class="message${isError ? ' error' : ''}">${escapeAdminHtml(message)}</div>` : ''}
        <section>
            <h2>User List</h2>
            <form method="post" action="/users">
                <label for="listPortalPassword">Control Panel Password</label>
                <input id="listPortalPassword" name="portalPassword" type="password" autocomplete="current-password" required>
                <button class="secondary" type="submit">Show Users</button>
            </form>
            ${users ? renderUserList(users) : ''}
        </section>
        <div class="grid">
        <section>
            <h2>Private Account Recovery</h2>
            <p>Users reset their own passwords with private recovery codes. Codes are generated in Messenger → Account security and are shown only to the account owner.</p>
            <p>This panel cannot generate recovery codes, set user passwords, or sign in as another user. Users must save codes before losing access.</p>
        </section>
        <section>
            <h2>Delete User</h2>
            <p>Deletes the account and removes that user's sent messages. Other users' message contents are not shown here.</p>
            <form method="post" action="/delete-user">
                <label for="deletePortalPassword">Control Panel Password</label>
                <input id="deletePortalPassword" name="portalPassword" type="password" autocomplete="current-password" required>
                <label for="deleteUsername">Messenger Username</label>
                <input id="deleteUsername" name="username" type="text" autocomplete="off" required>
                <label for="confirmUsername">Type Username Again</label>
                <input id="confirmUsername" name="confirmUsername" type="text" autocomplete="off" required>
                <button class="danger" type="submit">Delete User</button>
            </form>
        </section>
        </div>
        <div class="privacy">Privacy mode: message contents are never displayed by this panel.</div>
    </main>
</body>
</html>`;
}

adminApp.get('/', (req, res) => {
    res.type('html').send(renderAdminPortal());
});

adminApp.post('/users', (req, res) => {
    try {
        const { portalPassword } = req.body || {};
        if (portalPassword !== ADMIN_PANEL_PASSWORD) {
            return res.status(403).type('html').send(renderAdminPortal('Control panel password is incorrect.', true));
        }
        res.type('html').send(renderAdminPortal('', false, db.getUsersForAdmin()));
    } catch (err) {
        res.status(400).type('html').send(renderAdminPortal(err.message, true));
    }
});

adminApp.post('/change-password', (req,res) => {
    res.status(403).type('html').send(renderAdminPortal('User passwords are private. The account owner must use their saved recovery codes.',true));
});

adminApp.post('/delete-user', (req, res) => {
    try {
        const { portalPassword, username, confirmUsername } = req.body || {};
        if (portalPassword !== ADMIN_PANEL_PASSWORD) {
            return res.status(403).type('html').send(renderAdminPortal('Control panel password is incorrect.', true));
        }
        if (!username || !confirmUsername) {
            return res.status(400).type('html').send(renderAdminPortal('Username and confirmation are required.', true));
        }
        const normalizedUsername = String(username).trim().toLowerCase();
        if (normalizedUsername !== String(confirmUsername).trim().toLowerCase()) {
            return res.status(400).type('html').send(renderAdminPortal('The two usernames do not match.', true));
        }

        db.deleteUserByUsername(normalizedUsername);
        res.type('html').send(renderAdminPortal(`User ${normalizedUsername} deleted.`, false));
    } catch (err) {
        res.status(400).type('html').send(renderAdminPortal(err.message, true));
    }
});

// ─── CA Certificate Download ─────────────────────────────────
// GET /ca.crt  → download the root CA cert to install on devices
app.get('/ca.crt', (req, res) => {
    const caPath = path.join(CERT_DIR, 'ca.crt');
    if (!fs.existsSync(caPath)) {
        return res.status(404).send('CA certificate not generated yet. Restart the server.');
    }
    res.setHeader('Content-Type', 'application/x-x509-ca-cert');
    res.setHeader('Content-Disposition', 'attachment; filename="lan-messenger-ca.crt"');
    res.sendFile(caPath);
});

// GET /install-cert → friendly HTML page with installation guide
app.get('/install-cert', (req, res) => {
    const host = req.hostname;
    const httpsUrl = `https://${host}:${HTTPS_PORT}`;
    const caCertUrl = `http://${host}:${PORT}/ca.crt`;
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Install Certificate – LAN Messenger</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#1e293b;border-radius:16px;padding:36px;max-width:680px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,.5)}
  h1{font-size:1.6rem;font-weight:700;color:#38bdf8;margin-bottom:6px}
  .sub{color:#94a3b8;font-size:.95rem;margin-bottom:28px}
  .download-btn{display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:1rem;margin-bottom:32px;transition:opacity .2s}
  .download-btn:hover{opacity:.88}
  .step{background:#0f172a;border-radius:10px;padding:18px 20px;margin-bottom:12px;border-left:4px solid #3b82f6}
  .step h3{font-size:.85rem;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
  .step ol{padding-left:18px;line-height:1.8;font-size:.9rem;color:#cbd5e1}
  .step ol code{background:#1e293b;padding:2px 6px;border-radius:4px;font-size:.85rem;color:#a78bfa}
  .done{background:#0f172a;border-radius:10px;padding:16px 20px;text-align:center;margin-top:24px;border:1px solid #22c55e}
  .done a{color:#22c55e;font-weight:700;font-size:1.1rem;text-decoration:none}
  .badge{display:inline-block;background:#22c55e22;color:#22c55e;padding:4px 10px;border-radius:20px;font-size:.8rem;font-weight:600;margin-left:8px}
  .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
  .tab{padding:8px 16px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600;background:#0f172a;color:#94a3b8;border:1px solid #334155;transition:all .2s}
  .tab.active{background:#3b82f6;color:#fff;border-color:#3b82f6}
  .tab-content{display:none}.tab-content.active{display:block}
</style>
</head>
<body>
<div class="card">
  <h1>🔒 Install Trusted Certificate</h1>
  <p class="sub">Install this once on each device to remove the browser security warning and enable voice calls.</p>

  <a class="download-btn" href="${caCertUrl}">📥 Download CA Certificate</a>

  <div class="tabs">
    <div class="tab active" onclick="switchTab('windows',this)">🖥 Windows</div>
    <div class="tab" onclick="switchTab('mac',this)">🍎 macOS</div>
    <div class="tab" onclick="switchTab('android',this)">🤖 Android</div>
    <div class="tab" onclick="switchTab('ios',this)">📱 iPhone/iPad</div>
    <div class="tab" onclick="switchTab('linux',this)">🐧 Linux</div>
  </div>

  <div id="windows" class="tab-content active">
    <div class="step"><h3>Windows (Chrome / Edge / Firefox)</h3>
    <ol>
      <li>Click <b>Download CA Certificate</b> above</li>
      <li>Double-click the downloaded <code>lan-messenger-ca.crt</code> file</li>
      <li>Click <b>Install Certificate</b></li>
      <li>Select <b>Local Machine</b> → Next</li>
      <li>Select <b>Place all certificates in the following store</b></li>
      <li>Click Browse → choose <b>Trusted Root Certification Authorities</b></li>
      <li>Click OK → Next → Finish</li>
      <li>Restart your browser and open <b>${httpsUrl}</b></li>
    </ol></div>
  </div>

  <div id="mac" class="tab-content">
    <div class="step"><h3>macOS (Chrome / Safari / Firefox)</h3>
    <ol>
      <li>Click <b>Download CA Certificate</b> above</li>
      <li>Double-click <code>lan-messenger-ca.crt</code> → opens Keychain Access</li>
      <li>In Keychain Access, find <b>LAN Messenger Root CA</b></li>
      <li>Double-click it → expand <b>Trust</b></li>
      <li>Set <b>When using this certificate</b> to <b>Always Trust</b></li>
      <li>Close and enter your Mac password</li>
      <li>Restart your browser and open <b>${httpsUrl}</b></li>
    </ol></div>
  </div>

  <div id="android" class="tab-content">
    <div class="step"><h3>Android (Chrome)</h3>
    <ol>
      <li>Click <b>Download CA Certificate</b> above on your Android</li>
      <li>Go to <b>Settings → Security → More Security Settings</b></li>
      <li>Tap <b>Install from device storage</b> or <b>Install a certificate → CA Certificate</b></li>
      <li>Select the downloaded <code>lan-messenger-ca.crt</code> file</li>
      <li>Name it <b>LAN Messenger CA</b> and confirm</li>
      <li>Open Chrome and visit <b>${httpsUrl}</b></li>
    </ol></div>
  </div>

  <div id="ios" class="tab-content">
    <div class="step"><h3>iPhone / iPad (Safari)</h3>
    <ol>
      <li>Open this page in <b>Safari</b> and tap <b>Download CA Certificate</b></li>
      <li>Tap <b>Allow</b> → Go to <b>Settings → General → VPN &amp; Device Management</b></li>
      <li>Tap <b>LAN Messenger Root CA</b> → tap <b>Install</b> → enter passcode</li>
      <li>Then go to <b>Settings → General → About → Certificate Trust Settings</b></li>
      <li>Toggle on <b>LAN Messenger Root CA</b> → tap Continue</li>
      <li>Open Safari and visit <b>${httpsUrl}</b></li>
    </ol></div>
  </div>

  <div id="linux" class="tab-content">
    <div class="step"><h3>Linux (Chrome / Firefox)</h3>
    <ol>
      <li>Click <b>Download CA Certificate</b> above</li>
      <li>Run in terminal:<br>
        <code>sudo cp lan-messenger-ca.crt /usr/local/share/ca-certificates/</code><br>
        <code>sudo update-ca-certificates</code></li>
      <li>For Chrome: go to <code>chrome://settings/certificates</code> → Authorities → Import</li>
      <li>For Firefox: go to <code>about:preferences#privacy</code> → View Certificates → Import</li>
      <li>Open browser and visit <b>${httpsUrl}</b></li>
    </ol></div>
  </div>

  <div class="done">
    After installing → <a href="${httpsUrl}" target="_blank">${httpsUrl}</a>
    <span class="badge">🔒 Secure</span>
  </div>
</div>
<script>
function switchTab(id, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
}
</script>
</body>
</html>`);
});

// ─── Multer Config ──────────────────────────────────────────
function getCipherKey() {
    return crypto.scryptSync(JWT_SECRET, 'salt', 32);
}

const encryptedStorage = {
    _handleFile: function (req, file, cb) {
        const cipher = crypto.createCipheriv('aes-256-ctr', getCipherKey(), Buffer.alloc(16, 0));
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        const finalPath = path.join(UPLOAD_DIR, uniqueName);
        const outStream = fs.createWriteStream(finalPath);

        file.stream.pipe(cipher).pipe(outStream);

        outStream.on('error', cb);
        outStream.on('finish', () => {
            cb(null, {
                path: finalPath,
                size: outStream.bytesWritten,
                filename: uniqueName
            });
        });
    },
    _removeFile: function (req, file, cb) {
        fs.unlink(file.path, cb);
    }
};

const upload = multer({ storage: encryptedStorage, limits: { fileSize: MAX_FILE_SIZE } });

// ─── Auth Middleware ────────────────────────────────────────
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const current = db.getAuthState(decoded.id);
        if (!current || current.username !== decoded.username || current.auth_version !== (decoded.version ?? 0)) throw Error('Revoked session');
        if (current.password_must_change && Date.parse(current.temp_password_expires_at) <= Date.now()) throw Error('Temporary password expired');
        if ((decoded.scope === 'password-change' || current.password_must_change) && req.path !== '/api/auth/complete-temp-password') return res.status(403).json({error:'Set your own password before continuing.'});
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

scenes.routes(app, authMiddleware, io, db);

// ─── Auth Routes ────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, displayName, password, avatar, deviceBinding } = req.body;
        if (!username || !password || !displayName) {
            return res.status(400).json({ error: 'Username, display name, and password are required' });
        }
        if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
        if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

        const user = db.createUser(username, displayName, password, avatar, deviceBinding);
        const token = issueAuthToken(user);
        res.json({ user, token });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

const recoveryAccountLimit = new AttemptLimiter({limit:8});
const recoveryIpLimit = new AttemptLimiter({limit:40});
const recoverySetupLimit = new AttemptLimiter({limit:8});
function issueAuthToken(user) {
    const current = db.getAuthState(user.id);
    return jwt.sign({id:user.id,username:user.username,version:current.auth_version,...(current.password_must_change?{scope:'password-change'}:{})},JWT_SECRET,{expiresIn:current.password_must_change?Math.max(1,Math.min(120,Math.floor((Date.parse(current.temp_password_expires_at)-Date.now())/1000))):'30d'});
}
function revokeUserSessions(id) {
    io.to(`user:${id}`).emit('auth:revoked');
    io.in(`user:${id}`).disconnectSockets(true);
}
app.get('/api/auth/recovery-codes',authMiddleware,(req,res)=>{
    res.set('Cache-Control','no-store');res.json(db.recoveryStatus(req.user.id));
});
app.post('/api/auth/recovery-codes',authMiddleware,(req,res)=>{
    res.set('Cache-Control','no-store');
    if(!recoverySetupLimit.allow(req.user.id))return res.status(429).json({error:'Too many attempts. Try again in 15 minutes.'});
    try {res.json({codes:db.generateRecoveryCodes(req.user.id,req.body.currentPassword)});}
    catch(error){res.status(403).json({error:error.message});}
});
app.post('/api/auth/recovery/verify',async(req,res)=>{
    res.set('Cache-Control','no-store');
    const username=typeof req.body.username==='string'?req.body.username.trim().toLowerCase().slice(0,128):'';
    const ipAllowed=recoveryIpLimit.allow('verify:'+req.ip),accountAllowed=recoveryAccountLimit.allow(username);
    if(!ipAllowed||!accountAllowed)return res.status(429).json({error:'Too many attempts. Try again in 15 minutes.'});
    await new Promise(resolve=>setTimeout(resolve,200));
    try {res.json(db.verifyRecoveryCode(req.body.username,req.body.recoveryCode));}
    catch(error){res.status(400).json({error:'Recovery details are invalid or have expired.'});}
});
// The old hardware-ID reset route now requires a single-use reset token.
app.post('/api/auth/reset-password',(req,res)=>{
    res.set('Cache-Control','no-store');
    if(!recoveryIpLimit.allow('complete:'+req.ip))return res.status(429).json({error:'Too many attempts. Try again in 15 minutes.'});
    try {
        const id=db.completeRecovery(req.body.resetToken,req.body.newPassword);
        revokeUserSessions(id);
        res.json({success:true,message:'Password updated. All previous sessions and recovery codes were revoked. Sign in and save a fresh set of codes.'});
    } catch(error){res.status(400).json({error:error.message});}
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

        const user = db.authenticateUser(username, password);
        const token = issueAuthToken(user);
        res.json({ user, token });
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
});

app.post('/api/auth/complete-temp-password', authMiddleware, (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ error: 'New password is required' });
        if (newPassword.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

        db.completeTemporaryPasswordChange(req.user.id, newPassword);
        const user = db.getUserById(req.user.id);
        revokeUserSessions(user.id);
        res.json({ user, token:issueAuthToken(user), message: 'Password updated. Welcome back.' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── User Routes ────────────────────────────────────────────
app.get('/api/users', authMiddleware, (req, res) => {
    const users = db.getAllUsers(req.user.id);
    res.json(users);
});

app.get('/api/users/search', authMiddleware, (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = db.searchUsers(q, req.user.id);
    res.json(users);
});

app.get('/api/users/:id', authMiddleware, (req, res) => {
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

app.put('/api/users/profile', authMiddleware, (req, res) => {
    try {
        const { displayName, status, avatar } = req.body;
        db.updateUserProfile(req.user.id, displayName, status, avatar);
        const user = db.getUserById(req.user.id);
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── E2E Public Key / Prekey Routes ─────────────────────────
app.put('/api/users/prekeys', authMiddleware, (req, res) => {
    try {
        const { identityKey, signedPrekey, sig, prekeys } = req.body;
        if (!identityKey || !signedPrekey || !sig || !prekeys || !Array.isArray(prekeys)) {
            return res.status(400).json({ error: 'Incomplete prekey bundle' });
        }
        db.setPrekeys(req.user.id, identityKey, signedPrekey, sig, prekeys);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/users/:id/prekey', authMiddleware, (req, res) => {
    const bundle = db.getBundle(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'Prekey bundle not found for user' });
    res.json(bundle);
});

app.get('/api/conversations/:id/keys', authMiddleware, (req, res) => {
    const { id } = req.params;
    if (!db.isUserInConversation(req.user.id, id)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const keys = db.getConversationMemberKeys(id);
    res.json(keys);
});

// ─── Conversation Routes ────────────────────────────────────
app.get('/api/conversations', authMiddleware, (req, res) => {
    const conversations = db.getConversationsForUser(req.user.id);
    res.json(conversations);
});

app.delete('/api/conversations/:id/inbox', authMiddleware, (req, res) => {
    try {
        db.hideConversation(req.params.id, req.user.id);
        io.to(`user:${req.user.id}`).emit('inbox:hidden', { conversationId: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(403).json({ error: err.message }); }
});

app.post('/api/conversations', authMiddleware, (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });
        const conversationId = db.getOrCreatePrivateConversation(req.user.id, userId);
        for (const member of db.getConversationMembers(conversationId)) {
            io.in(`user:${member.id}`).socketsJoin(`conv:${conversationId}`);
            io.to(`user:${member.id}`).emit('inbox:restored', { conversationId });
        }
        const conversations = db.getConversationsForUser(req.user.id);
        const conv = conversations.find(c => c.id === conversationId);
        res.json(conv);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/conversations/:id/messages', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { before, limit } = req.query;
    if (!db.isUserInConversation(req.user.id, id)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const messages = db.getMessages(id, parseInt(limit) || 50, before || null);
    res.json(messages);
});

app.delete('/api/conversations/:id/messages', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        if (!db.isUserInConversation(req.user.id, id)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        db.clearConversationMessages(id);

        // Notify the conversation room about the clear to sync clients
        io.to(`conv:${id}`).emit('conversation:cleared', { conversationId: id, clearedBy: req.user.id });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/conversations/:id/members', authMiddleware, (req, res) => {
    const { id } = req.params;
    if (!db.isUserInConversation(req.user.id, id)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const members = db.getConversationMembers(id);
    res.json(members);
});

// ─── Group Routes ───────────────────────────────────────────
app.post('/api/groups', authMiddleware, (req, res) => {
    try {
        const { name, memberIds, avatar } = req.body;
        if (!name || !memberIds || memberIds.length === 0) {
            return res.status(400).json({ error: 'Group name and at least one member are required' });
        }
        const groupId = db.createGroup(name, req.user.id, memberIds, avatar);
        const conversations = db.getConversationsForUser(req.user.id);
        const conv = conversations.find(c => c.id === groupId);

        // Notify members
        memberIds.forEach(memberId => {
            const memberConvs = db.getConversationsForUser(memberId);
            const memberConv = memberConvs.find(c => c.id === groupId);
            io.to(`user:${memberId}`).emit('group:created', memberConv);
        });

        res.json(conv);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/groups/:id/members', authMiddleware, (req, res) => {
    try {
        const { userId } = req.body;
        const { id } = req.params;
        if (!db.isUserInConversation(req.user.id, id)) return res.status(403).json({ error: 'Access denied' });

        const conv = db.getConversationById(id);
        if (conv.created_by !== req.user.id) return res.status(403).json({ error: 'Only the group admin can add members' });
        db.addGroupMember(id, userId, req.user.id);
        const members = db.getConversationMembers(id);

        io.to(`conv:${id}`).emit('group:updated', { conversationId: id, members });

        // Notify the new member
        const memberConvs = db.getConversationsForUser(userId);
        const memberConv = memberConvs.find(c => c.id === id);
        io.to(`user:${userId}`).emit('group:created', memberConv);

        res.json(members);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/groups/:id/members/:userId', authMiddleware, (req, res) => {
    try {
        const { id, userId } = req.params;
        if (!db.isUserInConversation(req.user.id, id)) return res.status(403).json({ error: 'Access denied' });

        const conv = db.getConversationById(id);
        if (conv.created_by !== req.user.id && req.user.id !== userId) return res.status(403).json({ error: 'Only the group admin can remove members' });
        db.removeGroupMember(id, userId, req.user.id);
        const members = db.getConversationMembers(id);
        io.to(`conv:${id}`).emit('group:updated', { conversationId: id, members });
        io.to(`user:${userId}`).emit('group:removed', { conversationId: id });
        res.json(members);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/groups/:id', authMiddleware, (req, res) => {
    try {
        const { name, avatar } = req.body;
        const { id } = req.params;
        if (!db.isUserInConversation(req.user.id, id)) return res.status(403).json({ error: 'Access denied' });

        let conv = db.getConversationById(id);
        if (conv.created_by !== req.user.id) return res.status(403).json({ error: 'Only the group admin can update the group' });
        db.updateGroup(id, name, avatar);
        conv = db.getConversationById(id);
        io.to(`conv:${id}`).emit('group:updated', { conversationId: id, name: conv.name, avatar: conv.avatar });
        res.json(conv);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── File Upload ────────────────────────────────────────────
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileUrl = `/api/media/${req.file.filename}`;

        // Remove .enc to determine true type
        const originalName = req.file.originalname.replace(/\.enc$/i, '');
        const ext = path.extname(originalName).toLowerCase();

        let messageType = 'file';
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) messageType = 'image';
        else if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) messageType = 'video';
        else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) messageType = 'audio';

        res.json({
            file_url: fileUrl,
            file_name: req.file.originalname,
            file_size: req.file.size,
            message_type: messageType
        });
        
        // Ensure storage limit is enforced after upload
        enforceStorageLimit();
    } catch (err) {
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.get('/api/media/:filename', authMiddleware, (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).end();

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const key = getCipherKey();

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const blockIndex = Math.floor(start / 16);
        const remainder = start % 16;

        const iv = Buffer.alloc(16, 0);
        iv.writeBigUInt64BE(BigInt(blockIndex), 8);

        const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
        const fileStream = fs.createReadStream(filePath, { start: start - remainder, end });

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'application/octet-stream',
        });

        let isFirstBlock = true;
        fileStream.on('data', chunk => {
            let decrypted = decipher.update(chunk);
            if (isFirstBlock) {
                decrypted = decrypted.slice(remainder);
                isFirstBlock = false;
            }
            res.write(decrypted);
        });

        fileStream.on('end', () => {
            const final = decipher.final();
            if (final.length > 0) res.write(final);
            res.end();
        });
    } else {
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'application/octet-stream',
        });
        const decipher = crypto.createDecipheriv('aes-256-ctr', key, Buffer.alloc(16, 0));
        fs.createReadStream(filePath).pipe(decipher).pipe(res);
    }
});

// ─── Status Routes ──────────────────────────────────────────
app.get('/api/status', authMiddleware, (req, res) => {
    try {
        const statuses = db.getActiveStatuses(req.user.id);
        res.json(statuses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/status', authMiddleware, (req, res) => {
    try {
        const { content, type } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });
        const status = db.createStatus(req.user.id, content, type || 'image');
        
        // Notify all users about new status
        io.emit('status:new', { userId: req.user.id, username: req.user.username });
        
        res.json(status);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/status/:id/view', authMiddleware, (req, res) => {
    try {
        const viewers = db.markStatusViewed(req.params.id, req.user.id);
        res.json({ success: true, viewers });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/status/:id/viewers', authMiddleware, (req, res) => {
    try {
        const viewers = db.getStatusViewers(req.params.id, req.user.id);
        res.json(viewers);
    } catch (err) {
        res.status(403).json({ error: err.message });
    }
});

app.delete('/api/status/:id', authMiddleware, (req, res) => {
    try {
        db.deleteStatus(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (err) {
        res.status(403).json({ error: err.message });
    }
});

// ─── Message Search ─────────────────────────────────────────
app.get('/api/messages/search', authMiddleware, (req, res) => {
    // E2E encrypted — server can't search, client handles it
    res.json([]);
});

// ─── Socket.IO ──────────────────────────────────────────────
const presenceTracker = new PresenceTracker();
gameSessions.notify = (id,state) => io.to(`user:${id}`).emit('game:activity',state);

function publishPresenceTransition(transition, username = '') {
    if (!transition?.changed) return;
    if (transition.isOnline) {
        db.updateUserOnline(transition.userId, true);
        io.emit('user:online', { userId: transition.userId, username });
    } else {
        const lastSeen = db.updateUserOnline(transition.userId, false);
        io.emit('user:offline', { userId: transition.userId, lastSeen });
    }
}

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.getUserById(decoded.id);
        const current = db.getAuthState(decoded.id);
        if (!user || user.username !== decoded.username || !current || current.auth_version !== (decoded.version ?? 0) || current.password_must_change || decoded.scope === 'password-change') {
            return next(new Error('Authentication error'));
        }
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

const callRelay = new CallRelay({io,db});

io.on('connection', (socket) => {
    const userId = socket.user.id;
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    console.log(`✅ User connected: ${socket.user.username} | IP: ${clientIp}`);

    // Join personal room
    socket.join(`user:${userId}`);
    gameSessions.connect(userId, socket.id);
    socket.emit('game:activity', {active:gameSessions.publicFor(userId)});
    const initialAvailability = socket.handshake.auth.available !== false;
    const connectionTransition = presenceTracker.connect(socket.id, userId, initialAvailability);
    publishPresenceTransition(connectionTransition, socket.user.username);

    // Join all conversation rooms
    const conversations = db.getConversationsForUser(userId, true);
    conversations.forEach(conv => {
        socket.join(`conv:${conv.id}`);
        const match = ludoGames[conv.id];
        if (match) {
            const index = match.players.findIndex(player => player.id === userId);
            if (index >= 0) socket.emit('ludo:started', { conversationId: conv.id, playerNum: index + 1, ...getLudoGameState(match) });
        }
        if (scribblePending[conv.id] && scribblePending[conv.id].hostId !== userId) {
            socket.emit('scribble:invite', {
                conversationId: conv.id,
                hostId: scribblePending[conv.id].hostId,
                hostName: scribblePending[conv.id].hostName
            });
        }
    });

    socket.on('presence:state', ({ available } = {}) => {
        const transition = presenceTracker.update(socket.id, available !== false);
        publishPresenceTransition(transition, socket.user.username);
    });

    const duelSession = duels.install(io, socket, db);
    const tableSession = tables.install(io, socket, db);
    const sceneSession = scenes.install(io, socket, db);
    const legacySession = legacyGamesService.install(io, socket, db);

    if (gameSessions.forUser(userId)?.type === 'scribble') gameSessions.resume(userId,socket);

    // ─── Send Message (E2E encrypted content) ──────────
    socket.on('message:send', (data, callback) => {
        try {
            const { conversationId, ciphertext, messageType, fileData, iv, authTag, dhPub, messageNumber, replyTo } = data;
            if (!conversationId) return callback?.({ error: 'Conversation ID required' });
            if (!db.isUserInConversation(userId, conversationId)) return callback?.({ error: 'Access denied' });

            // Server stores encrypted content as-is — never reads it
            const e2eData = {
                iv: iv || '',
                authTag: authTag || '',
                dhPub: dhPub || '',
                messageNumber: messageNumber || 0
            };

            const message = db.addMessage(conversationId, userId, ciphertext || '', messageType || 'text', fileData || {}, e2eData, replyTo || null);
            io.to(`conv:${conversationId}`).emit('message:new', message);
            callback?.({ success: true, message });
        } catch (err) {
            callback?.({ error: err.message });
        }
    });

    // ─── Mark Read ────────────────
    socket.on('message:read', (data) => {
        const { conversationId } = data;
        if (!conversationId) return;
        db.markMessagesAsRead(conversationId, userId);
        socket.to(`conv:${conversationId}`).emit('message:read', { conversationId, readBy: userId });
    });

    socket.on('message:delete', ({ messageId, conversationId }) => {
        try {
            if (!db.isUserInConversation(userId, conversationId)) {
                return socket.emit('error', { message: 'Access denied' });
            }
            db.deleteMessage(messageId, socket.user.id);

            // Emit to the conversation room (members who have it open)
            io.to(`conv:${conversationId}`).emit('message:deleted', { messageId, conversationId });

            // Also emit to each member's personal room so sidebar updates
            // even if they haven't opened the conversation
            const members = db.getConversationMembers(conversationId);
            members.forEach(member => {
                io.to(`user:${member.id}`).emit('message:deleted', { messageId, conversationId });
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('message:reaction', (data) => {
        const { messageId, conversationId, reaction } = data;
        if (!messageId || !conversationId || !reaction) return;
        if (!db.isUserInConversation(userId, conversationId)) return;

        const reactions = db.addReaction(messageId, userId, reaction);
        io.to(`conv:${conversationId}`).emit('message:reaction', { messageId, conversationId, reactions });
    });

    // ─── Game (Tic Tac Toe, Dots and Boxes, Connect Four, RPS) ────────────────
    socket.on('game:request', (data = {}) => {
        if (!validIds(data)) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        const { targetUserId, conversationId, gameType, boardSize } = data;
        if (tables.isTable(gameType)) return tableSession.invite(data);
        if (scenes.isScene(gameType)) return sceneSession.invite(data);
        if (duels.isDuel(gameType)) return duelSession.invite(data);
        return legacySession.invite(data);
    });

    socket.on('game:accept', (data = {}) => {
        if (!validIds(data)) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        const { targetUserId, conversationId, gameType, boardSize } = data;
        if (tables.isTable(gameType)) return tableSession.accept(data);
        if (scenes.isScene(gameType)) return sceneSession.accept(data);
        if (duels.isDuel(gameType)) return duelSession.accept(data);
        return legacySession.accept(data);
    });

    socket.on('game:decline', (data = {}) => {
        if (!validIds(data)) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        if (tableSession.decline(data) || sceneSession.decline(data) || duelSession.decline(data) || legacySession.decline(data)) return;
    });

    socket.on('game:score:get', (data) => {
        if (!data || !validId(data.targetUserId)) return;
        const { targetUserId } = data;
        if (!targetUserId) return;
        const score = db.getGameScore(userId, targetUserId);
        socket.emit('game:score', { score });
    });

    socket.on('game:resume', () => {
        if (!gameSessions.resume(userId, socket)) socket.emit('arcade:error', {message:'No resumable game is open. Leave the current game to play again.'});
    });
    socket.on('game:leave-current', (data = {}) => {
        const current = gameSessions.forUser(userId);
        if (!current || !data || data.activityId !== current.id) return;
        gameSessions.abandon(userId);
    });
    socket.on('game:solo:start', (data = {}, ack) => {
        const allowed = ['snake','mines','2048','breakout','deskracer','wizardchess','rallyclub'];
        if (!data || !allowed.includes(data.type)) return ack?.({error:'Choose an available solo game.'});
        try {
            const activity = gameSessions.claim({key:'solo:'+userId,type:data.type,players:[userId],actorId:userId});
            ack?.({ok:true,activityId:activity.id});
        } catch(error) { ack?.({error:error.message}); }
    });
    socket.on('game:solo:leave', (data = {}) => {
        const current=gameSessions.forUser(userId);
        if(current?.key==='solo:'+userId && current.id===data?.activityId) gameSessions.release(current);
    });

    // ─── Ludo Game (Private + Group, 2-6 players) ─────────────
    function normalizeLudoPlayerCount(value, fallback = 4) {
        const count = parseInt(value, 10);
        if (!Number.isFinite(count)) return fallback;
        return Math.max(2, Math.min(4, count));
    }

    function getLudoSlots(playerCount) {
        if (playerCount === 2) return [0, 2];
        if (playerCount === 3) return [0, 1, 2];
        return [0, 1, 2, 3];
    }

    function getLudoGameState(game) {
        return {
            players: game.players,
            positions: game.positions,
            currentTurnIndex: game.currentTurnIndex,
            currentTurnPlayerId: game.players[game.currentTurnIndex]?.id || null,
            lastRoll: game.lastRoll,
            lastDice: game.lastDice || null,
            lastRollPlayerId: game.lastRollPlayerId || null,
            diceByPlayer: game.diceByPlayer || {},
            notice: game.notice || '',
            stateVersion: game.stateVersion || 0,
            mustMove: game.mustMove,
            winners: game.winners,
            consecutiveSixes: game.consecutiveSixes
        };
    }

    function emitLudoState(conversationId, game, eventName = 'ludo:state') {
        game.stateVersion = (game.stateVersion || 0) + 1;
        const state = getLudoGameState(game);
        game.players.forEach((player, index) => {
            io.to(`user:${player.id}`).emit(eventName, {
                conversationId,
                playerNum: index + 1,
                ...state
            });
        });
    }

    function getLudoAbsSquare(game, playerIndex, progress) {
        if (progress < 0 || progress >= 51) return null;
        const slot = game.players[playerIndex]?.slot ?? playerIndex;
        const offset = (slot * 13) % 52;
        return (offset + progress) % 52;
    }

    function getLudoStackAt(game, playerIndex, progress) {
        const absSquare = getLudoAbsSquare(game, playerIndex, progress);
        if (absSquare === null) return [];
        const stack = [];
        game.positions.forEach((tokens, otherIndex) => {
            tokens.forEach((tokenProgress, tokenIndex) => {
                if (getLudoAbsSquare(game, otherIndex, tokenProgress) === absSquare) {
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

    function getLudoMovableTokens(game, playerIndex, roll) {
        return LudoRules.movable(game, playerIndex, roll);
    }

    function advanceLudoTurn(game) {
        const total = game.players.length;
        for (let step = 1; step <= total; step++) {
            const next = (game.currentTurnIndex + step) % total;
            if (!game.winners.includes(game.players[next].id)) {
                game.currentTurnIndex = next;
                break;
            }
        }
        game.lastRoll = null;
        game.mustMove = false;
    }

    function ensureLudoWinner(game, playerIndex) {
        const playerId = game.players[playerIndex]?.id;
        if (!playerId || game.winners.includes(playerId)) return;
        if ((game.positions[playerIndex] || []).every(progress => progress >= 56)) {
            game.winners.push(playerId);
        }
    }

    function finishLudoTurn(game, playerIndex, getsExtraTurn) {
        game.lastRoll = null;
        game.mustMove = false;
        if (!getsExtraTurn || game.winners.includes(game.players[playerIndex]?.id)) {
            game.consecutiveSixes[playerIndex] = 0;
            advanceLudoTurn(game);
        }
    }

    socket.on('ludo:start', (data = {}) => {
        if (!validIds(data)) return;
        const { conversationId } = data;
        if (!conversationId || !db.isUserInConversation(userId, conversationId)) return;
        const existing = ludoGames[conversationId];
        if (existing) {
            const index = existing.players.findIndex(p => p.id === userId);
            if (index >= 0) return socket.emit('ludo:started', {conversationId, playerNum:index+1, ...getLudoGameState(existing)});
            return socket.emit('ludo:error', {message:'Other players are already playing Ludo in this chat.'});
        }

        const members = db.getConversationMembers(conversationId);
        const host = members.find(member => member.id === userId) || {
            id: userId,
            username: socket.user.username,
            display_name: socket.user.display_name || socket.user.username
        };
        const requestedCount = normalizeLudoPlayerCount(data.playerCount, Math.min(4, members.length || 2));
        const orderedMembers = [
            host,
            ...members.filter(member => member.id !== userId)
        ].slice(0, requestedCount);
        const slots = getLudoSlots(orderedMembers.length);

        if (orderedMembers.length < 2) {
            socket.emit('ludo:error', { message: 'Ludo needs at least 2 players.' });
            return;
        }

        const game = {
            players: orderedMembers.map(member => ({
                id: member.id,
                username: member.username,
                display_name: member.display_name || member.username,
                slot: slots.shift()
            })),
            positions: orderedMembers.map(() => Array(4).fill(-1)),
            diceByPlayer: {},
            currentTurnIndex: 0,
            lastRoll: null,
            mustMove: false,
            winners: [],
            consecutiveSixes: orderedMembers.map(() => 0)
        };

        try {
            game.activity = gameSessions.claim({key:'ludo:'+conversationId,type:'ludo',conversationId,players:game.players.map(p=>p.id),actorId:userId,onAbandon:id=>cancelLudoMatch(conversationId,game,id),resume:(s,id)=>s.emit('ludo:started',{conversationId,playerNum:game.players.findIndex(p=>p.id===id)+1,...getLudoGameState(game)})});
        } catch(error) { return socket.emit('ludo:error',{message:error.message}); }
        game.expiry = setTimeout(()=>cancelLudoMatch(conversationId,game,null),14400000);game.expiry.unref();
        ludoGames[conversationId] = game;
        emitLudoState(conversationId, ludoGames[conversationId], 'ludo:started');
    });

    socket.on('ludo:roll', (data = {}) => {
        if (!validIds(data)) return;
        const { conversationId } = data;
        const game = ludoGames[conversationId];
        if (!game) return;
        if (game.players[game.currentTurnIndex]?.id !== userId || game.lastRoll) return;

        const roll = crypto.randomInt(1, 7);
        game.rollSerial = (game.rollSerial || 0) + 1;
        game.players.forEach(player => io.to(`user:${player.id}`).emit('ludo:rolling', { conversationId, serial: game.rollSerial, playerId:userId }));
        game.lastDice = roll;
        game.lastRollPlayerId = userId;
        game.diceByPlayer[userId] = roll;
        game.notice = `${socket.user.username} rolled ${roll}.`;
        if (roll === 6) game.consecutiveSixes[game.currentTurnIndex]++;
        else game.consecutiveSixes[game.currentTurnIndex] = 0;

        if (roll === 6 && game.consecutiveSixes[game.currentTurnIndex] >= 3) {
            game.notice = 'Third consecutive six — turn passes. Earlier moves stay on the board.';
            game.lastRoll = roll;
            game.mustMove = false;
            game.consecutiveSixes[game.currentTurnIndex] = 0;
            advanceLudoTurn(game);
            emitLudoState(conversationId, game);
            return;
        }

        game.lastRoll = roll;
        const movable = getLudoMovableTokens(game, game.currentTurnIndex, roll);
        game.mustMove = movable.length > 0;
        if (!game.mustMove) {
            game.notice += roll === 6 ? ' No legal move; roll again.' : ' No legal move; turn passes.';
            finishLudoTurn(game, game.currentTurnIndex, roll === 6);
        }

        emitLudoState(conversationId, game);
    });

    socket.on('ludo:move', (data = {}) => {
        if (!validIds(data)) return;
        const { conversationId, tokenIndex } = data;
        const game = ludoGames[conversationId];
        if (!game || game.players[game.currentTurnIndex]?.id !== userId || !game.lastRoll) return;

        const playerIndex = game.currentTurnIndex;
        const token = parseInt(tokenIndex, 10);
        const movable = getLudoMovableTokens(game, playerIndex, game.lastRoll);
        if (!movable.includes(token)) return;

        const moveResult = LudoRules.move(game, playerIndex, token, game.lastRoll);
        game.notice = moveResult.captured ? 'Capture! Roll again.' : moveResult.finished ? 'Token home! Roll again.' : game.lastRoll === 6 ? 'Six! Roll again.' : 'Move complete. Next player.';

        ensureLudoWinner(game, playerIndex);
        const activePlayers = game.players.filter(player => !game.winners.includes(player.id));
        if (activePlayers.length <= 1) {
            activePlayers.forEach(player => {
                if (!game.winners.includes(player.id)) game.winners.push(player.id);
            });
            emitLudoState(conversationId, game);
            clearTimeout(game.expiry);gameSessions.release(game.activity);
            delete ludoGames[conversationId];
            return;
        }

        finishLudoTurn(game, playerIndex, moveResult.extraTurn);

        emitLudoState(conversationId, game);
    });

    function cancelLudoMatch(conversationId, game, leaver) {
        if(ludoGames[conversationId]!==game)return;
        clearTimeout(game.expiry);gameSessions.release(game.activity);delete ludoGames[conversationId];
        if(game.players.length===2&&leaver){const winner=game.players.find(p=>p.id!==leaver);game.winners=[winner.id,leaver];game.notice='Opponent left the match.';emitLudoState(conversationId,game);}
        for(const player of game.players)io.to(`user:${player.id}`).emit('ludo:ended',{conversationId});
    }
    socket.on('ludo:leave', (data = {}) => {
        if (!validIds(data)) return;
        const { conversationId } = data;
        const game = ludoGames[conversationId];
        if (!game || !game.players.some(player => player.id === userId)) return;
        cancelLudoMatch(conversationId,game,userId);
    });

    // ─── Scribble Game (Group) ──────────────────────────
    // Step 1: Host creates a lobby → all group members get notified
    socket.on('scribble:create', (data = {}) => {
        if (!validIds(data)) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        if (!db.isUserInConversation(userId, data.conversationId)) return;
        const { conversationId } = data;
        if (!conversationId) return;
        if (scribbleGames[conversationId] || scribblePending[conversationId]) return resumeScribble(socket,userId,conversationId);

        let activity;try{activity=gameSessions.claim({key:'scribble:'+conversationId,type:'scribble',conversationId,players:[userId],actorId:userId,onAbandon:id=>leaveScribble(conversationId,id),resume:(s,id)=>resumeScribble(s,id,conversationId)});}catch(error){return socket.emit('scribble:error',{message:error.message});}
        scribblePending[conversationId] = {
            activity,
            hostId: userId,
            hostName: socket.user.username,
            players: [{ id: userId, username: socket.user.username, score: 0 }]
        };

        // Notify all group members
        io.to(`conv:${conversationId}`).emit('scribble:invite', {
            conversationId,
            hostId: userId,
            hostName: socket.user.username
        });

        // Tell the host they're in the lobby
        socket.emit('scribble:lobby', {
            conversationId,
            players: scribblePending[conversationId].players,
            isHost: true
        });
    });

    // Step 2: A member accepts the invite and joins the lobby
    socket.on('scribble:join', (data = {}) => {
        if (!validIds(data)) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        if (!db.isUserInConversation(userId, data.conversationId)) return;
        const { conversationId } = data;
        if (!conversationId) return;
        const pending = scribblePending[conversationId];
        if (!pending) return;
        try{gameSessions.add(pending.activity,[userId],userId);}catch(error){return socket.emit('scribble:error',{message:error.message});}

        if (!pending.players.find(p => p.id === userId)) {
            pending.players.push({ id: userId, username: socket.user.username, score: 0 });
        }

        // Send lobby state to all joined players
        pending.players.forEach(p => {
            io.to(`user:${p.id}`).emit('scribble:lobby', {
                conversationId,
                players: pending.players,
                isHost: (p.id === pending.hostId)
            });
        });
    });

    // Step 3: Host starts the game
    socket.on('scribble:start_game', (data = {}) => {
        if (!validIds(data)) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        if (!db.isUserInConversation(userId, data.conversationId)) return;
        const { conversationId } = data;
        const pending = scribblePending[conversationId];
        if (!pending || pending.hostId !== userId) return;
        if (pending.players.length < 2) {
            socket.emit('scribble:error', { message: 'Need at least 2 players to start' });
            return;
        }

        // Create the actual game
        scribbleGames[conversationId] = {
            activity: pending.activity,
            hostId: pending.hostId,
            players: pending.players.map(p => ({ ...p, score: 0 })),
            drawerIndex: 0,
            currentWord: '',
            timer: null,
            timeLeft: 0,
            status: 'waiting',
            round: 0,
            usedWords: []
        };
        delete scribblePending[conversationId];

        // Close invites for anyone who didn't join
        io.to(`conv:${conversationId}`).emit('scribble:invite_closed', { conversationId });

        const game = scribbleGames[conversationId];
        // Notify all players
        game.players.forEach(p => {
            io.to(`user:${p.id}`).emit('scribble:game_started', {
                conversationId,
                players: game.players
            });
        });

        // Start first round immediately
        startScribbleRound(conversationId);
    });

    function getRandomWords(count, usedWords) {
        const used = new Set(usedWords);
        let available = scribbleWords.filter(w => !used.has(w));
        if (available.length < count) {
            usedWords.length = 0;
            available = [...scribbleWords];
        }
        const words = [];
        for (let i = 0; i < count && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            words.push(available.splice(idx, 1)[0]);
        }
        return words;
    }

    function startScribbleRound(conversationId) {
        const game = scribbleGames[conversationId];
        if (!game) return;

        game.status = 'choosing';
        const drawer = game.players[game.drawerIndex];
        const words = getRandomWords(3, game.usedWords);
        game.wordChoices = words;
        clearTimeout(game.chooseTimer);
        game.chooseTimer = setTimeout(() => {
            if (scribbleGames[conversationId] === game && game.status === 'choosing') beginScribbleDrawing(conversationId, words[0]);
        }, 15000);

        // Send word choices ONLY to the drawer
        io.to(`user:${drawer.id}`).emit('scribble:choose_word', { words, conversationId });

        // Tell everyone else who is choosing
        game.players.forEach(p => {
            io.to(`user:${p.id}`).emit('scribble:status', {
                conversationId,
                status: 'choosing',
                drawerUsername: drawer.username,
                drawerId: drawer.id
            });
        });
    }

    socket.on('scribble:word_selected', (data = {}) => {
        if (!validIds(data)) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        const game = scribbleGames[data.conversationId];
        if (!game || game.players[game.drawerIndex]?.id !== userId || !ScribbleRules.canSelect(game, data.word)) return;
        beginScribbleDrawing(data.conversationId, data.word.toLowerCase());
    });

    function beginScribbleDrawing(conversationId, word) {
        const game = scribbleGames[conversationId];
        if (!ScribbleRules.canSelect(game, word)) return;
        clearTimeout(game.chooseTimer);
        const drawer = game.players[game.drawerIndex];
        game.currentWord = word;
        game.drawingHistory = [];
        game.usedWords.push(word);
        game.status = 'drawing';
        game.timeLeft = 80;
        game.players.forEach(p => io.to(`user:${p.id}`).emit('scribble:drawing_started', {
            conversationId, drawerId: drawer.id, drawerUsername: drawer.username,
            wordLength: word.length, word: p.id === drawer.id ? word : null,
            timeLeft: 80, round: Math.floor(game.round / game.players.length) + 1
        }));
        clearInterval(game.timer);
        game.timer = setInterval(() => {
            if (scribbleGames[conversationId] !== game || game.status !== 'drawing') return clearInterval(game.timer);
            game.timeLeft--;
            if (game.timeLeft <= 0) endScribbleRound(conversationId);
            else game.players.forEach(p => io.to(`user:${p.id}`).emit('scribble:timer', {timeLeft: game.timeLeft, conversationId}));
        }, 1000);
    }

    socket.on('scribble:draw', (data = {}) => {
        if (!validIds(data)) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        if (!db.isUserInConversation(userId, data.conversationId)) return;
        const { conversationId, drawData } = data;
        const game = scribbleGames[conversationId];
        if (!game || game.status !== 'drawing' || game.players[game.drawerIndex].id !== userId) return;

        // Send to all players EXCEPT the drawer
        const safeDraw = ScribbleRules.normalizeDraw(drawData);
        if (!safeDraw) return;
        const now = Date.now();
        if (now - (game.lastDrawAt || 0) < 8 && safeDraw.type !== 'clear') return;
        game.lastDrawAt = now;
        if(safeDraw.type==='clear')game.drawingHistory=[];
        if(game.drawingHistory.length<10000)game.drawingHistory.push(safeDraw);
        game.players.filter(p => p.id !== userId).forEach(p => io.to(`user:${p.id}`).emit('scribble:draw', {drawData: safeDraw, conversationId}));
    });

    socket.on('scribble:guess', (data = {}) => {
        if (!validIds(data)) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        if (!db.isUserInConversation(userId, data.conversationId)) return;
        const { conversationId, guess } = data;
        const game = scribbleGames[conversationId];
        if (!game || game.status !== 'drawing') return;
        if (game.players[game.drawerIndex].id === userId) return; // Drawer can't guess

        const player = game.players.find(p => p.id === userId);
        if (!player || player.hasGuessed) return;

        if (typeof guess !== 'string' || guess.length > 128) return;
        if (guess.toLowerCase().trim() === game.currentWord) {
            player.hasGuessed = true;
            const points = Math.max(10, Math.floor(game.timeLeft));
            player.score += points;
            game.players[game.drawerIndex].score += 5;

            game.players.forEach(p => {
                io.to(`user:${p.id}`).emit('scribble:correct_guess', {
                    conversationId,
                    userId,
                    username: socket.user.username,
                    players: game.players
                });
            });

            // All guessed? End round
            const others = game.players.filter((p, i) => i !== game.drawerIndex);
            if (others.every(p => p.hasGuessed)) {
                game.guessTimer = setTimeout(() => { if (scribbleGames[conversationId] === game) endScribbleRound(conversationId); }, 1500);
            }
        } else {
            // Broadcast wrong guess in chat
            game.players.forEach(p => {
                io.to(`user:${p.id}`).emit('scribble:guess_msg', {
                    conversationId,
                    username: socket.user.username,
                    guess
                });
            });
        }
    });

    function endScribbleRound(conversationId) {
        const game = scribbleGames[conversationId];
        if (!ScribbleRules.claimRoundEnd(game)) return;

        clearInterval(game.timer);
        clearTimeout(game.guessTimer);
        game.timer = null;

        game.players.forEach(p => {
            io.to(`user:${p.id}`).emit('scribble:round_ended', {
                conversationId,
                word: game.currentWord,
                players: game.players
            });
        });

        // Reset guessed status
        game.players.forEach(p => p.hasGuessed = false);

        // Next drawer
        game.drawerIndex = (game.drawerIndex + 1) % game.players.length;
        game.round++;

        // 3 rounds per player
        if (game.round >= game.players.length * 3) {
            game.finishTimer = setTimeout(() => {
                ScribbleRules.finishCurrent(scribbleGames, conversationId, game, finished => {
                    gameSessions.release(finished.activity);
                    finished.players.forEach(p => io.to(`user:${p.id}`).emit('scribble:game_over', {conversationId, players:finished.players}));
                });
            }, 3500);
        } else {
            // Start next round after 5 seconds
            game.nextTimer = setTimeout(() => { if (scribbleGames[conversationId] === game) startScribbleRound(conversationId); }, 3500);
        }
    }

    function leaveScribble(conversationId, leavingId) {
        const activity=(scribbleGames[conversationId]||scribblePending[conversationId])?.activity;
        if(activity)gameSessions.releasePlayer(activity,leavingId);
        // Clean up from pending
        if (scribblePending[conversationId]) {
            const pending = scribblePending[conversationId];
            if (pending.hostId === leavingId) {
                // Host cancelled the game
                gameSessions.release(pending.activity);
                delete scribblePending[conversationId];
                io.to(`conv:${conversationId}`).emit('scribble:invite_closed', { conversationId });
                pending.players.forEach(p => {
                    io.to(`user:${p.id}`).emit('scribble:game_over', { conversationId, players: [] });
                });
            } else {
                pending.players = pending.players.filter(p => p.id !== leavingId);
                pending.players.forEach(p => {
                    io.to(`user:${p.id}`).emit('scribble:lobby', {
                        conversationId,
                        players: pending.players,
                        isHost: (p.id === pending.hostId)
                    });
                });
                if (pending.players.length === 0) {gameSessions.release(pending.activity);delete scribblePending[conversationId];}
            }
        }
        // Clean up from active game
        if (scribbleGames[conversationId]) {
            const game = scribbleGames[conversationId];
            if (!game.players.some(p => p.id === leavingId)) return;
            if (game.hostId === leavingId) {
                clearInterval(game.timer);
                clearTimeout(game.chooseTimer); clearTimeout(game.guessTimer); clearTimeout(game.nextTimer); clearTimeout(game.finishTimer);
                game.players.forEach(p => {
                    io.to(`user:${p.id}`).emit('scribble:game_over', { conversationId, players: [] });
                });
                gameSessions.release(game.activity);
                delete scribbleGames[conversationId];
            } else {
                const drawerId = game.players[game.drawerIndex]?.id;
                game.players = game.players.filter(p => p.id !== leavingId);
                game.drawerIndex = Math.max(0, game.players.findIndex(p => p.id === drawerId));
                if (drawerId === leavingId && game.players.length >= 2) {
                    clearInterval(game.timer); clearTimeout(game.chooseTimer); clearTimeout(game.guessTimer); clearTimeout(game.nextTimer); clearTimeout(game.finishTimer);
                    game.status = 'waiting'; startScribbleRound(conversationId);
                }
                if (game.players.length < 2) {
                    clearInterval(game.timer);
                    clearTimeout(game.chooseTimer); clearTimeout(game.guessTimer); clearTimeout(game.nextTimer); clearTimeout(game.finishTimer);
                    game.players.forEach(p => {
                        io.to(`user:${p.id}`).emit('scribble:game_over', { conversationId, players: game.players });
                    });
                    gameSessions.release(game.activity);
                delete scribbleGames[conversationId];
                }
            }
        }
    }
    socket.on('scribble:leave', (data={}) => {
        if(!validIds(data)||!db.isUserInConversation(userId,data.conversationId))return;
        leaveScribble(data.conversationId,userId);
    });
    function resumeScribble(s,id,conversationId){
        const pending=scribblePending[conversationId];
        if(pending){if(pending.players.some(p=>p.id===id))s.emit('scribble:lobby',{conversationId,players:pending.players,isHost:pending.hostId===id});return;}
        const game=scribbleGames[conversationId];if(!game||!game.players.some(p=>p.id===id))return;
        const drawer=game.players[game.drawerIndex];s.emit('scribble:game_started',{conversationId,players:game.players});
        if(game.status==='choosing'){
            s.emit('scribble:status',{conversationId,status:'choosing',drawerId:drawer.id,drawerUsername:drawer.username});
            if(drawer.id===id)s.emit('scribble:choose_word',{conversationId,words:game.wordChoices});
        }else if(game.status==='drawing'){
            s.emit('scribble:drawing_started',{conversationId,drawerId:drawer.id,drawerUsername:drawer.username,wordLength:game.currentWord.length,word:drawer.id===id?game.currentWord:null,timeLeft:game.timeLeft});
            s.emit('scribble:canvas',{conversationId,draws:game.drawingHistory||[]});
        }else s.emit('scribble:round_ended',{conversationId,word:game.currentWord,players:game.players});
    }

    socket.on('message:reaction:remove', (data) => {
        const { messageId, conversationId } = data;
        if (!messageId || !conversationId) return;
        if (!db.isUserInConversation(userId, conversationId)) return;

        const reactions = db.removeReaction(messageId, userId);
        io.to(`conv:${conversationId}`).emit('message:reaction', { messageId, conversationId, reactions });
    });

    // ─── Typing ───────────────────
    socket.on('typing:start', (data) => {
        const { conversationId } = data;
        socket.to(`conv:${conversationId}`).emit('typing:indicator', {
            conversationId, userId, username: socket.user.username, typing: true
        });
    });

    socket.on('typing:stop', (data) => {
        const { conversationId } = data;
        socket.to(`conv:${conversationId}`).emit('typing:indicator', {
            conversationId, userId, username: socket.user.username, typing: false
        });
    });

    // Call identities and signals are scoped to the participating sockets.
    callRelay.attach(socket);

    // ─── Disconnect ───────────────
    socket.on('disconnect', () => {
        gameSessions.disconnect(userId, socket.id);
        console.log(`❌ User disconnected: ${socket.user.username}`);
        const transition = presenceTracker.disconnect(socket.id);
        publishPresenceTransition(transition, socket.user.username);
    });
});

// ─── Start Servers ───────────────────────────────────────────
function getLocalIP() {
    const interfaces = require('os').networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) return alias.address;
        }
    }
    return 'localhost';
}

httpServer.listen(PORT, '0.0.0.0', () => {
    const lanIP = getLocalIP();
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║        🔒 LAN Messenger (E2E Encrypted)                ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  HTTP  Local:  http://localhost:${PORT}                     ║`);
    console.log(`║  HTTP  LAN:    http://${lanIP}:${PORT}              ║`);
    if (httpsServer) {
        console.log(`║  HTTPS Local:  https://localhost:${HTTPS_PORT}  (✅ Voice calls) ║`);
        console.log(`║  HTTPS LAN:    https://${lanIP}:${HTTPS_PORT}  (✅ Voice calls) ║`);
    } else {
        console.log('║  HTTPS: ⚠️  Certificate not found — voice calls disabled  ║');
    }
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
});

adminServer.listen(ADMIN_PORT, '0.0.0.0', () => {
    const lanIP = getLocalIP();
    console.log(`🛠️  Control Panel: http://${lanIP}:${ADMIN_PORT}`);
});

if (httpsServer) {
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`🔒 HTTPS server listening on port ${HTTPS_PORT}`);
    });
}
