'use strict';
const {Chess}=require('chess.js');
const {randomBytes}=require('node:crypto');
function createRoom(conversationId,players){return{code:randomBytes(4).toString('hex').toUpperCase(),conversationId,players,board:new Chess(),moves:[],joined:new Set(),resetCount:0,status:'playing',winner:null,reason:''};}
function joinRoom(room,userId){const i=room.players.findIndex(p=>p.id===userId);if(i<0)throw new Error('Access denied');room.joined.add(userId);return{ok:true,code:room.code,color:i===0?'w':'b',playerToken:'messenger-session',room:roomView(room)};}
function roomView(room){return{code:room.code,whiteJoined:room.joined.has(room.players[0].id),blackJoined:room.joined.has(room.players[1].id),turn:room.board.turn(),moves:room.moves,resetCount:room.resetCount,status:room.status,winner:room.winner,reason:room.reason,fen:room.board.fen()};}
function square(pos){if(!pos||!Number.isInteger(pos.r)||!Number.isInteger(pos.c)||pos.r<0||pos.r>7||pos.c<0||pos.c>7)throw new Error('Illegal square');return'abcdefgh'[pos.c]+(8-pos.r);}
function moveRoom(room,userId,data={}){
 const i=room.players.findIndex(p=>p.id===userId);if(i<0)throw new Error('Access denied');
 if(room.status!=='playing')throw new Error('Match is finished');
 const color=i===0?'w':'b';if(room.board.turn()!==color)throw new Error('Not your turn');
 const from=square(data.from),to=square(data.to),promotion=({queen:'q',rook:'r',bishop:'b',knight:'n',q:'q',r:'r',b:'b',n:'n'})[data.promotion]||'q';
 let move;try{move=room.board.move({from,to,promotion});}catch{throw new Error('Illegal move');}
 if(!move)throw new Error('Illegal move');
 room.moves.push({seq:room.moves.length+1,color,from:data.from,to:data.to,promotion:move.promotion||'q',san:move.san});
 if(room.board.isGameOver()){
  room.status='finished';room.winner=room.board.isCheckmate()?color:null;room.reason=room.board.isCheckmate()?'Checkmate':room.board.isStalemate()?'Stalemate':room.board.isThreefoldRepetition()?'Threefold repetition':room.board.isInsufficientMaterial()?'Insufficient material':'Draw';
 }
 return roomView(room);
}
module.exports={createRoom,joinRoom,moveRoom,roomView};
