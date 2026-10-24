const assert=require('node:assert/strict'),fs=require('node:fs'),{io}=require('socket.io-client');
const base='http://127.0.0.1:3391',sockets=[],activity=new Map();
function event(socket,name,check=()=>true,timeout=5000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off(name,receive);reject(Error('Timeout '+name));},timeout);function receive(data){if(!check(data))return;clearTimeout(timer);socket.off(name,receive);resolve(data);}socket.on(name,receive);});}
async function api(path,body,token){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});assert.equal(r.status,200,await r.clone().text());return r.json();}
async function connect(user){const s=io(base,{auth:{token:user.token},autoConnect:false});s.on('game:activity',d=>activity.set(user.user.id,d.active));sockets.push(s);const ready=event(s,'connect');s.connect();await ready;return s;}
async function invite(a,b,host,guest,conv,type,started){const requested=event(b,'game:request');a.emit('game:request',{conversationId:conv.id,targetUserId:guest.user.id,gameType:type});await requested;const p=event(a,started);b.emit('game:accept',{conversationId:conv.id,targetUserId:host.user.id,gameType:type});return p;}
async function solo(s,type){return new Promise(resolve=>s.emit('game:solo:start',{type},resolve));}
(async()=>{
 const users=[];for(let i=0;i<3;i++){const username='availability'+Date.now()+i;users.push(await api('/api/auth/register',{username,displayName:['Aarav Mehta','Riya Shah','Kabir Rao'][i],password:'local-availability-test',deviceBinding:username}));}
 let a=await connect(users[0]);const b=await connect(users[1]),c=await connect(users[2]);
 const ab=await api('/api/conversations',{userId:users[1].user.id},users[0].token),ac=await api('/api/conversations',{userId:users[2].user.id},users[0].token),bc=await api('/api/conversations',{userId:users[1].user.id},users[2].token);
 let next=event(a,'ludo:started');a.emit('ludo:start',{conversationId:ab.id,playerCount:2});let board=await next;
 let error=event(a,'table:error');a.emit('game:request',{conversationId:ac.id,targetUserId:users[2].user.id,gameType:'memorymatch'});assert.match((await error).message,/already playing Ludo/);
 error=event(c,'arcade:error');c.emit('game:request',{conversationId:bc.id,targetUserId:users[1].user.id,gameType:'connectfour'});assert.match((await error).message,/already playing Ludo/);
 error=event(c,'ludo:error');c.emit('ludo:start',{conversationId:ac.id,playerCount:2});assert.match((await error).message,/already playing Ludo/);
 const available=await solo(c,'2048');assert.equal(available.ok,true);c.emit('game:solo:leave',{activityId:available.activityId});
 let rolling=event(b,'ludo:rolling');next=event(a,'ludo:state');a.emit('ludo:roll',{conversationId:ab.id});assert.equal((await rolling).playerId,users[0].user.id);board=await next;assert.ok(board.diceByPlayer[users[0].user.id]>=1);assert.equal(board.lastRollPlayerId,users[0].user.id);
 next=event(a,'ludo:started');a.emit('ludo:start',{conversationId:ab.id,playerCount:2});const resumed=await next;assert.deepEqual(resumed.positions,board.positions);assert.deepEqual(resumed.diceByPlayer,board.diceByPlayer);
 a.disconnect();const restored=io(base,{auth:{token:users[0].token},autoConnect:false});restored.on('game:activity',d=>activity.set(users[0].user.id,d.active));sockets.push(restored);next=event(restored,'ludo:started');restored.connect();a=restored;assert.deepEqual((await next).diceByPlayer,board.diceByPlayer);
 next=event(a,'ludo:ended');b.emit('ludo:leave',{conversationId:ab.id});await next;
 console.log('PASS global cross-game/cross-chat busy checks, atomic Ludo claim, same-match resume, per-player roll identity and refresh restoration');
 await invite(a,c,users[0],users[2],ac,'memorymatch','table:state');
 error=event(b,'arcade:error');b.emit('game:request',{conversationId:bc.id,targetUserId:users[2].user.id,gameType:'wizardchess'});assert.match((await error).message,/already playing Memory Match/);
 next=event(c,'table:state',x=>x.status==='finished');a.emit('table:leave',{conversationId:ac.id});await next;
 const scene=await invite(b,c,users[1],users[2],bc,'wizardchess','arcade:launch');
 error=event(a,'duel:error');a.emit('game:request',{conversationId:ab.id,targetUserId:users[1].user.id,gameType:'reversi'});assert.match((await error).message,/already playing Wizard Chess/);
 next=event(c,'arcade:result');b.emit('arcade:leave',{room:scene.room});await next;
 await invite(a,b,users[0],users[1],ab,'reversi','duel:state');next=event(b,'duel:state',x=>x.status==='finished');a.emit('duel:leave',{conversationId:ab.id});await next;
 const legacy=await invite(a,b,users[0],users[1],ab,'tictactoe','game:started');
 next=event(b,'game:ended');a.emit('game:leave',{conversationId:ab.id,gameType:'tictactoe',sessionId:legacy.sessionId});assert.equal((await next).winnerId,users[1].user.id);
 const newLegacy=await invite(a,b,users[0],users[1],ab,'connectfour','game:started');a.emit('game:end',{conversationId:ab.id,targetUserId:users[1].user.id,sessionId:legacy.sessionId,winnerId:users[0].user.id});
 error=event(c,'table:error');c.emit('game:request',{conversationId:ac.id,targetUserId:users[0].user.id,gameType:'memorymatch'});assert.match((await error).message,/already playing Connect Four/);
 next=event(b,'game:ended');a.emit('game:leave',{conversationId:ab.id,gameType:'connectfour',sessionId:newLegacy.sessionId});await next;
 console.log('PASS table/scene/duel/legacy ownership, finish/forfeit release and stale legacy session rejection');
 const single=await solo(a,'2048');assert.equal(single.ok,true);a.emit('game:solo:leave',{activityId:'stale-id'});
 error=event(b,'table:error');b.emit('game:request',{conversationId:ab.id,targetUserId:users[0].user.id,gameType:'wordscramble'});assert.match((await error).message,/already playing 2048/);
 a.emit('game:solo:leave',{activityId:single.activityId});
 const group=await api('/api/groups',{name:'Game Night',memberIds:[users[1].user.id,users[2].user.id]},users[0].token);
 next=event(a,'scribble:lobby');a.emit('scribble:create',{conversationId:group.id});await next;
 const cSolo=await solo(c,'snake');error=event(c,'scribble:error');c.emit('scribble:join',{conversationId:group.id});assert.match((await error).message,/already playing Snake/);c.emit('game:solo:leave',{activityId:cSolo.activityId});
 next=event(a,'scribble:lobby',x=>x.players.length===2);b.emit('scribble:join',{conversationId:group.id});await next;
 next=event(a,'scribble:choose_word');a.emit('scribble:start_game',{conversationId:group.id});const word=(await next).words[0];next=event(b,'scribble:drawing_started');a.emit('scribble:word_selected',{conversationId:group.id,word});await next;
 next=event(b,'scribble:draw');a.emit('scribble:draw',{conversationId:group.id,drawData:{type:'line',from:{x:1,y:2},to:{x:20,y:30},color:'#123456',size:5}});await next;
 next=event(b,'scribble:canvas');b.emit('game:resume');const replay=await next;assert.equal(replay.draws.length,1);assert.equal(replay.draws[0].to.x,20);
 next=event(b,'scribble:game_over');a.emit('scribble:leave',{conversationId:group.id});await next;
 assert.equal((await solo(b,'breakout')).ok,true);b.emit('game:leave-current',{activityId:activity.get(users[1].user.id).id});
 console.log('PASS solo busy protection, stale leave rejection, Scribble lobby ownership/canvas resume and cleanup');
 fs.writeFileSync(process.env.QA_FIXTURES_PATH||require('node:path').join(require('node:os').tmpdir(),'lan-messenger-test-fixtures.json'),JSON.stringify({users,ab,ac,bc,group}),{mode:0o600});
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>sockets.forEach(s=>s.disconnect()));
