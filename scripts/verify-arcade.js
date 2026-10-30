// Uses only an isolated localhost server and public client payloads.
const assert=require('node:assert/strict'),fs=require('node:fs'),{io}=require('socket.io-client');
const base='http://127.0.0.1:3391',sockets=[];
function event(socket,name,check=()=>true,timeout=6000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off(name,receive);reject(Error('Timeout '+name));},timeout);function receive(data){if(!check(data))return;clearTimeout(timer);socket.off(name,receive);resolve(data);}socket.on(name,receive);});}
async function api(path,body,token,method=body?'POST':'GET',status=200){const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(res.status,status,await res.clone().text());return res.json();}
async function connect(user){const s=io(base,{auth:{token:user.token}});sockets.push(s);await event(s,'connect');return s;}
async function invite(a,b,users,conv,type,eventName){const requested=event(b,'game:request');a.emit('game:request',{conversationId:conv.id,targetUserId:users[1].user.id,gameType:type});assert.equal((await requested).gameType,type);const started=event(a,eventName);b.emit('game:accept',{conversationId:conv.id,targetUserId:users[0].user.id,gameType:type});return started;}
(async()=>{
 const users=[];for(let i=0;i<3;i++){const id='arcadetest'+Date.now()+i;users.push(await api('/api/auth/register',{username:id,displayName:'Arcade QA '+i,password:'local-arcade-test',deviceBinding:id}));}
 const [a,b,c]=await Promise.all(users.map(connect)),conv=await api('/api/conversations',{userId:users[1].user.id},users[0].token);
 let game=await invite(a,b,users,conv,'memorymatch','table:state');assert.ok(game.cards.every(x=>x===null));assert.equal(game.deck,undefined);assert.equal(game.seed,undefined);
 let err=event(c,'table:error');c.emit('table:move',{conversationId:conv.id,index:0});assert.match((await err).message,/not a player/i);
 err=event(b,'table:error');b.emit('table:move',{conversationId:conv.id,index:0});assert.match((await err).message,/turn/);
 const known=new Map();let turns=0;
 while(game.status==='playing'&&turns++<90){
  const player=game.turn===1?a:b;const closed=game.cards.flatMap((x,i)=>x===null?[i]:[]);let pair=null;
  for(const i of closed){const j=closed.find(j=>j!==i&&known.get(i)&&known.get(i)===known.get(j));if(j!==undefined){pair=[i,j];break;}}
  const first=pair?.[0]??closed.find(i=>!known.has(i))??closed[0];
  let next=event(a,'table:state',s=>s.version>game.version);player.emit('table:move',{conversationId:conv.id,index:first});game=await next;known.set(first,game.cards[first]);
  const second=pair?.[1]??closed.find(i=>i!==first&&known.get(i)===game.cards[first])??closed.find(i=>i!==first&&!known.has(i))??closed.find(i=>i!==first);
  next=event(a,'table:state',s=>s.version>game.version);player.emit('table:move',{conversationId:conv.id,index:second});game=await next;known.set(second,game.cards[second]);
  next=event(a,'table:state',s=>s.version>game.version);game=await next;
  for(let i=0;i<16;i++)if(!game.matched[i]&&!game.revealed.includes(i))assert.equal(game.cards[i],null);
 }
 assert.equal(game.status,'finished');assert.equal(game.scores.reduce((a,b)=>a+b),8);console.log('PASS private Memory Match, turn enforcement and complete two-player match');
 game=await invite(a,b,users,conv,'wordscramble','table:state');
 const dictionary='network message keyboard monitor browser socket avatar private secure laptop router server upload status friend planet garden forest puzzle castle rocket silver coffee bridge window crystal sunshine journey penguin orchard'.split(' '),answers=[];
 const letters=s=>[...s].sort().join('');
 for(let round=1;round<=3;round++){
  assert.equal(game.round,round);assert.equal(game.maxRounds,3);assert.equal(game.word,undefined);assert.equal(game.words,undefined);
  const answer=dictionary.find(w=>letters(w)===letters(game.scrambled));assert.ok(answer);answers.push(answer);
  const next=event(a,'table:state',s=>s.phase==='round_end'&&s.round===round);a.emit('table:move',{conversationId:conv.id,round,answer});b.emit('table:move',{conversationId:conv.id,round,answer});game=await next;
  assert.equal(game.scores[0]+game.scores[1],round);const advanced=event(a,'table:state',s=>s.version>game.version);game=await advanced;
 }
 assert.equal(new Set(answers).size,3);assert.equal(game.status,'finished');assert.ok(game.winner);console.log('PASS three distinct Word Guess rounds, hidden answers and simultaneous-submission scoring');
 const launch=await invite(a,b,users,conv,'wizardchess','arcade:launch');
 await api('/api/arcade/wizard/rooms/join',{code:launch.room},users[0].token);
 await api('/api/arcade/wizard/rooms/join',{code:launch.room},users[1].token);
 await api('/api/arcade/wizard/rooms/join',{code:launch.room},users[2].token,'POST',403);
 const movePath='/api/arcade/wizard/rooms/'+launch.room+'/move';
 await api(movePath,{from:{r:1,c:0},to:{r:2,c:0}},users[1].token,'POST',403);
 const moves=[[[6,5],[5,5]],[[1,4],[3,4]],[[6,6],[4,6]],[[0,3],[4,7]]];let view;
 for(let i=0;i<moves.length;i++)view=await api(movePath,{from:{r:moves[i][0][0],c:moves[i][0][1]},to:{r:moves[i][1][0],c:moves[i][1][1]}},users[i%2].token);
 assert.equal(view.room.reason,'Checkmate');assert.equal(view.room.winner,'b');console.log('PASS authenticated Wizard Chess, illegal move rejection and complete checkmate');
 const tennis=await invite(a,b,users,conv,'rallyclub','arcade:launch');
 await api('/api/arcade/tennis/match/state?room='+tennis.room,null,users[2].token,'GET',403);
 await api('/api/arcade/tennis/match/sync',{room:tennis.room,snapshot:{phase:'RALLY'}},users[1].token,'POST',403);
 await api('/api/arcade/tennis/match/sync',{room:tennis.room,snapshot:{phase:'RALLY',score:{playerGames:0,opponentGames:0}}},users[0].token);
 const state=await api('/api/arcade/tennis/match/state?room='+tennis.room,null,users[1].token);assert.equal(state.snapshot.phase,'RALLY');
 const win=event(a,'arcade:result');await api('/api/arcade/tennis/match/sync',{room:tennis.room,snapshot:{phase:'MATCH_OVER',score:{playerGames:1,opponentGames:0}}},users[0].token);assert.equal((await win).winnerId,users[0].user.id);console.log('PASS Rally Club scoped relay, guest write rejection and match result');
 const group=await api('/api/groups',{name:'Scribble QA',memberIds:[users[1].user.id]},users[0].token);
 let lobby=event(a,'scribble:lobby');a.emit('scribble:create',{conversationId:group.id});await lobby;lobby=event(a,'scribble:lobby',x=>x.players.length===2);b.emit('scribble:join',{conversationId:group.id});await lobby;
 const choices=event(a,'scribble:choose_word');a.emit('scribble:start_game',{conversationId:group.id});const words=(await choices).words;
 const drawingA=event(a,'scribble:drawing_started'),drawingB=event(b,'scribble:drawing_started');a.emit('scribble:word_selected',{conversationId:group.id,word:words[0]});assert.equal((await drawingA).word,words[0]);assert.equal((await drawingB).word,null);
 const drawing=event(b,'scribble:draw');a.emit('scribble:draw',{conversationId:group.id,drawData:{type:'line',from:{x:0,y:0},to:{x:40,y:50},color:'#123456',size:5}});assert.equal((await drawing).drawData.to.x,40);
 const ended=event(a,'scribble:round_ended');b.emit('scribble:guess',{conversationId:group.id,guess:words[0]});await ended;
 const closed=event(b,'scribble:game_over');a.emit('scribble:leave',{conversationId:group.id});await closed;console.log('PASS Scribble lobby, word secrecy, drawing, guess, round and cancellation');
 fs.writeFileSync(process.env.QA_FIXTURES_PATH||require('node:path').join(require('node:os').tmpdir(),'lan-messenger-arcade-fixtures.json'),JSON.stringify({users,conversation:conv}),{mode:0o600});
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>sockets.forEach(s=>s.disconnect()));
