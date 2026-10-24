'use strict';
const crypto=require('crypto'),bcrypt=require('bcryptjs');
const INVALID='Recovery details are invalid or have expired.';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
class AccountRecovery {
 constructor(sql,{now=Date.now}={}){
  this.sql=sql;this.now=now;
  if(!sql.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='auth_version'))sql.exec('ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0');
  sql.exec(`CREATE TABLE IF NOT EXISTS recovery_codes(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,code_hash TEXT NOT NULL,PRIMARY KEY(user_id,code_hash));
   CREATE TABLE IF NOT EXISTS recovery_challenges(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,auth_version INTEGER NOT NULL,expires_at INTEGER NOT NULL);`);
 }
 authState(id){return this.sql.prepare('SELECT id,username,auth_version,password_must_change,temp_password_expires_at FROM users WHERE id=?').get(id);}
 status(id){const count=this.sql.prepare('SELECT COUNT(*) AS count FROM recovery_codes WHERE user_id=?').get(id).count;return {enabled:count>0,remaining:count};}
 generate(id,password){
  const user=this.sql.prepare('SELECT password_hash,password_must_change FROM users WHERE id=?').get(id);
  if(typeof password!=='string'||password.length>256||!user||user.password_must_change||!bcrypt.compareSync(password,user.password_hash))throw Error('Confirm your current password to generate recovery codes.');
  const codes=Array.from({length:10},()=>crypto.randomBytes(16).toString('hex').toUpperCase().match(/.{8}/g).join('-'));
  this.sql.transaction(()=>{
   this.sql.prepare('DELETE FROM recovery_codes WHERE user_id=?').run(id);
   this.sql.prepare('DELETE FROM recovery_challenges WHERE user_id=?').run(id);
   const insert=this.sql.prepare('INSERT INTO recovery_codes(user_id,code_hash)VALUES(?,?)');
   for(const code of codes)insert.run(id,hash(id+':'+code.replace(/-/g,'')));
  })();return codes;
 }
 verify(username,code){
  if(typeof username!=='string'||username.length>128||typeof code!=='string'||code.length>128)throw Error(INVALID);
  const normalized=code.replace(/[\s-]/g,'').toUpperCase();
  const user=this.sql.prepare('SELECT id,auth_version FROM users WHERE username=?').get(username.trim().toLowerCase());
  const codeHash=hash((user?.id||'unknown')+':'+normalized);
  const token=crypto.randomBytes(32).toString('hex'),expiresAt=this.now()+120000;
  this.sql.transaction(()=>{
   const removed=this.sql.prepare('DELETE FROM recovery_codes WHERE user_id=? AND code_hash=?').run(user?.id||'',codeHash);
   if(!removed.changes)throw Error(INVALID);
   this.sql.prepare('DELETE FROM recovery_challenges WHERE expires_at<=?').run(this.now());
   this.sql.prepare('INSERT INTO recovery_challenges VALUES(?,?,?,?)').run(hash(token),user.id,user.auth_version,expiresAt);
  })();return {resetToken:token,expiresIn:120};
 }
 complete(token,password){
  if(typeof password!=='string'||password.length<12||Buffer.byteLength(password,'utf8')>72)throw Error('Use a password with at least 12 characters and at most 72 UTF-8 bytes.');
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error(INVALID);
  const challenge=this.sql.prepare('SELECT * FROM recovery_challenges WHERE token_hash=?').get(hash(token));
  if(!challenge||challenge.expires_at<=this.now()||this.authState(challenge.user_id)?.auth_version!==challenge.auth_version)throw Error(INVALID);
  const passwordHash=bcrypt.hashSync(password,12);
  return this.sql.transaction(()=>{
   const current=this.sql.prepare('SELECT * FROM recovery_challenges WHERE token_hash=?').get(hash(token));
   if(!current||current.expires_at<=this.now())throw Error(INVALID);
   const updated=this.sql.prepare("UPDATE users SET password_hash=?,auth_version=auth_version+1,password_must_change=0,temp_password_expires_at='' WHERE id=? AND auth_version=?").run(passwordHash,current.user_id,current.auth_version);
   if(!updated.changes)throw Error(INVALID);
   this.sql.prepare('DELETE FROM recovery_challenges WHERE user_id=?').run(current.user_id);
   this.sql.prepare('DELETE FROM recovery_codes WHERE user_id=?').run(current.user_id);
   return current.user_id;
  })();
 }
}
class AttemptLimiter {
 constructor({now=Date.now,limit=5,windowMs=900000}={}){this.now=now;this.limit=limit;this.windowMs=windowMs;this.entries=new Map();}
 allow(key){
  const now=this.now();
  for(const [id,item] of this.entries)if(item.until<=now)this.entries.delete(id);
  let item=this.entries.get(key);
  if(!item){if(this.entries.size>=10000)return false;item={count:0,until:now+this.windowMs};this.entries.set(key,item);}
  return ++item.count<=this.limit;
 }
}
module.exports={AccountRecovery,AttemptLimiter};
