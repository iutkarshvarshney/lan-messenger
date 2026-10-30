'use strict';
const {validIds}=require('./game-input');
const validCallId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{16,80}$/.test(value);
function description(value,type){return value&&value.type===type&&typeof value.sdp==='string'&&value.sdp.startsWith('v=0')&&value.sdp.length<=131072?{type,sdp:value.sdp}:null;}
function candidate(value){
 if(!value||typeof value.candidate!=='string'||value.candidate.length>4096)return null;
 if(value.sdpMid!=null&&(typeof value.sdpMid!=='string'||value.sdpMid.length>64))return null;
 if(value.sdpMLineIndex!=null&&(!Number.isInteger(value.sdpMLineIndex)||value.sdpMLineIndex<0||value.sdpMLineIndex>64))return null;
 if(value.usernameFragment!=null&&(typeof value.usernameFragment!=='string'||value.usernameFragment.length>256))return null;
 return {candidate:value.candidate,sdpMid:value.sdpMid??null,sdpMLineIndex:value.sdpMLineIndex??null,...(value.usernameFragment!=null?{usernameFragment:value.usernameFragment}:{})};
}
class CallRelay {
 constructor({io,db,timeoutMs=45000}){this.io=io;this.db=db;this.timeoutMs=timeoutMs;this.calls=new Map();this.users=new Map();}
 attach(socket){
  for(const event of ['call:offer','call:answer','call:ice-candidate','call:screen-state','call:reject','call:end'])socket.on(event,(data,callback)=>{
   try{this.dispatch(socket,event,data);if(typeof callback==='function')callback({success:true});}
   catch(error){if(typeof callback==='function')callback({error:error.message});}
  });
  socket.on('disconnect',()=>this.disconnect(socket));
 }
 dispatch(socket,event,data){
  if(!validIds(data,true)||!validCallId(data.callId)||data.targetUserId===socket.user.id)throw Error('Invalid call request. Refresh Messenger and try again.');
  const {callId,conversationId,targetUserId}=data,id=socket.user.id;
  if(event==='call:offer'){
   const offer=description(data.offer,'offer');if(!offer)throw Error('Invalid call description.');
   if(!this.db.isUserInConversation(id,conversationId)||!this.db.isUserInConversation(targetUserId,conversationId)||this.db.getConversationById(conversationId)?.type!=='private')throw Error('Calls are available to participants in a private chat only.');
   if(this.calls.has(callId)||this.users.has(id)||this.users.has(targetUserId))throw Error('A participant is already in another call.');
   if(!this.io.sockets.adapter.rooms.get(`user:${targetUserId}`)?.size)throw Error('This user is not connected to Messenger.');
   const call={id:callId,conversationId,caller:id,callee:targetUserId,callerSocket:socket.id,calleeSocket:null,accepted:false};
   call.timer=setTimeout(()=>{if(this.calls.get(callId)!==call)return;this.finish(call);this.log(call,call.caller,'Missed call');this.send(call,call.caller,'call:end',{reason:'timeout'});this.send(call,call.callee,'call:end',{reason:'timeout'});},this.timeoutMs);call.timer.unref?.();
   this.calls.set(callId,call);this.users.set(id,callId);this.users.set(targetUserId,callId);
   this.send(call,targetUserId,event,{offer},socket.user);return;
  }
  const call=this.calls.get(callId);
  if(!call||call.conversationId!==conversationId||!([call.caller,call.callee].includes(id))||targetUserId!==(id===call.caller?call.callee:call.caller))throw Error('This call is no longer active.');
  if(id===call.caller&&socket.id!==call.callerSocket)throw Error('This call belongs to another device.');
  if(id===call.callee&&call.calleeSocket&&socket.id!==call.calleeSocket)throw Error('This call was answered on another device.');
  if(event==='call:answer'){
   if(id!==call.callee||call.accepted)throw Error('This call cannot be answered again.');
   const answer=description(data.answer,'answer');if(!answer)throw Error('Invalid call answer.');
   call.calleeSocket=socket.id;call.accepted=true;clearTimeout(call.timer);
   this.send(call,call.caller,event,{answer},socket.user);
   this.io.to(`user:${id}`).except(socket.id).emit('call:handled',{callId,conversationId});return;
  }
  if(event==='call:ice-candidate'){
   if(id===call.callee&&!call.accepted)throw Error('Answer this call before sending media signals.');
   const ice=candidate(data.candidate);if(!ice)throw Error('Invalid media candidate.');
   this.send(call,targetUserId,event,{candidate:ice},socket.user);return;
  }
  if(event==='call:screen-state'){
   if(!call.accepted||typeof data.sharing!=='boolean')throw Error('Screen sharing requires an accepted call.');
   this.send(call,targetUserId,event,{sharing:data.sharing},socket.user);return;
  }
  if(event==='call:reject'&&call.accepted)throw Error('This call has already been answered.');
  this.finish(call);
  if(event==='call:reject')this.log(call,id,'Call declined');
  else if(!call.accepted)this.log(call,call.caller,'Missed call');
  this.send(call,targetUserId,event,event==='call:reject'?{reason:data.reason==='busy'?'busy':'declined'}:{},socket.user);
  if(!call.accepted)this.io.to(`user:${call.callee}`).emit('call:handled',{callId,conversationId});
 }
 send(call,target,event,extra={},from){
  const socketId=target===call.caller?call.callerSocket:call.calleeSocket;
  this.io.to(socketId||`user:${target}`).emit(event,{callId:call.id,conversationId:call.conversationId,...extra,...(from?{fromUserId:from.id,fromUsername:from.username}:{})});
 }
 finish(call){
  if(this.calls.get(call.id)!==call)return;
  clearTimeout(call.timer);this.calls.delete(call.id);
  for(const id of [call.caller,call.callee])if(this.users.get(id)===call.id)this.users.delete(id);
 }
 log(call,user,text){const message=this.db.addMessage(call.conversationId,user,text,'system');this.io.to(`conv:${call.conversationId}`).emit('message:new',message);}
 disconnect(socket){
  const call=this.calls.get(this.users.get(socket.user.id));
  if(!call||![call.callerSocket,call.calleeSocket].includes(socket.id))return;
  this.finish(call);this.send(call,socket.user.id===call.caller?call.callee:call.caller,'call:end',{reason:'disconnected'});
 }
}
module.exports={CallRelay};
