'use strict';
const {parentPort,workerData}=require('node:worker_threads');
const {utils}=require('ssh2');
try{
 const key=utils.parseKey(workerData.key,workerData.passphrase);
 if(key instanceof Error||Array.isArray(key)||!key.isPrivateKey())throw Error('Invalid private key');
 parentPort.postMessage({pem:key.getPrivatePEM()});
}catch(error){parentPort.postMessage({error:true});}
