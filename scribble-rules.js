'use strict';
const canSelect=(game,word)=>game?.status==='choosing'&&typeof word==='string'&&game.wordChoices?.includes(word.toLowerCase());
function claimRoundEnd(game){if(!game||game.status!=='drawing')return false;game.status='round_end';return true;}
function normalizeDraw(data){
 if(!data||typeof data!=='object')return null;
 if(data.type==='clear')return{type:'clear'};
 if(data.type!=='line'||!/^#[0-9a-f]{6}$/i.test(data.color)||!Number.isFinite(data.size))return null;
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?{x:Math.max(0,Math.min(900,p.x)),y:Math.max(0,Math.min(540,p.y))}:null;
 const from=point(data.from),to=point(data.to);return from&&to?{type:'line',from,to,color:data.color,size:Math.max(1,Math.min(30,data.size))}:null;
}
function finishCurrent(games,id,game,finish){if(games[id]!==game||game.status!=='round_end')return false;finish(game);delete games[id];return true;}
module.exports={canSelect,claimRoundEnd,normalizeDraw,finishCurrent};
