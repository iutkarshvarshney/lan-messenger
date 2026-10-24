import {Chess} from 'chess.js';
const names={q:'queen',r:'rook',b:'bishop',n:'knight'};
const letters={queen:'q',rook:'r',bishop:'b',knight:'n',q:'q',r:'r',b:'b',n:'n'};
const square=(r,c)=>{if(!Number.isInteger(r)||!Number.isInteger(c)||r<0||r>7||c<0||c>7)throw new Error('Illegal square');return'abcdefgh'[c]+(8-r);};
const coords=s=>({r:8-Number(s[1]),c:'abcdefgh'.indexOf(s[0])});
export class ChessPosition{
 constructor(fen){this.startFen=fen||new Chess().fen();this.chess=new Chess(this.startFen);}
 reset(){this.startFen=new Chess().fen();this.chess.reset();}
 moves(r,c){return this.chess.moves({square:square(r,c),verbose:true}).map(m=>{
  const to=coords(m.to),castle=m.flags.includes('k')?'k':m.flags.includes('q')?'q':null;
  return{...to,capture:Boolean(m.captured),enPassant:m.flags.includes('e'),promotion:m.promotion?names[m.promotion]:undefined,...(castle?{castle,rookFromC:castle==='k'?7:0,rookToC:castle==='k'?5:3}:{})};
 });}
 apply(fr,fc,tr,tc,promotion='queen'){
  const move=this.chess.move({from:square(fr,fc),to:square(tr,tc),promotion:letters[promotion]||'q'});
  return{promotion:move.promotion?names[move.promotion]:null,captureAt:move.captured?move.flags.includes('e')?{r:fr,c:tc}:{r:tr,c:tc}:null,flags:move.flags};
 }
 piece(r,c){return this.chess.get(square(r,c))||null;}
 snapshot(){return{startFen:this.startFen,moves:this.chess.history({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion}))};}
 restore(snapshot){this.startFen=snapshot.startFen;this.chess=new Chess(this.startFen);for(const move of snapshot.moves)this.chess.move(move);}
 fen(){return this.chess.fen();}
 result(){const ended=this.chess.isGameOver();return{ended,winner:ended&&this.chess.isCheckmate()?this.chess.turn()==='w'?'b':'w':null,reason:this.chess.isCheckmate()?'Checkmate':this.chess.isStalemate()?'Stalemate':this.chess.isThreefoldRepetition()?'Threefold repetition':this.chess.isInsufficientMaterial()?'Insufficient material':'Draw'};}
}
