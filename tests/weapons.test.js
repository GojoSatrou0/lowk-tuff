import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS,TICK,createMatch,createPlayer,cleanInput,stepMatch,stepProjectiles,movePlayer,startRound} from '../src/shared.js';
const empty={extent:100,boxes:[],ramps:[]};
function duel(weapon){const m=createMatch();m.phase='live';m.clock=90;m.players=[createPlayer('a','A'),createPlayer('b','B',1)];const [a,b]=m.players;a.p=[-12,0,12];b.p=[12,0,-12];a.loadout=[weapon,1,2,3,4];a.weapon=weapon;return m;}
function tick(m,extra={}){stepMatch(m,{a:cleanInput({weapon:m.players[0].weapon,...extra}),b:cleanInput()});}
test('unequipped weapons cannot be selected by forged input',()=>{const m=duel(0);tick(m,{weapon:9,fire:true});assert.equal(m.players[0].weapon,0);assert.equal(m.projectiles.length,0);});
test('burst fires exactly three shots after release and stops at an empty magazine',()=>{
  const m=duel(5),a=m.players[0];tick(m,{fire:true});for(let i=0;i<50;i++)tick(m);assert.equal(a.shots,3);assert.equal(a.ammo[5],24);
  a.ammo[5]=1;a.cooldown=0;tick(m,{fire:true});for(let i=0;i<180;i++)tick(m);assert.equal(a.shots,4);assert.equal(a.burstLeft,0);assert.equal(a.ammo[5],27);
});
test('revolver is semi-auto while dual pistols continue firing while held',()=>{
  const a=duel(6),b=duel(7);for(let i=0;i<60;i++){tick(a,{fire:true});tick(b,{fire:true});}assert.equal(a.players[0].shots,1);assert(b.players[0].shots>=8);assert(b.players[0].shots<=10);
});
test('bow charge increases projectile speed and damage; arrows travel, drop, and hit once',()=>{
  const weak=duel(8),charged=duel(8);tick(weak,{fire:true});for(let i=0;i<70;i++)tick(charged,{ads:true});tick(charged,{ads:true,fire:true});
  const q=charged.projectiles[0];assert(q.damage>weak.projectiles[0].damage);assert(Math.abs(q.v[2])>Math.abs(weak.projectiles[0].v[2]));assert.equal(charged.players[1].hp,100);assert(charged.players[0].reload>0);
  const y=q.p[1];stepProjectiles(charged,empty,.05);assert(q.p[1]<y);
  const m=duel(8);m.players[1].p=[-12,0,4];tick(m,{fire:true});assert.equal(m.players[1].hp,100);for(let i=0;i<40;i++)stepProjectiles(m,empty,TICK);assert(m.players[1].hp<100);assert.equal(m.events.filter(e=>e.type==='hit').length,1);
});
test('rocket direct hits and splash damage respect cover, consume the rocket, and boost the shooter',()=>{
  const m=duel(9),[a,b]=m.players;a.p=[0,0,5];b.p=[0,0,0];const covered=createPlayer('c','C');covered.p=[2,0,0];m.players.push(covered);
  const map={...empty,boxes:[{x:1,z:0,y:0,w:.25,h:4,d:4}]};
  m.projectiles=[{id:1,owner:'a',weapon:9,kind:'rocket',p:[0,1,2],v:[0,0,-24],damage:85,life:4}];
  stepProjectiles(m,map,.1);assert.equal(b.hp,15);assert.equal(covered.hp,100);assert.equal(m.projectiles.length,0);stepProjectiles(m,map,.1);assert.equal(b.hp,15);
  a.p=[0,0,0];a.hp=100;m.projectiles=[{id:2,owner:'a',weapon:9,kind:'rocket',p:[0,1,0],v:[0,-24,0],damage:85,life:4}];stepProjectiles(m,empty,.1);assert(a.hp<100&&a.hp>60);assert(a.v[1]>0);assert(!a.ground);
});
test('katana has greater reach and sprint speed; round resets clear projectiles and ammo',()=>{
  const m=duel(10),[a,b]=m.players;b.p=[-12,0,8.8];tick(m,{fire:true});for(let n=0;n<8;n++)tick(m,{fire:true});assert.equal(b.hp,52);
  const blade=createPlayer('c','C');blade.weapon=4;const katana=createPlayer('d','D');katana.weapon=10;
  for(let i=0;i<60;i++){movePlayer(blade,cleanInput({z:1,sprint:true}),empty,TICK);movePlayer(katana,cleanInput({z:1,sprint:true}),empty,TICK);}assert(Math.abs(katana.v[2])>Math.abs(blade.v[2])+.9);
  m.projectiles=[{}];a.ammo[9]=0;startRound(m);assert.equal(m.projectiles.length,0);assert.equal(a.ammo[9],WEAPONS[9].ammo);
});
