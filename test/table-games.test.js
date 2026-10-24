const test=require('node:test');
const assert=require('node:assert/strict');
const games=require('../table-games');

test('unopened Memory Match cards are absent from every client payload',()=>{
 const game=games.create('memorymatch');
 const view=games.view(game);
 assert.equal(view.cards.length,16);
 assert.ok(view.cards.every(x=>x===null));
 assert.equal(view.deck,undefined);assert.equal(view.seed,undefined);
 games.move(game,1,{index:0});
 assert.equal(games.view(game).cards[0],game.deck[0]);
 assert.ok(games.view(game).cards.slice(1).every(x=>x===null));
});
test('Memory Match rejects out-of-turn, duplicate, out-of-bounds and locked flips',()=>{
 const game=games.create('memorymatch');
 assert.throws(()=>games.move(game,2,{index:0}),/turn/);
 for(const index of [-1,16,1.5,NaN])assert.throws(()=>games.move(game,1,{index}),/card/);
 games.move(game,1,{index:0});assert.throws(()=>games.move(game,1,{index:0}),/card/);
 const different=game.deck.findIndex(x=>x!==game.deck[0]);
 games.move(game,1,{index:different});assert.throws(()=>games.move(game,1,{index:2}),/wait/i);
 games.advance(game);assert.equal(game.turn,2);assert.ok(games.view(game).cards.every(x=>x===null));
});
test('a complete Memory Match has a winner and eight awarded pairs',()=>{
 const game=games.create('memorymatch');
 for(const symbol of new Set(game.deck)){
  const indexes=game.deck.flatMap((x,i)=>x===symbol?[i]:[]);
  indexes.forEach(index=>games.move(game,1,{index}));games.advance(game);
 }
 assert.equal(game.status,'finished');assert.equal(game.winner,1);assert.deepEqual(game.scores,[8,0]);
 assert.throws(()=>games.move(game,1,{index:0}),/finished/);
});
test('Word Guess has three distinct answers, no answer leak, and scores only the first correct submission',()=>{
 const game=games.create('wordscramble');
 assert.equal(game.words.length,3);assert.equal(new Set(game.words).size,3);
 for(let round=1;round<=3;round++){
  const view=games.view(game);assert.equal(view.round,round);assert.equal(view.maxRounds,3);
  assert.equal(view.word,undefined);assert.equal(view.words,undefined);assert.equal(view.seed,undefined);
  assert.notEqual(view.scrambled,game.words[round-1]);
  assert.throws(()=>games.move(game,1,{round,answer:'wrong-answer'}),/again/);
  games.move(game,round===2?2:1,{round,answer:game.words[round-1]});
  assert.throws(()=>games.move(game,2,{round,answer:game.words[round-1]}),/wait/i);
  games.advance(game);
 }
 assert.equal(game.status,'finished');assert.equal(game.winner,1);assert.deepEqual(game.scores,[2,1]);
});
test('Word Guess rejects a stale round and non-player submissions',()=>{
 const game=games.create('wordscramble');
 assert.throws(()=>games.move(game,3,{round:1,answer:game.words[0]}),/player/);
 assert.throws(()=>games.move(game,1,{round:2,answer:game.words[0]}),/round/);
});
test('a Word Guess timeout reveals only the ended round and can advance to a draw',()=>{
 const game=games.create('wordscramble');
 for(let i=0;i<3;i++){games.expire(game);assert.equal(game.phase,'round_end');assert.equal(games.view(game).answer,game.words[i]);games.advance(game);}
 assert.equal(game.status,'finished');assert.equal(game.winner,0);assert.deepEqual(game.scores,[0,0]);
});
