'use strict';
const rules=require('./duel-games');
const {sessions}=require('./game-sessions');
const {validIds}=require('./game-input');
const matches=new Map(),invites=new Map();
const isDuel=type=>['reversi','gomoku'].includes(type);
function install(io,socket,db){
 const userId=socket.user.id;
 const error=message=>socket.emit('duel:error',{message});
 function publish(match){
  match.players.forEach((player,index)=>io.to(`user:${player.id}`).emit('duel:state',{
   conversationId:match.conversationId,players:match.players,playerNum:index+1,
   ...match.game,legalMoves:rules.legal(match.game,match.game.turn)
  }));
 }
 function finish(match){
  if(match.game.status!=='finished'||match.scored)return;
  match.scored=true;sessions.release(match.activity);
  db.updateGameScore(match.players[0].id,match.players[1].id,match.game.winner?match.players[match.game.winner-1].id:'draw');
  const timer=setTimeout(()=>{if(matches.get(match.conversationId)===match)matches.delete(match.conversationId);},30*60*1000);timer.unref();
 }
 socket.on('duel:move',(data={})=>{
  if(!validIds(data))return error('Invalid conversation.');
  const match=matches.get(data.conversationId);
  if(!match)return error('This match has ended. Send a new invitation.');
  const index=match.players.findIndex(player=>player.id===userId);
  if(index<0)return error('You are not a player in this match.');
  try{rules.move(match.game,index+1,data.cell);finish(match);publish(match);}catch(err){error(err.message);}
 });
 function forfeit(match,id){
  const index=match.players.findIndex(p=>p.id===id);if(index<0)return false;
  if(match.game.status==='playing'){match.game.status='finished';match.game.winner=2-index;match.game.notice='Opponent left the match.';finish(match);publish(match);}return true;
 }
 socket.on('duel:leave',(data={})=>{
  if(!validIds(data))return error('Invalid conversation.');const match=matches.get(data.conversationId);if(match&&!forfeit(match,userId))error('You are not a player in this match.');
 });
 for(const match of matches.values()){
  const index=match.players.findIndex(p=>p.id===userId);
  if(index>=0&&match.game.status==='playing')socket.emit('duel:state',{conversationId:match.conversationId,players:match.players,playerNum:index+1,...match.game,legalMoves:rules.legal(match.game,match.game.turn)});
 }
 return{
  invite(data){
   if(!validIds(data))return error('Invalid conversation or player.');
   const{conversationId,targetUserId,gameType}=data;
   if(!db.isUserInConversation(userId,conversationId))return error('Access denied');
   if(targetUserId&&(targetUserId===userId||!db.isUserInConversation(targetUserId,conversationId)))return error('Choose another member of this conversation.');
   try{sessions.assertFree([userId,...(targetUserId?[targetUserId]:[])],userId);}catch(e){return error(e.message);}
   if(matches.get(conversationId)?.game.status==='playing')return error('Finish the current two-player match first.');
   for(const[key,value]of invites)if(value.expires<Date.now())invites.delete(key);
   invites.set(`${conversationId}:${userId}`,{conversationId,hostId:userId,targetUserId,gameType,expires:Date.now()+90000});
   const invite={fromUserId:userId,fromUsername:socket.user.username,conversationId,gameType};
   if(targetUserId)io.to(`user:${targetUserId}`).emit('game:request',invite);
   else socket.to(`conv:${conversationId}`).emit('game:request',invite);
  },
  accept(data){
   if(!validIds(data,true))return error('Invalid conversation or player.');
   const{conversationId,targetUserId,gameType}=data;const key=`${conversationId}:${targetUserId}`,invite=invites.get(key);
   if(!invite||invite.expires<Date.now()||invite.gameType!==gameType)return error('Invitation expired. Ask your friend to send another.');
   if(userId===targetUserId||!db.isUserInConversation(userId,conversationId)||!db.isUserInConversation(targetUserId,conversationId)||(invite.targetUserId&&invite.targetUserId!==userId))return error('Access denied');
   if(matches.get(conversationId)?.game.status==='playing')return error('A match is already running.');
   const ids=[targetUserId,userId];
   const match={conversationId,players:ids.map(id=>{const u=db.getUserById(id);return{id,name:u.display_name||u.username};}),game:rules.create(gameType),scored:false};
   try{match.activity=sessions.claim({key:'duel:'+conversationId,type:gameType,conversationId,players:ids,actorId:userId,onAbandon:id=>forfeit(match,id),resume:(s,id)=>s.emit('duel:state',{conversationId,players:match.players,playerNum:ids.indexOf(id)+1,...match.game,legalMoves:rules.legal(match.game,match.game.turn)})});}catch(e){return error(e.message);}
   invites.delete(key);
   const expiry=setTimeout(()=>{if(matches.get(conversationId)===match&&match.game.status==='playing'){match.game.status='finished';match.game.winner=0;match.game.notice='Match expired.';finish(match);publish(match);}},14400000);expiry.unref();
   matches.set(conversationId,match);io.to(`conv:${conversationId}`).emit('game:invite_closed',{conversationId});publish(match);
  },
  decline(data){
   const key=`${data.conversationId}:${data.targetUserId}`,invite=invites.get(key);
   if(!invite)return false;
   if(userId===invite.hostId||!db.isUserInConversation(userId,data.conversationId)||(invite.targetUserId&&invite.targetUserId!==userId))return true;
   invites.delete(key);
   io.to(`user:${invite.hostId}`).emit('game:declined',{fromUserId:userId});
   return true;
  }
 };
}
module.exports={isDuel,install};
