import {ADMIN_TOYS} from './admin-rules.js';
const $=id=>document.getElementById(id);
export function createAdminPanel({getUser,getMatch,send,onOpen,notify}){
  let busy=false;const dialog=$('admin-dialog');
  $('admin-toys').innerHTML=ADMIN_TOYS.map(t=>`<button type="button" class="admin-toy" data-admin-toy="${t.id}"><strong>${t.label}</strong><small>${t.note}</small><span data-admin-state="${t.id}"></span></button>`).join('');
  function render(){
    const admin=getUser()?.admin===true,m=getMatch(),available=admin&&m?.canAdmin===true;
    for(const b of document.querySelectorAll('[data-admin-open]'))b.hidden=!admin;
    if(!admin&&dialog.open)dialog.close();
    $('admin-message').textContent=!available?'Create a private room or start solo while signed in to use your toys.':m.playground?.used?'Playground active. Coins stay disabled until you create a new room.':'Your room, your rules. Using any toy disables coin rewards in this room.';
    $('admin-room-status').hidden=!m?.playground?.used;
    for(const toy of ADMIN_TOYS){const b=document.querySelector(`[data-admin-toy="${toy.id}"]`);b.disabled=busy||!available||(toy.live&&m.phase!=='live');
      if(toy.toggle){b.setAttribute('aria-pressed',String(!!m?.playground?.[toy.id]));document.querySelector(`[data-admin-state="${toy.id}"]`).textContent=m?.playground?.[toy.id]?'ON':'OFF';}}
  }
  for(const b of document.querySelectorAll('[data-admin-open]'))b.onclick=()=>{onOpen();render();dialog.showModal();};
  $('admin-close').onclick=() =>dialog.close();
  for(const b of document.querySelectorAll('[data-admin-toy]'))b.onclick=async()=>{if(busy)return;busy=true;render();try{await send(b.dataset.adminToy,$('admin-target').value);}catch(e){notify(e.message);}finally{busy=false;render();}};
  document.addEventListener('velocity-account-change',render);render();return {render};
}
