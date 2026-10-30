// Run only against an isolated localhost QA server/database on port3391.
const assert=require('node:assert/strict'),{io}=require('socket.io-client');
const base='http://127.0.0.1:3391',sockets=[];
function event(s,name,check=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,receive);reject(Error('Timeout '+name));},5000);function receive(data){if(!check(data))return;clearTimeout(timer);s.off(name,receive);resolve(data);}s.on(name,receive);});}
async function api(path,body,token){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});assert.equal(response.status,200,await response.clone().text());return response.json();}
async function connect(user){const s=io(base,{auth:{token:user.token},autoConnect:false,reconnection:false});sockets.push(s);const ready=event(s,'connect');s.connect();await ready;return s;}
function send(s,event,data){return new Promise((resolve,reject)=>s.timeout(4000).emit(event,data,(error,result)=>error?reject(error):resolve(result)));}
(async()=>{
 const users=[];for(let i=0;i<3;i++)users.push(await api('/api/auth/register',{username:'callqa'+Date.now()+i,displayName:['Call A','Call B','Call C'][i],password:'LocalCallTestPassword123!'}));
 const a=await connect(users[0]),a2=await connect(users[0]),b=await connect(users[1]),b2=await connect(users[1]),c=await connect(users[2]);
 const ab=await api('/api/conversations',{userId:users[1].user.id},users[0].token);
 const ac=await api('/api/conversations',{userId:users[2].user.id},users[0].token);
 const id='qa-call-'+Date.now(),offer={callId:id,conversationId:ab.id,targetUserId:users[1].user.id,offer:{type:'offer',sdp:'v=0\r\n'}};
 const answer={callId:id,conversationId:ab.id,targetUserId:users[0].user.id,answer:{type:'answer',sdp:'v=0\r\n'}};
 let incoming=event(b,'call:offer');assert.equal((await send(a,'call:offer',offer)).success,true);assert.equal((await incoming).fromUserId,users[0].user.id);
 assert.ok((await send(c,'call:answer',answer)).error);
 const accepted=event(a,'call:answer'),handled=event(b2,'call:handled');assert.equal((await send(b,'call:answer',answer)).success,true);await accepted;await handled;
 assert.ok((await send(b2,'call:screen-state',{...answer,sharing:true})).error);
 assert.ok((await send(a2,'call:end',offer)).error);
 const shared=event(a,'call:screen-state');assert.equal((await send(b,'call:screen-state',{...answer,sharing:true})).success,true);assert.equal((await shared).sharing,true);
 assert.ok((await send(c,'call:offer',{...offer,callId:'other-call-'+Date.now(),conversationId:ac.id,targetUserId:users[0].user.id})).error);
 let ended=event(a,'call:end');assert.equal((await send(b,'call:end',answer)).success,true);await ended;
 const replacement={...offer,callId:'replacement-call-'+Date.now()};incoming=event(b,'call:offer');assert.equal((await send(a,'call:offer',replacement)).success,true);await incoming;
 assert.ok((await send(a,'call:end',offer)).error);
 ended=event(b,'call:end');a.disconnect();await ended;
 incoming=event(b,'call:offer');assert.equal((await send(a2,'call:offer',{...offer,callId:'after-disconnect-'+Date.now()})).success,true);await incoming;
 console.log('PASS private call identity, per-device answer/screen ownership, third-party/busy rejection, stale replay protection and disconnect cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>sockets.forEach(s=>s.disconnect()));
