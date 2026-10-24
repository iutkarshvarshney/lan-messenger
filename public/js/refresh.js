/* Consistent, local SVG controls and a self-contained solo arcade. */
(() => {
 'use strict';
 const paths={
 chat:'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z M7 9h9 M7 13h6',
 users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 search:'m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 phone:'M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.8L7.7 9.6a16 16 0 0 0 6.7 6.7l1.3-1.3a2 2 0 0 1 1.8-.6l2.8.5a2 2 0 0 1 1.7 2Z',
 game:'M6 8h12a3 3 0 0 1 3 3l1 7a2 2 0 0 1-3 2l-3-3H8l-3 3a2 2 0 0 1-3-2l1-7a3 3 0 0 1 3-3 M7 10v6 M4 13h6 M16 12h.01 M19 15h.01',
 more:'M12 5h.01 M12 12h.01 M12 19h.01',
 close:'m6 6 12 12 M6 18 18 6',
 attach:'m21 11-9 9a6 6 0 0 1-8.5-8.5L13 2a4 4 0 0 1 5.7 5.7l-9.5 9.5a2 2 0 0 1-2.8-2.8L15 6',
 send:'m22 2-7 20-4-9-9-4Z M22 2 11 13',
 mic:'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0Z M5 10v1a7 7 0 0 0 14 0v-1 M12 18v4 M8 22h8',
 back:'m12 19-7-7 7-7 M5 12h16',
 status:'M12 3a9 9 0 1 1-9 9 M3 7V3h4 M8 12l3 3 5-6',
 shield:'m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z M8 12l3 3 5-6',
 user:'M20 21v-2a7 7 0 0 0-14 0v2 M17 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
 logout:'M9 21H4V3h5 M14 8l5 4-5 4 M8 12h13',
 info:'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 check:'M9 11l3 3 8-8 M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
 trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
 lock:'M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v11H5Z M12 14v3',
 chevron:'m7 10 5 5 5-5'
 };
 function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width',name==='more'?'3':'1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.classList.add('ui-icon');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.game);svg.append(p);return svg;}
 const controls={'new-group-btn':'users','new-chat-btn':'chat','menu-btn':'more','game-btn':'game','voice-call-btn':'phone','chat-search-btn':'search','chat-search-close':'close','attach-btn':'attach','send-btn':'send','voice-rec-btn':'mic','back-btn':'back','call-mute-btn':'mic','call-end-btn':'close','incoming-accept-btn':'phone','incoming-reject-btn':'close'};
 function renderIcons(){
  document.querySelectorAll('[data-ui-icon]').forEach(el=>{if(!el.querySelector('svg'))el.replaceChildren(icon(el.dataset.uiIcon));});
  Object.entries(controls).forEach(([id,name])=>{const el=document.getElementById(id);if(el&&!el.querySelector('svg') && el.textContent.trim()!=='■'){el.replaceChildren(icon(name));el.setAttribute('aria-label',el.title||id.replaceAll('-',' '));}});
  document.querySelectorAll('.icon-btn,.game-close,.search-close,.status-close').forEach(el=>{if(el.children.length)return;const name=el.textContent.trim();if(name==='✕'||name==='×')el.replaceChildren(icon('close'));else if(name==='⋮')el.replaceChildren(icon('more'));if(el.title)el.setAttribute('aria-label',el.title);});
 }
 renderIcons();
 const logo=document.querySelector('.logo-icon');if(logo)logo.replaceChildren(icon('chat'));
 const welcome=document.querySelector('.welcome-icon');if(welcome){const mark=icon('chat');mark.classList.add('welcome-icon');welcome.replaceWith(mark);}
 document.querySelectorAll('.welcome-feature-icon').forEach((el,i)=>el.replaceChildren(icon(['shield','attach','users'][i]||'chat')));
 [['nav-chats','chat','Chats'],['nav-status','status','Updates']].forEach(([id,name,label])=>{const el=document.getElementById(id);if(el)el.replaceChildren(icon(name),document.createTextNode(label));});
 document.querySelectorAll('.search-icon').forEach(el=>el.replaceChildren(icon('search')));
 const actionObserver=new MutationObserver(renderIcons);
 [document.getElementById('send-btn'),document.getElementById('voice-rec-btn'),document.getElementById('call-mute-btn')].filter(Boolean).forEach(el=>actionObserver.observe(el,{childList:true}));
 const profileBody=document.getElementById('profile-panel-body');if(profileBody)actionObserver.observe(profileBody,{childList:true,subtree:true});

 const launch=document.createElement('button');launch.className='arcade-launch';launch.title='Solo arcade';launch.setAttribute('aria-label','Open solo arcade');launch.append(icon('game'));const label=document.createElement('span');label.textContent='Arcade';launch.append(label);document.querySelector('.sidebar-header .header-actions')?.prepend(launch);
 const dialog=document.createElement('dialog');dialog.className='arcade-dialog';dialog.setAttribute('aria-labelledby','arcade-title');
 dialog.innerHTML='<header class="arcade-header"><h2 id="arcade-title">Take a play break</h2><button type="button" class="icon-btn" aria-label="Close arcade">×</button></header><div class="arcade-body"></div>';
 document.body.append(dialog);const body=dialog.querySelector('.arcade-body');let cleanup=()=>{};
 function stop(){cleanup();cleanup=()=>{};}
 dialog.querySelector('header button').onclick=()=>dialog.close();dialog.addEventListener('close',stop);
 launch.onclick=()=>{home();dialog.showModal();};
 window.MessengerSoloLegacy=type=>{home();if(!dialog.open)dialog.showModal();body.querySelector(`[data-solo="${type}"]`)?.click();};
 function home(){stop();body.innerHTML='<p class="arcade-intro">Two quick solo games, available entirely on your LAN. For multiplayer games, open a chat and choose the game controller.</p><div class="arcade-grid"><button class="arcade-tile" data-solo="snake"><strong>Snake</strong><small>Find your rhythm. Collect food, grow longer, beat your score.</small></button><button class="arcade-tile" data-solo="mines"><strong>Minesweeper</strong><small>Clear the field. Read the numbers and mark the hidden mines.</small></button></div>';body.querySelectorAll('[data-solo]').forEach(el=>{el.prepend(icon('game'));el.onclick=()=>el.dataset.solo==='snake'?snake():mines();});}
 function frame(title,instructions,restart){stop();body.innerHTML='<div class="arcade-actions"><button type="button">← Arcade</button><strong></strong><button type="button">New game</button></div><p class="arcade-intro"></p><div class="arcade-status" role="status" aria-live="polite"></div><div class="arcade-play"></div>';body.querySelector('strong').textContent=title;body.querySelector('p').textContent=instructions;const buttons=body.querySelectorAll('button');buttons[0].onclick=home;buttons[1].onclick=restart;return [body.querySelector('.arcade-play'),body.querySelector('.arcade-status')];}
 function snake(){
  const [area,status]=frame('Snake','Use arrow keys, WASD or the buttons. Eat the glowing food. Avoid walls and your tail.',snake);
  area.innerHTML='<canvas class="arcade-snake" width="400" height="400" aria-label="Snake playing field"></canvas><div class="arcade-pad"><button data-dir="0,-1" aria-label="Up">↑</button><button data-dir="-1,0" aria-label="Left">←</button><button data-dir="0,1" aria-label="Down">↓</button><button data-dir="1,0" aria-label="Right">→</button></div>';
  const canvas=area.querySelector('canvas'),ctx=canvas.getContext('2d');let pieces=[[8,10],[7,10],[6,10]],dir=[1,0],next=[1,0],food,score=0,over=false;
  function place(){const free=[];for(let x=0;x<20;x++)for(let y=0;y<20;y++)if(!pieces.some(p=>p[0]===x&&p[1]===y))free.push([x,y]);food=free[Math.floor(Math.random()*free.length)];if(!food){over=true;status.textContent='You filled the board. You win!';window.MessengerArcade?.result({winnerName:'You',won:true,reason:'Snake · The whole board is yours'});}}
  function draw(){ctx.fillStyle='#0b1420';ctx.fillRect(0,0,400,400);if(food){ctx.fillStyle='#f8bb64';ctx.beginPath();ctx.arc(food[0]*20+10,food[1]*20+10,7,0,Math.PI*2);ctx.fill();}pieces.forEach((p,i)=>{ctx.fillStyle=i?'#259e89':'#74f2ce';ctx.fillRect(p[0]*20+2,p[1]*20+2,16,16);});}
  function change(d){if(d[0]!==-dir[0]||d[1]!==-dir[1])next=d;}
  const key=e=>{const d={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]}[e.key];if(d){e.preventDefault();change(d);}};
  window.addEventListener('keydown',key);area.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>change(b.dataset.dir.split(',').map(Number)));
  place();draw();status.textContent='Score: 0';const timer=setInterval(()=>{if(over||document.hidden)return;dir=next;const head=[pieces[0][0]+dir[0],pieces[0][1]+dir[1]];const eat=food&&head[0]===food[0]&&head[1]===food[1];const bodyToCheck=eat?pieces:pieces.slice(0,-1);if(head.some(n=>n<0||n>19)||bodyToCheck.some(p=>p[0]===head[0]&&p[1]===head[1])){over=true;status.textContent=`Game over · Score: ${score}. Choose New game to retry.`;window.MessengerArcade?.result({solo:true,reason:'Snake · '+score+' points'});return;}pieces.unshift(head);if(eat){score++;place();}else pieces.pop();if(!over)status.textContent=`Score: ${score}`;draw();},140);
  cleanup=()=>{clearInterval(timer);window.removeEventListener('keydown',key);};
 }
 function mines(){
  const [area,status]=frame('Minesweeper','9 × 9 field · 10 mines. Click to reveal. Right-click or use Flag mode to mark a mine. Your first reveal is safe.',mines);
  area.innerHTML='<div class="arcade-actions"><button type="button" aria-pressed="false">Flag mode: off</button></div><div class="arcade-board" aria-label="Minesweeper grid"></div>';
  const board=area.querySelector('.arcade-board'),mode=area.querySelector('button');let flagMode=false,started=false,ended=false;const bombs=new Set(),flags=new Set(),open=new Set();
  mode.onclick=()=>{flagMode=!flagMode;mode.textContent=`Flag mode: ${flagMode?'on':'off'}`;mode.setAttribute('aria-pressed',String(flagMode));};
  function neighbours(i){const a=[];for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const r=Math.floor(i/9)+y,c=i%9+x;if((x||y)&&r>=0&&r<9&&c>=0&&c<9)a.push(r*9+c);}return a;}
  const count=i=>neighbours(i).filter(n=>bombs.has(n)).length;
  function render(){board.querySelectorAll('button').forEach((b,i)=>{const shown=open.has(i)||(ended&&bombs.has(i));b.classList.toggle('revealed',shown);b.textContent=flags.has(i)?'⚑':shown?(bombs.has(i)?'●':count(i)||''):'';b.setAttribute('aria-label',`Row ${Math.floor(i/9)+1}, column ${i%9+1}: ${flags.has(i)?'flagged':shown?(bombs.has(i)?'mine':count(i)+' adjacent mines'):'hidden'}`);});if(!ended)status.textContent=`${10-flags.size} mines unmarked · ${open.size}/71 cleared`;}
  function flag(i){if(ended||open.has(i))return;if(flags.has(i))flags.delete(i);else if(flags.size<10)flags.add(i);render();}
  function reveal(i){if(ended||flags.has(i)||open.has(i))return;if(!started){started=true;const excluded=new Set([i,...neighbours(i)]);while(bombs.size<10){const n=Math.floor(Math.random()*81);if(!excluded.has(n))bombs.add(n);}}if(bombs.has(i)){ended=true;status.textContent='Mine found. Choose New game to try again.';window.MessengerArcade?.result({solo:true,reason:'Minesweeper · '+open.size+'/71 squares cleared'});render();return;}const queue=[i];while(queue.length){const n=queue.pop();if(open.has(n)||flags.has(n))continue;open.add(n);if(count(n)===0)neighbours(n).forEach(k=>{if(!open.has(k)&&!bombs.has(k))queue.push(k);});}if(open.size===71){ended=true;status.textContent='Field cleared. You win!';window.MessengerArcade?.result({winnerName:'You',won:true,reason:'Minesweeper · Field cleared'});}render();}
  for(let i=0;i<81;i++){const b=document.createElement('button');b.type='button';b.onclick=()=>flagMode?flag(i):reveal(i);b.oncontextmenu=e=>{e.preventDefault();flag(i);};board.append(b);}render();
 }
})();
