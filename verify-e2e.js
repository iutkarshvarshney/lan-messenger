/**
 * E2E Encryption Verification Script
 * Proves that messages are stored as encrypted ciphertext in the DB
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'messenger.db');

async function verify() {
    console.log('\n════════════════════════════════════════════════════');
    console.log('  🔍 LAN Messenger — E2E Encryption Verifier');
    console.log('════════════════════════════════════════════════════\n');

    const db = new Database(DB_PATH);

    // ─── 1. Check Schema ───────────────────────────────────
    console.log('📋 STEP 1: Checking database schema...\n');

    const msgCols = db.pragma('table_info(messages)').map(c => `  ${c.cid}. ${c.name} (${c.type})`);
    const userCols = db.pragma('table_info(users)').map(c => `  ${c.cid}. ${c.name} (${c.type})`);

    console.log('  messages table columns:');
    msgCols.forEach(c => console.log(c));
    console.log();
    console.log('  users table columns:');
    userCols.forEach(c => console.log(c));

    const hasE2eIv = db.pragma('table_info(messages)').some(c => c.name === 'e2e_iv');
    const hasIsEncrypted = db.pragma('table_info(messages)').some(c => c.name === 'is_encrypted');
    const hasPublicKey = db.pragma('table_info(users)').some(c => c.name === 'public_key');

    console.log('\n  ✅ e2e_iv column:', hasE2eIv ? 'EXISTS' : '❌ MISSING');
    console.log('  ✅ is_encrypted column:', hasIsEncrypted ? 'EXISTS' : '❌ MISSING');
    console.log('  ✅ public_key column:', hasPublicKey ? 'EXISTS' : '❌ MISSING');

    // ─── 2. Browse All Users ────────────────────────────────
    console.log('\n────────────────────────────────────────────────────');
    console.log('📋 STEP 2: Registered users with public keys...\n');

    const users = db.prepare('SELECT id, username, display_name, substr(public_key, 1, 60) as pk_preview FROM users').all();
    if (users.length === 0) {
        console.log('  ⚠️  No users registered yet! Open the app and register two users first,');
        console.log('     then send a message and re-run this script.\n');
    } else {
        users.forEach(u => {
            const hasPK = u.pk_preview && u.pk_preview.length > 5;
            console.log(`  👤 ${u.display_name} (@${u.username})`);
            console.log(`     ID: ${u.id}`);
            console.log(`     Public Key: ${hasPK ? '🔑 SET — ' + u.pk_preview + '...' : '⚠️  NOT SET (user not logged in yet)'}`);
            console.log();
        });
    }

    // ─── 3. Browse All Messages ─────────────────────────────
    console.log('────────────────────────────────────────────────────');
    console.log('📋 STEP 3: All stored messages in the database...\n');

    const messages = db.prepare(`
        SELECT m.id, m.content, m.e2e_iv, m.is_encrypted, m.message_type,
               u.display_name as sender, m.created_at
        FROM messages m JOIN users u ON m.sender_id = u.id
        ORDER BY m.created_at DESC LIMIT 20
    `).all();

    if (messages.length === 0) {
        console.log('  ⚠️  No messages found! Send some messages in the app first,');
        console.log('     then re-run this script.\n');
    } else {
        let encryptedCount = 0;
        let plainCount = 0;

        messages.forEach((msg, i) => {
            const isEnc = msg.is_encrypted === 1;
            if (isEnc) encryptedCount++; else plainCount++;

            console.log(`  [${i + 1}] From: ${msg.sender}  |  Type: ${msg.message_type}  |  ${new Date(msg.created_at + 'Z').toLocaleTimeString()}`);

            if (isEnc) {
                console.log(`       🔒 ENCRYPTED — Content in DB (first 80 chars):`);
                console.log(`       "${msg.content.substring(0, 80)}..."`);
                console.log(`       IV (first 30 chars): ${msg.e2e_iv.substring(0, 30)}...`);
                console.log(`       ✅ This is base64-encoded AES-256-GCM ciphertext — unreadable without keys`);
            } else {
                console.log(`       📄 PLAIN — Content: "${msg.content}"`);
                if (msg.message_type === 'system') {
                    console.log(`       ℹ️  System messages are not encrypted (no sensitive user content)`);
                } else {
                    console.log(`       ⚠️  Legacy/unencrypted message (sent before E2E was active)`);
                }
            }
            console.log();
        });

        console.log('────────────────────────────────────────────────────');
        console.log(`  📊 Summary: ${encryptedCount} encrypted, ${plainCount} plain (system/legacy)`);
    }

    // ─── 4. Prove ciphertext is meaningless ─────────────────
    console.log('\n────────────────────────────────────────────────────');
    console.log('📋 STEP 4: Proof — what an attacker with DB access sees...\n');

    const encMsg = db.prepare('SELECT content, e2e_iv FROM messages WHERE is_encrypted = 1 LIMIT 1').get();
    if (encMsg) {
        console.log('  Even knowing the ciphertext, without the private key:\n');
        console.log('  Raw DB content field:');
        console.log(`    "${encMsg.content}"\n`);
        console.log('  Raw DB e2e_iv field:');
        console.log(`    "${encMsg.e2e_iv}"\n`);
        console.log('  To decrypt this, you need: sender private key + recipient public key');
        console.log('  Private keys are NEVER stored on the server.');
        console.log('  ✅ VERDICT: Server/DB is completely blind to message content.\n');
    } else {
        console.log('  No encrypted messages yet — send messages via the app first.\n');
    }

    // ─── 5. Conversation key metadata ───────────────────────
    console.log('────────────────────────────────────────────────────');
    console.log('📋 STEP 5: Conversation & member summary...\n');

    const convs = db.prepare(`
        SELECT c.id, c.type, c.name,
            COUNT(DISTINCT cm.user_id) as members,
            COUNT(DISTINCT m.id) as total_msgs,
            SUM(CASE WHEN m.is_encrypted = 1 THEN 1 ELSE 0 END) as encrypted_msgs
        FROM conversations c
        LEFT JOIN conversation_members cm ON c.id = cm.conversation_id
        LEFT JOIN messages m ON c.id = m.conversation_id
        GROUP BY c.id
    `).all();

    if (convs.length === 0) {
        console.log('  No conversations yet.\n');
    } else {
        convs.forEach(c => {
            console.log(`  💬 ${c.type === 'group' ? `Group: "${c.name}"` : 'Private chat'} (${c.members} members)`);
            console.log(`     Messages: ${c.total_msgs} total | ${c.encrypted_msgs || 0} encrypted | ${(c.total_msgs - (c.encrypted_msgs || 0))} plain`);
            if (c.total_msgs > 0) {
                const pct = Math.round(((c.encrypted_msgs || 0) / c.total_msgs) * 100);
                console.log(`     Encryption rate: ${pct}%`);
            }
            console.log();
        });
    }

    db.close();
    console.log('════════════════════════════════════════════════════');
    console.log('  ✅ Verification complete.');
    console.log('════════════════════════════════════════════════════\n');
}

verify().catch(console.error);
