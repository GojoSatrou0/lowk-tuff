import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponMotion,sniperScope} from '../src/weapon-presentation.js';
import {WEAPONS,isMelee} from '../src/shared.js';

test('weapon motion stays bounded, gives guns a kick, and fully settles without gun recoil on melee',()=>{
  for(let id=0;id<WEAPONS.length;id++){
    for(let age=0;age<1.5;age+=.007){const p=weaponMotion(id,age);for(const value of Object.values(p))assert(Number.isFinite(value)&&Math.abs(value)<2);if(isMelee(id)||WEAPONS[id].throwable)assert.equal(p.kick,0);}
    const rest=weaponMotion(id,10);assert.equal(rest.kick,0);assert.equal(rest.cycle,0);assert.equal(rest.bolt,0);
    if(!isMelee(id)&&!WEAPONS[id].throwable)assert(weaponMotion(id,.012).kick>0);
    assert.equal(weaponMotion(id,NaN).kick,0);
  }
  assert(weaponMotion(2,.03).kick>weaponMotion(1,.03).kick);
  assert(weaponMotion(2,.03,{ads:1}).kick<weaponMotion(2,.03).kick);
});
test('reload animation follows each weapon duration; equip and bolt actions finish cleanly',()=>{
  for(let id=0;id<WEAPONS.length;id++){const w=WEAPONS[id];if(!w.reload)continue;
    assert.equal(weaponMotion(id,10,{reload:w.reload}).reload,0);
    assert(weaponMotion(id,10,{reload:w.reload*.5}).reload>.9);
    assert.equal(weaponMotion(id,10,{reload:0}).reload,0);
  }
  assert.equal(weaponMotion(2,0).bolt,0);assert(weaponMotion(2,.3).bolt>.9);assert.equal(weaponMotion(2,.85).bolt,0);
  assert.equal(weaponMotion(0,10,{equipAge:0}).equip,1);assert.equal(weaponMotion(0,10,{equipAge:.3}).equip,0);
});
test('scoped firing shows optical recoil, delayed shell ejection and the actual firing lockout',()=>{
  const start=sniperScope({age:.02,cooldown:1});assert(start.visible&&start.kick>0&&start.flash>0);assert.equal(start.casing,0);assert.equal(start.status,'CYCLING BOLT');assert.equal(start.ready,false);
  const bolt=sniperScope({age:.35,cooldown:.7});assert(bolt.bolt>.9);assert(bolt.casing>0);assert(bolt.progress>0&&bolt.progress<1);
  const settled=sniperScope({age:1.2,cooldown:0});assert.equal(settled.kick,0);assert.equal(settled.casing,0);assert.equal(settled.status,'READY');assert.equal(settled.progress,1);
  assert.equal(sniperScope({age:10,cooldown:.22}).status,'SETTLING');assert.equal(sniperScope({age:10,ammo:0}).status,'RELOAD · R');assert.equal(sniperScope({age:10,reload:1}).status,'RELOADING');
});
test('scope effects do not replay for other weapons, non-shots, or reduced motion',()=>{
  for(const age of [-1,NaN,Infinity,10]){const s=sniperScope({age});assert.equal(s.kick,0);assert.equal(s.flash,0);assert.equal(s.casing,0);}
  assert.equal(sniperScope({weapon:0,age:.02}).visible,false);assert.equal(sniperScope({weapon:0,age:.02}).kick,0);assert.equal(sniperScope({ads:0}).visible,false);
  const reduced=sniperScope({age:.3,cooldown:.7,reduced:true});for(const key of ['kick','flash','bolt','lift','casing'])assert.equal(reduced[key],0);assert.equal(reduced.status,'CYCLING BOLT');
  const pose=weaponMotion(2,.03,{reload:1,equipAge:0,reduced:true});for(const key of ['kick','side','bolt','boltLift','cycle','pump','reload','magazine','equip'])assert.equal(pose[key],0);
});
