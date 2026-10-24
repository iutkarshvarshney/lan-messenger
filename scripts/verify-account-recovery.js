// Isolated localhost QA only. Never use production accounts or data.
const assert=require('node:assert/strict'),{io}=require('socket.io-client');
const base='http://127.0.0.1:3391',sockets=[];
async function request(path,body,token,method='POST'){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 return {status:r.status,data:await r.json()};
}
function event(s,name){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Timeout '+name)),5000);s.once(name,d=>{clearTimeout(timeout);resolve(d);});});}
async function connect(token,valid=true){const s=io(base,{auth:{token},autoConnect:false,reconnection:false});sockets.push(s);const ready=event(s,valid?'connect':'connect_error');s.connect();await ready;return s;}
(async()=>{
 const username='recoveryqa'+Date.now(),password='OriginalPrivatePassword123!';
 const registration=await request('/api/auth/register',{username,displayName:'Recovery QA',password,deviceBinding:'known-public-device-id'});assert.equal(registration.status,200);
 const first=registration.data,second=(await request('/api/auth/login',{username,password})).data;
 const socket=await connect(first.token);
 assert.equal((await request('/api/auth/recovery-codes',{currentPassword:'wrong'},first.token)).status,403);
 const generated=await request('/api/auth/recovery-codes',{currentPassword:password},first.token);assert.equal(generated.status,200);assert.equal(generated.data.codes.length,10);
 const status=await request('/api/auth/recovery-codes',null,first.token,'GET');assert.deepEqual(status.data,{enabled:true,remaining:10});
 const bypass=await request('/api/auth/reset-password',{username,newPassword:'AttackerPassword123!',deviceBinding:'known-public-device-id'});assert.equal(bypass.status,400);
 assert.equal((await request('/api/users',null,first.token,'GET')).status,200);
 const invalid=await request('/api/auth/recovery/verify',{username,recoveryCode:'BAD'}),unknown=await request('/api/auth/recovery/verify',{username:'not-an-account'+Date.now(),recoveryCode:'BAD'});
 assert.equal(invalid.status,unknown.status);assert.deepEqual(invalid.data,unknown.data);
 const proof=await request('/api/auth/recovery/verify',{username,recoveryCode:generated.data.codes[0]});assert.equal(proof.status,200);assert.equal(proof.data.expiresIn,120);
 assert.equal((await request('/api/auth/recovery/verify',{username,recoveryCode:generated.data.codes[0]})).status,400);
 assert.equal((await request('/api/users',null,proof.data.resetToken,'GET')).status,401);await connect(proof.data.resetToken,false);
 const disconnected=event(socket,'disconnect');
 const reset=await request('/api/auth/reset-password',{resetToken:proof.data.resetToken,newPassword:'NewPrivatePassword123!'});assert.equal(reset.status,200);await disconnected;
 assert.equal((await request('/api/users',null,first.token,'GET')).status,401);assert.equal((await request('/api/users',null,second.token,'GET')).status,401);await connect(first.token,false);
 assert.equal((await request('/api/auth/reset-password',{resetToken:proof.data.resetToken,newPassword:'AnotherPrivatePassword123!'})).status,400);
 assert.equal((await request('/api/auth/recovery/verify',{username,recoveryCode:generated.data.codes[1]})).status,400);
 assert.equal((await request('/api/auth/login',{username,password})).status,401);
 const fresh=await request('/api/auth/login',{username,password:'NewPrivatePassword123!'});assert.equal(fresh.status,200);
 assert.deepEqual((await request('/api/auth/recovery-codes',null,fresh.data.token,'GET')).data,{enabled:false,remaining:0});
 console.log('PASS owner reauthentication, generic failures, hardware-ID bypass rejection, restricted proof, single-use recovery and HTTP/socket session revocation');
 const limitedName='limitqa'+Date.now();for(let i=0;i<8;i++)assert.equal((await request('/api/auth/recovery/verify',{username:limitedName,recoveryCode:'BAD'})).status,400);
 assert.equal((await request('/api/auth/recovery/verify',{username:limitedName,recoveryCode:'BAD'})).status,429);
 const admin=await fetch('http://127.0.0.1:3392/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,newPassword:'AttackerPassword123!',portalPassword:'local-control-test-password'})});assert.equal(admin.status,403);
 assert.equal((await request('/api/auth/login',{username,password:'NewPrivatePassword123!'})).status,200);
 console.log('PASS verification rate limits and removal of admin password impersonation');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>sockets.forEach(s=>s.disconnect()));
