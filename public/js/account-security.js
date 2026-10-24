/* Recovery secrets remain in memory until the owner saves them. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 let resetToken=null,deadline=0,clock=null,codes=[],downloadUrl=null,securityVersion=0,resetVersion=0;
 const dialog=document.createElement('dialog');dialog.className='account-security-dialog';
 dialog.setAttribute('aria-labelledby','account-security-title');document.body.append(dialog);
 function resetForm(){
  resetVersion++;
  resetToken=null;deadline=0;clearInterval(clock);
  $('reset-form').reset();$('recovery-password-fields').hidden=true;
  $('recovery-username-field').hidden=false;$('recovery-code-field').hidden=false;
  $('reset-recovery-code').required=true;$('reset-recovery-code').disabled=false;
  ['reset-new-password','reset-confirm-password'].forEach(id=>{$(id).disabled=true;$(id).required=false;});
  $('reset-btn').textContent='Verify recovery code';$('reset-btn').disabled=false;
 }
 function clearCodes(){securityVersion++;codes=[];if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null;dialog.replaceChildren();}
 dialog.addEventListener('close',clearCodes);
 function clear(){resetForm();if(dialog.open)dialog.close();clearCodes();}
 async function openSecurity(){
  $('main-menu').classList.remove('open');$('menu-btn').setAttribute('aria-expanded','false');
  clearCodes();
  const version=securityVersion,owner=state.user.id;
  dialog.innerHTML='<header><div><span>YOUR ACCOUNT</span><h2 id="account-security-title">Private recovery codes</h2></div><button type="button" data-close aria-label="Close account security">×</button></header><p>Save codes before you forget your password. Each code works once, from any device. Neither your MAC address nor the server IP is used.</p><p class="security-code-status">Checking recovery setup…</p><form><label for="security-current-password">Confirm your current password</label><input id="security-current-password" type="password" autocomplete="current-password" required><p>Generating a fresh set replaces all older codes and pending reset windows.</p><button class="btn btn-primary" type="submit">Generate private codes</button></form><p class="security-error" role="alert"></p><div class="security-saved-codes" hidden></div>';
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.showModal();
  const form=dialog.querySelector('form'),error=dialog.querySelector('.security-error');
  form.onsubmit=async e=>{
   e.preventDefault();const button=form.querySelector('button');button.disabled=true;error.textContent='';
   try{
    const currentPassword=$('security-current-password').value;$('security-current-password').value='';
    const data=await apiCall('POST','/api/auth/recovery-codes',{currentPassword});
    if(!dialog.open||securityVersion!==version||state.user?.id!==owner)return;
    codes=data.codes;form.hidden=true;dialog.querySelector('.security-code-status').textContent='Shown once. Save these somewhere private, outside this browser.';
    const output=dialog.querySelector('.security-saved-codes');output.hidden=false;output.replaceChildren();
    const pre=document.createElement('pre');pre.textContent=codes.join('\n');output.append(pre);
    const download=document.createElement('button');download.type='button';download.className='btn btn-primary';download.textContent='Download recovery codes';
    download.onclick=()=>{
     if(downloadUrl)URL.revokeObjectURL(downloadUrl);
     const text=`LAN Messenger private recovery codes\nAccount: ${state.user.username}\nGenerated: ${new Date().toISOString()}\n\nKeep this file private. Each code can be used once. After a password reset, sign in and generate a fresh set.\n\n${codes.join('\n')}\n`;
     downloadUrl=URL.createObjectURL(new Blob([text],{type:'text/plain'}));const link=document.createElement('a');link.href=downloadUrl;link.download='lan-messenger-recovery-codes.txt';link.click();
    };output.append(download);
    const done=document.createElement('button');done.type='button';done.className='btn btn-secondary';done.textContent='I saved my codes';done.onclick=()=>dialog.close();output.append(done);
   }catch(e){error.textContent=e.message;}finally{button.disabled=false;}
  };
  try{const status=await apiCall('GET','/api/auth/recovery-codes');if(dialog.open&&securityVersion===version&&state.user?.id===owner&&!codes.length)dialog.querySelector('.security-code-status').textContent=status.enabled?`${status.remaining} unused codes available. Saved codes cannot be viewed again.`:'Recovery is not set up. Save a set of codes now.';}catch(e){if(dialog.open&&securityVersion===version)error.textContent=e.message;}
 }
 $('menu-security').addEventListener('click',openSecurity);
 $('forgot-password-link').addEventListener('click',resetForm);
 $('back-to-login').addEventListener('click',resetForm);
 document.querySelectorAll('.auth-tab').forEach(tab=>tab.addEventListener('click',resetForm));
 $('reset-form').addEventListener('submit',async e=>{
  e.preventDefault();const button=$('reset-btn'),username=$('reset-username').value.trim();button.disabled=true;$('auth-error').style.display='none';
  const version=resetVersion;
  try{
   if(!resetToken){
    const data=await apiCall('POST','/api/auth/recovery/verify',{username,recoveryCode:$('reset-recovery-code').value});
    if(version!==resetVersion)return;
    resetToken=data.resetToken;deadline=Date.now()+data.expiresIn*1000;
    $('reset-recovery-code').value='';$('reset-recovery-code').required=false;$('reset-recovery-code').disabled=true;
    $('recovery-username-field').hidden=true;$('recovery-code-field').hidden=true;$('recovery-password-fields').hidden=false;
    ['reset-new-password','reset-confirm-password'].forEach(id=>{$(id).disabled=false;$(id).required=true;});
    const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));$('recovery-countdown').textContent=`Set your password within ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;if(!remaining){resetForm();showAuthError('Reset window expired. Use another saved recovery code.');}};
    tick();clock=setInterval(tick,1000);button.textContent='Save new password';$('reset-new-password').focus();
   }else{
    if($('reset-new-password').value!==$('reset-confirm-password').value)throw Error('Passwords do not match.');
    const data=await apiCall('POST','/api/auth/reset-password',{resetToken,newPassword:$('reset-new-password').value});
    if(version!==resetVersion)return;
    resetForm();$('reset-form').style.display='none';$('login-form').style.display='flex';$('login-username').value=username;$('login-password').value='';showToast(data.message);$('login-password').focus();
   }
  }catch(e){if(version===resetVersion)showAuthError(e.message);}finally{if(version===resetVersion)button.disabled=false;}
 });
 window.MessengerRecovery={clear};
})();
