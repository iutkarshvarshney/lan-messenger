'use strict';
const {randomUUID}=require('node:crypto');
const titles={ludo:'Ludo',scribble:'Scribble',memorymatch:'Memory Match',wordscramble:'Word Guess',wizardchess:'Wizard Chess',rallyclub:'Rally Club',reversi:'Reversi',gomoku:'Gomoku',tictactoe:'Tic Tac Toe',dotsandboxes:'Dots & Boxes',connectfour:'Connect Four',rockpaperscissors:'RPS Lizard Spock',retropong:'Retro Pong',stickfight:'Street Arena',snake:'Snake',mines:'Minesweeper',deskracer:'Desk Racer','2048':'2048',breakout:'Breakout'};
class GameSessions{
 constructor({graceMs=60000}={}){this.graceMs=graceMs;this.players=new Map();this.matches=new Map();this.connections=new Map();this.timers=new Map();this.notify=()=>{};}
 forUser(id){return this.players.get(id)||null;}
 publicFor(id){const m=this.forUser(id);return m?{id:m.id,type:m.type,title:titles[m.type]||m.type,conversationId:m.conversationId||null,resumable:typeof m.resume==='function'}:null;}
 changed(id){this.notify(id,{active:this.publicFor(id)});}
 assertFree(ids,actorId=null,allow=null){for(const id of ids){const current=this.forUser(id);if(current&&current!==allow){const subject=id===actorId?'You are':'This player is';const error=new Error(`${subject} already playing ${titles[current.type]||current.type}. Resume or leave the current game first.`);error.playerId=id;throw error;}}}
 claim(options){const ids=[...new Set(options.players)];this.assertFree(ids,options.actorId);if(this.matches.has(options.key))throw new Error('This match is already running.');const match={...options,id:randomUUID(),players:new Set(ids)};this.matches.set(match.key,match);for(const id of ids){this.players.set(id,match);this.changed(id);if(!this.connections.get(id)?.size)this.disconnect(id,null);}return match;}
 add(match,ids,actorId=null){if(this.matches.get(match.key)!==match)throw new Error('This lobby has closed.');this.assertFree(ids,actorId,match);for(const id of ids){match.players.add(id);this.players.set(id,match);this.changed(id);}}
 releasePlayer(match,id){if(this.players.get(id)!==match)return;this.players.delete(id);match.players.delete(id);this.changed(id);if(!match.players.size&&this.matches.get(match.key)===match)this.matches.delete(match.key);}
 release(match){if(!match||this.matches.get(match.key)!==match)return;for(const id of [...match.players])this.releasePlayer(match,id);if(this.matches.get(match.key)===match)this.matches.delete(match.key);}
 connect(id,socketId){if(!this.connections.has(id))this.connections.set(id,new Set());this.connections.get(id).add(socketId);clearTimeout(this.timers.get(id));this.timers.delete(id);}
 disconnect(id,socketId){const sockets=this.connections.get(id);sockets?.delete(socketId);if(sockets?.size)return;this.connections.delete(id);clearTimeout(this.timers.get(id));const timer=setTimeout(()=>{this.timers.delete(id);if(this.connections.get(id)?.size)return;const match=this.forUser(id);if(!match)return;try{match.onAbandon?.(id);}finally{this.releasePlayer(match,id);}},this.graceMs);timer.unref?.();this.timers.set(id,timer);}
 abandon(id){const match=this.forUser(id);if(!match)return;match.onAbandon?.(id);this.releasePlayer(match,id);}
 resume(id,socket){const match=this.forUser(id);if(!match)return false;if(!match.resume)return false;match.resume(socket,id);return true;}
 clear(){for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();this.matches.clear();this.players.clear();this.connections.clear();}
}
module.exports={GameSessions,sessions:new GameSessions(),titles};
