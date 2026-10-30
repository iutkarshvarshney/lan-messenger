const test=require('node:test'),assert=require('node:assert/strict');
const {Controller}=require('../public/js/screen-share');
class Track extends EventTarget{constructor(kind='video'){super();this.kind=kind;this.readyState='live';this.muted=false;this.stops=0;}stop(){this.stops++;this.readyState='ended';}end(){this.readyState='ended';this.dispatchEvent(new Event('ended'));}}
class Stream{constructor(tracks=[]){this.tracks=tracks;}getTracks(){return this.tracks;}getVideoTracks(){return this.tracks.filter(t=>t.kind==='video');}addTrack(t){this.tracks.push(t);}removeTrack(t){this.tracks=this.tracks.filter(v=>v!==t);}}
function fixture(getDisplayMedia){
 const changes=[],signals=[],sent=[],track=new Track(),audio=new Track('audio');let current=true;
 const controller=new Controller({peer:{connectionState:'connected'},mediaDevices:{getDisplayMedia:getDisplayMedia||(()=>Promise.resolve(new Stream([track])))},isCurrent:()=>current,signal:state=>signals.push(state),onChange:()=>changes.push(controller.snapshot()),makeStream:()=>new Stream()});
 controller.setSender({replaceTrack:async track=>{sent.push(track);}});
 return {controller,track,audio,signals,sent,changes,end:()=>{current=false;controller.close();}};
}
test('screen capture replaces only the video sender and stop detaches/stops the display track',async()=>{
 const f=fixture();await f.controller.start();assert.equal(f.sent[0],f.track);assert.equal(f.controller.snapshot().sharing,true);assert.deepEqual(f.signals,[true]);assert.equal(f.audio.stops,0);
 await f.controller.stop();assert.equal(f.sent.at(-1),null);assert.equal(f.track.stops,1);assert.deepEqual(f.signals,[true,false]);assert.equal(f.controller.snapshot().sharing,false);assert.equal(f.audio.stops,0);
});
test('cancelled screen chooser leaves the call usable with no sharing signal',async()=>{
 const f=fixture(()=>Promise.reject(Object.assign(Error('cancel'),{name:'NotAllowedError'})));
 await assert.rejects(f.controller.start());assert.equal(f.controller.snapshot().pending,false);assert.equal(f.controller.snapshot().sharing,false);assert.deepEqual(f.signals,[]);
});
test('capture resolving after call end is stopped and never attached to another call',async()=>{
 let resolve;const f=fixture(()=>new Promise(r=>{resolve=r;}));const pending=f.controller.start();f.end();resolve(new Stream([f.track]));await pending;
 assert.equal(f.track.stops,1);assert.deepEqual(f.sent,[]);assert.deepEqual(f.signals,[]);
});
test('a late replaceTrack completion after close cannot revive capture',async()=>{
 let resolve;const f=fixture();f.controller.setSender({replaceTrack:track=>track?new Promise(r=>{resolve=r;}):Promise.resolve()});
 const pending=f.controller.start();await Promise.resolve();f.end();resolve();await pending;
 assert.ok(f.track.stops>=1);assert.equal(f.controller.snapshot().sharing,false);assert.deepEqual(f.signals,[]);
});
test('native Stop sharing detaches the video track and sends one stopped state',async()=>{
 const f=fixture();await f.controller.start();f.track.end();await Promise.resolve();await Promise.resolve();
 assert.equal(f.controller.snapshot().sharing,false);assert.deepEqual(f.signals,[true,false]);assert.equal(f.sent.at(-1),null);
});
test('a remote video is visible only while sharing is signaled and closes cleanly',()=>{
 const f=fixture(),remote=new Track();f.controller.receive(remote);assert.equal(f.controller.snapshot().remoteSharing,false);
 f.controller.setRemoteSharing(true);assert.equal(f.controller.snapshot().remoteSharing,true);assert.equal(f.controller.snapshot().remoteStream.getTracks()[0],remote);
 f.controller.setRemoteSharing(false);assert.equal(f.controller.snapshot().remoteSharing,false);
 f.controller.close();assert.equal(remote.stops,1);assert.equal(f.controller.snapshot().remoteStream,null);
});
test('simultaneous capture requests do not open a second chooser',async()=>{
 let calls=0,resolve;const f=fixture(()=>{calls++;return new Promise(r=>{resolve=r;});});const first=f.controller.start();await assert.rejects(f.controller.start());assert.equal(calls,1);resolve(new Stream([f.track]));await first;f.end();
});
