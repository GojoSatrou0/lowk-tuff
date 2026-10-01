import test from 'node:test';
import assert from 'node:assert/strict';
import {attackEffects,bladeSwing} from '../src/weapon-presentation.js';
import {createMatch,createPlayer,cleanInput,stepMatch,castShot,WEAPONS} from '../src/shared.js';

test('all melee attacks use a whoosh without gun recoil, flashes, tracers or shells',()=>{
  for(const id of [4,10,14])assert.deepEqual(attackEffects(id),{sound:'swing',recoil:0,muzzle:0,tracer:false,casings:false,flame:false});
  assert.equal(attackEffects(0).tracer,true);assert.equal(attackEffects(0).casings,true);assert.equal(attackEffects(0).sound,'shot');
  for(const id of [8,9,12])assert.equal(attackEffects(id).tracer,false);
  assert.equal(attackEffects(12).flame,true);
});
test('blade crosses the view, alternates its cut, settles, and keeps a smaller reduced-motion swing',()=>{
  const rest=bladeSwing(10),cut=bladeSwing(.19,1),reverse=bladeSwing(.19,2),reduced=bladeSwing(.19,1,true);
  assert.deepEqual(bladeSwing(0),rest);assert.deepEqual(bladeSwing(.42),rest);assert.deepEqual(bladeSwing(NaN),rest);
  assert.ok(cut.position[0]<-.25);assert.ok(cut.rotation[2]>1);assert.ok(reverse.rotation[2]<-1);
  assert.ok(Math.abs(reduced.position[0])>0&&Math.abs(reduced.position[0])<Math.abs(cut.position[0]));
  for(let age=0;age<.45;age+=.005)for(const value of Object.values(bladeSwing(age)).flat())assert.ok(Number.isFinite(value));
});
function duel(aPos,bPos){const m=createMatch();m.phase='live';m.clock=90;m.players=[createPlayer('a','A'),createPlayer('b','B',1)];m.players[0].weapon=4;m.players[0].p=aPos;m.players[1].p=bPos;return m;}
const attack=m=>stepMatch(m,{a:cleanInput({weapon:4,fire:true}),b:cleanInput()});
test('blade deals close-range damage once per click and cannot shoot distant targets or spawn projectiles',()=>{
  const near=duel([-12,0,12],[-12,0,9.5]);attack(near);assert.equal(near.players[1].hp,45);
  for(let i=0;i<60;i++)attack(near);assert.equal(near.players[1].hp,45);assert.equal(near.players[0].ammo[4],-1);assert.equal(near.projectiles.length,0);
  const far=duel([-12,0,12],[-12,0,7]);attack(far);assert.equal(far.players[1].hp,100);assert.equal(far.projectiles.length,0);
  const target=createPlayer('b','B',1);target.p=[0,0,-2];const wall={boxes:[{x:0,z:-1,y:0,w:3,h:3,d:.2}],ramps:[]};
  assert.equal(castShot([0,1.62,0],[0,0,-1],wall,[target],'a',WEAPONS[4].range).target,null);
});
