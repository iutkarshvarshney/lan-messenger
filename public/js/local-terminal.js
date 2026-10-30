/* A native local terminal launcher: no terminal commands traverse Messenger. */
(()=>{
 'use strict';
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/></svg>';
 const dialog=document.createElement('dialog');dialog.className='local-terminal-dialog';dialog.setAttribute('aria-labelledby','local-terminal-title');
 dialog.innerHTML=`<header><span class="local-terminal-symbol">${icon}</span><button type="button" class="local-terminal-close" aria-label="Close local terminal">×</button></header><span class="local-terminal-eyebrow">YOUR PC · YOUR TOOLS</span><h2 id="local-terminal-title">Your terminal, right here.</h2><p>Open your normal Linux terminal for SSH and other commands. It runs as your own desktop user.</p><a class="local-terminal-open" href="lan-messenger://terminal" target="_blank" rel="noopener">${icon}Open local terminal</a><p class="local-terminal-status" role="status">Your browser may ask permission to open the installed launcher.</p><section><h3>First time? Set up once.</h3><ol><li>Download and extract the Linux launcher.</li><li>In the extracted folder, run <code>python3 install.py</code> as your normal user, without sudo.</li><li>Return here and choose <strong>Open local terminal</strong>.</li></ol><a class="local-terminal-download" href="/downloads/lan-messenger-linux-terminal.tar.gz" download="lan-messenger-linux-terminal.tar.gz">Download Linux launcher <span>Python3 · xdg-utils · Source included</span></a></section><footer><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7Z"/><path d="m8 12 3 3 5-6"/></svg><span>Commands, SSH keys and passwords stay on your PC. Messenger does not receive terminal output.</span></footer>`;
 document.body.append(dialog);
 dialog.querySelector('.local-terminal-close').onclick=()=>dialog.close();
 const platform=navigator.userAgentData?.platform||navigator.platform||'';
 const linux=/Linux|X11/i.test(platform)&&!/Android/i.test(navigator.userAgent);
 const open=dialog.querySelector('.local-terminal-open'),status=dialog.querySelector('.local-terminal-status');
 open.addEventListener('click',event=>{
  if(!linux){event.preventDefault();status.textContent='This launcher is for Linux desktops. Install it on the Linux PC where you use Messenger.';return;}
  status.textContent='Allow your browser to open the launcher. If nothing opens, complete the one-time setup below.';
 });
 function show(){
  document.getElementById('main-menu')?.classList.remove('open');document.getElementById('menu-btn')?.setAttribute('aria-expanded','false');
  if(!dialog.open)dialog.showModal();
 }
 document.getElementById('menu-terminal')?.addEventListener('click',show);
 const footer=document.querySelector('.connect-sidebar-footer');
 if(footer){
  const button=document.createElement('button');button.type='button';button.className='local-terminal-launch';button.setAttribute('aria-label','Open local terminal tools');
  button.innerHTML=icon+'<span>Local terminal<small>Open on your Linux PC</small></span><span class="local-terminal-launch-arrow">↗</span>';
  button.onclick=show;footer.insertBefore(button,footer.querySelector('.connect-network-status'));
 }
 window.MessengerLocalTerminal={close(){if(dialog.open)dialog.close();}};
})();
