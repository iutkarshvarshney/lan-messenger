'use strict';
const crypto=require('node:crypto'),wizard=require('./wizard-rooms');
const {sessions}=require('./game-sessions');
const {validIds}=require('./game-input');
const rooms=new Map(),invites=new Map();
const isScene=type=>['wizardchess','rallyclub'].includes(type);
function newRacket(role){return{role,seq:0,lastSeenTs:0,connected:false,orientation:{pitch:0,roll:0,yaw:0,accelMag:0,buttonB:false},swingHistory:[],lastSwing:null};}
function launchFor(room,i){return {conversationId:room.conversationId,room:room.code,type:room.type,url:room.type==='wizardchess'?`/games/wizard-chess/?lan=1&room=${room.code}`:`/games/rally-club/?lan=1&room=${room.code}&role=p${i+1}&mode=1v1`};}
function result(io,db,room,winner,reason){
 if(room.scored)return;room.scored=true;room.status='finished';sessions.release(room.activity);
 const winnerId=winner===null?'draw':room.players[winner].id;
 db.updateGameScore(room.players[0].id,room.players[1].id,winnerId);
 for(const player of room.players)io.to(`user:${player.id}`).emit('arcade:result',{conversationId:room.conversationId,type:room.type,winnerId,winnerName:winner===null?'Draw':room.players[winner].name,reason,room:room.code});
 const timer=setTimeout(()=>rooms.delete(room.code),1800000);timer.unref();
}
function install(io,socket,db){
 const id=socket.user.id,error=message=>socket.emit('arcade:error',{message});
 socket.on('arcade:leave',(data={})=>{if(!data||typeof data!=='object')return error('Invalid game');const room=rooms.get(data.room);if(!room)return;const i=room.players.findIndex(p=>p.id===id);if(i<0)return error('Access denied');if(room.status==='playing')result(io,db,room,1-i,'Opponent left the match.');});
 for(const room of rooms.values())if(room.status==='playing'&&room.players.some(p=>p.id===id))socket.emit('arcade:launch',launchFor(room,room.players.findIndex(p=>p.id===id)));
 return{
  invite(data){
   if(!validIds(data))return error('Invalid conversation or player.');
   const{conversationId,targetUserId,gameType}=data;
   if(!db.isUserInConversation(id,conversationId)||targetUserId&&(targetUserId===id||!db.isUserInConversation(targetUserId,conversationId)))return error('Choose a member of this conversation.');
   try{sessions.assertFree([id,...(targetUserId?[targetUserId]:[])],id);}catch(e){return error(e.message);}
   if([...rooms.values()].some(r=>r.conversationId===conversationId&&r.status==='playing'))return error('Finish the current 3D match first.');
   for(const[k,v]of invites)if(v.expires<Date.now())invites.delete(k);
   invites.set(`${conversationId}:${id}`,{conversationId,targetUserId,gameType,hostId:id,expires:Date.now()+90000});
   const payload={fromUserId:id,fromUsername:socket.user.username,conversationId,gameType};
   if(targetUserId)io.to(`user:${targetUserId}`).emit('game:request',payload);else socket.to(`conv:${conversationId}`).emit('game:request',payload);
  },
  accept(data){
   if(!validIds(data,true))return error('Invalid conversation or player.');
   const key=`${data.conversationId}:${data.targetUserId}`,invite=invites.get(key);
   if(!invite||invite.expires<Date.now()||invite.gameType!==data.gameType)return error('Invitation expired.');
   if(id===invite.hostId||!db.isUserInConversation(id,invite.conversationId)||(invite.targetUserId&&invite.targetUserId!==id))return error('Access denied');
   if([...rooms.values()].some(r=>r.conversationId===invite.conversationId&&r.status==='playing'))return error('A match is already running.');
   const players=[invite.hostId,id].map(uid=>{const user=db.getUserById(uid);return{id:uid,name:user.display_name||user.username};});
   const room=invite.gameType==='wizardchess'?wizard.createRoom(invite.conversationId,players):{code:crypto.randomBytes(4).toString('hex').toUpperCase(),conversationId:invite.conversationId,players,status:'playing',rackets:{p1:newRacket('p1'),p2:newRacket('p2')},seen:[0,0],stateSeq:0,snapshot:null};
   room.type=invite.gameType;
   try{room.activity=sessions.claim({key:'scene:'+room.code,type:room.type,conversationId:room.conversationId,players:players.map(p=>p.id),actorId:id,onAbandon:user=>{const i=players.findIndex(p=>p.id===user);result(io,db,room,1-i,'Opponent left the match.');},resume:(s,user)=>s.emit('arcade:launch',launchFor(room,players.findIndex(p=>p.id===user)))});}catch(e){return error(e.message);}
   invites.delete(key);rooms.set(room.code,room);
   const cleanup=setTimeout(()=>{if(room.status==='playing')result(io,db,room,null,'Match expired.');rooms.delete(room.code);},4*60*60*1000);cleanup.unref();
   players.forEach((p,i)=>io.to(`user:${p.id}`).emit('arcade:launch',launchFor(room,i)));
   io.to(`conv:${room.conversationId}`).emit('game:invite_closed',{conversationId:room.conversationId});
  },
  decline(data){const key=`${data.conversationId}:${data.targetUserId}`,invite=invites.get(key);if(!invite)return false;if(id===invite.hostId||!db.isUserInConversation(id,invite.conversationId)||(invite.targetUserId&&invite.targetUserId!==id))return true;invites.delete(key);io.to(`user:${invite.hostId}`).emit('game:declined',{fromUserId:id});return true;}
 };
}
function routes(app,auth,io,db){
 app.use('/api/arcade',auth,(req,res,next)=>{res.set('Cache-Control','no-store');if(!db.getUserById(req.user.id))return res.status(401).json({error:'Session expired'});next();});
 app.post('/api/arcade/wizard/rooms/join',(req,res)=>{const room=rooms.get(String(req.body?.code||'').toUpperCase());if(!room||room.type!=='wizardchess')return res.status(404).json({error:'Room not found'});try{res.json(wizard.joinRoom(room,req.user.id));}catch(e){res.status(403).json({error:e.message});}});
 app.get('/api/arcade/wizard/rooms/:code/state',(req,res)=>{const room=rooms.get(req.params.code.toUpperCase());if(!room||room.type!=='wizardchess')return res.status(404).json({error:'Room not found'});if(!room.players.some(p=>p.id===req.user.id))return res.status(403).json({error:'Access denied'});res.json({ok:true,room:wizard.roomView(room)});});
 app.post('/api/arcade/wizard/rooms/:code/move',(req,res)=>{const room=rooms.get(req.params.code.toUpperCase());if(!room||room.type!=='wizardchess')return res.status(404).json({error:'Room not found'});try{const view=wizard.moveRoom(room,req.user.id,req.body);if(room.status==='finished')result(io,db,room,room.winner===null?null:room.winner==='w'?0:1,room.reason);res.json({ok:true,room:view});}catch(e){res.status(403).json({error:e.message});}});
 app.use('/api/arcade/tennis',(req,res)=>{
  const code=String(req.body?.room||req.query.room||'').toUpperCase();
  // The solo game polls for motion input too. It needs no network room.
  if(!code||code==='DEFAULT')return res.json({ok:true,roomId:'default',p1Online:true,p2Online:false,p1:newRacket('p1'),p2:newRacket('p2')});
  const room=rooms.get(code);if(!room||room.type!=='rallyclub')return res.status(404).json({error:'Room not found'});
  const index=room.players.findIndex(p=>p.id===req.user.id);if(index<0)return res.status(403).json({error:'Access denied'});
  const role=index===0?'p1':'p2',racket=room.rackets[role];room.seen[index]=Date.now();
  if(req.method==='GET'&&req.path==='/match/state')return res.json({ok:true,roomId:room.code,hostName:room.players[0].name,guestName:room.players[1].name,p1Online:Date.now()-room.seen[0]<10000,p2Online:Date.now()-room.seen[1]<10000,p1:room.rackets.p1,p2:room.rackets.p2,snapshotSeq:room.stateSeq,snapshot:room.snapshot});
  if(req.method!=='POST')return res.status(404).json({error:'Unknown game endpoint'});
  if(req.path==='/match/sync'){
   if(index!==0)return res.status(403).json({error:'Only the host can synchronize physics'});
   const value=req.body.snapshot;if(!value||typeof value!=='object'||JSON.stringify(value).length>60000)return res.status(400).json({error:'Invalid snapshot'});
   room.snapshot=value;room.stateSeq++;
   if(value.phase==='MATCH_OVER'||value.phase==='VICTORY'){const s=value.score;if(s&&Number.isFinite(s.playerGames)&&Number.isFinite(s.opponentGames))result(io,db,room,s.playerGames===s.opponentGames?null:s.playerGames>s.opponentGames?0:1,'Match complete');}
   return res.json({ok:true,seq:room.stateSeq,p2Racket:room.rackets.p2});
  }
  if(req.path==='/racket/swing'){
   const b=req.body;racket.seq++;racket.lastSeenTs=Date.now();racket.connected=true;
   const num=(x,min,max,def=0)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):def;
   const swing={seq:racket.seq,role,type:b.type==='toss'?'toss':'swing',shotType:['topspin','slice','lob','flat','smash'].includes(b.shotType)?b.shotType:'topspin',speed:num(b.speed,0,3,1),angleX:num(b.angleX,-1,1),dirX:num(b.angleX,-1,1),dirY:num(b.dirY,-1,1),timestamp:Date.now(),serverTimeMs:Date.now(),source:'keyboard_p2'};
   racket.lastSwing=swing;racket.swingHistory.push(swing);racket.swingHistory=racket.swingHistory.slice(-20);return res.json({ok:true,swing});
  }
  if(req.path==='/racket/feedback')return res.json({ok:true});
  return res.status(404).json({error:'Invite your friend through Messenger to play.'});
 });
}
module.exports={isScene,install,routes};
