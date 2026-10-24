const test=require('node:test');
const assert=require('node:assert/strict');
const {openMicrophone}=require('../public/js/audio-input');
test('a failed default microphone falls back to an available physical input',async()=>{
 const attempts=[];const stream={getAudioTracks:()=>[{readyState:'live'}]};
 const devices={getUserMedia:async c=>{attempts.push(c);if(c.audio===true)throw Object.assign(new Error('Could not start audio source'),{name:'NotReadableError'});return stream;},enumerateDevices:async()=>[{kind:'audioinput',deviceId:'usb-mic'}]};
 assert.equal(await openMicrophone(devices),stream);assert.equal(attempts[1].audio.deviceId.exact,'usb-mic');
});
test('denied permission does not trigger repeated input requests',async()=>{
 let requests=0;const devices={getUserMedia:async()=>{requests++;throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}};
 await assert.rejects(openMicrophone(devices),/Allow microphone/);assert.equal(requests,1);
});
