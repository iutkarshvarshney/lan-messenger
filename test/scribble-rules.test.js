const test=require('node:test'),assert=require('node:assert/strict');
const rules=require('../scribble-rules');
test('Scribble accepts only offered words while the drawer is choosing',()=>{
 const game={status:'choosing',wordChoices:['castle','rocket','garden']};
 assert.equal(rules.canSelect(game,'castle'),true);
 assert.equal(rules.canSelect(game,'injected word'),false);
 game.status='drawing';assert.equal(rules.canSelect(game,'castle'),false);
});
test('Scribble round end can be claimed only once',()=>{
 const game={status:'drawing'};assert.equal(rules.claimRoundEnd(game),true);assert.equal(rules.claimRoundEnd(game),false);assert.equal(game.status,'round_end');
});
test('Scribble drops invalid drawing data and bounds legal canvas input',()=>{
 assert.equal(rules.normalizeDraw({type:'line',from:{x:NaN,y:0},to:{x:1,y:2},color:'#ffffff',size:4}),null);
 assert.equal(rules.normalizeDraw({type:'line',from:{x:0,y:0},to:{x:1,y:2},color:'url(external)',size:4}),null);
 const line=rules.normalizeDraw({type:'line',from:{x:-5,y:1000},to:{x:950,y:25},color:'#123456',size:1000});
 assert.deepEqual(line,{type:'line',from:{x:0,y:540},to:{x:900,y:25},color:'#123456',size:30});
});
test('an old Scribble finish timer cannot finish a replacement match',()=>{
 const old={status:'round_end'},replacement={status:'drawing'},matches={room:replacement};let fired=false;
 assert.equal(rules.finishCurrent(matches,'room',old,()=>{fired=true;}),false);
 assert.equal(fired,false);assert.equal(matches.room,replacement);
 matches.room=old;assert.equal(rules.finishCurrent(matches,'room',old,()=>{fired=true;}),true);assert.equal(fired,true);assert.equal(matches.room,undefined);
});
