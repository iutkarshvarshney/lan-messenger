'use strict';
const crypto=require('node:crypto'),{StringDecoder}=require('node:string_decoder'),{Worker}=require('node:worker_threads');
const {Client}=require('ssh2'),{TerminalPolicy}=require('./web-terminal-policy'),{AttemptLimiter}=require('./account-recovery');
class TerminalGateway{
 constructor({db,verifyToken,createClient=()=>new Client(),policy=new TerminalPolicy(),now=Date.now,outputWindow=262144,maxOutput=1048576,connectMs=60000,hostMs=30000,idleMs=1200000}={}){
  Object.assign(this,{db,verifyToken,createClient,policy,now,outputWindow,maxOutput,connectMs,hostMs,idleMs});this.sessions=new Map();
  this.attempts=new AttemptLimiter({now,limit:10,windowMs:300000});this.ipAttempts=new AttemptLimiter({now,limit:40,windowMs:300000});
 }
 authorize(socket){
  if(!this.policy.allowedRequest(socket.request))throw Error('Use the same secure Messenger address for the terminal.');
  const user=this.verifyToken(socket.handshake.auth?.token),current=this.db.getAuthState(user.id);
  if(!current||current.username!==user.username||current.auth_version!==(user.version??0)||current.password_must_change||user.scope==='password-change')throw Error('Sign in to Messenger again.');
  return user;
 }
 valid(socket){const user=socket.user,current=this.db.getAuthState(user.id);return !!current&&current.username===user.username&&current.auth_version===(user.version??0)&&!current.password_must_change&&user.scope!=='password-change'&&(!user.exp||user.exp*1000>this.now());}
 attach(io){io.use((socket,next)=>{try{socket.user=this.authorize(socket);next();}catch(error){next(Error('Terminal authentication failed. Sign in again.'));}});io.on('connection',socket=>this.attachSocket(socket));}
 attachSocket(socket){
  for(const event of ['connect','trust','input','resize','ack','disconnect'])socket.on('terminal:'+event,(data,callback)=>{
   const reply=typeof callback==='function'?callback:()=>{};
   try{
    if(!this.valid(socket)){this.revokeUser(socket.user.id);throw Error('Your Messenger session expired.');}
    if(event==='connect')return reply(this.connect(socket,data));
    const record=this.owned(socket,data);
    if(event==='trust'){
     if(!record.verifier||typeof data.accept!=='boolean')throw Error('This host confirmation is no longer active.');
     const verify=record.verifier;record.verifier=null;clearTimeout(record.hostTimer);
     if(!data.accept){verify(false);this.finish(record,'SSH host verification cancelled.');}else{record.phase='connecting';verify(true);}
    }else if(event==='input'){
     if(record.phase!=='ready'||typeof data.data!=='string'||Buffer.byteLength(data.data)>16384)throw Error('Invalid terminal input.');
     if(record.pendingInput)throw Error('Wait for the terminal to accept the previous input.');
     record.pendingInput=reply;this.touch(record);
     record.channel.write(data.data,()=>{if(record.pendingInput){const pending=record.pendingInput;record.pendingInput=null;pending(record.closed?{error:'Terminal disconnected.'}:{success:true});}});return;
    }else if(event==='resize'){
     const size=this.policy.dimensions(data);if(record.phase!=='ready')throw Error('Connect the terminal first.');record.channel.setWindow(size.rows,size.cols,0,0);
    }else if(event==='ack'){
     if(!Number.isSafeInteger(data.sequence)||data.sequence<0||data.sequence>record.sequence)throw Error('Invalid render acknowledgement.');
     for(const [sequence,bytes]of record.pending){if(sequence<=data.sequence){record.pendingBytes-=bytes;record.pending.delete(sequence);}}
     if(record.pendingBytes<this.outputWindow/2){record.channel?.resume();record.channel?.stderr?.resume();}
    }else if(event==='disconnect')this.finish(record,'Disconnected.');
    reply({success:true});
   }catch(error){reply({error:error.message});}
  });
  socket.on('disconnect',()=>{for(const record of [...this.sessions.values()])if(record.socket===socket)this.finish(record,'Connection closed.',false);});
 }
 owned(socket,data){const record=this.sessions.get(data?.sessionId);if(!record||record.socket!==socket||record.closed)throw Error('This terminal session is no longer available.');return record;}
 connect(socket,data){
  if(!this.attempts.allow(socket.user.id)||!this.ipAttempts.allow(socket.request.socket?.remoteAddress||'local'))throw Error('Too many connection attempts. Try again in five minutes.');
  const options=this.policy.connection(data),active=[...this.sessions.values()];
  if(active.some(s=>s.socket===socket))throw Error('Disconnect this terminal before opening another.');
  if(active.filter(s=>s.userId===socket.user.id).length>=2||active.length>=32)throw Error('The terminal session limit has been reached.');
  const record={id:crypto.randomUUID(),requestId:options.requestId,userId:socket.user.id,socket,phase:'connecting',host:options.host,port:options.port,username:options.username,closed:false,pending:new Map(),pendingBytes:0,sequence:0};
  this.sessions.set(record.id,record);record.connectTimer=setTimeout(()=>this.finish(record,'SSH connection timed out.'),this.connectMs);record.connectTimer.unref();
  this.touch(record);
  const start=auth=>{if(record.closed)return;this.start(record,options,auth);};
  if(options.auth.privateKey)this.prepareKey(record,options.auth).then(key=>start({privateKey:key})).catch(()=>this.finish(record,'The SSH key could not be opened. Check its format and passphrase.'));
  else start(options.auth);
  return {sessionId:record.id};
 }
 prepareKey(record,auth){return new Promise((resolve,reject)=>{
  const worker=new Worker(require.resolve('./ssh-key-worker'),{workerData:{key:auth.privateKey,passphrase:auth.passphrase}});record.worker=worker;
  const timer=setTimeout(()=>{worker.terminate();reject(Error('Key timeout'));},2500);timer.unref();
  worker.once('message',data=>{clearTimeout(timer);record.worker=null;worker.terminate();data.error?reject(Error('Invalid key')):resolve(data.pem);});
  worker.once('error',()=>{clearTimeout(timer);reject(Error('Invalid key'));});
  worker.once('exit',()=>{clearTimeout(timer);reject(Error('Key worker closed'));});
 });}
 start(record,options,auth){
  const client=this.createClient();record.client=client;
  client.on('error',error=>this.finish(record,error.level==='client-authentication'?'SSH authentication failed. Check the SSH username and credentials.':'SSH connection failed. Check the PC address, SSH service and network.'));
  client.on('close',()=>this.finish(record,'SSH connection closed.'));
  client.on('ready',()=>{
   if(record.closed||!this.valid(record.socket))return this.finish(record,'Your Messenger session expired.');
   client.shell({term:'xterm-256color',cols:options.cols,rows:options.rows},(error,channel)=>{
    if(record.closed){channel?.end();return;}
    if(!this.valid(record.socket)){record.channel=channel;return this.finish(record,'Your Messenger session expired.');}
    if(error)return this.finish(record,'The SSH server could not open an interactive terminal.');
    clearTimeout(record.connectTimer);record.channel=channel;record.phase='ready';const stdout=new StringDecoder('utf8'),stderr=new StringDecoder('utf8');
    channel.on('data',data=>this.output(record,stdout.write(data)));channel.stderr?.on('data',data=>this.output(record,stderr.write(data)));
    channel.stderr?.on('error',()=>this.finish(record,'The SSH terminal closed.'));
    channel.on('error',()=>this.finish(record,'The SSH terminal closed.'));channel.on('close',()=>this.finish(record,'SSH session ended.'));
    this.send(record,'ready',{host:record.host,port:record.port,username:record.username});this.touch(record);
   });
  });
  try{client.connect({host:options.host,port:options.port,username:options.username,...auth,readyTimeout:this.connectMs,keepaliveInterval:15000,keepaliveCountMax:3,tryKeyboard:false,
   hostVerifier:(key,verify)=>{
    if(record.closed||!this.valid(record.socket)){verify(false);return;}
    const fingerprint='SHA256:'+crypto.createHash('sha256').update(key).digest('base64').replace(/=+$/,'');
    if(options.expectedFingerprint){if(fingerprint===options.expectedFingerprint)verify(true);else{verify(false);this.finish(record,'The SSH host key does not match the expected fingerprint.');}return;}
    record.phase='host-key';record.verifier=verify;record.hostTimer=setTimeout(()=>this.finish(record,'SSH host verification timed out.'),this.hostMs);record.hostTimer.unref();
    this.send(record,'host-key',{host:record.host,port:record.port,fingerprint});
   }});}catch(error){this.finish(record,'The SSH connection could not be started. Check the connection details.');}
 }
 send(record,event,extra){if(!record.closed)record.socket.emit('terminal:'+event,{sessionId:record.id,requestId:record.requestId,...extra});}
 output(record,text){
  if(record.closed||!text)return;
  if(!this.valid(record.socket))return this.finish(record,'Your Messenger session expired.');
  this.touch(record);
  for(let offset=0;offset<text.length;){
   let end=Math.min(offset+4096,text.length);
   if(end<text.length&&text.charCodeAt(end-1)>=0xd800&&text.charCodeAt(end-1)<=0xdbff)end--;
   const data=text.slice(offset,end),bytes=Buffer.byteLength(data);offset=end;
   if(record.pendingBytes+bytes>this.maxOutput)return this.finish(record,'Terminal output exceeded the display buffer. Reconnect when ready.');
   record.pending.set(++record.sequence,bytes);record.pendingBytes+=bytes;this.send(record,'output',{sequence:record.sequence,data});
  }
  if(record.pendingBytes>=this.outputWindow){record.channel?.pause();record.channel?.stderr?.pause();}
 }
 touch(record){clearTimeout(record.idleTimer);record.idleTimer=setTimeout(()=>this.finish(record,'Inactive terminal disconnected after 20 minutes.'),this.idleMs);record.idleTimer.unref();}
 finish(record,message,notify=true){
  if(record.closed)return;
  if(notify)this.send(record,'closed',{message});record.closed=true;this.sessions.delete(record.id);
  for(const timer of [record.connectTimer,record.hostTimer,record.idleTimer])clearTimeout(timer);
  const safely=action=>{try{action();}catch(error){/* A failed close must not retain the remaining resources. */}};
  if(record.verifier){const verify=record.verifier;record.verifier=null;safely(()=>verify(false));}
  safely(()=>record.worker?.terminate());safely(()=>record.channel?.end());safely(()=>record.client?.end());safely(()=>record.client?.destroy());
  if(record.pendingInput){const reply=record.pendingInput;record.pendingInput=null;safely(()=>reply({error:'Terminal disconnected.'}));}
  record.pending.clear();record.pendingBytes=0;
 }
 revokeUser(id){for(const record of [...this.sessions.values()])if(record.userId===id){this.finish(record,'Your Messenger account session was revoked.');record.socket.disconnect(true);}}
 shutdown(){for(const record of [...this.sessions.values()])this.finish(record,'Terminal service stopped.');}
}
module.exports={TerminalGateway};
