// Run only against an isolated localhost test server on port 3391.
const assert=require('node:assert/strict');const {io}=require('socket.io-client');
const sockets=[];const base='http://127.0.0.1:3391';
function event(socket,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off(name,receive);reject(new Error('Timed out: '+name));},4000);function receive(value){if(!predicate(value))return;clearTimeout(timer);socket.off(name,receive);resolve(value);}socket.on(name,receive);});}
async function api(method,path,body,token){const response=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.ok(response.ok,await response.clone().text());return response.json();}
async function connect(user){const socket=io(base,{auth:{token:user.token}});sockets.push(socket);await event(socket,'connect');return socket;}
(async()=>{
 const users=[];for(let i=0;i<3;i++){const username='nativeqa'+Date.now()+i;users.push(await api('POST','/api/auth/register',{username,displayName:username,password:'test-local-password',deviceBinding:username}));}
 const a=await connect(users[0]),b=await connect(users[1]),outsider=await connect(users[2]);
 const conv=await api('POST','/api/conversations',{userId:users[1].user.id},users[0].token);
 for(const type of ['reversi','gomoku']){
  let incoming=event(b,'game:request');a.emit('game:request',{targetUserId:users[1].user.id,conversationId:conv.id,gameType:type});assert.equal((await incoming).gameType,type);
  const declined=event(a,'game:declined');b.emit('game:decline',{targetUserId:users[0].user.id,conversationId:conv.id});await declined;
  const expired=event(b,'duel:error');b.emit('game:accept',{targetUserId:users[0].user.id,conversationId:conv.id,gameType:type});assert.match((await expired).message,/expired/);
  incoming=event(b,'game:request');a.emit('game:request',{targetUserId:users[1].user.id,conversationId:conv.id,gameType:type});await incoming;
  let next=event(a,'duel:state');b.emit('game:accept',{targetUserId:users[0].user.id,conversationId:conv.id,gameType:type});let state=await next;
  let invalid=event(outsider,'duel:error');outsider.emit('duel:move',{conversationId:conv.id,cell:0});assert.match((await invalid).message,/not a player/);
  invalid=event(b,'duel:error');b.emit('duel:move',{conversationId:conv.id,cell:0});assert.match((await invalid).message,/turn/);
  const players=[a,b];let steps=0;
  if(type==='reversi'){
   while(state.status==='playing'&&steps<64){assert.ok(state.legalMoves.length);const current=players[state.turn-1];next=event(a,'duel:state');current.emit('duel:move',{conversationId:conv.id,cell:state.legalMoves[0]});state=await next;steps++;}
   assert.equal(state.status,'finished');assert.deepEqual(state.scores,[state.board.filter(x=>x===1).length,state.board.filter(x=>x===2).length]);
  }else{
   for(let x=0;x<5;x++){
    next=event(a,'duel:state');a.emit('duel:move',{conversationId:conv.id,cell:x});state=await next;if(x===4)break;
    next=event(a,'duel:state');b.emit('duel:move',{conversationId:conv.id,cell:30+x});state=await next;
   }
   assert.equal(state.status,'finished');assert.equal(state.winner,1);
  }
  console.log('PASS '+type+' complete authoritative two-player match');
 }
 const firstDelivery=event(b,'message:new');
 let ack=new Promise(resolve=>a.emit('message:send',{conversationId:conv.id,ciphertext:'existing history'},resolve));assert.equal((await ack).success,true);
 assert.equal((await firstDelivery).ciphertext,'existing history');
 await api('DELETE',`/api/conversations/${conv.id}/inbox`,null,users[1].token);
 assert.equal((await api('GET','/api/conversations',null,users[1].token)).some(c=>c.id===conv.id),false);
 assert.equal((await api('GET','/api/conversations',null,users[0].token)).some(c=>c.id===conv.id),true);
 b.disconnect();const restored=await connect(users[1]);const message=event(restored,'message:new');
 ack=new Promise(resolve=>a.emit('message:send',{conversationId:conv.id,ciphertext:'new message after hidden reconnect'},resolve));assert.equal((await ack).success,true);assert.equal((await message).ciphertext,'new message after hidden reconnect');
 assert.equal((await api('GET','/api/conversations',null,users[1].token)).some(c=>c.id===conv.id),true);
 assert.equal((await api('GET',`/api/conversations/${conv.id}/messages`,null,users[0].token)).length,2);
 const rejected=await fetch(base+`/api/conversations/${conv.id}/inbox`,{method:'DELETE',headers:{authorization:'Bearer '+users[2].token}});assert.equal(rejected.status,403);
 let leaked=false;outsider.on('message:new',()=>{leaked=true;});outsider.emit('conversation:join',{conversationId:conv.id});
 ack=new Promise(resolve=>a.emit('message:send',{conversationId:conv.id,ciphertext:'privacy subscription test'},resolve));assert.equal((await ack).success,true);
 await new Promise(resolve=>setTimeout(resolve,100));assert.equal(leaked,false);
 let ludo=event(a,'ludo:started');a.emit('ludo:start',{conversationId:conv.id,playerCount:2});await ludo;
 const rollA=event(a,'ludo:rolling'),rollB=event(restored,'ludo:rolling');ludo=event(a,'ludo:state');a.emit('ludo:roll',{conversationId:conv.id});
 assert.equal((await rollA).conversationId,conv.id);assert.equal((await rollB).conversationId,conv.id);const dice=await ludo;assert.ok(dice.lastDice>=1&&dice.lastDice<=6);
 a.emit('ludo:leave',{conversationId:conv.id});
 console.log('PASS inbox deletion privacy, reconnect subscription, restoration and authorization');
 console.log('PASS declined invitation cannot be replayed, private-room protection, and dice broadcast to both players');
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>sockets.forEach(s=>s.disconnect()));
