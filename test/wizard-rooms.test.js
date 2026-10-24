const test=require('node:test'),assert=require('node:assert/strict');
const {createRoom,joinRoom,moveRoom,roomView}=require('../wizard-rooms');
test('Wizard rooms authorize assigned players and enforce legal turns',()=>{
 const room=createRoom('conversation',[{id:'a',name:'A'},{id:'b',name:'B'}]);
 assert.throws(()=>joinRoom(room,'outsider'),/denied/);
 assert.equal(joinRoom(room,'a').color,'w');assert.equal(joinRoom(room,'b').color,'b');
 assert.throws(()=>moveRoom(room,'b',{from:{r:1,c:4},to:{r:3,c:4}}),/turn/);
 assert.throws(()=>moveRoom(room,'a',{from:{r:6,c:4},to:{r:3,c:4}}),/legal/i);
 moveRoom(room,'a',{from:{r:6,c:4},to:{r:4,c:4}});
 assert.equal(roomView(room).moves.length,1);assert.equal(roomView(room).turn,'b');
 assert.equal(roomView(room).players,undefined);
});
test('Wizard Chess reports checkmate and rejects moves after completion',()=>{
 const room=createRoom('conversation',[{id:'a',name:'A'},{id:'b',name:'B'}]);
 const m=(id,fr,fc,tr,tc)=>moveRoom(room,id,{from:{r:fr,c:fc},to:{r:tr,c:tc}});
 m('a',6,5,5,5);m('b',1,4,3,4);m('a',6,6,4,6);m('b',0,3,4,7);
 const view=roomView(room);assert.equal(view.status,'finished');assert.equal(view.winner,'b');assert.equal(view.reason,'Checkmate');
 assert.throws(()=>m('a',6,0,5,0),/finished/);
});
