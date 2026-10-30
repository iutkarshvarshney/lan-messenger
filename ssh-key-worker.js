'use strict';
const {parentPort,workerData}=require('node:worker_threads');
const {utils}=require('ssh2'),crypto=require('node:crypto');
// ssh2 reads Ed25519 in OpenSSH format; its getPrivatePEM returns PKCS8,
// which its input parser cannot re-read. Re-encode the decrypted key in
// an unencrypted OpenSSH envelope, keeping expensive KDF work off-thread.
function ed25519OpenSSH(pem){
 const jwk=crypto.createPrivateKey(pem).export({format:'jwk'});
 const str=value=>{const b=Buffer.isBuffer(value)?value:Buffer.from(value),length=Buffer.alloc(4);length.writeUInt32BE(b.length);return Buffer.concat([length,b]);};
 const pub=Buffer.from(jwk.x,'base64url'),priv=Buffer.from(jwk.d,'base64url');
 const publicSSH=Buffer.concat([str('ssh-ed25519'),str(pub)]),check=crypto.randomBytes(4);
 let block=Buffer.concat([check,check,str('ssh-ed25519'),str(pub),str(Buffer.concat([priv,pub])),str('')]);
 const pad=8-block.length%8;block=Buffer.concat([block,Buffer.from(Array.from({length:pad},(_,i)=>i+1))]);
 const count=Buffer.alloc(4);count.writeUInt32BE(1);
 const encoded=Buffer.concat([Buffer.from('openssh-key-v1\0'),str('none'),str('none'),str(''),count,str(publicSSH),str(block)]).toString('base64');
 return '-----BEGIN OPENSSH PRIVATE KEY-----\n'+encoded+'\n-----END OPENSSH PRIVATE KEY-----';
}
try{
 const key=utils.parseKey(workerData.key,workerData.passphrase);
 if(key instanceof Error||Array.isArray(key)||!key.isPrivateKey())throw Error('Invalid private key');
 const pem=key.getPrivatePEM();
 parentPort.postMessage({pem:key.type==='ssh-ed25519'?ed25519OpenSSH(pem):pem});
}catch(error){parentPort.postMessage({error:true});}
