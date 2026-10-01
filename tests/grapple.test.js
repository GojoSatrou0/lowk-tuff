import test from 'node:test';
import assert from 'node:assert/strict';
import {GRAPPLE,MOVEMENT,WEAPONS,TICK,createPlayer,createFreePlay,cleanInput,movePlayer,stepMatch,resetPlayer,MAPS,horizontalSpeed,damagePlayer} from '../src/shared.js';
const wall={extent:50,boxes:[{x:0,y:0,z:-12,w:8,h:12,d:1}],ramps:[]};
const hold=(extra={})=>cleanInput({grapple:true,grappleId:1,...extra});
test('grapple attaches to real geometry, pulls, preserves released momentum and leaves every weapon untouched',()=>{
  for(let weapon=0;weapon<WEAPONS.length;weapon++){
    const p=createPlayer('p','P');p.weapon=weapon;const ammo=[...p.ammo];
    for(let i=0;i<24;i++)movePlayer(p,hold(),wall,TICK);
    assert(p.grapple);assert.equal(p.grapple.anchor[2],-11.5);assert(p.p[2]<-1);assert(horizontalSpeed(p)>10);assert.equal(p.weapon,weapon);assert.deepEqual(p.ammo,ammo);
    const speed=horizontalSpeed(p);movePlayer(p,cleanInput({grappleId:1}),wall,TICK);assert.equal(p.grapple,null);assert(p.grappleCD>2);assert(horizontalSpeed(p)>speed*.9);
    movePlayer(p,hold({grappleId:2}),wall,TICK);assert.equal(p.grapple,null);
  }
});
test('grapple rejects air and out-of-range anchors; forged anchor/cooldown and force are ignored',()=>{
  for(const map of [{extent:50,boxes:[],ramps:[]},{...wall,boxes:wall.boxes.map(b=>({...b,z:-40}))}]){
    const p=createPlayer('p','P');movePlayer(p,hold(),map,TICK);assert.equal(p.grapple,null);
  }
  const input=cleanInput({grapple:{anchor:[9,99,9]},anchor:[9,99,9],grappleCD:0,pull:999,grappleId:Infinity});
  assert.equal(input.grapple,false);assert.equal(input.grappleId,0);for(const key of ['anchor','grappleCD','pull'])assert.equal(input[key],undefined);
});
test('rope breaks on obstructed line of sight, expires, and cannot move through thin cover',()=>{
  const p=createPlayer('p','P');movePlayer(p,hold(),wall,TICK);assert(p.grapple);
  const blocked={...wall,boxes:[...wall.boxes,{x:0,y:0,z:-3,w:8,h:12,d:.05}]};movePlayer(p,hold(),blocked,TICK);assert.equal(p.grapple,null);
  const q=createPlayer('q','Q');for(let i=0;i<150;i++){movePlayer(q,hold(),wall,TICK);assert(q.p[2]>=-11.14-1e-8);assert(horizontalSpeed(q)<=MOVEMENT.maxSpeed+1e-8);}assert.equal(q.grapple,null);
  // A held key never automatically reattaches after cooldown.
  for(let i=0;i<180;i++)movePlayer(q,hold(),wall,TICK);assert.equal(q.grapple,null);
});
test('stun, death and reset cancel the rope and consume attempts during stun',()=>{
  const p=createPlayer('p','P');movePlayer(p,hold(),wall,TICK);p.stun=.2;
  movePlayer(p,hold({grappleId:2}),wall,TICK);assert.equal(p.grapple,null);assert.equal(p.lastGrapple,2);
  for(let i=0;i<180;i++)movePlayer(p,hold({grappleId:2}),wall,TICK);assert.equal(p.grapple,null);
  p.p=[0,0,0];movePlayer(p,hold({grappleId:3}),wall,TICK);assert(p.grapple);
  const m=createFreePlay();m.players=[p];damagePlayer(m,p,'enemy',0,100,false,p.p);assert.equal(p.grapple,null);
  resetPlayer(p,MAPS[0]);assert.equal(p.grappleCD,0);assert.equal(p.lastGrapple,0);assert.equal(p.hp,100);
});
test('grapple and gunfire can coexist and snapshot state contains only server-chosen anchors',()=>{
  const m=createFreePlay(),p=m.players[0];p.p=[0,0,12];p.cooldown=0;
  stepMatch(m,{you:hold({fireId:1,anchor:[999,999,999]})});assert(p.grapple);assert(p.grapple.anchor[2]<12);assert.equal(p.ammo[0],23);assert(m.events.some(e=>e.type==='shot'));
});
