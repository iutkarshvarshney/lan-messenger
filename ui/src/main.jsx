import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './native.css';

function Icon({ name, size = 20 }) {
 const paths={users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',more:'M5 12h.01 M12 12h.01 M19 12h.01',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',chat:'M21 11a9 9 0 0 1-9 9H4l-2 2V11a9.5 9.5 0 0 1 19 0 M7 9h9 M7 13h5',close:'M6 6l12 12 M6 18 18 6',shield:'m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z M8 12l3 3 5-6',arrow:'m14 5-7 7 7 7',game:'M6 8h12a3 3 0 0 1 3 3l1 7a2 2 0 0 1-3 2l-3-3H8l-3 3a2 2 0 0 1-3-2l1-7a3 3 0 0 1 3-3 M7 10v6 M4 13h6 M16 12h.01 M19 15h.01'};
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.chat}/></svg>;
}

function ConfirmDelete({ item, onCancel, onConfirm }) {
 const ref=useRef(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const dialog=ref.current;if(!dialog.open)dialog.showModal();const cancel=e=>{e.preventDefault();if(!busy)onCancel();};dialog.addEventListener('cancel',cancel);return()=>dialog.removeEventListener('cancel',cancel);},[busy,onCancel]);
 async function remove(){setBusy(true);setError('');try{await onConfirm(item.id);onCancel();}catch(e){setError(e.message);setBusy(false);}}
 return <dialog ref={ref} className="native-confirm" aria-labelledby="delete-title"><div className="native-confirm-icon"><Icon name="trash" size={24}/></div><h2 id="delete-title">Delete chat from inbox?</h2><p><strong>{item.name}</strong> will be removed from your inbox. Messages stay available to both participants. The chat returns if a new message arrives or you start it again.</p>{error&&<p role="alert" className="native-error">{error}</p>}<footer><button onClick={onCancel} disabled={busy}>Keep chat</button><button className="native-danger" onClick={remove} disabled={busy}>{busy?'Removing…':'Delete chat'}</button></footer></dialog>;
}

function Avatar({item}){
 const[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[item.avatar]);
 return <span className={`native-avatar${item.group?' group':''}`} style={{'--avatar-color':item.color}}>{item.avatar&&!failed?<img src={item.avatar} alt="" onError={()=>setFailed(true)}/>:item.group?<Icon name="users" size={23}/>:item.initials}{item.online&&<i className="native-presence" aria-label="Online"/>}</span>;
}
function Inbox({items,activeId,onOpen,onDelete,searching}){
 const[filter,setFilter]=useState('all'),[selected,setSelected]=useState(null),[menu,setMenu]=useState(null);
 const visible=items.filter(item=>filter!=='unread'||item.unread>0);
 useEffect(()=>{if(!menu)return;const close=e=>{if(!e.target.closest('.native-row-menu'))setMenu(null);};const esc=e=>{if(e.key==='Escape')setMenu(null);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',esc);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',esc);};},[menu]);
 return <><div className="native-inbox-top"><div><span className="native-eyebrow">YOUR WORKSPACE</span><h2>Messages <span>{items.length}</span></h2></div><span className="native-private" title="Your LAN workspace"><Icon name="shield" size={16}/> LAN</span></div><nav className="native-filters" aria-label="Inbox filter"><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>All messages</button><button aria-pressed={filter==='unread'} onClick={()=>setFilter('unread')}>Unread{items.some(i=>i.unread>0)&&<span>{items.filter(i=>i.unread>0).length}</span>}</button></nav><div className="native-inbox-rows">{visible.length?visible.map(item=><article key={item.id} className={`native-chat-row${item.id===activeId?' selected':''}${item.unread?' has-unread':''}`} data-id={item.id}><button className="native-chat-open" onClick={()=>{setMenu(null);onOpen(item.id);}} aria-current={item.id===activeId?'page':undefined} aria-label={`Open chat with ${item.name}`}><Avatar item={item}/><span className="native-chat-copy"><span className="native-chat-head"><strong>{item.name}</strong><time>{item.time}</time></span><span className="native-chat-foot"><span>{item.preview||'Start a conversation'}</span>{item.unread>0&&<b aria-label={`${item.unread} unread messages`}>{item.unread>99?'99+':item.unread}</b>}</span></span></button><div className="native-row-menu"><button className="native-more" aria-label={`Chat options for ${item.name}`} aria-haspopup="menu" aria-expanded={menu===item.id} onClick={()=>setMenu(menu===item.id?null:item.id)}><Icon name="more" size={18}/></button>{menu===item.id&&<div className="native-popover" role="menu"><button role="menuitem" onClick={()=>{setSelected(item);setMenu(null);}}><Icon name="trash" size={16}/>Delete chat</button></div>}</div></article>):<div className="native-empty"><Icon name="chat" size={32}/><h3>{searching?'No matches':filter==='unread'?'You’re all caught up':'Your conversations live here'}</h3><p>{searching?'Try another name.':filter==='unread'?'No unread messages right now.':'Start a chat with someone on your network.'}</p></div>}</div>{selected&&<ConfirmDelete item={selected} onCancel={()=>setSelected(null)} onConfirm={onDelete}/>}</>;
}

const dotPositions={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function Dice({rolling,value=1}){
 const[face,setFace]=useState(value||1);
 useEffect(()=>{if(!rolling){setFace(value||1);return;}const timer=setInterval(()=>setFace(n=>n%6+1),80);return()=>clearInterval(timer);},[rolling,value]);
 return <div className={`native-dice-stage${rolling?' is-rolling':''}`} aria-label={rolling?'Dice rolling':`Dice result ${value||1}`}><div className="native-die" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} className={dotPositions[face]?.includes(i)?'pip':''}/>)}</div><span role="status" aria-live="polite">{rolling?'Rolling…':value?`Rolled ${value}`:'Ready to roll'}</span></div>;
}

function LudoSeats({players,myId,turnId,rolls={},rollingId,onRoll,canRoll}){
 return <div className="ludo-seat-layout">{players.map(player=>{
  const active=player.id===turnId&&!player.rank,mine=player.id===myId;
  return <article key={player.id} className={`ludo-seat seat-${player.slot}${active?' is-turn':''}${mine?' is-you':''}`} style={{'--seat-color':player.color}} aria-label={`${player.name}${active?', current turn':''}`}>
   <div className="ludo-seat-identity"><i className="ludo-seat-avatar">{player.name.slice(0,2).toUpperCase()}</i><div><strong>{mine?'You':player.name}</strong><small>{player.rank?`Finished #${player.rank}`:active?mine?'Your turn':`${player.name}’s turn`:`${player.home}/4 home`}</small></div></div>
   <button className="ludo-seat-dice" type="button" disabled={!mine||!active||!canRoll} onClick={onRoll} aria-label={`${mine?'Your':player.name+'’s'} dice${active?', current turn':''}${rolls[player.id]?', rolled '+rolls[player.id]:''}`}><Dice rolling={rollingId===player.id} value={rolls[player.id]||null}/></button>
   <div className="ludo-home-progress" aria-label={`${player.home} of 4 tokens home`}>{[0,1,2,3].map(n=><i key={n} className={n<player.home?'home':''}/>)}</div>
  </article>;
 })}</div>;
}

function Duel({game,onMove,onClose}){
 const[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{setBusy(false);},[game.board,game.status]);
 const yours=game.turn===game.playerNum,done=game.status==='finished',legal=new Set(game.legalMoves);
 const title=game.type==='reversi'?'Reversi':'Gomoku';
 const result=done?(game.winner===0?'A well-played draw':game.winner===game.playerNum?'You win!':`${game.players[game.winner-1]?.name||'Opponent'} wins`):(yours?'Your move':`${game.players[game.turn-1]?.name||'Opponent'}’s move`);
 return <div className="native-duel-panel"><header className="native-duel-header"><div><span className="native-eyebrow">TWO-PLAYER MATCH</span><h2>{title}</h2></div><button className="native-icon-button" aria-label="Close multiplayer game" onClick={()=>done?onClose(false):setConfirm(true)}><Icon name="close"/></button></header><div className="native-duel-players">{game.players.map((p,index)=><div key={p.id} className={index+1===game.turn&&!done?'turn':''}><i className={`stone player-${index+1}`}/><span>{index+1===game.playerNum?'You':p.name}</span>{game.type==='reversi'&&<b>{game.scores[index]}</b>}</div>)}</div><div className="native-duel-turn" role="status" aria-live="polite"><span className={yours&&!done?'turn-dot':''}/>{result}</div><div className={`native-board ${game.type}`} style={{'--board-size':game.size}} role="group" aria-label={`${title} board`}>{game.board.map((value,i)=><button type="button" key={i} className={`${value?'occupied':''}${game.lastMove===i?' last-move':''}`} disabled={done||!yours||busy||!legal.has(i)} aria-label={`Row ${Math.floor(i/game.size)+1}, column ${i%game.size+1}${value?`, ${value===game.playerNum?'your':'opponent'} stone`:legal.has(i)&&yours?', legal move':', empty'}`} onClick={()=>{setBusy(true);onMove(i);}}>{value?<i className={`stone player-${value}`}/>:yours&&legal.has(i)&&game.type==='reversi'?<i className="move-hint"/>:null}</button>)}</div><p className="native-duel-help">{game.notice|| (game.type==='reversi'?'Bracket your opponent’s discs to flip them. Highlighted spots are legal moves. If you cannot move, your turn passes automatically.':'Connect five or more stones in a straight line: horizontally, vertically or diagonally. Black plays first.')}</p>{confirm&&<div className="native-forfeit"><strong>Leave this match?</strong><p>The other player wins by forfeit.</p><button onClick={()=>setConfirm(false)}>Keep playing</button><button className="native-danger" onClick={()=>onClose(true)}>Leave match</button></div>}</div>;
}

const roots=new Map();
function rootFor(id){const node=document.getElementById(id);if(!node)return null;if(!roots.has(id))roots.set(id,createRoot(node));return roots.get(id);}
let latestInbox=null,latestDuel=null,duelHandlers=null;
const dialog=document.createElement('dialog');dialog.id='native-duel-dialog';dialog.className='native-duel-dialog';const content=document.createElement('div');content.id='native-duel-root';dialog.append(content);document.body.append(dialog);
dialog.addEventListener('cancel',event=>{if(latestDuel?.status==='playing'){event.preventDefault();dialog.querySelector('[aria-label="Close multiplayer game"]')?.click();}});
window.MessengerNative={
 renderInbox(props){latestInbox=props;rootFor('chat-list')?.render(<Inbox {...props}/>);},
 clearInbox(){if(latestInbox)rootFor('chat-list')?.render(<Inbox {...latestInbox} items={[]}/>);},
 renderDice(props){rootFor('ludo-dice')?.render(<Dice {...props}/>);},
 renderLudoSeats(props){rootFor('ludo-scorebar')?.render(<LudoSeats {...props}/>);},
 showDuel(game,handlers){latestDuel=game;duelHandlers=handlers;rootFor('native-duel-root')?.render(<Duel game={game} onMove={handlers.onMove} onClose={forfeit=>{if(forfeit)handlers.onForfeit();dialog.close();}}/>);if(!dialog.open)dialog.showModal();},
 closeDuel(){dialog.close();latestDuel=null;rootFor('native-duel-root')?.render(null);},
 duelError(){if(latestDuel&&duelHandlers)rootFor('native-duel-root')?.render(<Duel key={Date.now()} game={latestDuel} {...duelHandlers} onClose={forfeit=>{if(forfeit)duelHandlers.onForfeit();dialog.close();}}/>);}
};
window.dispatchEvent(new Event('messenger-native-ready'));
