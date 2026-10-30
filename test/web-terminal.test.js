const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {TerminalPolicy}=require('../web-terminal-policy');
const {TerminalGateway}=require('../web-terminal-service');
const crypto=require('node:crypto');
const REQUEST='request-1234567890123';

function ed25519OpenSSH(){
 const jwk=crypto.generateKeyPairSync('ed25519').privateKey.export({format:'jwk'});
 const str=value=>{const b=Buffer.isBuffer(value)?value:Buffer.from(value),length=Buffer.alloc(4);length.writeUInt32BE(b.length);return Buffer.concat([length,b]);};
 const pub=Buffer.from(jwk.x,'base64url'),priv=Buffer.from(jwk.d,'base64url'),publicSSH=Buffer.concat([str('ssh-ed25519'),str(pub)]);
 let block=Buffer.concat([Buffer.alloc(8,1),str('ssh-ed25519'),str(pub),str(Buffer.concat([priv,pub])),str('qa')]);
 const pad=8-block.length%8;block=Buffer.concat([block,Buffer.from(Array.from({length:pad},(_,i)=>i+1))]);
 const count=Buffer.alloc(4);count.writeUInt32BE(1);
 return '-----BEGIN OPENSSH PRIVATE KEY-----\n'+Buffer.concat([Buffer.from('openssh-key-v1\0'),str('none'),str('none'),str(''),count,str(publicSSH),str(block)]).toString('base64')+'\n-----END OPENSSH PRIVATE KEY-----';
}

class Channel extends EventEmitter{constructor(){super();this.stderr=new EventEmitter();this.stderr.pause=()=>{};this.stderr.resume=()=>{};this.writes=[];this.pauses=0;}write(data,cb){this.writes.push(data);cb?.();return true;}pause(){this.pauses++;}resume(){}setWindow(...value){this.window=value;}end(){this.emit('close');}}
class Client extends EventEmitter{connect(options){this.options=options;options.hostVerifier(Buffer.from('host-key'),accepted=>{this.trusted=accepted;if(accepted)queueMicrotask(()=>this.emit('ready'));});}shell(options,callback){this.pty=options;this.channel=new Channel();callback(null,this.channel);}end(){this.ended=true;this.emit('close');}destroy(){this.destroyed=true;}}
function fixture(options={}){
 const clients=[],states=new Map([['a',{id:'a',username:'alice',auth_version:0}],['b',{id:'b',username:'bob',auth_version:0}]]);
 const gateway=new TerminalGateway({db:{getAuthState:id=>states.get(id)},verifyToken:token=>{if(token==='a'||token==='b')return {id:token,username:states.get(token).username,version:0};throw Error('invalid');},createClient:()=>{const c=new Client();clients.push(c);return c;},...options});
 function socket(id,user){const handlers={},sent=[];const s={id,handshake:{auth:{token:user}},request:{headers:{origin:'https://messenger.local',host:'messenger.local'},socket:{encrypted:true}},on:(event,callback)=>{handlers[event]=callback;},emit:(event,data)=>sent.push({event,data}),disconnect:()=>{s.disconnected=true;handlers.disconnect?.();}};s.user=gateway.authorize(s);gateway.attachSocket(s);return {s,sent,send(event,data){return new Promise(resolve=>handlers[event](data,resolve));}};}
 const a=socket('a1','a'),other=socket('a2','a'),b=socket('b1','b');
 const connect={requestId:REQUEST,host:'10.229.40.50',port:22,username:'linux-user',authType:'password',password:'OnlyForThisConnection',cols:80,rows:24};
 return {gateway,clients,states,a,other,b,connect};
}
test('target policy rejects DNS, public/metadata/loopback addresses, disallowed ports and malformed credentials',()=>{
 const p=new TerminalPolicy();
 for(const host of ['localhost','example.com','127.0.0.1','169.254.169.254','8.8.8.8','::1','10.1.2.3;id','10.1.2.03'])assert.throws(()=>p.connection({requestId:REQUEST,host,port:22,username:'x',authType:'password',password:'x'}));
 assert.throws(()=>p.connection({requestId:REQUEST,host:'10.1.2.3',port:80,username:'x',authType:'password',password:'x'}));
 assert.equal(p.connection({requestId:REQUEST,host:'192.168.1.5',port:22,username:'user',authType:'password',password:'x'}).host,'192.168.1.5');
 assert.throws(()=>new TerminalPolicy({allowedCidrs:['10.229.40.0/24']}).connection({requestId:REQUEST,host:'192.168.1.5',port:22,username:'user',authType:'password',password:'x'}));
});
test('terminal authentication requires matching origin, TLS, a current full account and token version',()=>{
 const f=fixture();
 assert.throws(()=>f.gateway.authorize({...f.a.s,request:{headers:{origin:'https://evil.example',host:'messenger.local'},socket:{encrypted:true}}}));
 assert.throws(()=>f.gateway.authorize({...f.a.s,request:{headers:{origin:'http://messenger.local',host:'messenger.local'},socket:{encrypted:false}}}));
 f.states.get('a').password_must_change=1;assert.throws(()=>f.gateway.authorize(f.a.s));f.gateway.shutdown();
});
test('host trust is required before ready and only the owning socket can confirm or use a session',async()=>{
 const f=fixture(),reply=await f.a.send('terminal:connect',f.connect);
 assert.ok(reply.sessionId);assert.ok(f.a.sent.some(e=>e.event==='terminal:host-key'));assert.equal(f.clients[0].channel,undefined);
 assert.ok((await f.b.send('terminal:trust',{sessionId:reply.sessionId,accept:true})).error);
 assert.ok((await f.other.send('terminal:trust',{sessionId:reply.sessionId,accept:true})).error);
 assert.equal((await f.a.send('terminal:trust',{sessionId:reply.sessionId,accept:true})).success,true);await Promise.resolve();
 assert.ok(f.clients[0].channel);assert.equal((await f.a.send('terminal:input',{sessionId:reply.sessionId,data:'printf hi\r'})).success,true);
 assert.deepEqual(f.clients[0].channel.writes,['printf hi\r']);assert.ok((await f.other.send('terminal:input',{sessionId:reply.sessionId,data:'id\r'})).error);
 assert.ok((await f.b.send('terminal:disconnect',{sessionId:reply.sessionId})).error);f.gateway.shutdown();
});
test('a mismatched supplied host fingerprint rejects before authentication',async()=>{
 const f=fixture();await f.a.send('terminal:connect',{...f.connect,expectedFingerprint:'SHA256:'+Buffer.alloc(32,1).toString('base64').replace(/=+$/,'')});
 assert.equal(f.gateway.sessions.size,0);assert.ok(f.clients[0].ended);assert.equal(f.clients[0].channel,undefined);f.gateway.shutdown();
});
test('known fingerprints connect without a blind confirmation prompt and keep PTY resize scoped',async()=>{
 const f=fixture();const fingerprint='SHA256:'+crypto.createHash('sha256').update('host-key').digest('base64').replace(/=+$/,'');
 const {sessionId}=await f.a.send('terminal:connect',{...f.connect,expectedFingerprint:fingerprint});await Promise.resolve();
 assert.ok(!f.a.sent.some(e=>e.event==='terminal:host-key'));
 assert.equal((await f.a.send('terminal:resize',{sessionId,cols:120,rows:40})).success,true);assert.deepEqual(f.clients[0].channel.window,[40,120,0,0]);
 assert.ok((await f.a.send('terminal:resize',{sessionId,cols:1000000,rows:40})).error);f.gateway.shutdown();
});
test('closing a pending host prompt resolves verification false and stale replies cannot revive it',async()=>{
 const f=fixture(),{sessionId}=await f.a.send('terminal:connect',f.connect);
 await f.a.send('terminal:disconnect',{sessionId});assert.equal(f.clients[0].trusted,false);assert.equal(f.gateway.sessions.size,0);
 assert.ok((await f.a.send('terminal:trust',{sessionId,accept:true})).error);f.gateway.shutdown();
});
test('output remains private, preserves split UTF8 and pauses until rendering is acknowledged',async()=>{
 const f=fixture({outputWindow:8}),{sessionId}=await f.a.send('terminal:connect',f.connect);await f.a.send('terminal:trust',{sessionId,accept:true});await Promise.resolve();
 const bytes=Buffer.from('hello नमस्ते');f.clients[0].channel.emit('data',bytes.subarray(0,8));f.clients[0].channel.emit('data',bytes.subarray(8));
 const output=f.a.sent.filter(e=>e.event==='terminal:output');assert.equal(output.map(e=>e.data.data).join(''),'hello नमस्ते');assert.ok(f.clients[0].channel.pauses>0);assert.equal(f.b.sent.length,0);
 await f.a.send('terminal:ack',{sessionId,sequence:output.at(-1).data.sequence});assert.equal(f.gateway.sessions.get(sessionId).pendingBytes,0);f.gateway.shutdown();
});
test('password revocation closes active output and releases session quotas',async()=>{
 const f=fixture(),{sessionId}=await f.a.send('terminal:connect',f.connect);await f.a.send('terminal:trust',{sessionId,accept:true});await Promise.resolve();
 f.states.get('a').auth_version++;f.clients[0].channel.emit('data',Buffer.from('private'));
 assert.equal(f.gateway.sessions.size,0);assert.ok(f.clients[0].ended);assert.ok(!f.a.sent.some(e=>e.event==='terminal:output'));f.gateway.shutdown();
});
test('quotas and disconnect cleanup prevent abandoned shells',async()=>{
 const f=fixture();const first=await f.a.send('terminal:connect',f.connect);assert.ok(first.sessionId);
 assert.ok((await f.a.send('terminal:connect',f.connect)).error);
 f.a.s.disconnect();assert.equal(f.gateway.sessions.size,0);assert.ok(f.clients[0].destroyed);f.gateway.shutdown();
});
test('output chunks never split emoji at the transport boundary',async()=>{
 const f=fixture(),{sessionId}=await f.a.send('terminal:connect',f.connect);await f.a.send('terminal:trust',{sessionId,accept:true});await Promise.resolve();
 const value='x'.repeat(4095)+'🙂done';f.clients[0].channel.emit('data',Buffer.from(value));
 const pieces=f.a.sent.filter(e=>e.event==='terminal:output').map(e=>e.data.data);
 assert.equal(pieces.map(s=>Buffer.from(s).toString()).join(''),value);f.gateway.shutdown();
});
test('delayed shell setup rechecks account validity and tears down safely',async()=>{
 const f=fixture(),{sessionId}=await f.a.send('terminal:connect',f.connect);
 let callback;f.clients[0].shell=(options,cb)=>{callback=cb;};await f.a.send('terminal:trust',{sessionId,accept:true});await Promise.resolve();
 f.states.get('a').auth_version++;const channel=new Channel();callback(null,channel);
 assert.equal(f.gateway.sessions.size,0);assert.ok(!f.a.sent.some(e=>e.event==='terminal:ready'));f.gateway.shutdown();
});
test('cleanup releases all resources even if a transport teardown throws',async()=>{
 const f=fixture(),{sessionId}=await f.a.send('terminal:connect',f.connect);await f.a.send('terminal:trust',{sessionId,accept:true});await Promise.resolve();
 f.clients[0].channel.end=()=>{throw Error('transport closed');};
 await f.a.send('terminal:disconnect',{sessionId});assert.ok(f.clients[0].destroyed);assert.equal(f.gateway.sessions.size,0);f.gateway.shutdown();
});
test('real SSH password and encrypted-key login support PTY I/O, resize and cleanup',async t=>{
 const {Server,utils}=require('ssh2'),{once}=require('node:events');
 const host=crypto.generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs1',format:'pem'});
 // RSA PEM encryption exercises the worker passphrase path supported by ssh2.
 const keyPair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const clear=keyPair.privateKey.export({type:'pkcs1',format:'pem'}),parsed=utils.parseKey(clear);
 const encrypted=keyPair.privateKey.export({type:'pkcs1',format:'pem',cipher:'aes-256-cbc',passphrase:'fixture-passphrase'});
 const edKey=ed25519OpenSSH(),edParsed=utils.parseKey(edKey);
 let resized=false;const peers=new Set();
 const server=new Server({hostKeys:[host]},peer=>{peers.add(peer);peer.on('error',()=>{});peer.on('close',()=>peers.delete(peer));
  peer.on('authentication',ctx=>{
   if(ctx.username!=='qa')return ctx.reject();
   if(ctx.method==='password'&&ctx.password==='fixture-password')return ctx.accept();
   if(ctx.method==='publickey'){const key=[parsed,edParsed].find(k=>ctx.key.data.equals(k.getPublicSSH()));if(key&&(!ctx.signature||key.verify(ctx.blob,ctx.signature,ctx.hashAlgo)))return ctx.accept();}
   ctx.reject();
  });
  peer.on('ready',()=>peer.on('session',accept=>{const session=accept();session.on('pty',accept=>accept());session.on('window-change',(accept,reject,info)=>{resized=info.cols===100;if(accept)accept();});session.on('shell',accept=>{const stream=accept();stream.write('\x1b[32mSSH ready नमस्ते🙂\x1b[0m\r\n');stream.on('data',data=>stream.write(data));});}));
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{for(const peer of peers)peer.end();server.close();});
 const port=server.address().port;
 const policy=new TerminalPolicy({allowedCidrs:['127.0.0.0/8'],allowedPorts:[port],allowLoopback:true});
 for(const auth of [{authType:'password',password:'fixture-password'},{authType:'key',privateKey:encrypted,passphrase:'fixture-passphrase'},{authType:'key',privateKey:edKey}]){
  const f=fixture({policy,createClient:()=>new (require('ssh2').Client)()});t.after(()=>f.gateway.shutdown());
  const wait=async predicate=>{for(let i=0;i<200;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}assert.fail('SSH integration timed out');};
  const {sessionId}=await f.a.send('terminal:connect',{...f.connect,...auth,host:'127.0.0.1',port,username:'qa'});assert.ok(sessionId);
  await wait(()=>f.a.sent.some(e=>e.event==='terminal:host-key'));await f.a.send('terminal:trust',{sessionId,accept:true});
  await wait(()=>f.a.sent.some(e=>e.event==='terminal:ready'));
  assert.equal((await f.a.send('terminal:input',{sessionId,data:'echo fixture🙂\r'})).success,true);
  await f.a.send('terminal:resize',{sessionId,cols:100,rows:30});
  await wait(()=>f.a.sent.filter(e=>e.event==='terminal:output').map(e=>e.data.data).join('').includes('echo fixture🙂'));
  assert.ok(f.a.sent.filter(e=>e.event==='terminal:output').map(e=>e.data.data).join('').includes('नमस्ते🙂'));
  await f.a.send('terminal:disconnect',{sessionId});assert.equal(f.gateway.sessions.size,0);
 }
 assert.ok(resized);
});
test('connection deadline also covers a server that never answers the shell request',async()=>{
 const f=fixture({connectMs:30}),{sessionId}=await f.a.send('terminal:connect',f.connect);
 f.clients[0].shell=()=>{};await f.a.send('terminal:trust',{sessionId,accept:true});await new Promise(resolve=>setTimeout(resolve,65));
 assert.equal(f.gateway.sessions.size,0);assert.ok(f.clients[0].destroyed);f.gateway.shutdown();
});
test('host confirmation timeout and output hard cap close the SSH client',async()=>{
 const pending=fixture({hostMs:20});await pending.a.send('terminal:connect',pending.connect);await new Promise(resolve=>setTimeout(resolve,50));assert.equal(pending.gateway.sessions.size,0);assert.equal(pending.clients[0].trusted,false);assert.ok(pending.clients[0].destroyed);pending.gateway.shutdown();
 const f=fixture({maxOutput:16}),{sessionId}=await f.a.send('terminal:connect',f.connect);await f.a.send('terminal:trust',{sessionId,accept:true});await Promise.resolve();
 f.clients[0].channel.emit('data',Buffer.from('x'.repeat(32)));assert.equal(f.gateway.sessions.size,0);assert.ok(f.clients[0].destroyed);assert.ok(!f.a.sent.some(e=>e.event==='terminal:output'));f.gateway.shutdown();
});
