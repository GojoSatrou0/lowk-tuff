import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,WEAPONS,TICK,createFreePlay,resetFreePlay,stepMatch,cleanInput} from '../src/shared.js';
test('free play starts alone on each chosen map and never completes rounds or earns rewards',()=>{
  for(const map of MAPS){const kit=[1,0,2,3,4],m=createFreePlay(map.id,'Practice',kit),p=m.players[0];
    assert.equal(m.players.length,1);assert.equal(p.id,'you');assert.equal(p.weapon,1);assert.deepEqual(p.p,map.spawns[0]);assert.notEqual(p.loadout,kit);
    for(let i=0;i<60*100;i++)stepMatch(m,{you:cleanInput({weapon:1})});
    assert.equal(m.phase,'live');assert.equal(m.clock,0);assert.equal(m.round,0);assert.equal(m.winner,null);assert.equal(p.score,0);assert.equal(p.hp,100);
    assert.equal(m.events.length,0);assert.equal(cleanInput({freePlay:true}).freePlay,undefined);
  }
});
test('free play keeps movement, shooting and reloads; reset refills and clears active effects',()=>{
  const m=createFreePlay(),p=m.players[0];
  for(let i=0;i<60;i++)stepMatch(m,{you:cleanInput({z:1,sprint:true,fire:true})});
  assert.ok(p.p[2]<MAPS[0].spawns[0][2]-5);assert.ok(p.ammo[0]<WEAPONS[0].ammo);assert.ok(m.events.some(e=>e.type==='shot'));
  stepMatch(m,{you:cleanInput({reload:true})});assert.ok(p.reload>0);
  for(let i=0;i<110;i++)stepMatch(m,{});assert.equal(p.ammo[0],WEAPONS[0].ammo);
  p.weapon=4;p.ammo[0]=0;p.hp=40;p.parry=.5;p.abilityCD=2;p.v=[2,3,4];m.projectiles=[{}];
  resetFreePlay(m);assert.deepEqual(p.p,MAPS[0].spawns[0]);assert.deepEqual(p.v,[0,0,0]);assert.equal(p.weapon,4);assert.equal(p.hp,100);assert.equal(p.ammo[0],24);assert.equal(p.abilityCD,0);assert.equal(p.parry,0);assert.equal(m.projectiles.length,0);assert.equal(m.events.length,0);assert.equal(m.phase,'live');
});
test('rocket jumping works in free play while self-damage cannot end practice',()=>{
  const m=createFreePlay('foundry','Practice',[9,1,2,3,4]),p=m.players[0];p.cooldown=0;
  stepMatch(m,{you:cleanInput({weapon:9,pitch:-1.48,fireId:1})});let lifted=false;
  for(let i=0;i<30;i++){stepMatch(m,{you:cleanInput({weapon:9,pitch:-1.48,fireId:1})});if(p.v[1]>3)lifted=true;assert.equal(p.hp,100);}
  assert.ok(lifted);assert.equal(m.phase,'live');assert.ok(m.events.some(e=>e.type==='explosion'));assert.ok(m.events.every(e=>!['roundEnd','matchEnd','coins'].includes(e.type)));
});
