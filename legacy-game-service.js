'use strict';
const crypto=require('node:crypto');
const {sessions}=require('./game-sessions');
const {validIds}=require('./game-input');
const matches=new Map(),invites=new Map();
const types=['tictactoe','dotsandboxes','connectfour','rockpaperscissors','retropong','stickfight'];
function install(io,socket,db){
 const id=socket.user.id,error=message=>socket.emit('arcade:error',{message});
 function finish(match,winnerId,reason=''){
  if(match.finished)return;match.finished=true;clearTimeout(match.expiry);sessions.release(match.activity);matches.delete(match.activity.key);
  const score=db.updateGameScore(match.players[0],match.players[1],winnerId);
  for(const player of match.players)io.to(`user:${player}`).emit('game:ended',{winnerId,score,conversationId:match.conversationId,gameType:match.type,reason});
 }
 function current(data){const activity=sessions.forUser(id);if(!activity||activity.id!==data.sessionId&&data.sessionId)return null;const match=matches.get(activity.key);return match&&!match.finished&&match.conversationId===data.conversationId&&match.players.includes(id)?match:null;}
 socket.on('game:move',(data={})=>{
  if(!validIds(data))return;const match=current(data);if(!match||!match.players.includes(data.targetUserId))return;
  if(data.moveData&&data.moveData.gameType!==match.type)return;
  if(match.type==='tictactoe'&&(!Number.isInteger(data.index)||data.index<0||data.index>8))return;
  io.to(`user:${data.targetUserId}`).emit('game:move',{index:data.index,symbol:data.symbol,moveData:data.moveData,conversationId:data.conversationId});
 });
 socket.on('game:end',(data={})=>{if(!validIds(data))return;const match=current(data);if(match&&[...match.players,'draw'].includes(data.winnerId))finish(match,data.winnerId);});
 socket.on('game:leave',(data={})=>{if(!validIds(data))return;const match=current(data);if(match&&(!data.gameType||data.gameType===match.type))finish(match,match.players.find(player=>player!==id),'Opponent left the match.');});
 return{
  invite(data){
   if(!validIds(data)||!types.includes(data.gameType||'tictactoe'))return error('Choose an available game.');
   const{conversationId,targetUserId}=data;
   if(!db.isUserInConversation(id,conversationId)||targetUserId&&(targetUserId===id||!db.isUserInConversation(targetUserId,conversationId)))return error('Access denied');
   try{sessions.assertFree([id,...(targetUserId?[targetUserId]:[])],id);}catch(e){return error(e.message);}
   for(const[k,v]of invites)if(v.expires<Date.now())invites.delete(k);
   const type=data.gameType||'tictactoe';invites.set(`${conversationId}:${id}`,{hostId:id,conversationId,targetUserId,type,size:[4,8,16].includes(data.boardSize)?data.boardSize:8,expires:Date.now()+90000});
   const payload={fromUserId:id,fromUsername:socket.user.username,conversationId,gameType:type,boardSize:data.boardSize||8,isGroup:!targetUserId};
   if(targetUserId)io.to(`user:${targetUserId}`).emit('game:request',payload);
   else for(const member of db.getConversationMembers(conversationId))if(member.id!==id&&!sessions.forUser(member.id))io.to(`user:${member.id}`).emit('game:request',payload);
  },
  accept(data){
   if(!validIds(data,true))return error('Invalid invitation.');const key=`${data.conversationId}:${data.targetUserId}`,invite=invites.get(key);
   if(!invite||invite.expires<Date.now()||invite.type!==(data.gameType||'tictactoe'))return error('Invitation expired.');
   if(id===invite.hostId||!db.isUserInConversation(id,invite.conversationId)||(invite.targetUserId&&invite.targetUserId!==id))return error('Access denied');
   const match={players:[invite.hostId,id],conversationId:invite.conversationId,type:invite.type};
   try{match.activity=sessions.claim({key:'legacy:'+match.conversationId,type:match.type,conversationId:match.conversationId,players:match.players,actorId:id,onAbandon:user=>finish(match,match.players.find(p=>p!==user),'Opponent left the match.')});}catch(e){return error(e.message);}
   invites.delete(key);matches.set(match.activity.key,match);match.expiry=setTimeout(()=>finish(match,'draw','Match expired.'),14400000);match.expiry.unref();
   const hostIsFirst=crypto.randomInt(2)===0,hostStarts=crypto.randomInt(2)===0,seed=crypto.randomBytes(8).toString('hex');
   match.players.forEach((player,i)=>{
    const other=db.getUserById(match.players[1-i]);
    io.to(`user:${player}`).emit('game:started',{sessionId:match.activity.id,opponentId:match.players[1-i],opponentName:other?.display_name||other?.username||'Opponent',conversationId:match.conversationId,gameType:match.type,boardSize:invite.size,playerNum:(i===0)===hostIsFirst?1:2,symbol:(i===0)===hostIsFirst?'X':'O',starts:i===0?hostStarts:!hostStarts,gameSeed:seed});
   });io.to(`conv:${match.conversationId}`).emit('game:invite_closed',{conversationId:match.conversationId});
  },
  decline(data){const key=`${data.conversationId}:${data.targetUserId}`,invite=invites.get(key);if(!invite)return false;if(id!==invite.hostId&&db.isUserInConversation(id,invite.conversationId)&&(!invite.targetUserId||invite.targetUserId===id)){invites.delete(key);io.to(`user:${invite.hostId}`).emit('game:declined',{fromUserId:id});}return true;}
 };
}
module.exports={install};
