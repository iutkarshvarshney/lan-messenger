'use strict';
const net=require('node:net');
const PRIVATE=['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16'];
const ipNumber=value=>value.split('.').reduce((n,v)=>n*256+Number(v),0);
function cidr(value){const [ip,bits]=value.split('/');const prefix=Number(bits);if(net.isIP(ip)!==4||!Number.isInteger(prefix)||prefix<0||prefix>32)throw Error('Invalid network policy');return {base:ipNumber(ip),prefix};}
function contains(network,address){const size=2**(32-network.prefix);return Math.floor(network.base/size)===Math.floor(ipNumber(address)/size);}
class TerminalPolicy{
 constructor({allowedCidrs=PRIVATE,allowedPorts=[22],allowLoopback=false,allowInsecureLocal=false}={}){
  this.allowLoopback=allowLoopback;this.allowInsecureLocal=allowInsecureLocal;
  this.networks=allowedCidrs.map(cidr);this.allowedCidrs=allowedCidrs;
  this.allowedPorts=allowedPorts.filter(n=>Number.isInteger(n)&&n>=1&&n<=65535);
 }
 allowedRequest(request){
  const tls=!!request.socket?.encrypted,headers=request.headers||{};
  try{
   const origin=new URL(headers.origin),host=String(headers.host||'').toLowerCase();
   if(origin.host!==host||origin.protocol!==(tls?'https:':'http:'))return false;
   return tls||(this.allowInsecureLocal&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname));
  }catch(error){return false;}
 }
 connection(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Enter SSH connection details.');
  if(typeof data.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(data.requestId))throw Error('Invalid connection request.');
  const host=data.host;
  if(typeof host!=='string'||net.isIP(host)!==4)throw Error('Enter the target PC’s LAN IPv4 address. Hostnames are not supported.');
  const privateAddress=PRIVATE.some(value=>contains(cidr(value),host));
  if(!(privateAddress||(this.allowLoopback&&host.startsWith('127.')))||!this.networks.some(value=>contains(value,host)))throw Error('This address is outside the permitted LAN networks.');
  const port=data.port??22;if(!this.allowedPorts.includes(port))throw Error('This SSH port is not permitted by the Messenger configuration.');
  if(typeof data.username!=='string'||!/^[a-zA-Z0-9_.@-]{1,64}$/.test(data.username))throw Error('Enter a valid SSH username.');
  if(data.authType!=='password'&&data.authType!=='key')throw Error('Choose password or private-key authentication.');
  const auth={};
  if(data.authType==='password'){
   if(typeof data.password!=='string'||!data.password||Buffer.byteLength(data.password)>4096)throw Error('Enter your SSH password.');
   auth.password=data.password;
  }else{
   if(typeof data.privateKey!=='string'||!data.privateKey||Buffer.byteLength(data.privateKey)>32768)throw Error('Enter a valid private key (maximum32KiB).');
   if(data.passphrase!=null&&(typeof data.passphrase!=='string'||Buffer.byteLength(data.passphrase)>4096))throw Error('Invalid private-key passphrase.');
   auth.privateKey=data.privateKey;auth.passphrase=data.passphrase||undefined;
  }
  const expectedFingerprint=data.expectedFingerprint||'';
  if(typeof expectedFingerprint!=='string'||(expectedFingerprint&&!/^SHA256:[A-Za-z0-9+/]{43}$/.test(expectedFingerprint)))throw Error('Use a SHA256 SSH host-key fingerprint.');
  return {requestId:data.requestId,host,port,username:data.username,auth,expectedFingerprint,...this.dimensions(data)};
 }
 dimensions(data){const cols=data.cols??80,rows=data.rows??24;if(!Number.isInteger(cols)||cols<20||cols>300||!Number.isInteger(rows)||rows<5||rows>150)throw Error('Invalid terminal dimensions.');return {cols,rows};}
}
module.exports={TerminalPolicy};
