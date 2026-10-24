/* LAN arcade. Scenes are mounted on demand and destroyed on close. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const paths={game:'M6 8h12a3 3 0 0 1 3 3l1 7a2 2 0 0 1-3 2l-3-3H8l-3 3a2 2 0 0 1-3-2l1-7a3 3 0 0 1 3-3 M7 10v6 M4 13h6 M16 12h.01 M19 15h.01',close:'m6 6 12 12 M6 18 18 6',arrow:'m14 6-6 6 6 6',search:'m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',chat:'M21 11a9 9 0 0 1-9 9H4l-2 2V11a9.5 9.5 0 0 1 19 0 M7 9h9 M7 13h5',trophy:'M8 3h8v7a4 4 0 0 1-8 0Z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 14v6 M8 21h8',bolt:'m13 2-9 12h7l-1 8 10-12h-7Z',play:'m8 4 13 8-13 8Z',check:'m5 12 4 4L19 6',lock:'M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v11H5Z',dice:'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3 M8 8h.01 M16 8h.01 M8 16h.01 M16 16h.01 M12 12h.01',cards:'M3 5h8v15H3Z M14 3h7v15h-7Z M6 9h2 M17 7h1',brush:'m14 3 7 7-9 9-7-7Z M5 12c-5 1-1 6-4 9 5 0 10-2 8-6',racket:'M17 15a7 8 40 1 0-9-10 7 8 40 0 0 9 10 M9 15l-6 7 M7 17l2 2 M10 5l8 7 M8 8l6 6 M12 3l7 6',car:'M3 17v-6l3-6h12l3 6v6 M3 11h18 M5 17v3 M19 17v3 M6 14h2 M16 14h2',grid:'M3 3h18v18H3Z M9 3v18 M15 3v18 M3 9h18 M3 15h18',word:'M3 17 8 4l5 13 M5 12h6 M15 8h6l-6 9h6'};
 const icon=(name,cls='')=>`<svg class="arc-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.game}"/></svg>`;
 const games=[
  ['wizardchess','Wizard Chess','A little strategy. A lot of magic.','chess','violet','1–2 players','scene'],
  ['ludo','Ludo','Roll, race, and make your way home.','dice','amber','2–4 players','multi'],
  ['scribble','Scribble','Draw something. Guess anything.','brush','pink','Group game','multi'],
  ['memorymatch','Memory Match','Trust your memory. Find your match.','cards','mint','2 players','multi'],
  ['rallyclub','Rally Club','Find your rhythm on the court.','racket','green','1–2 players','scene'],
  ['deskracer','Desk Racer','Small kart. Big desk. One more lap.','car','orange','Solo · 3D','solo'],
  ['wordscramble','Word Guess','Three fresh words. One winner.','word','blue','2 players','multi'],
  ['reversi','Reversi','Turn the board in your favour.','grid','mint','2 players','multi'],
  ['gomoku','Gomoku','Five in a row. Think a step ahead.','grid','amber','2 players','multi'],
  ['tictactoe','Tic Tac Toe','A classic, one square at a time.','grid','blue','2 players','multi'],
  ['dotsandboxes','Dots & Boxes','Make your move. Close the box.','grid','violet','2 players','multi'],
  ['connectfour','Connect Four','Four together, for the win.','grid','pink','2 players','multi'],
  ['rockpaperscissors','RPS Lizard Spock','A familiar duel with a twist.','bolt','orange','2 players','multi'],
  ['retropong','Retro Pong 77','Keep the rally alive.','racket','green','2 players','multi'],
  ['stickfight','Street Arena 3D','Pick a fighter. Enter the arena.','bolt','pink','2 players','multi'],
  ['snake','Snake','A quick bite. A new high score.','bolt','mint','Solo','solo'],
  ['mines','Minesweeper','Read the field. Clear the board.','grid','amber','Solo','solo'],
  ['2048','2048','Slide. Merge. Make your number.','grid','orange','Solo','solo'],
  ['breakout','Breakout','Bounce back. Break every brick.','bolt','blue','Solo','solo']
 ].map(([id,name,description,mark,color,players,mode])=>({id,name,description,mark,color,players,mode}));
 let table=null,tableBusy=false,scene=null,hubFilter='all',search='',soloCleanup=()=>{},attachedSocket=null,lastResult='',dismissedTable='',wordClock=null,currentActivity=null,soloActivityId=null;
 const root=document.createElement('div');root.id='connect-arcade-root';document.body.append(root);
 const hub=document.createElement('section');hub.id='connect-hub';hub.hidden=true;hub.className='connect-hub';$('chat-area').append(hub);
 const tablePanel=document.createElement('section');tablePanel.className='connect-game-panel';tablePanel.hidden=true;tablePanel.setAttribute('role','dialog');tablePanel.setAttribute('aria-label','Multiplayer game');root.append(tablePanel);
 const scenePanel=document.createElement('section');scenePanel.className='connect-scene';scenePanel.hidden=true;scenePanel.setAttribute('role','dialog');scenePanel.setAttribute('aria-label','Game window');root.append(scenePanel);
 const soloPanel=document.createElement('section');soloPanel.className='connect-game-panel';soloPanel.hidden=true;soloPanel.setAttribute('role','dialog');soloPanel.setAttribute('aria-label','Solo game');root.append(soloPanel);
 const resultPanel=document.createElement('dialog');resultPanel.className='connect-result';root.append(resultPanel);
 document.querySelectorAll('.game-select-option').forEach(button=>{const game=games.find(g=>g.id===button.dataset.game);if(!game)return;button.classList.add(game.color);button.setAttribute('aria-pressed',String(button.classList.contains('active')));button.innerHTML=`<span class="game-picker-icon ${game.color}">${window.MessengerGameIcons.svg(game.id)}</span><span class="game-picker-copy"><strong>${esc(game.name)}</strong><small>${esc(game.players)}</small></span>`;});
 const scribbleButton=$('scribble-btn');if(scribbleButton)scribbleButton.innerHTML=icon('brush');
 const brand=document.createElement('div');brand.className='connect-brand';brand.innerHTML=`<span class="connect-logo">${icon('chat')}</span><span><strong>LAN Messenger</strong><small>Your local workspace</small></span><span class="connect-online" title="Local network">LAN</span>`;document.querySelector('.sidebar').prepend(brand);
 const footer=document.createElement('div');footer.className='connect-sidebar-footer';footer.innerHTML=`<button id="connect-hub-btn">${icon('game')}<span>Games & play<small>A little break, together</small></span>${icon('arrow')}</button><span class="connect-network-status">Local network</span>`;document.querySelector('.sidebar').append(footer);
 $('connect-hub-btn').onclick=()=>showHub();
 const activityBar=document.createElement('div');activityBar.className='current-game-bar';activityBar.hidden=true;footer.append(activityBar);
 function paintActivity(){
  activityBar.hidden=!currentActivity;if(!currentActivity){activityBar.replaceChildren();return;}
  activityBar.innerHTML=`<strong>Playing ${esc(currentActivity.title)}</strong><div class="current-game-actions">${currentActivity.resumable?'<button data-resume>Resume game</button>':''}<button data-leave>Leave game</button></div>`;
  activityBar.querySelector('[data-resume]')?.addEventListener('click',()=>state.socket.emit('game:resume'));
  activityBar.querySelector('[data-leave]').onclick=()=>{
   const leave=()=>{state.socket?.emit('game:leave-current',{activityId:currentActivity?.id});soloCleanup();soloPanel.hidden=true;tablePanel.hidden=true;table=null;scenePanel.replaceChildren();scenePanel.hidden=true;scene=null;closeLegacy();if(state.scribble){$('scribble-overlay').style.display='none';state.scribble=null;}resultPanel.close();};
   if(soloActivityId)leave();else askLeave(document.body,leave);
  };
 }
 async function beginSolo(type){
  if(!state.socket?.connected){showToast('Reconnect to Messenger before opening a game.',true);return false;}
  return new Promise(resolve=>state.socket.timeout(5000).emit('game:solo:start',{type},(error,reply)=>{
   if(error||reply?.error){showToast(reply?.error||'Could not connect. Please try again.',true);resolve(false);return;}
   soloActivityId=reply.activityId;resolve(true);
  }));
 }
 function stopSolo(){if(soloActivityId){state.socket?.emit('game:solo:leave',{activityId:soloActivityId});soloActivityId=null;}}
 document.querySelector('.arcade-dialog')?.addEventListener('close',stopSolo);

 document.querySelector('.arcade-launch')?.addEventListener('click',event=>{event.stopImmediatePropagation();document.querySelector('.arcade-dialog')?.close();showHub();},true);
 const welcome=$('welcome-screen');welcome.querySelector('h2').textContent='Your people. Your workspace.';welcome.querySelector('p').textContent='Start a conversation, share a file, or take a play break. All here on your local network.';
 const welcomeButton=document.createElement('button');welcomeButton.className='connect-primary welcome-play';welcomeButton.innerHTML=icon('game')+'Explore games';welcomeButton.onclick=()=>showHub();welcome.append(welcomeButton);
 function context(){return state.conversations.find(c=>c.id===($('hub-conversation')?.value||state.activeConversation));}
 function closeHub(){hub.hidden=true;document.querySelector('.app-wrapper').classList.remove('show-games');$('connect-hub-btn').classList.remove('active');}
 function mark(game){return window.MessengerGameIcons.svg(game.id);}
 function showHub(filter='all'){
  hubFilter=filter;hub.hidden=false;document.querySelector('.app-wrapper').classList.add('show-games');$('connect-hub-btn').classList.add('active');renderHub();
 }
 function renderHub(){
  const selected=$('hub-conversation')?.value||state.activeConversation||'';
  const list=games.filter(g=>(hubFilter==='all'||hubFilter==='solo'&&(g.mode==='solo'||g.mode==='scene')||hubFilter==='multi'&&g.mode!=='solo')&&g.name.toLowerCase().includes(search.toLowerCase()));
  hub.innerHTML=`<header class="hub-header"><div><span class="eyebrow">A LITTLE BREAK GOES A LONG WAY</span><h1>Good company. Great games<span>.</span></h1><p>Challenge a friend or find your next solo favourite.</p></div><button class="connect-icon" data-action="close-hub" aria-label="Back to chats">${icon('close')}</button></header><div class="hub-feature"><div class="hub-feature-copy"><span class="connect-pill">${icon('bolt')}THE FEATURED PLAY</span><h2>A move worth<br>making.</h2><p>Meet Wizard Chess. A 3D board, animated pieces,<br class="desktop-only"> and your next friendly rivalry.</p><div class="hub-feature-actions"><button class="connect-primary" data-launch="wizardchess" data-solo="true">${icon('play')}Play solo</button><button class="connect-secondary" data-launch="wizardchess">Invite a friend ${icon('arrow')}</button></div></div><div class="hub-chess-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-board"></div><span class="art-piece piece-back">♜</span><span class="art-piece piece-front">♞</span><span class="art-piece piece-small">♟</span><span class="art-spark spark-one">✦</span><span class="art-spark spark-two">✦</span><span class="art-caption">WIZARD CHESS / 3D</span></div></div><div class="hub-library-bar"><div class="hub-tabs" role="group" aria-label="Filter games">${[['all','All games'],['multi','With friends'],['solo','Solo time']].map(([key,label])=>`<button class="${hubFilter===key?'selected':''}" data-filter="${key}" aria-pressed="${hubFilter===key}">${label}</button>`).join('')}</div><label class="hub-search">${icon('search')}<input id="hub-search" placeholder="Find a game" aria-label="Find a game" value="${esc(search)}"></label></div><label class="hub-context">${icon('users')}Play with <select id="hub-conversation" aria-label="Choose chat for multiplayer"><option value="">Choose a conversation</option>${state.conversations.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.type==='group'?c.name:c.other_user?.display_name||c.other_user?.username||'Conversation')}${c.type==='group'?' · Group':''}</option>`).join('')}</select></label><div class="hub-grid">${list.map(g=>`<article class="hub-game ${g.color}"><button class="hub-game-cover" data-launch="${g.id}" ${g.mode==='solo'?'data-solo="true"':''} aria-label="Open ${g.name}"><span class="game-cover-grid"></span>${mark(g)}<span class="game-cover-badge">${g.players}</span><span class="cover-play">${icon('play')}</span></button><div class="hub-game-copy"><h3>${g.name}</h3><p>${g.description}</p><div class="hub-card-actions"><button data-launch="${g.id}" ${g.mode==='solo'?'data-solo="true"':''}>${g.mode==='solo'?'Play now':'Play with friends'} ${icon('arrow')}</button>${g.mode==='scene'?`<button data-launch="${g.id}" data-solo="true" aria-label="Play ${g.name} solo">Solo</button>`:''}</div></div></article>`).join('')||'<p class="hub-empty">No games found. Try another name.</p>'}</div><p class="hub-footer">A whole arcade, right here on your LAN. Pick up where your next break begins.</p>`;
  hub.querySelector('[data-action="close-hub"]').onclick=closeHub;
  hub.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{hubFilter=b.dataset.filter;renderHub();});
  hub.querySelectorAll('[data-launch]').forEach(b=>b.onclick=()=>launch(b.dataset.launch,b.dataset.solo==='true'));
  $('hub-search').oninput=e=>{const pos=e.target.selectionStart;search=e.target.value;renderHub();$('hub-search').focus();$('hub-search').setSelectionRange(pos,pos);};
 }
 async function launch(type,solo=false){
  if(!state.user)return;
  const isSolo=['deskracer','2048','breakout','snake','mines'].includes(type)||solo;
  if(isSolo&&!await beginSolo(type))return;
  if(type==='deskracer')return openScene({type,url:'/games/desk-racer/'});
  if(solo&&['wizardchess','rallyclub'].includes(type))return openScene({type,url:type==='wizardchess'?'/games/wizard-chess/':'/games/rally-club/'});
  if(['2048','breakout'].includes(type))return openSolo(type);
  if(['snake','mines'].includes(type)){
   window.MessengerSoloLegacy?.(type);return;
  }
  const conv=context();if(!conv)return showToast('Choose a conversation above to invite your friends.',true);
  if(type==='scribble'){
   if(conv.type!=='group')return showToast('Choose a group conversation for Scribble.',true);
   closeHub();state.socket.emit('scribble:create',{conversationId:conv.id});return;
  }
  if(type==='ludo'){
   closeHub();state.socket.emit('ludo:start',{conversationId:conv.id,playerCount:conv.type==='private'?2:Math.min(4,conv.members?.length||4)});return;
  }
  if(!state.socket?.connected)return showToast('Reconnect to Messenger before sending an invitation.',true);
  state.socket.emit('game:request',{conversationId:conv.id,targetUserId:conv.type==='private'?conv.other_user.id:null,gameType:type,boardSize:8});showToast(`${games.find(g=>g.id===type)?.name||'Game'} invitation sent`);
 }
 function closeLegacy(){
  [closeGame,closeDotsGame,closeConnectFour,closeRpsGame,closeMemoryGame,closeWordGame,closeRetroPong,closeStickFight].forEach(fn=>fn());closeLudoGame(false);window.MessengerNative?.closeDuel();
 }
 function result({winnerName='Draw',draw=false,reason='',won=false,solo=false}){
  resultPanel.innerHTML=`<button class="connect-icon result-close" aria-label="Close result">${icon('close')}</button><div class="result-trophy">${icon(draw?'users':'trophy')}</div><span class="eyebrow">${draw?'WELL MATCHED':'A MATCH TO REMEMBER'}</span><h2>${draw?'Honours shared.':won?'That’s your win.':'Well played.'}</h2><p class="result-winner">${draw?'It’s a draw.':`${esc(winnerName)} wins!`}</p><p class="result-reason">${esc(reason)}</p><button class="connect-primary" data-result-close>Back to the game</button><small>Another round is always a good idea.</small>`;
  if(solo){resultPanel.querySelector('h2').textContent='Good game.';resultPanel.querySelector('.result-winner').textContent='One more try?';}
  else if(winnerName==='You')resultPanel.querySelector('.result-winner').textContent='You win!';
  resultPanel.querySelectorAll('[data-result-close],.result-close').forEach(b=>b.onclick=()=>resultPanel.close());if(!resultPanel.open){if(document.querySelector('#native-duel-dialog[open],.arcade-dialog[open]'))resultPanel.showModal();else resultPanel.show();}
 }
 function legacyResult(winnerId){
  const active=[state.game,state.dotsGame,state.connectFour,state.rpsGame,state.retroPong,state.stickFight].find(g=>g.active);if(!active)return;
  const won=winnerId===state.user.id;result({winnerName:won?state.user.display_name||state.user.username:active.opponentName||state.conversations.find(c=>c.id===active.conversationId)?.other_user?.display_name||'Opponent',draw:winnerId==='draw',won,reason:'Match complete'});
 }
 function askLeave(panel,onLeave){
  if(panel.querySelector('.connect-leave'))return;
  const notice=document.createElement('div');notice.className='connect-leave';notice.innerHTML='<div><strong>Leave this match?</strong><p>Your opponent wins if you leave before the match ends.</p><button class="connect-secondary">Keep playing</button><button class="connect-danger">Leave match</button></div>';panel.append(notice);notice.querySelector('.connect-secondary').onclick=()=>notice.remove();notice.querySelector('.connect-danger').onclick=()=>{notice.remove();onLeave();};
 }
 function renderTable(game){
  clearInterval(wordClock);
  if(dismissedTable===game.conversationId+':'+game.type&&game.status==='finished')return;
  if(game.status==='playing')dismissedTable='';
  const first=!table||table.conversationId!==game.conversationId||table.type!==game.type||game.version<table.version;
  if(first){closeLegacy();closeHub();lastResult='';}table=game;tableBusy=false;
  const yours=game.turn===game.playerNum,done=game.status==='finished',title=game.type==='memorymatch'?'Memory Match':'Word Guess';
  const answer=tablePanel.querySelector('input')?.value||'';
  tablePanel.hidden=false;
  tablePanel.innerHTML=`<div class="connect-table-inner"><header class="connect-play-header"><div><span class="eyebrow">${game.type==='memorymatch'?'FIND YOUR FOCUS':'THREE WORDS. ONE WINNER.'}</span><h2>${title}<span>.</span></h2></div><button class="connect-icon" aria-label="Close game">${icon('close')}</button></header><div class="connect-players">${game.players.map((p,i)=>`<div class="${(game.type==='wordscramble'||game.turn===i+1)&&!done?'player-active':''}"><span class="player-letter">${esc(p.name.slice(0,2).toUpperCase())}</span><span>${esc(p.name)}${i+1===game.playerNum?'<small>You</small>':'<small>Opponent</small>'}</span><strong>${game.scores[i]}</strong></div>`).join('')}</div><div class="connect-turn" role="status" aria-live="polite">${done?'Match complete':game.phase!=='pick'?game.type==='memorymatch'?'Remember these cards…':`The word was ${esc(game.answer)}`:game.type==='wordscramble'?`Round ${game.round} of 3 · Unscramble the word <span id="word-time-left"></span>`:yours?'Your turn. Make it a match.':`${esc(game.players[game.turn-1].name)}’s turn`}</div>${game.type==='memorymatch'?`<div class="connect-memory" aria-label="Memory Match cards">${game.cards.map((value,i)=>`<button class="${value?'card-open':''} ${game.matched[i]?'card-matched':''}" data-card="${i}" aria-label="${value?`Card ${i+1}: ${value}`:`Unopened card ${i+1}`}" ${done||!yours||game.phase!=='pick'||value?'disabled':''}>${value?esc(value):icon('cards')}</button>`).join('')}</div><p class="connect-play-help">Find a pair to keep your turn. The most pairs wins.</p>`:`<div class="connect-rounds" aria-label="Round ${game.round} of 3">${[1,2,3].map(n=>`<span class="${n===game.round?'current':n<game.round?'complete':''}">${n<game.round?icon('check'):n}</span>`).join('')}</div><div class="connect-word" aria-label="Scrambled letters">${[...game.scrambled].map(c=>`<span>${c.toUpperCase()}</span>`).join('')}</div><form class="connect-word-form"><input aria-label="Your answer" placeholder="Found the word?" autocomplete="off" maxlength="32" ${done||game.phase!=='pick'?'disabled':''} value="${game.phase==='pick'?esc(answer):''}"><button class="connect-primary" ${done||game.phase!=='pick'?'disabled':''}>Check answer ${icon('arrow')}</button></form><p class="connect-play-help">Three different words. First correct answer gets the point.</p>`}<div class="connect-table-notice" aria-live="polite">${esc(game.notice)}</div></div>`;
  tablePanel.querySelector('.connect-play-header button').onclick=()=>{if(done){tablePanel.hidden=true;table=null;clearInterval(wordClock);}else askLeave(tablePanel,()=>{dismissedTable=game.conversationId+':'+game.type;state.socket.emit('table:leave',{conversationId:game.conversationId});tablePanel.hidden=true;table=null;clearInterval(wordClock);});};
  tablePanel.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{if(tableBusy)return;tableBusy=true;tablePanel.querySelectorAll('[data-card]').forEach(x=>x.disabled=true);state.socket.emit('table:move',{conversationId:game.conversationId,index:Number(b.dataset.card)});});
  if(game.type==='wordscramble'&&game.phase==='pick'&&!done&&game.deadline){
   const received=performance.now(),duration=Math.max(0,game.deadline-(game.serverNow||Date.now()));
   const tick=()=>{const node=$('word-time-left');if(node)node.textContent=' · '+Math.max(0,Math.ceil((duration-performance.now()+received)/1000))+'s';};tick();wordClock=setInterval(tick,1000);
  }
  const form=tablePanel.querySelector('form');if(form)form.onsubmit=e=>{e.preventDefault();if(tableBusy)return;tableBusy=true;form.querySelector('button').disabled=true;state.socket.emit('table:move',{conversationId:game.conversationId,round:game.round,answer:form.querySelector('input').value});};
  if(done){const key=game.conversationId+':'+game.type+':'+game.version;if(lastResult!==key){lastResult=key;const winner=game.players[game.winner-1];result({winnerName:winner?.name,draw:!game.winner,won:game.winner===game.playerNum,reason:`${title} · ${game.scores[0]} — ${game.scores[1]}`});}}
 }
 function openScene(data){
  closeLegacy();tablePanel.hidden=true;closeHub();soloCleanup();soloPanel.hidden=true;
  if(scene?.room&&scene.room!==data.room)state.socket?.emit('arcade:leave',{room:scene.room});
  scene=data;scenePanel.hidden=false;
  const title=games.find(g=>g.id===data.type)?.name||'Game';
  scenePanel.innerHTML=`<header class="scene-header"><button class="connect-icon" aria-label="Close game">${icon('arrow')}</button><div><strong>${esc(title)}</strong><small>${data.room?'LAN match · Your conversation':'Solo play · Your time'}</small></div><span class="connect-pill">${icon(data.room?'users':'bolt')}${data.room?'PLAYING TOGETHER':'SOLO'}</span></header><div class="scene-loading" role="status">Preparing ${esc(title)}…</div><iframe title="${esc(title)} game" src="${esc(data.url)}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  scenePanel.querySelector('iframe').onload=()=>{scenePanel.querySelector('.scene-loading').hidden=true;};
  scenePanel.querySelector('button').onclick=()=>{const close=()=>{if(scene?.room)state.socket?.emit('arcade:leave',{room:scene.room});else stopSolo();scene=null;scenePanel.replaceChildren();scenePanel.hidden=true;showHub();};if(scene?.room&&!scene.finished)askLeave(scenePanel,close);else close();};
 }
 function openSolo(type){
  soloCleanup();closeHub();soloPanel.hidden=false;const title=type==='2048'?'2048':'Breakout';
  soloPanel.innerHTML=`<div class="connect-table-inner"><header class="connect-play-header"><div><span class="eyebrow">JUST YOU AND ONE MORE TRY</span><h2>${title}<span>.</span></h2></div><button class="connect-icon" aria-label="Close solo game">${icon('close')}</button></header><div class="connect-solo-root"></div></div>`;
  soloPanel.querySelector('header button').onclick=()=>{soloCleanup();stopSolo();soloPanel.hidden=true;showHub('solo');};
  if(!window.LanSolo){const script=document.createElement('script');script.src='/js/solo-games.js';script.onload=()=>{if(!soloPanel.hidden)soloCleanup=window.LanSolo.mount(type,soloPanel.querySelector('.connect-solo-root'),result);};script.onerror=()=>showToast('Could not load this game. Please refresh.',true);document.head.append(script);}else soloCleanup=window.LanSolo.mount(type,soloPanel.querySelector('.connect-solo-root'),result);
 }
 function attachSocket(socket){
  if(socket===attachedSocket)return;attachedSocket=socket;
  socket.on('game:activity',data=>{
   currentActivity=data.active||null;paintActivity();
   if(soloActivityId&&currentActivity?.id!==soloActivityId){soloActivityId=null;soloCleanup();soloPanel.hidden=true;document.querySelector('.arcade-dialog')?.close();if(scene&&!scene.room){scene=null;scenePanel.replaceChildren();scenePanel.hidden=true;}}
  });
  socket.on('table:state',renderTable);socket.on('table:error',data=>{tableBusy=false;if(table)renderTable(table);showToast(data.message,true);});
  socket.on('arcade:launch',openScene);socket.on('arcade:error',data=>showToast(data.message,true));
  socket.on('arcade:result',data=>{if(scene?.room!==data.room)return;scene.finished=true;result({winnerName:data.winnerName,draw:data.winnerId==='draw',won:data.winnerId===state.user.id,reason:data.reason});});
  socket.on('duel:state',game=>{if(game.status==='finished'){const winner=game.players[game.winner-1];queueMicrotask(()=>result({winnerName:winner?.name,draw:!game.winner,won:game.winner===game.playerNum,reason:`${game.type==='reversi'?'Reversi':'Gomoku'} · ${game.scores.join(' — ')}`}));}});
  const network=()=>{footer.querySelector('.connect-network-status').textContent=socket.connected?'Connected to your LAN':'Reconnecting to your LAN…';};socket.on('connect',network);socket.on('disconnect',network);
 }
 window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==scenePanel.querySelector('iframe')?.contentWindow)return;if(event.data?.type==='arcade:render-error')showToast(event.data.message,true);});
 document.addEventListener('click',event=>{if(event.target.closest('.native-chat-open,#nav-chats,#nav-status'))closeHub();});
 window.MessengerArcade={token:()=>state.token,attachSocket,showHub,closeHub,result,legacyResult,error:message=>showToast(message,true),reset(){if(currentActivity)state.socket?.emit('game:leave-current',{activityId:currentActivity.id});stopSolo();soloCleanup();currentActivity=null;paintActivity();clearInterval(wordClock);table=null;scene=null;scenePanel.replaceChildren();scenePanel.hidden=tablePanel.hidden=soloPanel.hidden=true;closeHub();resultPanel.close();}};
 if(state.socket)attachSocket(state.socket);
})();
