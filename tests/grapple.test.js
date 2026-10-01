import test from 'node:test';
import assert from 'node:assert/strict';
import {GRAPPLE,MOVEMENT,WEAPONS,TICK,createPlayer,createFreePlay,cleanInput,movePlayer,stepMatch,resetPlayer,MAPS,horizontalSpeed,damagePlayer,eyeHeight,rayWorld,forward} from '../src/shared.js';
const wall={extent:50,boxes:[{x:0,y:0,z:-12,w:8,h:12,d:1}],ramps:[]};
const hold=(extra={})=>cleanInput({grapple:true,grappleId:1,...extra});
test('overhead beams accept grapples across their span and pull players upward on both industrial maps',()=>{
  for(const map of MAPS.filter(m=>m.id!=='canyon'))for(const x of [-22,0,22]){
    const p=createPlayer('p','P');p.p=[x,0,-6];
    const pitch=Math.atan2(12-eyeHeight(p),4),input=hold({pitch});
    movePlayer(p,input,map,TICK);
    assert(p.grapple,`${map.id} beam at x=${x}`);
    assert(Math.abs(p.grapple.anchor[0]-x)<1e-8);
    assert(p.grapple.anchor[1]>=11.725-1e-8&&p.grapple.anchor[1]<=12.275+1e-8);
    assert(Math.abs(p.grapple.anchor[2]+10)<=.35+1e-8);
    for(let i=0;i<20;i++)movePlayer(p,input,map,TICK);
    assert(p.p[1]>2,'rope should gain height');
    movePlayer(p,cleanInput({grappleId:1}),map,TICK);assert.equal(p.grapple,null);assert(p.grappleCD>2);
  }
});
test('beam collision stops an upward pull, supports landing, and leaves adjacent sky open',()=>{
  for(const map of MAPS.filter(m=>m.id!=='canyon')){
    const p=createPlayer('p','P');p.p=[3,7,-9.65];p.ground=false;p.v=[0,24,0];
    const input=hold({pitch:Math.atan2(12-(p.p[1]+eyeHeight(p)),.35)});
    for(let i=0;i<75;i++){movePlayer(p,input,map,TICK);if(Math.abs(p.p[2]+10)<.35)assert(p.p[1]+(p.crouch?1.15:1.8)<=11.725+1e-8,'head must not pass through the beam');}
    const landed=createPlayer('landed','L');landed.p=[3,13,-10];landed.ground=false;
    for(let i=0;i<60;i++)movePlayer(landed,cleanInput(),map,TICK);
    assert(landed.ground);assert(Math.abs(landed.p[1]-12.275)<1e-8);
    const origin=[3,9,-20];assert.equal(rayWorld(origin,forward(Math.PI,Math.atan2(5,10)),map,30),30,'sky above beam stays open');
    const distant=createPlayer('far','F');distant.p=[3,0,23];movePlayer(distant,hold({pitch:Math.atan2(12-eyeHeight(distant),33)}),map,TICK);assert.equal(distant.grapple,null);
  }
  assert(!MAPS.find(m=>m.id==='canyon').boxes.some(b=>b.kind==='gantry'));
});
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
