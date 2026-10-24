/* Same-origin bridge: applets share Messenger authentication, never URL tokens. */
(()=>{
 'use strict';
 const kind=location.pathname.includes('wizard-chess')?'wizard':'tennis';
 const originalFetch=window.fetch.bind(window);
 window.fetch=(input,options={})=>{
  const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const url=new URL(address,location.href);
  if(url.origin===location.origin&&url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/api/arcade/')){
   const headers=new Headers(options.headers||(input instanceof Request?input.headers:undefined));
   const token=window.parent!==window?window.parent.MessengerArcade?.token():null;
   if(token)headers.set('Authorization','Bearer '+token);
   url.pathname='/api/arcade/'+kind+url.pathname.slice(4);
   return originalFetch(url.href,{...options,headers});
  }
  return originalFetch(input,options);
 };
 document.addEventListener('click',event=>{
  if(new URLSearchParams(location.search).get('lan')==='1'&&event.target.closest('#btn-play-again,#btn-return-title')){
   event.preventDefault();event.stopImmediatePropagation();window.parent.MessengerArcade?.error('Close this game and send a fresh invitation for another LAN match.');
  }
 },true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('audio,video').forEach(x=>x.pause());});
 window.addEventListener('error',event=>{
  if(/WebGL|context|shader/i.test(event.message||''))window.parent.postMessage({type:'arcade:render-error',message:'3D rendering could not start. Try another browser or enable hardware acceleration.'},location.origin);
 });
})();
