const test=require('node:test'),assert=require('node:assert/strict');
const {slide2048}=require('../public/js/solo-games');
test('2048 merges each tile once, preserves the total, and returns earned points',()=>{
 const board=[2,2,2,2,4,4,0,0,0,0,0,0,0,0,0,0];const next=slide2048(board,'left');
 assert.deepEqual(next.board.slice(0,8),[4,4,0,0,8,0,0,0]);assert.equal(next.score,16);
 assert.equal(next.board.reduce((a,b)=>a+b),board.reduce((a,b)=>a+b));assert.equal(next.changed,true);
 assert.deepEqual(board.slice(0,4),[2,2,2,2]);
});
test('2048 supports all directions and identifies a move that cannot change the board',()=>{
 const board=[2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0];
 assert.equal(slide2048(board,'up').board[0],4);assert.equal(slide2048(board,'down').board[12],4);
 assert.equal(slide2048(board,'right').board[3],2);
 assert.equal(slide2048([4,...Array(15).fill(0)],'left').changed,false);
});
