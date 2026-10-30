/* In-app SSH UI. Credentials are memory-only; terminal rendering is sandboxed. */
(()=>{
 'use strict';
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/></svg>';
 const panel=document.createElement('section');panel.className='web-terminal-panel';panel.hidden=true;panel.setAttribute('aria-label','Web SSH terminal');
 panel.innerHTML=`<header class="web-terminal-header"><div>${icon}<div><h2>Web terminal</h2><p id="web-terminal-status" role="status">Connect to your Linux PC</p></div></div><div class="web-terminal-actions"><button type="button" id="web-terminal-disconnect" disabled>Disconnect</button><button type="button" id="web-terminal-minimise" aria-label="Minimise web terminal">−</button><button type="button" id="web-terminal-close" aria-label="Close web terminal">×</button></div></header><div class="web-terminal-body"><form id="web-terminal-form"><span class="web-terminal-eyebrow">SSH CONNECTION</span><h3>Your shell. In Messenger.</h3><p>Your Linux PC must have SSH running and be reachable from the Messenger server.</p><label for="web-terminal-host">PC LAN IP address</label><input id="web-terminal-host" placeholder="e.g. 10.229.40.50" autocomplete="off" maxlength="64" required><div class="web-terminal-form-row"><div><label for="web-terminal-user">SSH username</label><input id="web-terminal-user" autocomplete="off" maxlength="64" required></div><div><label for="web-terminal-port">SSH port</label><select id="web-terminal-port"><option value="22">22</option></select></div></div><label for="web-terminal-auth">Sign in with</label><select id="web-terminal-auth"><option value="password">SSH password</option><option value="key">Private key</option></select><div id="web-terminal-password-fields"><label for="web-terminal-password">SSH password</label><input id="web-terminal-password" type="password" autocomplete="off" required></div><div id="web-terminal-key-fields" hidden><label for="web-terminal-key">Private key</label><textarea id="web-terminal-key" rows="4" autocomplete="off" spellcheck="false" disabled></textarea><label for="web-terminal-passphrase">Key passphrase, if needed</label><input id="web-terminal-passphrase" type="password" autocomplete="off" disabled></div><details><summary>Known SSH host key</summary><label for="web-terminal-fingerprint">Expected SHA256 fingerprint (optional)</label><input id="web-terminal-fingerprint" autocomplete="off" placeholder="SHA256:…"></details><button id="web-terminal-connect" type="submit" disabled>Connect securely</button><p class="web-terminal-privacy">SSH traffic passes through Messenger. Credentials are used for this connection and are not saved or logged.</p></form><div class="web-terminal-stage"><div class="web-terminal-empty">${icon}<h3>Ready when you are.</h3><p>Connect to use your Linux shell here. No launcher or download needed.</p></div><div id="web-terminal-frame-slot"></div><section class="web-terminal-host-key" hidden><span class="web-terminal-eyebrow">VERIFY SSH HOST</span><h3>Confirm this PC’s key</h3><p>Check that this fingerprint matches the SSH host key on your target PC.</p><code id="web-terminal-host-fingerprint"></code><p id="web-terminal-host-address"></p><div><button id="web-terminal-trust" type="button">Trust for this connection</button><button id="web-terminal-cancel-trust" type="button">Cancel</button></div></section></div></div><footer><span id="web-terminal-session-label">Private SSH session · No terminal history stored</span><span>Inactive sessions disconnect after 20 minutes</span></footer>`;
 document.body.append(panel);
 const $=id=>panel.querySelector('#'+id),form=$('web-terminal-form'),status=$('web-terminal-status');
 let generation=0,socket=null,requestId=null,sessionId=null,phase='idle',frame=null,frameNonce=null,frameReady=false,output=[],outputBytes=0,input=[],inputBytes=0,sending=false,configReady=false;
 let size={cols:80,rows:24};
 function secretClear(){for(const id of ['web-terminal-password','web-terminal-key','web-terminal-passphrase'])$(id).value='';}
 function framePost(type,extra={}){if(frameReady)frame.contentWindow.postMessage({type,nonce:frameNonce,sessionId,...extra},'*');}
 function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
 function controls(){const pending=['connecting','host-key'].includes(phase);$('web-terminal-connect').disabled=!configReady||pending||phase==='ready';$('web-terminal-disconnect').disabled=phase==='idle';panel.classList.toggle('connected',phase==='ready');}
 function ended(text){phase='idle';sessionId=null;requestId=null;input=[];inputBytes=0;sending=false;output=[];outputBytes=0;panel.querySelector('.web-terminal-host-key').hidden=true;framePost('terminal:ended');controls();message(text);}
 function disconnect(){generation++;const previous=socket;socket=null;previous?.disconnect();ended('Disconnected.');secretClear();}
 function close(){disconnect();panel.hidden=true;frame?.remove();frame=null;frameReady=false;frameNonce=null;form.reset();authFields();}
 function authFields(){const key=$('web-terminal-auth').value==='key';$('web-terminal-key-fields').hidden=!key;$('web-terminal-password-fields').hidden=key;$('web-terminal-password').disabled=key;$('web-terminal-password').required=!key;$('web-terminal-key').disabled=!key;$('web-terminal-key').required=key;$('web-terminal-passphrase').disabled=!key;secretClear();}
 function createFrame(){if(frame)return;frame=document.createElement('iframe');frame.title='Interactive SSH terminal';frame.setAttribute('sandbox','allow-scripts');frame.src='/terminal-view.html';frameNonce=crypto.randomUUID();frame.onload=()=>frame?.contentWindow.postMessage({type:'terminal:init',nonce:frameNonce},'*');$('web-terminal-frame-slot').append(frame);}
 async function show(){
  document.getElementById('main-menu')?.classList.remove('open');document.getElementById('menu-btn')?.setAttribute('aria-expanded','false');panel.hidden=false;createFrame();framePost('terminal:fit');
  const version=generation;
  try{const config=await apiCall('GET','/api/terminal/config');if(version!==generation||panel.hidden)return;const select=$('web-terminal-port'),old=select.value;select.replaceChildren(...config.ports.map(port=>new Option(String(port),String(port))));if(config.ports.includes(Number(old)))select.value=old;configReady=config.enabled;controls();if(!config.enabled)message('Web SSH is not configured on this Messenger server.',true);}
  catch(error){if(version===generation)message(error.message,true);}
 }
 function current(data){return data?.requestId===requestId&&socket&&phase!=='idle';}
 async function sendInput(){
  if(sending||phase!=='ready'||!input.length||!socket?.connected)return;
  const value=input.shift();inputBytes-=new TextEncoder().encode(value).length;sending=true;const version=generation,id=sessionId;
  socket.timeout(10000).emit('terminal:input',{sessionId:id,data:value},(error,result)=>{
   if(version!==generation||id!==sessionId)return;sending=false;
   if(error||result?.error){message(result?.error||'Terminal input could not be delivered.',true);return;}
   sendInput();
  });
 }
 addEventListener('message',event=>{
  if(!frame||event.source!==frame.contentWindow||event.origin!=='null')return;
  const data=event.data;if(!data||data.nonce!==frameNonce)return;
  if(data.type==='terminal:frame-ready'){frameReady=true;framePost('terminal:session',{sessionId:phase==='ready'?sessionId:null});for(const item of output)framePost('terminal:output',item);output=[];outputBytes=0;return;}
  if(data.type==='terminal:size'){
   if(!Number.isInteger(data.cols)||!Number.isInteger(data.rows)||data.cols<20||data.cols>300||data.rows<5||data.rows>150)return;
   size={cols:data.cols,rows:data.rows};if(phase==='ready'&&socket?.connected)socket.emit('terminal:resize',{sessionId,...size});
  }else if(data.type==='terminal:input'&&phase==='ready'&&data.sessionId===sessionId&&typeof data.data==='string'){
   const bytes=new TextEncoder().encode(data.data).length;if(inputBytes+bytes>1048576){message('Paste is too large for the terminal input buffer.',true);return;}
   let chunk='',count=0;for(const char of data.data){chunk+=char;if(++count===4096){input.push(chunk);chunk='';count=0;}}if(chunk)input.push(chunk);inputBytes+=bytes;sendInput();
  }else if(data.type==='terminal:rendered'&&phase==='ready'&&data.sessionId===sessionId&&Number.isSafeInteger(data.sequence))socket?.emit('terminal:ack',{sessionId,sequence:data.sequence});
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(phase!=='idle')return;
  const payload={requestId:crypto.randomUUID(),host:$('web-terminal-host').value.trim(),port:Number($('web-terminal-port').value),username:$('web-terminal-user').value.trim(),authType:$('web-terminal-auth').value,password:$('web-terminal-password').value,privateKey:$('web-terminal-key').value,passphrase:$('web-terminal-passphrase').value,expectedFingerprint:$('web-terminal-fingerprint').value.trim(),...size};
  secretClear();generation++;const version=generation;requestId=payload.requestId;phase='connecting';sessionId=null;controls();message('Connecting to SSH…');
  const connection=io(location.origin,{path:'/terminal-socket',transports:['websocket'],forceNew:true,reconnection:false,auth:{token:state.token},autoConnect:false});socket=connection;
  connection.on('terminal:host-key',data=>{if(!current(data))return;sessionId=data.sessionId;phase='host-key';$('web-terminal-host-fingerprint').textContent=data.fingerprint;$('web-terminal-host-address').textContent=`${data.host}:${data.port}`;panel.querySelector('.web-terminal-host-key').hidden=false;message('Verify the target PC’s SSH host key.');controls();});
  connection.on('terminal:ready',data=>{if(!current(data))return;sessionId=data.sessionId;phase='ready';panel.querySelector('.web-terminal-host-key').hidden=true;panel.querySelector('.web-terminal-empty').hidden=true;message(`Connected · ${data.username}@${data.host}:${data.port}`);$('web-terminal-session-label').textContent='Live SSH · Credentials and output are not saved';controls();framePost('terminal:session');for(const item of output)framePost('terminal:output',item);output=[];outputBytes=0;});
  connection.on('terminal:output',data=>{if(!current(data)||data.sessionId!==sessionId||typeof data.data!=='string')return;if(frameReady)framePost('terminal:output',data);else{outputBytes+=new TextEncoder().encode(data.data).length;if(outputBytes>1048576){disconnect();message('Terminal display buffer exceeded. Reconnect.',true);return;}output.push(data);}});
  connection.on('terminal:closed',data=>{if(current(data)){ended(data.message||'Disconnected.');connection.disconnect();}});
  connection.on('disconnect',()=>{if(socket===connection&&phase!=='idle')ended('Terminal connection closed. Connect again when ready.');});
  try{
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Terminal connection timed out.')),10000);connection.once('connect',()=>{clearTimeout(timer);resolve();});connection.once('connect_error',()=>{clearTimeout(timer);reject(Error('Could not open the secure terminal connection. Sign in again if needed.'));});connection.connect();});
   if(version!==generation){connection.disconnect();return;}
   await new Promise((resolve,reject)=>connection.timeout(10000).emit('terminal:connect',payload,(error,result)=>{if(error||result?.error)reject(Error(result?.error||'SSH connection request timed out.'));else{if(version===generation&&phase!=='idle')sessionId=result.sessionId;resolve();}}));
  }catch(error){if(version===generation){connection.disconnect();ended(error.message);message(error.message,true);}}
  finally{payload.password='';payload.privateKey='';payload.passphrase='';}
 });
 $('web-terminal-trust').onclick=()=>{if(phase!=='host-key'||!sessionId)return;phase='connecting';panel.querySelector('.web-terminal-host-key').hidden=true;message('Authenticating SSH…');socket.emit('terminal:trust',{sessionId,accept:true});controls();};
 $('web-terminal-cancel-trust').onclick=disconnect;$('web-terminal-disconnect').onclick=disconnect;$('web-terminal-close').onclick=close;$('web-terminal-minimise').onclick=()=>{panel.hidden=true;};$('web-terminal-auth').onchange=authFields;
 document.getElementById('menu-terminal')?.addEventListener('click',show);
 const footer=document.querySelector('.connect-sidebar-footer');if(footer){const button=document.createElement('button');button.type='button';button.className='local-terminal-launch';button.setAttribute('aria-label','Open web SSH terminal');button.innerHTML=icon+'<span>Web terminal<small>SSH inside Messenger</small></span><span>↗</span>';button.onclick=show;footer.insertBefore(button,footer.querySelector('.connect-network-status'));}
 window.MessengerLocalTerminal={close};
})();
