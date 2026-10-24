'use strict';
const rules=require('./table-games');
const {sessions}=require('./game-sessions');
const {validIds}=require('./game-input');
const matches=new Map(),invites=new Map();
const isTable=type=>['memorymatch','wordscramble'].includes(type);
function install(io,socket,db){
 const id=socket.user.id;
 const error=message=>socket.emit('table:error',{message});
 function publish(match){match.players.forEach((p,i)=>io.to(`user:${p.id}`).emit('table:state',{conversationId:match.conversationId,players:match.players,playerNum:i+1,...rules.view(match.game)}));}
 function score(match){if(match.game.status!=='finished'||match.scored)return;match.scored=true;sessions.release(match.activity);db.updateGameScore(match.players[0].id,match.players[1].id,match.game.winner?match.players[match.game.winner-1].id:'draw');const t=setTimeout(()=>{if(matches.get(match.conversationId)===match)matches.delete(match.conversationId);},1800000);t.unref();}
 function clock(match){
  clearTimeout(match.roundTimer);
  if(match.game.type!=='wordscramble'||match.game.status!=='playing'||match.game.phase!=='pick')return;
  match.game.deadline=Date.now()+60000;
  match.roundTimer=setTimeout(()=>{if(matches.get(match.conversationId)!==match||match.game.status!=='playing')return;rules.expire(match.game);publish(match);schedule(match);},60000);match.roundTimer.unref();
 }
 function schedule(match){
  clearTimeout(match.roundTimer);const version=match.game.version;
  match.timer=setTimeout(()=>{if(matches.get(match.conversationId)!==match||match.game.version!==version||match.game.status!=='playing')return;rules.advance(match.game);score(match);clock(match);publish(match);},match.game.type==='memorymatch'?900:1500);match.timer.unref();
 }
 socket.on('table:move',(data={})=>{
  if(!data||typeof data!=='object')return error('Invalid move');
  const match=matches.get(data.conversationId);if(!match)return error('This match has ended.');
  const player=match.players.findIndex(p=>p.id===id)+1;if(!player)return error('You are not a player in this match.');
  try{
   rules.move(match.game,player,data);publish(match);
   if(match.game.phase!=='pick')schedule(match);
  }catch(e){error(e.message);}
 });
 function forfeit(match,userId){
  const index=match.players.findIndex(p=>p.id===userId);if(index<0)return false;
  if(match.game.status==='playing'){clearTimeout(match.timer);clearTimeout(match.roundTimer);match.game.status='finished';match.game.winner=2-index;match.game.notice='Opponent left the match.';match.game.version++;score(match);publish(match);}return true;
 }
 socket.on('table:leave',(data={})=>{
  if(!data||typeof data!=='object')return error('Invalid game');
  const match=matches.get(data.conversationId);if(match&&!forfeit(match,id))error('You are not a player in this match.');
 });
 for(const match of matches.values())if(match.game.status==='playing'&&match.players.some(p=>p.id===id))publish(match);
 return{
  invite(data){
   if(!validIds(data))return error('Invalid conversation or player.');
   const{conversationId,targetUserId,gameType}=data;
   if(!db.isUserInConversation(id,conversationId))return error('Access denied');
   if(targetUserId&&(targetUserId===id||!db.isUserInConversation(targetUserId,conversationId)))return error('Choose another member.');
   try{sessions.assertFree([id,...(targetUserId?[targetUserId]:[])],id);}catch(e){return error(e.message);}
   if(matches.get(conversationId)?.game.status==='playing')return error('Finish the current match first.');
   for(const[key,value]of invites)if(value.expires<Date.now())invites.delete(key);
   invites.set(`${conversationId}:${id}`,{hostId:id,conversationId,targetUserId,gameType,expires:Date.now()+90000});
   const payload={fromUserId:id,fromUsername:socket.user.display_name||socket.user.username,conversationId,gameType};
   if(targetUserId)io.to(`user:${targetUserId}`).emit('game:request',payload);else socket.to(`conv:${conversationId}`).emit('game:request',payload);
  },
  accept(data){
   if(!validIds(data,true))return error('Invalid conversation or player.');
   const key=`${data.conversationId}:${data.targetUserId}`,invite=invites.get(key);
   if(!invite||invite.expires<Date.now()||invite.gameType!==data.gameType)return error('Invitation expired.');
   if(id===invite.hostId||!db.isUserInConversation(id,invite.conversationId)||(invite.targetUserId&&invite.targetUserId!==id))return error('Access denied');
   if(matches.get(invite.conversationId)?.game.status==='playing')return error('A match is already running.');
   const match={conversationId:invite.conversationId,players:[invite.hostId,id].map(uid=>{const u=db.getUserById(uid);return{id:uid,name:u.display_name||u.username};}),game:rules.create(invite.gameType)};
   try{match.activity=sessions.claim({key:'table:'+match.conversationId,type:invite.gameType,conversationId:match.conversationId,players:match.players.map(p=>p.id),actorId:id,onAbandon:user=>forfeit(match,user),resume:(s,user)=>s.emit('table:state',{conversationId:match.conversationId,players:match.players,playerNum:match.players.findIndex(p=>p.id===user)+1,...rules.view(match.game)})});}catch(e){return error(e.message);}
   invites.delete(key);
   matches.set(invite.conversationId,match);clock(match);io.to(`conv:${invite.conversationId}`).emit('game:invite_closed',{conversationId:invite.conversationId});publish(match);
   const expiry=setTimeout(()=>{if(matches.get(match.conversationId)!==match||match.game.status!=='playing')return;clearTimeout(match.timer);clearTimeout(match.roundTimer);match.game.status='finished';match.game.winner=0;match.game.notice='Match expired.';score(match);publish(match);},14400000);expiry.unref();
  },
  decline(data){const key=`${data.conversationId}:${data.targetUserId}`,invite=invites.get(key);if(!invite)return false;if(id===invite.hostId||!db.isUserInConversation(id,invite.conversationId)||(invite.targetUserId&&invite.targetUserId!==id))return true;invites.delete(key);io.to(`user:${invite.hostId}`).emit('game:declined',{fromUserId:id});return true;}
 };
}
module.exports={isTable,install};
