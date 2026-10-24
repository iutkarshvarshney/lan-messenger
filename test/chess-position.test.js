const test=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../games-src/wizard-chess-3d/src/chessPosition.js');
test('the 3D board offers en passant and removes the captured pawn from its actual square',async()=>{
 const {ChessPosition}=await load(),p=new ChessPosition();
 const move=(fr,fc,tr,tc)=>p.apply(fr,fc,tr,tc);
 move(6,4,4,4);move(1,0,2,0);move(4,4,3,4);move(1,3,3,3);
 assert.ok(p.moves(3,4).some(m=>m.r===2&&m.c===3&&m.enPassant));
 const capture=move(3,4,2,3);assert.deepEqual(capture.captureAt,{r:3,c:3});assert.equal(p.piece(3,3),null);assert.equal(p.piece(2,3).type,'p');
});
test('3D promotion choices preserve knight, bishop and rook underpromotions',async()=>{
 const {ChessPosition}=await load();
 for(const [name,type]of [['knight','n'],['bishop','b'],['rook','r'],['queen','q']]){
  const p=new ChessPosition('7k/P7/8/8/8/8/8/4K3 w - - 0 1');
  const move=p.apply(1,0,0,0,name);assert.equal(move.promotion,name);assert.equal(p.piece(0,0).type,type);
 }
});
test('3D castling metadata moves the rook and undo restores castling rights',async()=>{
 const {ChessPosition}=await load(),p=new ChessPosition('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
 const snapshot=p.snapshot();assert.ok(p.moves(7,4).some(m=>m.castle==='k'&&m.rookFromC===7&&m.rookToC===5));
 p.apply(7,4,7,6);assert.equal(p.piece(7,5).type,'r');assert.equal(p.piece(7,7),null);p.restore(snapshot);assert.ok(p.moves(7,4).some(m=>m.castle==='k'));
});
