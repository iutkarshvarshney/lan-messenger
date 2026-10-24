// Isolated local QA only: run against the test server on localhost:3391.
const assert=require('node:assert/strict');
const {io}=require('socket.io-client');
const rules=require('../public/js/ludo-rules');
const base='http://127.0.0.1:3391';
const sockets=[];
function once(socket,event,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off(event,listener);reject(new Error('Timed out: '+event));},4000);function listener(data){if(!predicate(data))return;clearTimeout(timer);socket.off(event,listener);resolve(data);}socket.on(event,listener);});}
async function api(route,body,token){const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});assert.equal(response.ok,true,await response.clone().text());return response.json();}
(async()=>{
 const stamp=Date.now();const users=[];
 for(let i=0;i<3;i++){const username=`ludoqa${stamp}${i}`;const data=await api('/api/auth/register',{username,displayName:username,password:'local-test-pass',deviceBinding:username});users.push(data);const socket=io(base,{auth:{token:data.token}});sockets.push(socket);await once(socket,'connect');}
 const conv=await api('/api/conversations',{userId:users[1].user.id},users[0].token);
 let pending=once(sockets[0],'ludo:started');sockets[0].emit('ludo:start',{conversationId:conv.id,playerCount:2});let state=await pending;
 pending=once(sockets[0],'ludo:error');sockets[0].emit('ludo:start',{conversationId:conv.id,playerCount:2});assert.match((await pending).message,/already running/);
 sockets[2].emit('ludo:leave',{conversationId:conv.id});
 let turns=0,captures=0;for(;turns<2500&&state.winners.length<2;turns++){
  const index=state.currentTurnIndex;const rollVersion=state.stateVersion;pending=once(sockets[index],'ludo:state',data=>data.stateVersion>rollVersion);sockets[index].emit('ludo:roll',{conversationId:conv.id});state=await pending;
  if(!state.lastRoll)continue;
  const legal=rules.movable(state,index,state.lastRoll);assert.ok(legal.length);
  const before=structuredClone(state);const previews=legal.map(token=>{const preview=structuredClone(state);const outcome=rules.move(preview,index,token,state.lastRoll);return{token,outcome,preview};});
  // Prioritise captures and progress to keep the simulation short.
  previews.sort((a,b)=>(b.outcome.captured-a.outcome.captured)||((before.positions[index][b.token])-(before.positions[index][a.token])));
  const selected=previews[0];captures+=selected.outcome.captured;
  const moveVersion=state.stateVersion;pending=once(sockets[index],'ludo:state',data=>data.stateVersion>moveVersion);sockets[index].emit('ludo:move',{conversationId:conv.id,tokenIndex:selected.token});state=await pending;
  assert.deepEqual(state.positions,selected.preview.positions);
  if(state.winners.length<2){const finished=state.winners.includes(state.players[index].id);assert.equal(state.currentTurnIndex,selected.outcome.extraTurn&&!finished?index:(index+1)%2);}
 }
 assert.equal(state.winners.length,2,'Match failed to complete');assert.equal(new Set(state.winners).size,2);
 assert.ok(state.positions.some(tokens=>tokens.every(p=>p===56)));
 console.log(JSON.stringify({passed:true,rolls:turns,captures,completeMatch:true,activeMatchProtected:true,nonParticipantLeaveBlocked:true}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>sockets.forEach(socket=>socket.disconnect()));
