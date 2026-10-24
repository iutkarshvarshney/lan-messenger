const test=require('node:test'),assert=require('node:assert/strict');
const Database=require('better-sqlite3'),bcrypt=require('bcryptjs');
const {AccountRecovery,AttemptLimiter}=require('../account-recovery');
function fixture(){
 const sql=new Database(':memory:');sql.pragma('foreign_keys=ON');
 sql.exec('CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT UNIQUE,password_hash TEXT,password_must_change INTEGER DEFAULT 0,temp_password_expires_at TEXT DEFAULT "")');
 sql.prepare('INSERT INTO users(id,username,password_hash)VALUES(?,?,?)').run('a','alice',bcrypt.hashSync('OriginalPassword123!',4));
 sql.prepare('INSERT INTO users(id,username,password_hash)VALUES(?,?,?)').run('b','bob',bcrypt.hashSync('BobPassword123!',4));
 let now=1000;const recovery=new AccountRecovery(sql,{now:()=>now});
 return {sql,recovery,advance:ms=>{now+=ms;}};
}
test('only a reauthenticated owner can generate codes; storage and status never expose plaintext',()=>{
 const {sql,recovery}=fixture();
 assert.throws(()=>recovery.generate('a','wrong'));
 const codes=recovery.generate('a','OriginalPassword123!');
 assert.equal(codes.length,10);assert.equal(new Set(codes).size,10);
 assert.ok(codes.every(c=>/^[A-F0-9]{8}(?:-[A-F0-9]{8}){3}$/.test(c)));
 const rows=sql.prepare('SELECT * FROM recovery_codes').all();
 assert.ok(rows.every(r=>!codes.includes(r.code_hash)));
 assert.deepEqual(recovery.status('a'),{enabled:true,remaining:10});
});
test('one code is consumed once; unknown accounts and wrong codes have the same error',()=>{
 const {recovery}=fixture();const [code]=recovery.generate('a','OriginalPassword123!');
 const errors=['alice','nobody','bob'].map(name=>{try{recovery.verify(name,'BAD')}catch(e){return e.message;}});
 assert.equal(new Set(errors).size,1);
 const challenge=recovery.verify('ALICE',code.toLowerCase());assert.equal(challenge.expiresIn,120);
 assert.throws(()=>recovery.verify('alice',code));assert.equal(recovery.status('a').remaining,9);
});
test('a reset token cannot login, expires in two minutes, and cannot be replayed',()=>{
 const {recovery,advance}=fixture();const codes=recovery.generate('a','OriginalPassword123!');
 const first=recovery.verify('alice',codes[0]);advance(120001);
 assert.throws(()=>recovery.complete(first.resetToken,'NewPassword123!'));
 const second=recovery.verify('alice',codes[1]);
 assert.throws(()=>recovery.complete(second.resetToken,'short'));
 assert.equal(recovery.complete(second.resetToken,'NewPassword123!'),'a');
 assert.throws(()=>recovery.complete(second.resetToken,'AnotherPassword123!'));
});
test('reset revokes sessions and outstanding codes/challenges while preserving unrelated account data',()=>{
 const {sql,recovery}=fixture();sql.exec('CREATE TABLE private_data(user_id TEXT,contents TEXT);INSERT INTO private_data VALUES(\'a\',\'keep this ciphertext\')');
 const codes=recovery.generate('a','OriginalPassword123!');
 const one=recovery.verify('alice',codes[0]),two=recovery.verify('alice',codes[1]);
 recovery.complete(one.resetToken,'NewPassword123!');
 assert.equal(recovery.authState('a').auth_version,1);
 assert.throws(()=>recovery.complete(two.resetToken,'OtherPassword123!'));
 assert.throws(()=>recovery.verify('alice',codes[2]));
 assert.ok(bcrypt.compareSync('NewPassword123!',sql.prepare('SELECT password_hash FROM users WHERE id=?').get('a').password_hash));
 assert.equal(sql.prepare('SELECT contents FROM private_data').get().contents,'keep this ciphertext');
 assert.equal(recovery.authState('b').auth_version,0);
});
test('regenerating codes invalidates previous codes and in-progress reset windows',()=>{
 const {recovery}=fixture();const old=recovery.generate('a','OriginalPassword123!');
 const challenge=recovery.verify('alice',old[0]);
 recovery.generate('a','OriginalPassword123!');
 assert.throws(()=>recovery.verify('alice',old[1]));
 assert.throws(()=>recovery.complete(challenge.resetToken,'NewPassword123!'));
});
test('attempt limiter bounds brute-force attempts and resets after the retry window',()=>{
 let now=0;const limiter=new AttemptLimiter({now:()=>now,limit:3,windowMs:1000});
 assert.equal(limiter.allow('account'),true);assert.equal(limiter.allow('account'),true);assert.equal(limiter.allow('account'),true);
 assert.equal(limiter.allow('account'),false);assert.equal(limiter.allow('other'),true);
 now=1001;assert.equal(limiter.allow('account'),true);
});
