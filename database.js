const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const {AccountRecovery} = require('./account-recovery');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'messenger.db');

let db;
let recovery;

function initDatabase() {
    const dbDir = path.dirname(DB_PATH);
    require('fs').mkdirSync(dbDir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            avatar TEXT DEFAULT '',
            status TEXT DEFAULT 'Hey there! I am using LAN Messenger',
            public_identity_key TEXT DEFAULT '',
            signed_prekey TEXT DEFAULT '',
            sig TEXT DEFAULT '',
            device_binding TEXT DEFAULT '',
            password_must_change INTEGER DEFAULT 0,
            temp_password_expires_at TEXT DEFAULT '',
            is_online INTEGER DEFAULT 0,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS prekeys (
            user_id TEXT NOT NULL,
            key_id INTEGER NOT NULL,
            public_key TEXT NOT NULL,
            is_used INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, key_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK(type IN ('private', 'group')),
            name TEXT DEFAULT '',
            avatar TEXT DEFAULT '',
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS conversation_members (
            conversation_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (conversation_id, user_id),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            conversation_id TEXT NOT NULL,
            ciphertext TEXT DEFAULT '',
            iv TEXT DEFAULT '',
            auth_tag TEXT DEFAULT '',
            dh_pub TEXT DEFAULT '',
            message_number INTEGER DEFAULT 0,
            message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'file', 'video', 'audio', 'system')),
            file_url TEXT DEFAULT '',
            file_name TEXT DEFAULT '',
            file_size INTEGER DEFAULT 0,
            reply_to TEXT DEFAULT '',
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS message_reactions (
            message_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            reaction TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (message_id, user_id),
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS inbox_hidden (
            conversation_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            PRIMARY KEY (conversation_id, user_id),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS statuses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'image' CHECK(type IN ('image', 'video', 'text')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS status_views (
            status_id TEXT NOT NULL,
            viewer_id TEXT NOT NULL,
            viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (status_id, viewer_id),
            FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE CASCADE,
            FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS game_scores (
            user_id_1 TEXT NOT NULL,
            user_id_2 TEXT NOT NULL,
            wins_1 INTEGER DEFAULT 0,
            wins_2 INTEGER DEFAULT 0,
            draws INTEGER DEFAULT 0,
            PRIMARY KEY (user_id_1, user_id_2),
            FOREIGN KEY (user_id_1) REFERENCES users(id),
            FOREIGN KEY (user_id_2) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_status_views_status ON status_views(status_id, viewed_at);
    `);

    recovery = new AccountRecovery(db);

    // Migrations to avoid failure on existing DB
    try { db.exec('ALTER TABLE users ADD COLUMN public_identity_key TEXT DEFAULT ""'); } catch (e) {}
    try { db.exec('ALTER TABLE users ADD COLUMN signed_prekey TEXT DEFAULT ""'); } catch (e) {}
    try { db.exec('ALTER TABLE users ADD COLUMN sig TEXT DEFAULT ""'); } catch (e) {}
    try { db.exec('ALTER TABLE users ADD COLUMN password_must_change INTEGER DEFAULT 0'); } catch (e) {}
    try { db.exec("ALTER TABLE users ADD COLUMN temp_password_expires_at TEXT DEFAULT ''"); } catch (e) {}
    try { db.exec('ALTER TABLE messages ADD COLUMN ciphertext TEXT DEFAULT ""'); } catch (e) {}
    try { db.exec('ALTER TABLE messages ADD COLUMN iv TEXT DEFAULT ""'); } catch (e) {}
    try { db.exec('ALTER TABLE messages ADD COLUMN auth_tag TEXT DEFAULT ""'); } catch (e) {}
    try { db.exec('ALTER TABLE messages ADD COLUMN dh_pub TEXT DEFAULT ""'); } catch (e) {}
    try { db.exec('ALTER TABLE messages ADD COLUMN message_number INTEGER DEFAULT 0'); } catch (e) {}

    return db;
}

// ─── User Operations ────────────────────────────────────────

function createUser(username, displayName, password, avatar, deviceBinding) {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    try {
        db.prepare(`
            INSERT INTO users (id, username, display_name, password_hash, avatar, device_binding) VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, username.toLowerCase(), displayName, passwordHash, avatar || '', deviceBinding || '');
        return { id, username: username.toLowerCase(), display_name: displayName };
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            throw new Error('Username already taken');
        }
        throw err;
    }
}

function resetPassword() { throw new Error('Use a private recovery code to reset your password.'); }

function authenticateUser(username, password) {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
    if (!user) throw new Error('User not found');
    if (!bcrypt.compareSync(password, user.password_hash)) throw new Error('Invalid password');
    if (user.password_must_change && user.temp_password_expires_at && Date.now() > Date.parse(user.temp_password_expires_at)) {
        throw new Error('Temporary password expired. Please ask for a new temporary password.');
    }
    return {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar: user.avatar,
        status: user.status,
        password_must_change: !!user.password_must_change,
        temp_password_expires_at: user.temp_password_expires_at || ''
    };
}

function getUserById(id) {
    return db.prepare('SELECT id, username, display_name, avatar, status, is_online, last_seen, created_at, public_identity_key FROM users WHERE id = ?').get(id);
}

function getAllUsers(excludeId) {
    return db.prepare('SELECT id, username, display_name, avatar, status, is_online, last_seen FROM users WHERE id != ? ORDER BY display_name').all(excludeId);
}

function getUsersForAdmin() {
    return db.prepare(`
        SELECT id, username, display_name, avatar, status, is_online, last_seen, created_at, password_must_change, temp_password_expires_at
        FROM users
        ORDER BY display_name
    `).all();
}

function searchUsers(query, excludeId) {
    const q = `%${query}%`;
    return db.prepare(`
        SELECT id, username, display_name, avatar, status, is_online, last_seen 
        FROM users WHERE (username LIKE ? OR display_name LIKE ?) AND id != ? ORDER BY display_name
    `).all(q, q, excludeId);
}

function updateUserOnline(userId, isOnline) {
    db.prepare('UPDATE users SET is_online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(isOnline ? 1 : 0, userId);
    const row = db.prepare('SELECT last_seen FROM users WHERE id = ?').get(userId);
    return row ? row.last_seen : null;
}

function updateUserProfile(userId, displayName, status, avatar) {
    const updates = [];
    const params = [];
    if (displayName) { updates.push('display_name = ?'); params.push(displayName); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar); }
    if (updates.length === 0) return;
    params.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

function changeUserPassword(userId, newPassword) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ?, auth_version = auth_version + 1, password_must_change = 0, temp_password_expires_at = '' WHERE id = ?").run(newPasswordHash, userId);
    return true;
}

function setTemporaryPasswordByUsername(username, tempPassword, ttlMs = 120000) {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
    if (!user) throw new Error('User not found');
    const passwordHash = bcrypt.hashSync(tempPassword, 10);
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    db.prepare(`
        UPDATE users
        SET password_hash = ?, password_must_change = 1, temp_password_expires_at = ?
        WHERE id = ?
    `).run(passwordHash, expiresAt, user.id);
    return { expiresAt };
}

function completeTemporaryPasswordChange(userId, newPassword) {
    const user = db.prepare('SELECT id, password_must_change FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');
    if (!user.password_must_change) throw new Error('Password change is not required for this account.');
    return changeUserPassword(userId, newPassword);
}

function deleteUserByUsername(username) {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
    if (!user) throw new Error('User not found');
    return deleteUser(user.id);
}

function deleteUser(userId) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');

    const tx = db.transaction(() => {
        db.prepare('DELETE FROM message_reactions WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM status_views WHERE viewer_id = ?').run(userId);
        db.prepare('DELETE FROM game_scores WHERE user_id_1 = ? OR user_id_2 = ?').run(userId, userId);
        db.prepare('DELETE FROM statuses WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM prekeys WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM messages WHERE sender_id = ?').run(userId);
        db.prepare('DELETE FROM conversation_members WHERE user_id = ?').run(userId);
        db.prepare('UPDATE conversations SET created_by = NULL WHERE created_by = ?').run(userId);
        db.prepare('DELETE FROM conversations WHERE id NOT IN (SELECT DISTINCT conversation_id FROM conversation_members)').run();
        db.prepare(`
            DELETE FROM conversations
            WHERE type = 'private'
              AND id IN (
                  SELECT conversation_id
                  FROM conversation_members
                  GROUP BY conversation_id
                  HAVING COUNT(*) < 2
              )
        `).run();
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });

    tx();
    return true;
}

// ─── Prekey Operations ──────────────────────────────────────

function setPrekeys(userId, identityKey, signedPrekey, sig, prekeys) {
    const tx = db.transaction(() => {
        db.prepare('UPDATE users SET public_identity_key = ?, signed_prekey = ?, sig = ? WHERE id = ?')
          .run(identityKey, signedPrekey, sig, userId);
        
        const insertStmt = db.prepare('INSERT OR REPLACE INTO prekeys (user_id, key_id, public_key, is_used) VALUES (?, ?, ?, 0)');
        for (const pk of prekeys) {
            insertStmt.run(userId, pk.keyId, pk.publicKey);
        }
    });
    tx();
}

function getBundle(userId) {
    const tx = db.transaction(() => {
        const user = db.prepare('SELECT public_identity_key, signed_prekey, sig FROM users WHERE id = ?').get(userId);
        if (!user || !user.public_identity_key) return null;

        // Fetch ONE unused prekey
        const oneTimePrekey = db.prepare('SELECT key_id, public_key FROM prekeys WHERE user_id = ? AND is_used = 0 LIMIT 1').get(userId);

        if (oneTimePrekey) {
            db.prepare('UPDATE prekeys SET is_used = 1 WHERE user_id = ? AND key_id = ?').run(userId, oneTimePrekey.key_id);
        }

        return {
            identityKey: user.public_identity_key,
            signedPrekey: user.signed_prekey,
            sig: user.sig,
            prekey: oneTimePrekey ? { id: oneTimePrekey.key_id, key: oneTimePrekey.public_key } : null
        };
    });
    return tx();
}

function getConversationMemberKeys(conversationId) {
    return db.prepare(`
        SELECT u.id, u.public_identity_key 
        FROM conversation_members cm JOIN users u ON cm.user_id = u.id
        WHERE cm.conversation_id = ?
    `).all(conversationId);
}

// ─── Conversation Operations ────────────────────────────────

function getOrCreatePrivateConversation(userId1, userId2) {
    const existing = db.prepare(`
        SELECT c.id FROM conversations c
        JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ?
        JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ?
        WHERE c.type = 'private'
    `).get(userId1, userId2);

    if (existing) {
        db.prepare('DELETE FROM inbox_hidden WHERE conversation_id = ? AND user_id = ?').run(existing.id, userId1);
        return existing.id;
    }

    const id = uuidv4();
    db.prepare('INSERT INTO conversations (id, type, created_by) VALUES (?, ?, ?)').run(id, 'private', userId1);
    db.prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)').run(id, userId1, 'admin');
    db.prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)').run(id, userId2, 'member');
    return id;
}

function createGroup(name, creatorId, memberIds, avatar) {
    const id = uuidv4();
    db.prepare('INSERT INTO conversations (id, type, name, avatar, created_by) VALUES (?, ?, ?, ?, ?)').run(id, 'group', name, avatar || '', creatorId);
    db.prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)').run(id, creatorId, 'admin');

    const insertMember = db.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)');
    for (const memberId of memberIds) {
        if (memberId !== creatorId) {
            insertMember.run(id, memberId, 'member');
        }
    }

    // System message (not encrypted)
    const creator = getUserById(creatorId);
    addMessage(id, creatorId, `${creator.display_name} created the group "${name}"`, 'system');

    return id;
}

function hideConversation(conversationId, userId) {
    if (!isUserInConversation(userId, conversationId)) throw new Error('Access denied');
    db.prepare('INSERT OR IGNORE INTO inbox_hidden (conversation_id, user_id) VALUES (?, ?)').run(conversationId, userId);
}

function getConversationsForUser(userId, includeHidden = false) {
    const rows = db.prepare(`
        SELECT c.*, cm.role as my_role,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = 0 AND m.sender_id != ?) as unread_count,
            (SELECT m2.ciphertext FROM messages m2 WHERE m2.conversation_id = c.id ORDER BY m2.created_at DESC, m2.rowid DESC LIMIT 1) as last_message_ciphertext,
            (SELECT m2c.id FROM messages m2c WHERE m2c.conversation_id = c.id ORDER BY m2c.created_at DESC, m2c.rowid DESC LIMIT 1) as last_message_id,
            (SELECT m3.created_at FROM messages m3 WHERE m3.conversation_id = c.id ORDER BY m3.created_at DESC, m3.rowid DESC LIMIT 1) as last_message_time,
            (SELECT m4.sender_id FROM messages m4 WHERE m4.conversation_id = c.id ORDER BY m4.created_at DESC, m4.rowid DESC LIMIT 1) as last_message_sender,
            (SELECT m5.message_type FROM messages m5 WHERE m5.conversation_id = c.id ORDER BY m5.created_at DESC, m5.rowid DESC LIMIT 1) as last_message_type,
            (SELECT (m6.iv <> '' OR m6.dh_pub <> '' OR m6.auth_tag <> '') FROM messages m6 WHERE m6.conversation_id = c.id ORDER BY m6.created_at DESC, m6.rowid DESC LIMIT 1) as last_message_encrypted
        FROM conversations c
        JOIN conversation_members cm ON c.id = cm.conversation_id AND cm.user_id = ?
        WHERE (? = 1 OR NOT EXISTS (SELECT 1 FROM inbox_hidden ih WHERE ih.conversation_id = c.id AND ih.user_id = cm.user_id))
        ORDER BY last_message_time DESC NULLS LAST
    `).all(userId, userId, includeHidden ? 1 : 0);

    return rows.map(row => {
        row.last_message_encrypted = Boolean(row.last_message_encrypted);
        row.last_message = row.last_message_encrypted ? '' : row.last_message_ciphertext || '';
        if (row.type === 'private') {
            const otherUser = db.prepare(`
                SELECT u.id, u.username, u.display_name, u.avatar, u.status, u.is_online, u.last_seen, u.public_identity_key
                FROM conversation_members cm JOIN users u ON cm.user_id = u.id
                WHERE cm.conversation_id = ? AND cm.user_id != ?
            `).get(row.id, userId);
            row.other_user = otherUser;
            row.name = otherUser ? otherUser.display_name : 'Unknown';
            row.avatar = otherUser ? otherUser.avatar : '';
        }
        return row;
    });
}

function getConversationById(conversationId) {
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
}

function getConversationMembers(conversationId) {
    return db.prepare(`
        SELECT u.id, u.username, u.display_name, u.avatar, u.status, u.is_online, cm.role, u.public_identity_key
        FROM conversation_members cm JOIN users u ON cm.user_id = u.id
        WHERE cm.conversation_id = ?
        ORDER BY cm.role DESC, u.display_name
    `).all(conversationId);
}

function isUserInConversation(userId, conversationId) {
    return !!db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId);
}

function addGroupMember(conversationId, userId, addedById) {
    db.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)').run(conversationId, userId, 'member');
    const adder = getUserById(addedById);
    const added = getUserById(userId);
    addMessage(conversationId, addedById, `${adder.display_name} added ${added.display_name}`, 'system');
}

function removeGroupMember(conversationId, userId, removedById) {
    db.prepare('DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?').run(conversationId, userId);
    const remover = getUserById(removedById);
    const removed = getUserById(userId);
    addMessage(conversationId, removedById, `${remover.display_name} removed ${removed.display_name}`, 'system');
}

function updateGroup(conversationId, name, avatar) {
    const updates = [];
    const params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar); }
    if (updates.length === 0) return;
    params.push(conversationId);
    db.prepare(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

// ─── Message Operations ─────────────────────────────────────

function addMessage(conversationId, senderId, ciphertext, type = 'text', fileData = {}, e2eData = {}, replyTo = null) {
    const id = uuidv4();
    db.prepare(`
        INSERT INTO messages (id, sender_id, conversation_id, ciphertext, iv, auth_tag, dh_pub, message_number, message_type, file_url, file_name, file_size, reply_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id, senderId, conversationId, ciphertext, 
        e2eData.iv || '', e2eData.authTag || '', e2eData.dhPub || '', e2eData.messageNumber || 0,
        type, fileData.fileUrl || '', fileData.fileName || '', fileData.fileSize || 0,
        replyTo || null
    );

    db.prepare('DELETE FROM inbox_hidden WHERE conversation_id = ?').run(conversationId);

    return db.prepare(`
        SELECT m.*, u.display_name as sender_name, u.avatar as sender_avatar, u.username as sender_username
        FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?
    `).get(id);
}

function deleteMessage(messageId, userId) {
    const message = db.prepare('SELECT sender_id FROM messages WHERE id = ?').get(messageId);
    if (!message) throw new Error('Message not found');
    if (message.sender_id !== userId) throw new Error('Unauthorized to delete this message');

    // Wipe content and mark as system/deleted
    db.prepare(`
        UPDATE messages 
        SET ciphertext = '', 
            message_type = 'system', 
            iv = '',
            auth_tag = '',
            dh_pub = '',
            message_number = 0,
            file_url = '',
            file_name = '',
            file_size = 0
        WHERE id = ?
    `).run(messageId);
    
    return true;
}

function getMessages(conversationId, limit = 50, before = null) {
    let messages;
    if (before) {
        messages = db.prepare(`
            SELECT m.*, u.display_name as sender_name, u.avatar as sender_avatar, u.username as sender_username
            FROM messages m JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ? AND m.created_at < ?
            ORDER BY m.created_at DESC LIMIT ?
        `).all(conversationId, before, limit).reverse();
    } else {
        messages = db.prepare(`
            SELECT m.*, u.display_name as sender_name, u.avatar as sender_avatar, u.username as sender_username
            FROM messages m JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at DESC LIMIT ?
        `).all(conversationId, limit).reverse();
    }

    // Attach reactions to each message
    for (const msg of messages) {
        msg.reactions = db.prepare(`
            SELECT user_id, reaction FROM message_reactions WHERE message_id = ?
        `).all(msg.id);
    }
    return messages;
}

function addReaction(messageId, userId, reaction) {
    db.prepare(`
        INSERT INTO message_reactions (message_id, user_id, reaction)
        VALUES (?, ?, ?)
        ON CONFLICT(message_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction
    `).run(messageId, userId, reaction);
    return getReactions(messageId);
}

function removeReaction(messageId, userId) {
    db.prepare('DELETE FROM message_reactions WHERE message_id = ? AND user_id = ?').run(messageId, userId);
    return getReactions(messageId);
}

function getReactions(messageId) {
    return db.prepare('SELECT user_id, reaction FROM message_reactions WHERE message_id = ?').all(messageId);
}

function clearConversationMessages(conversationId) {
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);
}

function markMessagesAsRead(conversationId, userId) {
    db.prepare('UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0').run(conversationId, userId);
}

// ─── Status Operations ──────────────────────────────────────
function createStatus(userId, content, type = 'image') {
    const id = uuidv4();
    db.prepare('INSERT INTO statuses (id, user_id, content, type) VALUES (?, ?, ?, ?)').run(id, userId, content, type);
    return { id, user_id: userId, content, type, created_at: new Date().toISOString() };
}

function getStatusById(statusId) {
    return db.prepare('SELECT * FROM statuses WHERE id = ?').get(statusId);
}

function markStatusViewed(statusId, viewerId) {
    const status = getStatusById(statusId);
    if (!status) throw new Error('Status not found');
    if (status.user_id === viewerId) return getStatusViewers(statusId, viewerId);

    db.prepare(`
        INSERT INTO status_views (status_id, viewer_id, viewed_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(status_id, viewer_id) DO UPDATE SET viewed_at = CURRENT_TIMESTAMP
    `).run(statusId, viewerId);

    return [];
}

function getStatusViewers(statusId, requesterId) {
    const status = getStatusById(statusId);
    if (!status) throw new Error('Status not found');
    if (status.user_id !== requesterId) throw new Error('Only the status owner can view seen-by details');

    return db.prepare(`
        SELECT u.id, u.username, u.display_name, u.avatar, sv.viewed_at
        FROM status_views sv
        JOIN users u ON sv.viewer_id = u.id
        WHERE sv.status_id = ?
        ORDER BY sv.viewed_at DESC
    `).all(statusId);
}

function getActiveStatuses(userId) {
    // Return statuses from all users created in the last 24 hours
    // (In a real app, we might only return statuses from contacts/friends)
    const rows = db.prepare(`
        SELECT s.*, u.display_name as user_name, u.avatar as user_avatar, u.username,
            (SELECT COUNT(*) FROM status_views sv WHERE sv.status_id = s.id) as view_count
        FROM statuses s
        JOIN users u ON s.user_id = u.id
        WHERE s.created_at > datetime('now', '-24 hours')
        ORDER BY s.created_at DESC
    `).all();

    // Group by user
    const users = {};
    rows.forEach(row => {
        if (!users[row.user_id]) {
            users[row.user_id] = {
                id: row.user_id,
                name: row.user_name,
                avatar: row.user_avatar,
                username: row.username,
                is_mine: row.user_id === userId,
                statuses: []
            };
        }
        users[row.user_id].statuses.push(row);
    });
    return Object.values(users);
}

function deleteStatus(statusId, userId) {
    const status = getStatusById(statusId);
    if (!status) throw new Error('Status not found');
    if (status.user_id !== userId) throw new Error('Unauthorized to delete this status');

    db.prepare('DELETE FROM statuses WHERE id = ?').run(statusId);
    return true;
}

function getGameScore(userId1, userId2) {
    const [u1, u2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    let score = db.prepare('SELECT * FROM game_scores WHERE user_id_1 = ? AND user_id_2 = ?').get(u1, u2);
    if (!score) {
        db.prepare('INSERT INTO game_scores (user_id_1, user_id_2) VALUES (?, ?)').run(u1, u2);
        score = { user_id_1: u1, user_id_2: u2, wins_1: 0, wins_2: 0, draws: 0 };
    }
    return score;
}

function updateGameScore(userId1, userId2, winnerId) {
    const [u1, u2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    getGameScore(u1, u2); // Ensure it exists

    if (winnerId === 'draw') {
        db.prepare('UPDATE game_scores SET draws = draws + 1 WHERE user_id_1 = ? AND user_id_2 = ?').run(u1, u2);
    } else if (winnerId === u1) {
        db.prepare('UPDATE game_scores SET wins_1 = wins_1 + 1 WHERE user_id_1 = ? AND user_id_2 = ?').run(u1, u2);
    } else if (winnerId === u2) {
        db.prepare('UPDATE game_scores SET wins_2 = wins_2 + 1 WHERE user_id_1 = ? AND user_id_2 = ?').run(u1, u2);
    }
    return getGameScore(u1, u2);
}

function cleanupExpiredStatuses() {
    // Delete statuses older than 24 hours
    const result = db.prepare(`
        DELETE FROM statuses 
        WHERE created_at < datetime('now', '-24 hours')
    `).run();
    if (result.changes > 0) {
        console.log(`🧹 Deleted ${result.changes} expired status(es)`);
    }
}

module.exports = {
    initDatabase,
    recoveryStatus: id => recovery.status(id),
    generateRecoveryCodes: (id,password) => recovery.generate(id,password),
    verifyRecoveryCode: (username,code) => recovery.verify(username,code),
    completeRecovery: (token,password) => recovery.complete(token,password),
    getAuthState: id => recovery.authState(id),
    createUser, authenticateUser, resetPassword, getUserById, getAllUsers, searchUsers,
    getUsersForAdmin, updateUserOnline, updateUserProfile, changeUserPassword, setTemporaryPasswordByUsername, completeTemporaryPasswordChange, deleteUserByUsername, deleteUser,
    setPrekeys, getBundle, getConversationMemberKeys,
    getOrCreatePrivateConversation, createGroup, getConversationsForUser, hideConversation,
    getConversationById, getConversationMembers, isUserInConversation,
    addGroupMember, removeGroupMember, updateGroup,
    addMessage, deleteMessage, getMessages, clearConversationMessages, markMessagesAsRead,
    addReaction, removeReaction, getReactions,
    createStatus, deleteStatus, getStatusById, markStatusViewed, getStatusViewers, getActiveStatuses, cleanupExpiredStatuses,
    getGameScore, updateGameScore
};
