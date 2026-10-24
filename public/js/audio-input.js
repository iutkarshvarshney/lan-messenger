(function(root){
 'use strict';
 function readableError(error){
  if(error.name==='NotAllowedError'||error.name==='SecurityError')return new Error('Allow microphone access in your browser site settings, then try again.');
  if(error.name==='NotFoundError')return new Error('No microphone found. Connect a microphone and select it in your system sound settings.');
  return new Error('The microphone could not start. Check your selected input in system sound settings and close other apps using it, then retry.');
 }
 async function openMicrophone(devices){
  try{return await devices.getUserMedia({audio:true,video:false});}
  catch(error){
   if(!['NotReadableError','AbortError','OverconstrainedError'].includes(error.name))throw readableError(error);
   let inputs=[];
   try{inputs=(await devices.enumerateDevices()).filter(d=>d.kind==='audioinput'&&d.deviceId&&!['default','communications'].includes(d.deviceId));}catch(e){}
   for(const input of inputs){
    try{return await devices.getUserMedia({audio:{deviceId:{exact:input.deviceId}},video:false});}
    catch(e){if(e.name==='NotAllowedError')throw readableError(e);}
   }
   throw readableError(error);
  }
 }
 const api={openMicrophone};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.AudioInput=api;
})(typeof window!=='undefined'?window:globalThis);
