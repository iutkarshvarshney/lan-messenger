(()=>{
 'use strict';
 let nonce=null,terminal=null,fit=null,sessionId=null;
 const parentOrigin=(()=>{try{return new URL(document.referrer).origin;}catch(error){return null;}})();
 function send(type,extra={}){if(nonce&&parentOrigin)parent.postMessage({type,nonce,sessionId,...extra},parentOrigin);}
 function resize(){
  if(!terminal||innerWidth<50||innerHeight<50)return;
  const size=fit.proposeDimensions();if(!size)return;
  const cols=Math.min(300,Math.max(20,size.cols)),rows=Math.min(150,Math.max(5,size.rows));
  terminal.resize(cols,rows);send('terminal:size',{cols,rows});
 }
 addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==parentOrigin)return;
  const data=event.data;if(!data||typeof data!=='object')return;
  if(data.type==='terminal:init'&&!nonce&&typeof data.nonce==='string'){
   nonce=data.nonce;terminal=new Terminal({fontSize:13,fontFamily:'monospace',cursorBlink:true,disableStdin:true,scrollback:1000,allowProposedApi:true,linkHandler:{activate:()=>{}},theme:{background:'#07151e',foreground:'#d3e7e1',cursor:'#80e1bf',selectionBackground:'#35695d'}});
   fit=new FitAddon.FitAddon();terminal.loadAddon(fit);terminal.open(document.getElementById('terminal-screen'));
   terminal.parser.registerOscHandler(52,()=>true);
   terminal.onData(value=>send('terminal:input',{data:value}));
   new ResizeObserver(resize).observe(document.getElementById('terminal-screen'));resize();send('terminal:frame-ready');return;
  }
  if(!terminal||data.nonce!==nonce)return;
  if(data.type==='terminal:session'){sessionId=data.sessionId;terminal.reset();terminal.options.disableStdin=!sessionId;resize();if(sessionId)terminal.focus();}
  else if(data.type==='terminal:output'&&data.sessionId===sessionId&&typeof data.data==='string')terminal.write(data.data,()=>send('terminal:rendered',{sequence:data.sequence,sessionId:data.sessionId}));
  else if(data.type==='terminal:ended'){sessionId=null;terminal.options.disableStdin=true;}
  else if(data.type==='terminal:fit')resize();
 });
 if(parentOrigin)parent.postMessage({type:'terminal:frame-loading'},parentOrigin);
})();
