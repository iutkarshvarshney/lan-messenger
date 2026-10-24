const test=require('node:test');const assert=require('node:assert/strict');
const rules=require('../duel-games');
test('Reversi allows only bracketing moves and flips captured discs',()=>{
 const g=rules.create('reversi');
 assert.deepEqual(rules.legal(g,1),[19,26,37,44]);
 assert.throws(()=>rules.move(g,1,0),/Illegal/);
 rules.move(g,1,19);assert.equal(g.board[27],1);assert.equal(g.turn,2);
 assert.throws(()=>rules.move(g,1,18),/turn/);
});
test('Reversi counts final discs and ends when neither player can move',()=>{
 const g=rules.create('reversi');g.board.fill(1);g.board[0]=0;g.board[1]=2;
 rules.move(g,1,0);assert.equal(g.status,'finished');assert.equal(g.winner,1);assert.deepEqual(g.scores,[64,0]);
});
test('Reversi automatically passes the turn if the opponent has no legal move',()=>{
 const g=rules.create('reversi');g.board.fill(1);g.board[0]=0;g.board[1]=2;g.board[63]=0;g.board[62]=2;
 rules.move(g,1,0);assert.equal(g.status,'playing');assert.equal(g.turn,1);
});
test('Gomoku detects five stones and rejects occupied cells and extra turns',()=>{
 const g=rules.create('gomoku');
 for(let x=0;x<4;x++){rules.move(g,1,x);rules.move(g,2,30+x);}
 assert.throws(()=>rules.move(g,1,0),/Illegal/);
 rules.move(g,1,4);assert.equal(g.status,'finished');assert.equal(g.winner,1);
 assert.throws(()=>rules.move(g,2,50),/finished/);
});
test('Gomoku detects diagonal wins without wrapping rows',()=>{
 const g=rules.create('gomoku');[0,16,32,48].forEach(i=>g.board[i]=1);rules.move(g,1,64);assert.equal(g.winner,1);
 const h=rules.create('gomoku');[13,14,15,16].forEach(i=>h.board[i]=1);rules.move(h,1,17);assert.equal(h.status,'playing');
});
