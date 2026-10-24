/* Original offline games. No network, telemetry, or external assets. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LanSolo=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 'use strict';
 function slide2048(board,direction){
  const next=[...board];let score=0;
  for(let line=0;line<4;line++){
   const positions=Array.from({length:4},(_,i)=>direction==='left'?line*4+i:direction==='right'?line*4+3-i:direction==='up'?i*4+line:(3-i)*4+line);
   const values=positions.map(i=>board[i]).filter(Boolean),merged=[];
   for(let i=0;i<values.length;i++){if(values[i]===values[i+1]){const value=values[i]*2;merged.push(value);score+=value;i++;}else merged.push(values[i]);}
   positions.forEach((pos,i)=>next[pos]=merged[i]||0);
  }
  return{board:next,score,changed:next.some((x,i)=>x!==board[i])};
 }
 function best(key,value){try{const previous=Number(localStorage.getItem(key)||0);if(value>previous)localStorage.setItem(key,String(value));return Math.max(previous,value);}catch{return value;}}
 function mount(type,element,result){return type==='2048'?tiles(element,result):breakout(element,result);}
 function tiles(element,result){
  element.innerHTML='<div class="solo-stats"><span>Score <strong id="solo-score">0</strong></span><span>Best <strong id="solo-best">0</strong></span><button>New game</button></div><div class="solo-2048" role="grid" aria-label="2048 board, use arrow keys or swipe"></div><div class="solo-pad"><button data-dir="left" aria-label="Slide left">←</button><button data-dir="up" aria-label="Slide up">↑</button><button data-dir="down" aria-label="Slide down">↓</button><button data-dir="right" aria-label="Slide right">→</button></div><p class="connect-play-help" role="status">Arrow keys, WASD or swipe. Match tiles to reach 2048.</p>';
  const grid=element.querySelector('.solo-2048'),status=element.querySelector('[role=status]');let board,score,won=false,over=false,start=null;
  function spawn(){const empty=board.flatMap((x,i)=>x===0?[i]:[]);if(empty.length)board[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4;}
  function render(){grid.innerHTML=board.map(value=>`<span role="gridcell" data-value="${value}" aria-label="${value||'Empty'}">${value||''}</span>`).join('');element.querySelector('#solo-score').textContent=score;element.querySelector('#solo-best').textContent=best('lan-2048-best',score);}
  function reset(){board=Array(16).fill(0);score=0;won=false;over=false;spawn();spawn();render();status.textContent='Arrow keys, WASD or swipe. Match tiles to reach 2048.';}
  function move(direction){if(over)return;const next=slide2048(board,direction);if(!next.changed)return;board=next.board;score+=next.score;spawn();render();if(!won&&board.some(x=>x>=2048)){won=true;status.textContent='2048 reached! Keep playing to beat your score.';result({winnerName:'You',won:true,reason:'2048 reached · '+score+' points'});}if(!['up','down','left','right'].some(d=>slide2048(board,d).changed)){over=true;status.textContent='No more moves. Final score: '+score;result({winnerName:'',reason:'2048 · Final score '+score,solo:true});}}
  const key=e=>{if(e.target.matches('input,textarea'))return;const direction={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'}[e.key];if(direction){e.preventDefault();move(direction);}};
  window.addEventListener('keydown',key);element.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>move(b.dataset.dir));element.querySelector('.solo-stats button').onclick=reset;
  grid.onpointerdown=e=>{start={x:e.clientX,y:e.clientY};grid.setPointerCapture(e.pointerId);};grid.onpointerup=e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;move(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');};
  reset();return()=>window.removeEventListener('keydown',key);
 }
 function breakout(element,result){
  element.innerHTML='<div class="solo-stats"><span>Score <strong id="solo-score">0</strong></span><span id="solo-lives">3 lives</span><button>New game</button></div><canvas class="solo-breakout" width="620" height="420" aria-label="Breakout field. Move with arrow keys, mouse or touch."></canvas><div class="solo-pad"><button data-key="left" aria-label="Move left">←</button><button data-key="pause" aria-label="Start or pause">▶ / Ⅱ</button><button data-key="right" aria-label="Move right">→</button></div><p class="connect-play-help" role="status">Move with ← →, mouse or touch. Click the court or press Space to start.</p>';
  const canvas=element.querySelector('canvas'),ctx=canvas.getContext('2d'),status=element.querySelector('[role=status]');let x,y,vx,vy,paddle,score,lives,bricks,playing=false,over=false,raf=0,last=0,keys={},disposed=false;
  function reset(){x=310;y=340;vx=170;vy=-235;paddle=260;score=0;lives=3;bricks=Array.from({length:48},(_,i)=>({x:29+(i%8)*71,y:45+Math.floor(i/8)*25,alive:true,row:Math.floor(i/8)}));playing=false;over=false;status.textContent='Move with ← →, mouse or touch. Click the court or press Space to start.';update();draw();}
  function update(){element.querySelector('#solo-score').textContent=score;element.querySelector('#solo-lives').textContent=lives+' '+(lives===1?'life':'lives');}
  function toggle(){if(over)return;playing=!playing;status.textContent=playing?'Clear all the bricks. You’ve got this.':'Paused. Click the court or press Space to resume.';}
  function draw(){ctx.fillStyle='#081b28';ctx.fillRect(0,0,620,420);ctx.strokeStyle='#203c4833';for(let i=20;i<620;i+=25){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,420);ctx.stroke();}bricks.forEach(b=>{if(!b.alive)return;ctx.fillStyle=['#cc9ccc','#a8a5da','#8bb9d2','#77c6c1','#8aceb4','#bdd6a6'][b.row];ctx.beginPath();ctx.roundRect(b.x,b.y,64,17,5);ctx.fill();});ctx.shadowColor='#65ddbd';ctx.shadowBlur=14;ctx.fillStyle='#73e8c6';ctx.beginPath();ctx.roundRect(paddle,386,100,10,5);ctx.fill();ctx.shadowBlur=12;ctx.fillStyle='#f3e4bd';ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(!playing&&!over){ctx.fillStyle='#06151caa';ctx.fillRect(0,175,620,65);ctx.fillStyle='#bce4da';ctx.font='15px system-ui';ctx.textAlign='center';ctx.fillText('Click or press Space to play',310,212);}}
  function step(now){if(disposed)return;const dt=Math.min((now-last)/1000||0,.024);last=now;
   if(playing&&!document.hidden){
    paddle=Math.max(0,Math.min(520,paddle+(keys.right?390*dt:0)-(keys.left?390*dt:0)));x+=vx*dt;y+=vy*dt;
    if(x<7){x=7;vx=Math.abs(vx);}if(x>613){x=613;vx=-Math.abs(vx);}if(y<7){y=7;vy=Math.abs(vy);}
    if(vy>0&&y>=379&&y<=404&&x>=paddle-5&&x<=paddle+105){y=378;vy=-Math.abs(vy);vx=((x-(paddle+50))/50)*230;}
    const hit=bricks.find(b=>b.alive&&x+7>b.x&&x-7<b.x+64&&y+7>b.y&&y-7<b.y+17);if(hit){hit.alive=false;vy=-vy;score+=10;update();}
    if(y>430){lives--;update();x=paddle+50;y=350;vy=-235;playing=false;if(!lives){over=true;status.textContent='Game over · '+score+' points. Try for a new best.';best('lan-breakout-best',score);result({solo:true,reason:'Breakout · '+score+' points'});}else status.textContent='One more ball. Click or press Space when ready.';}
    if(bricks.every(b=>!b.alive)){over=true;playing=false;status.textContent='Every brick cleared. You win!';best('lan-breakout-best',score);result({winnerName:'You',won:true,reason:'Breakout · Every brick cleared · '+score+' points'});}
   }
   if(!document.hidden)draw();raf=requestAnimationFrame(step);
  }
  const key=e=>{if(e.target.matches('input,textarea'))return;if(['ArrowLeft','a','ArrowRight','d',' '].includes(e.key)){e.preventDefault();if(e.key===' '&&e.type==='keydown'&&!e.repeat)toggle();else if(e.key!==' ')keys[e.key==='a'||e.key==='ArrowLeft'?'left':'right']=e.type==='keydown';}};
  window.addEventListener('keydown',key);window.addEventListener('keyup',key);const blur=()=>{keys={};if(playing)toggle();};window.addEventListener('blur',blur);
  const point=e=>{const r=canvas.getBoundingClientRect();paddle=Math.max(0,Math.min(520,(e.clientX-r.left)*620/r.width-50));};canvas.onpointermove=point;canvas.onpointerdown=e=>{point(e);canvas.setPointerCapture(e.pointerId);if(!playing)toggle();};element.querySelector('.solo-stats button').onclick=reset;
  element.querySelectorAll('[data-key]').forEach(button=>{const d=button.dataset.key;if(d==='pause')button.onclick=toggle;else{button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys[d]=true;};button.onpointerup=button.onpointercancel=()=>keys[d]=false;}});
  reset();raf=requestAnimationFrame(step);return()=>{disposed=true;cancelAnimationFrame(raf);window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur);};
 }
 return{slide2048,mount};
});
