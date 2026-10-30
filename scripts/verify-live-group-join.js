// Localhost isolated QA only: verifies room subscription without reconnecting.
const assert=require('node:assert/strict'),{io}=require('socket.io-client');
const base='http://127.0.0.1:3391',sockets=[];
async function api(path,body,token){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();}
function event(s,name,check=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,receive);reject(Error('Timeout '+name));},2000);function receive(data){if(!check(data))return;clearTimeout(timer);s.off(name,receive);resolve(data);}s.on(name,receive);});}
async function connect(user){const s=io(base,{auth:{token:user.token},autoConnect:false});sockets.push(s);const p=event(s,'connect');s.connect();await p;return s;}
function ack(s,name,data){return new Promise((resolve,reject)=>s.timeout(1000).emit(name,data,(error,result)=>error?reject(error):resolve(result)));}
(async()=>{
 const users=[];for(let i=0;i<3;i++)users.push(await api('/api/auth/register',{username:'roomqa'+Date.now()+i,displayName:'Room QA '+i,password:'LocalRoomTestPassword123!'}));
 const a=await connect(users[0]),b=await connect(users[1]),c=await connect(users[2]);
 const group=await api('/api/groups',{name:'New live group',memberIds:[users[1].user.id]},users[0].token);
 assert.equal((await ack(a,'conversation:join',{conversationId:group.id})).success,true);
 assert.equal((await ack(b,'conversation:join',{conversationId:group.id})).success,true);
 assert.ok((await ack(c,'conversation:join',{conversationId:group.id})).error);
 const received=event(b,'message:new',m=>m.conversation_id===group.id);
 assert.equal((await ack(a,'message:send',{conversationId:group.id,ciphertext:'isolated-room-delivery-test'})).success,true);
 await received;
 await api('/api/groups/'+group.id+'/members',{userId:users[2].user.id},users[0].token);
 assert.equal((await ack(c,'conversation:join',{conversationId:group.id})).success,true);
 const memberDelivery=event(c,'message:new',m=>m.conversation_id===group.id);
 assert.equal((await ack(a,'message:send',{conversationId:group.id,ciphertext:'isolated-new-member-delivery-test'})).success,true);
 await memberDelivery;console.log('PASS new-group and new-member live delivery without reconnect, with outsider subscription rejected');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>sockets.forEach(s=>s.disconnect()));
