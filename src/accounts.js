const $=id=>document.getElementById(id);
export function createAccounts({shop,beforeChange,notify}){
  const dialog=$('account-dialog'),form=$('account-form');let mode='login',busy=false;
  function message(text,error=false){$('account-message').textContent=text;$('account-message').classList.toggle('error',error);}
  function render(){
    const user=shop.user,register=mode==='register';
    $('account-open').textContent=user?user.username:'SIGN IN';$('account-open').setAttribute('aria-label',user?`Account: ${user.username}`:'Sign in or create account');
    $('account-title').textContent=user?'READY WHEN YOU ARE.':register?'MAKE IT YOURS.':'WELCOME BACK.';
    $('account-tabs').hidden=!!user;form.hidden=!!user;$('account-signed-in').hidden=!user;
    $('account-description').textContent=user?'Your progress is saved to your account on this game server.':register?'Keep your coins. Keep your kit. Pick up on another device.':'Use your email or username to load your saved progress.';
    $('account-username-display').textContent=user?.username||'';
    $('account-summary').textContent=`${shop.profile.coins} coins · ${shop.profile.owned.length} weapons unlocked`;
    $('account-email-display').textContent=user?.email||'';$('account-email-display').hidden=!user?.email;
    $('account-add-email').hidden=!user||!!user.email;
    $('account-identifier-row').hidden=register;$('account-identifier').required=!register;
    $('account-username-row').hidden=!register;$('account-username').required=register;
    $('account-email-row').hidden=!register;$('account-email').required=register;
    $('account-confirm-row').hidden=!register;$('account-confirm').required=register;
    $('account-password').autocomplete=register?'new-password':'current-password';$('account-password').minLength=register?15:1;
    $('account-submit').textContent=busy?'PLEASE WAIT…':register?'CREATE ACCOUNT ↗':'SIGN IN ↗';
    $('account-progress-note').textContent=register?'Creating an account keeps this guest’s current coins, weapons, and loadout. New players start with 100 coins.':'Existing accounts load their own progress. Guest coins are not added to an existing account.';
    for(const b of document.querySelectorAll('[data-account-mode]'))b.setAttribute('aria-pressed',String(b.dataset.accountMode===mode));
    for(const el of dialog.querySelectorAll('input,button'))el.disabled=busy;
  }
  function focusIdentity(){(mode==='register'?$('account-username'):$('account-identifier')).focus();}
  $('account-open').onclick=()=>{form.reset();$('account-add-email').reset();mode='login';message('');render();dialog.showModal();if(!shop.user)focusIdentity();};
  $('account-close').onclick=$('account-guest').onclick=()=>dialog.close();
  for(const b of document.querySelectorAll('[data-account-mode]'))b.onclick=()=>{mode=b.dataset.accountMode;form.reset();$('account-password').type=$('account-confirm').type='password';message('');render();focusIdentity();};
  $('account-show-password').onchange=e=>{$('account-password').type=$('account-confirm').type=e.target.checked?'text':'password';};
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  dialog.addEventListener('close',()=>{form.reset();$('account-add-email').reset();$('account-password').type=$('account-confirm').type='password';});
  form.onsubmit=async e=>{
    e.preventDefault();if(busy)return;
    if(mode==='register'&&$('account-password').value!==$('account-confirm').value){message('Your passwords do not match.',true);$('account-confirm').focus();return;}
    busy=true;message('Connecting to your account…');render();
    try{await beforeChange();const credentials=mode==='register'?{username:$('account-username').value.trim(),email:$('account-email').value.trim()}:{identifier:$('account-identifier').value.trim()};await shop.authenticate(mode,{...credentials,password:$('account-password').value});form.reset();message(mode==='register'?'Account created. You can now sign in with your email.':'Signed in. Your saved progress is ready.');notify(`Signed in as ${shop.user.username}.`);}
    catch(e){message(e.name==='TimeoutError'?'The server took too long. Try signing in again.':e.message,true);}
    finally{busy=false;render();}
  };
  $('account-add-email').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;message('Saving your email…');render();try{await beforeChange();await shop.authenticate('add-email',{email:$('account-link-email').value.trim(),password:$('account-link-password').value});$('account-add-email').reset();message('Email saved. You can now use it to sign in.');}catch(e){message(e.message,true);}finally{busy=false;render();}};
  $('account-logout').onclick=async()=>{if(busy)return;busy=true;message('Signing out…');render();try{await beforeChange();await shop.signOut();form.reset();mode='login';message('Signed out. Your account progress is saved.');notify('Signed out. Now playing as a guest.');}catch(e){message(e.message,true);}finally{busy=false;render();}};
  document.addEventListener('velocity-account-change',render);
  window.addEventListener('storage',async e=>{if(e.key!=='velocity-account-update')return;await beforeChange();await shop.refreshIdentity();message('Account updated in another tab.');render();});
  render();
}
