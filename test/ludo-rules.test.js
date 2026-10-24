const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../public/js/ludo-rules');
function game() { return { players: [{slot:0},{slot:1}], positions:[[5,-1,-1,-1],[45,-1,-1,-1]] }; }
test('star and start squares protect tokens from capture', () => {
 const g=game(); g.positions[1][0]=47; // absolute square 8
 const result=rules.move(g,0,0,3);
 assert.equal(result.captured,0); assert.equal(g.positions[1][0],47);
});
test('capture on an unprotected square awards a bonus', () => {
 const g=game(); const result=rules.move(g,0,0,1);
 assert.equal(g.positions[1][0],-1); assert.equal(result.extraTurn,true);
});
test('home lane tokens can pass each other, but finishing requires exact roll', () => {
 const g=game(); g.positions[0]=[51,53,56,-1];
 assert.deepEqual(rules.movable(g,0,3),[0,1]);
 assert.deepEqual(rules.movable(g,0,6),[3]);
});
test('a six enters on a shared safe start and a home finish awards another roll', () => {
 const g=game(); g.positions[0]=[-1,55,56,56];
 assert.equal(rules.move(g,0,0,6).extraTurn,true);
 assert.equal(rules.move(g,0,1,1).extraTurn,true);
});
test('the home lane begins after the entrance square and finishes at progress 56', () => {
 const g=game();g.positions[0][0]=50;
 rules.move(g,0,0,1);
 assert.equal(rules.square(g,0,g.positions[0][0]),null);
 assert.equal(rules.move(g,0,0,5).finished,true);
 assert.equal(g.positions[0][0],56);
 assert.deepEqual(rules.movable(g,0,1),[]);
});
test('invalid rolls and finished pieces cannot move', () => {
 const g=game(); assert.deepEqual(rules.movable(g,0,0),[]);
 assert.deepEqual(rules.movable(g,0,7),[]);
 assert.throws(()=>rules.move(g,0,1,2));
});
