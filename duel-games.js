'use strict';
const DIRECTIONS=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function create(type){
 if(!['reversi','gomoku'].includes(type))throw new Error('Unknown game');
 const size=type==='reversi'?8:15;
 const board=Array(size*size).fill(0);
 if(type==='reversi'){board[27]=2;board[28]=1;board[35]=1;board[36]=2;}
 return{type,size,board,turn:1,status:'playing',winner:null,lastMove:null,scores:[2,2],notice:''};
}
function flips(game,player,cell){
 if(!Number.isInteger(cell)||cell<0||cell>=game.board.length||game.board[cell])return[];
 const result=[],r=Math.floor(cell/game.size),c=cell%game.size;
 for(const[dy,dx]of DIRECTIONS){
  const line=[];let y=r+dy,x=c+dx;
  while(y>=0&&y<game.size&&x>=0&&x<game.size){
   const index=y*game.size+x,value=game.board[index];
   if(value===3-player)line.push(index);
   else{if(value===player&&line.length)result.push(...line);break;}
   y+=dy;x+=dx;
  }
 }
 return result;
}
function legal(game,player){
 if(game.status!=='playing')return[];
 return game.board.flatMap((value,cell)=>value===0&&(game.type==='gomoku'||flips(game,player,cell).length)?[cell]:[]);
}
function move(game,player,cell){
 if(game.status!=='playing')throw new Error('Game is finished');
 if(game.turn!==player)throw new Error('Not your turn');
 if(!Number.isInteger(cell)||!legal(game,player).includes(cell))throw new Error('Illegal move');
 const captured=game.type==='reversi'?flips(game,player,cell):[];
 game.board[cell]=player;captured.forEach(i=>game.board[i]=player);
 game.lastMove=cell;game.notice='';game.turn=3-player;
 game.scores=[game.board.filter(v=>v===1).length,game.board.filter(v=>v===2).length];
 if(game.type==='reversi'){
  if(!legal(game,game.turn).length){
   if(legal(game,player).length){game.turn=player;game.notice='Opponent has no legal move. Play again.';}
   else{game.status='finished';game.winner=game.scores[0]===game.scores[1]?0:game.scores[0]>game.scores[1]?1:2;}
  }
 }else{
  const row=Math.floor(cell/game.size),col=cell%game.size;
  for(const[dy,dx]of [[1,0],[0,1],[1,1],[1,-1]]){
   let length=1;
   for(const sign of [-1,1]){let y=row+dy*sign,x=col+dx*sign;while(y>=0&&y<game.size&&x>=0&&x<game.size&&game.board[y*game.size+x]===player){length++;y+=dy*sign;x+=dx*sign;}}
   if(length>=5){game.status='finished';game.winner=player;break;}
  }
  if(game.status==='playing'&&!game.board.includes(0)){game.status='finished';game.winner=0;}
 }
 return game;
}
module.exports={create,legal,move};
