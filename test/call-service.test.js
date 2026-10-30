const test=require('node:test'),assert=require('node:assert/strict');
const {CallRelay}=require('../call-service');
const CALL='call-1234567890123456';
function setup(options={}){
 const sent=[],messages=[];
 const io={sockets:{adapter:{rooms:new Map([['user:a',new Set(['a1','a2'])],['user:b',new Set(['b1','b2'])]])}},to(target){return {except(excluded){this.excluded=excluded;return this;},emit(event,data){sent.push({target,event,data,excluded:this.excluded});}};}};
 const db={isUserInConversation:(id,conv)=>conv==='chat'&&['a','b'].includes(id),getConversationById:()=>({type:'private'}),addMessage(...args){messages.push(args);return {id:'msg'};}};
 const relay=new CallRelay({io,db,...options});
 function socket(id,user){const handlers={};const socket={id,user:{id:user,username:user},on:(event,handler)=>{handlers[event]=handler;}};relay.attach(socket);return {socket,send(event,data){let reply;handlers[event](data,r=>{reply=r;});return reply;},disconnect(){handlers.disconnect();}};}
 const a=socket('a1','a'),a2=socket('a2','a'),b=socket('b1','b'),b2=socket('b2','b'),c=socket('c1','c');
 const offer={callId:CALL,conversationId:'chat',targetUserId:'b',offer:{type:'offer',sdp:'v=0\r\n'}};
 const answer={callId:CALL,conversationId:'chat',targetUserId:'a',answer:{type:'answer',sdp:'v=0\r\n'}};
 return {relay,sent,messages,a,a2,b,b2,c,offer,answer};
}
test('call offers require private membership, distinct users, and a bounded valid description',()=>{
 const f=setup();assert.ok(f.c.send('call:offer',f.offer).error);
 assert.ok(f.a.send('call:offer',{...f.offer,targetUserId:'a'}).error);
 assert.ok(f.a.send('call:offer',{...f.offer,offer:{type:'answer',sdp:'v=0'}}).error);
 assert.ok(f.a.send('call:offer',{...f.offer,offer:{type:'offer',sdp:'x'.repeat(140000)}}).error);
 assert.equal(f.sent.length,0);assert.equal(f.a.send('call:offer',f.offer).success,true);
 assert.equal(f.sent[0].target,'user:b');assert.equal(f.sent[0].data.fromUserId,'a');f.a.disconnect();
});
test('one active call per user and stale or foreign call ids cannot control a call',()=>{
 const f=setup();f.a.send('call:offer',f.offer);
 assert.ok(f.a2.send('call:offer',{...f.offer,callId:'different-1234567890'}).error);
 assert.ok(f.c.send('call:end',{...f.offer,targetUserId:'a'}).error);
 assert.ok(f.b.send('call:answer',{...f.answer,callId:'stale-1234567890123'}).error);
 assert.equal(f.b.send('call:answer',f.answer).success,true);f.a.disconnect();
});
test('answers bind the receiver socket and other tabs cannot inject screen or ICE signals',()=>{
 const f=setup();f.a.send('call:offer',f.offer);f.b.send('call:answer',f.answer);
 const share={...f.answer,sharing:true};
 assert.ok(f.b2.send('call:screen-state',share).error);
 assert.ok(f.a2.send('call:screen-state',{...f.offer,sharing:true}).error);
 assert.ok(f.b.send('call:screen-state',{...share,sharing:'true'}).error);
 assert.equal(f.b.send('call:screen-state',share).success,true);
 const shared=f.sent.find(m=>m.event==='call:screen-state');assert.equal(shared.target,'a1');assert.equal(shared.data.sharing,true);
 assert.ok(f.b2.send('call:ice-candidate',{...f.answer,candidate:{candidate:'candidate:test',sdpMid:'0',sdpMLineIndex:0}}).error);
 assert.equal(f.sent.filter(m=>m.event==='call:handled').length,1);f.a.disconnect();
});
test('ending a call cleans ownership and replayed events cannot end the replacement call',()=>{
 const f=setup();f.a.send('call:offer',f.offer);f.b.send('call:answer',f.answer);
 assert.equal(f.a.send('call:end',f.offer).success,true);
 assert.equal(f.a.send('call:offer',{...f.offer,callId:'replacement-12345678'}).success,true);
 assert.ok(f.a.send('call:end',f.offer).error);
 assert.equal(f.relay.calls.size,1);f.a.disconnect();assert.equal(f.relay.calls.size,0);
});
test('only the participating socket disconnect ends a call',()=>{
 const f=setup();f.a.send('call:offer',f.offer);f.b.send('call:answer',f.answer);
 f.a2.disconnect();assert.equal(f.relay.calls.size,1);
 f.b.disconnect();assert.equal(f.relay.calls.size,0);
 assert.equal(f.sent.at(-1).event,'call:end');assert.equal(f.sent.at(-1).target,'a1');
});
test('unanswered calls time out once and release both participants',async()=>{
 const f=setup({timeoutMs:10});f.a.send('call:offer',f.offer);
 await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(f.relay.calls.size,0);assert.equal(f.messages.length,1);
 assert.equal(f.messages[0][2],'Missed call');assert.ok(f.sent.some(m=>m.event==='call:end'&&m.data.reason==='timeout'));
});
