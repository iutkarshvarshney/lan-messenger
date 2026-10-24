'use strict';
const {randomInt}=require('node:crypto');
const WORDS=['network','message','keyboard','monitor','browser','socket','avatar','private','secure','laptop','router','server','upload','status','friend','planet','garden','forest','puzzle','castle','rocket','silver','coffee','bridge','window','crystal','sunshine','journey','penguin','orchard'];
function shuffle(items){const out=[...items];for(let i=out.length-1;i>0;i--){const j=randomInt(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;}
function scramble(word){let value=shuffle([...word]).join('');return value===word?word.slice(1)+word[0]:value;}
function create(type){
 const game={type,turn:1,status:'playing',phase:'pick',winner:null,scores:[0,0],notice:'',version:0};
 if(type==='memorymatch')return Object.assign(game,{deck:shuffle(['⚡','🎯','💎','🚀','🎲','🔥','⭐','🎵'].flatMap(x=>[x,x])),matched:Array(16).fill(false),revealed:[]});
 if(type==='wordscramble'){const words=shuffle(WORDS).slice(0,3);return Object.assign(game,{words,round:1,maxRounds:3,scrambled:scramble(words[0])});}
 throw new Error('Unknown table game');
}
function view(g){
 const result={type:g.type,turn:g.turn,status:g.status,phase:g.phase,winner:g.winner,scores:[...g.scores],notice:g.notice,version:g.version,deadline:g.deadline||null,serverNow:Date.now()};
 if(g.type==='memorymatch')Object.assign(result,{cards:g.deck.map((symbol,i)=>g.matched[i]||g.revealed.includes(i)?symbol:null),matched:[...g.matched],revealed:[...g.revealed]});
 else Object.assign(result,{round:g.round,maxRounds:3,scrambled:g.scrambled,...(g.phase==='round_end'?{answer:g.words[g.round-1]}:{})});
 return result;
}
function move(g,player,data={}){
 if(![1,2].includes(player))throw new Error('Not a player');
 if(g.status!=='playing')throw new Error('Game is finished');
 if(g.phase!=='pick')throw new Error('Please wait for the next turn');
 if(g.type==='memorymatch'){
  if(g.turn!==player)throw new Error('Not your turn');
  const i=data.index;
  if(!Number.isInteger(i)||i<0||i>=16||g.matched[i]||g.revealed.includes(i))throw new Error('Choose an unopened card');
  g.revealed.push(i);if(g.revealed.length===2)g.phase='reveal';
 }else{
  if(data.round!==g.round)throw new Error('This round has ended');
  if(typeof data.answer!=='string'||data.answer.trim().toLowerCase()!==g.words[g.round-1])throw new Error('Try again');
  g.scores[player-1]++;g.phase='round_end';g.notice=`Player ${player} solved the word`;
 }
 g.version++;
 return g;
}
function advance(g){
 if(g.status!=='playing'||g.phase==='pick')return g;
 if(g.type==='memorymatch'){
  const[a,b]=g.revealed;
  if(g.deck[a]===g.deck[b]){g.matched[a]=g.matched[b]=true;g.scores[g.turn-1]++;g.notice='A match! Play again.';}
  else{g.turn=3-g.turn;g.notice='No match. Next player’s turn.';}
  g.revealed=[];
  if(g.matched.every(Boolean))g.status='finished';
 }else if(g.round===3)g.status='finished';
 else{g.round++;g.scrambled=scramble(g.words[g.round-1]);g.notice='';}
 g.phase='pick';g.version++;
 if(g.status==='finished')g.winner=g.scores[0]===g.scores[1]?0:g.scores[0]>g.scores[1]?1:2;
 return g;
}
function expire(game){if(game.type!=='wordscramble'||game.status!=='playing'||game.phase!=='pick')return;game.phase='round_end';game.notice='Time’s up. A fresh word is coming.';game.version++;}
module.exports={create,view,move,advance,expire};
