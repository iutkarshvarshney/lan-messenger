(function(root){
 'use strict';
 class Controller {
  constructor({peer,mediaDevices,isCurrent,signal,onChange,makeStream=()=>new MediaStream()}){
   Object.assign(this,{peer,mediaDevices,isCurrent,signal,onChange,makeStream});
   this.sender=null;this.stream=null;this.acquiringStream=null;this.remoteStream=null;this.remoteTrack=null;
   this.remoteEnabled=false;this.pending=false;this.closed=false;this.nativeStop=null;
  }
  setSender(sender){this.sender=sender;}
  snapshot(){return {sharing:!!this.stream&&!this.closed,pending:this.pending&&!this.closed,localStream:this.closed?null:this.stream,
   remoteSharing:!this.closed&&this.remoteEnabled&&!!this.remoteTrack&&this.remoteTrack.readyState!=='ended',
   remoteStream:this.closed?null:this.remoteStream,remotePaused:!!this.remoteTrack?.muted};}
  changed(){this.onChange?.(this.snapshot());}
  async start(){
   if(this.closed||!this.isCurrent()||this.peer.connectionState!=='connected')throw Error('Connect the call before sharing your screen.');
   if(!this.mediaDevices?.getDisplayMedia)throw Error('This browser cannot share a screen. Use a supported desktop browser over HTTPS.');
   if(!this.sender)throw Error('Refresh Messenger on both PCs and start a new call to enable screen sharing.');
   if(this.pending||this.stream)throw Error('Screen sharing is already starting or active.');
   this.pending=true;this.changed();
   let stream;
   try{
    stream=await this.mediaDevices.getDisplayMedia({video:{width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:15,max:30}},audio:false});
    if(this.closed||!this.isCurrent()){stream.getTracks().forEach(track=>track.stop());return;}
    this.acquiringStream=stream;
    const track=stream.getVideoTracks()[0];if(!track||track.readyState==='ended')throw Error('No screen was selected.');
    await this.sender.replaceTrack(track);
    if(this.closed||!this.isCurrent()||track.readyState==='ended'){
     stream.getTracks().forEach(track=>track.stop());await this.sender.replaceTrack(null).catch(()=>{});return;
    }
    this.stream=stream;this.acquiringStream=null;
    this.nativeStop=()=>this.stop();track.addEventListener('ended',this.nativeStop,{once:true});
    this.signal(true);
   }catch(error){stream?.getTracks().forEach(track=>track.stop());this.acquiringStream=null;throw error;}
   finally{this.pending=false;this.changed();}
  }
  async stop(){
   const stream=this.stream;this.stream=null;
   if(!stream)return;
   for(const track of stream.getTracks()){if(this.nativeStop)track.removeEventListener('ended',this.nativeStop);track.stop();}
   this.nativeStop=null;
   if(!this.closed&&this.isCurrent())this.signal(false);
   this.changed();
   await this.sender?.replaceTrack(null).catch(()=>{});
  }
  receive(track){
   if(this.closed||track.kind!=='video')return;
   if(this.remoteTrack&&this.remoteTrack!==track){this.remoteStream.removeTrack(this.remoteTrack);this.remoteTrack.stop();}
   if(this.remoteTrack!==track){
    this.remoteStream||=this.makeStream();this.remoteStream.addTrack(track);this.remoteTrack=track;
    this.remoteChanged=()=>this.changed();
    track.addEventListener('ended',this.remoteChanged);track.addEventListener('mute',this.remoteChanged);track.addEventListener('unmute',this.remoteChanged);
   }
   this.changed();
  }
  setRemoteSharing(value){this.remoteEnabled=!!value;this.changed();}
  close(){
   if(this.closed)return;this.closed=true;
   this.stop();this.acquiringStream?.getTracks().forEach(track=>track.stop());this.acquiringStream=null;
   if(this.remoteTrack){for(const event of ['ended','mute','unmute'])this.remoteTrack.removeEventListener(event,this.remoteChanged);this.remoteTrack.stop();}
   this.remoteTrack=null;this.remoteStream=null;this.remoteEnabled=false;this.changed();
  }
 }
 const api={Controller};if(typeof module==='object'&&module.exports)module.exports=api;else root.ScreenShare=api;
})(typeof window==='undefined'?globalThis:window);
