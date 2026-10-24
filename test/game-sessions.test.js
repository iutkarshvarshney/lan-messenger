const test=require('node:test'),assert=require('node:assert/strict');
const {GameSessions}=require('../game-sessions');
test('one player cannot enter different games or chats and claims are atomic',()=>{
 const s=new GameSessions();const a=s.claim({key:'ludo:a',type:'ludo',conversationId:'a',players:['p1','p2']});
 assert.throws(()=>s.claim({key:'memory:b',type:'memorymatch',conversationId:'b',players:['p3','p2']}),/already playing/i);
 assert.equal(s.forUser('p3'),null);assert.equal(s.forUser('p2'),a);s.release(a);
 assert.doesNotThrow(()=>s.claim({key:'memory:b',type:'memorymatch',conversationId:'b',players:['p3','p2']}));s.clear();
});
test('old cleanup cannot release a replacement match and a lobby can add free players',()=>{
 const s=new GameSessions(),a=s.claim({key:'scribble:a',type:'scribble',conversationId:'a',players:['p1']});
 s.add(a,['p2']);assert.equal(s.forUser('p2'),a);s.releasePlayer(a,'p2');assert.equal(s.forUser('p2'),null);
 s.release(a);const b=s.claim({key:'scribble:a',type:'scribble',conversationId:'a',players:['p1']});s.release(a);assert.equal(s.forUser('p1'),b);s.clear();
});
test('disconnect grace preserves refresh and only the last disconnected session abandons a game',async()=>{
 let left=0;const s=new GameSessions({graceMs:20});s.connect('p1','a');s.connect('p1','b');const m=s.claim({key:'ludo:a',type:'ludo',conversationId:'a',players:['p1'],onAbandon(){left++;s.release(m);}});
 s.disconnect('p1','a');await new Promise(r=>setTimeout(r,30));assert.equal(left,0);
 s.disconnect('p1','b');s.connect('p1','c');await new Promise(r=>setTimeout(r,30));assert.equal(left,0);
 s.disconnect('p1','c');await new Promise(r=>setTimeout(r,30));assert.equal(left,1);assert.equal(s.forUser('p1'),null);s.clear();
});
test('a player who never connected cannot leave an indefinitely busy match',async()=>{
 let abandoned=false;const s=new GameSessions({graceMs:15});s.claim({key:'ludo:offline',type:'ludo',players:['offline'],onAbandon(){abandoned=true;}});await new Promise(r=>setTimeout(r,25));assert.equal(abandoned,true);assert.equal(s.forUser('offline'),null);s.clear();
});
