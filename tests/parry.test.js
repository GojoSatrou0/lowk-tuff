import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS,TICK,createMatch,createPlayer,cleanInput,stepMatch,stepProjectiles,startRound,movePlayer} from '../src/shared.js';
const empty={extent:100,boxes:[],ramps:[]};
function duel(id,reverse=false){const m=createMatch();m.phase='live';m.clock=90;const a=createPlayer('a','A'),b=createPlayer('b','B',1);a.p=[-12,0,12];b.p=[-12,0,4];a.weapon=id;a.loadout=[id,1,2,3,4];b.weapon=10;b.loadout=[10,0,2,3,4];m.players=reverse?[b,a]:[a,b];return {m,a,b};}
function run(m,a={},b={}){stepMatch(m,{a:cleanInput({weapon:m.players.find(p=>p.id==='a').weapon,...a}),b:cleanInput({weapon:m.players.find(p=>p.id==='b').weapon,...b})});}
test('same-tick parry blocks every hitscan gun and flame, independent of player order',()=>{
  for(const id of [0,1,2,3,5,6,7,11,12,13])for(const reversed of [false,true]){const {m,a,b}=duel(id,reversed);a.spin=1;run(m,{fire:true,ads:true},{altId:1});assert.equal(b.hp,100,WEAPONS[id].name);assert(m.events.some(e=>e.type==='parry'),WEAPONS[id].name);assert(!m.events.some(e=>e.type==='hit'));}
});
test('parry catches a traveling arrow and consumes it without applying damage',()=>{
  const {m,b}=duel(8);run(m,{fire:true},{altId:1});assert.equal(m.projectiles.length,1);
  for(let i=0;i<35;i++)run(m,{}, {altId:1});assert.equal(b.hp,100);assert.equal(m.projectiles.length,0);assert(m.events.some(e=>e.type==='parry'&&e.weapon===8));
});
test('blade, katana, and scythe all damage a parrying katana user',()=>{
  for(const id of [4,10,14]){const {m,b}=duel(id);b.p=[-12,0,9.5];run(m,{fire:true},{altId:1});assert(b.parry>0);assert.equal(b.hp,100-WEAPONS[id].damage,WEAPONS[id].name);assert(!m.events.some(e=>e.type==='parry'));}
});
test('rocket direct hits and splash both bypass parry',()=>{
  for(const direct of [true,false]){const {m,b}=duel(9);b.p=[0,0,0];b.parry=.7;m.projectiles=[{id:1,owner:'a',weapon:9,kind:'rocket',p:direct?[0,1,2]:[1,1,0],v:direct?[0,0,-24]:[0,-24,0],damage:85,life:4}];stepProjectiles(m,empty,.1);assert(b.hp<100);assert(!m.events.some(e=>e.type==='parry'));}
});
test('guard is timed, holding does not repeat it, attacks are suppressed, and cooldown survives switching',()=>{
  const {m,b}=duel(0);run(m,{}, {altId:1,ads:true,fire:true});assert.equal(b.shots,0);assert.equal(b.parry,.75);
  for(let i=0;i<150;i++)run(m,{}, {altId:1,ads:true});assert.equal(b.parry,0);assert.equal(m.events.filter(e=>e.type==='guard').length,1);
  run(m,{}, {altId:1});run(m,{}, {altId:2});assert(b.parry>0);const remaining=b.abilityCD;
  run(m,{}, {weapon:0,altId:2});assert.equal(b.parry,0);run(m,{}, {weapon:10,altId:3});assert.equal(b.parry,0);assert(b.abilityCD<remaining&&b.abilityCD>2);
  startRound(m);assert.equal(b.parry,0);assert.equal(b.abilityCD,0);
});
test('forged parry timers are ignored and non-katana weapons cannot guard',()=>{
  const {m,b}=duel(0);run(m,{fire:true,ads:true},{weapon:0,altId:999,parry:999,abilityCD:0});assert(b.hp<100);assert.equal(b.parry,0);assert.equal(cleanInput({parry:999}).parry,undefined);assert.equal(cleanInput({altId:Infinity}).altId,0);
});
test('minigun needs sustained spin-up and trades movement speed for fire rate',()=>{
  const {m,a,b}=duel(11);b.p=[12,0,-12];for(let i=0;i<30;i++)run(m,{fire:true});assert.equal(a.shots,0);for(let i=0;i<35;i++)run(m,{fire:true});assert(a.shots>=9);run(m,{reload:true});assert(a.reload>0);assert(a.spin<1);
  const light=createPlayer('light','L'),heavy=createPlayer('heavy','H');heavy.weapon=11;for(let i=0;i<60;i++){movePlayer(light,cleanInput({z:1}),empty,TICK);movePlayer(heavy,cleanInput({z:1}),empty,TICK);}assert(Math.abs(heavy.v[2])<Math.abs(light.v[2])*.75);
});
test('flame cone has limited range and cannot damage through cover or outside its cone',()=>{
  for(const position of [[-8,0,5],[-12,0,-1],[0,0,-4]]){const {m,a,b}=duel(12);if(position[0]===0)a.p=[0,0,10];b.p=position;run(m,{fire:true},{weapon:0});assert.equal(b.hp,100);}
  const {m,b}=duel(12);run(m,{fire:true},{weapon:0});assert.equal(b.hp,93);
});
test('Shorty fires two distinct shell bursts, then reloads, and preserves pellet count',()=>{
  const {m,a,b}=duel(13);b.p=[12,0,-12];run(m,{fireId:1});for(let i=0;i<15;i++)run(m,{fireId:1});run(m,{fireId:2});assert.equal(a.ammo[13],0);assert.equal(m.events.filter(e=>e.type==='shot').length,2);assert.equal(m.events.find(e=>e.type==='shot').impacts.length,10);
  for(let i=0;i<15;i++)run(m,{fireId:2});run(m,{fireId:3});assert(a.reload>0);for(let i=0;i<110;i++)run(m,{fireId:3});assert.equal(a.ammo[13],2);
});
test('scythe dashes toward movement, collides with walls, and cannot spam its ability',()=>{
  const {m,a,b}=duel(14);b.p=[12,0,-12];run(m,{altId:1,x:1});assert(a.v[0]>20);assert(Math.abs(a.v[2])<.01);assert(a.dash>0);run(m,{altId:2,x:-1});assert(a.v[0]>20);assert.equal(m.events.filter(e=>e.type==='dash').length,1);
  a.p=[0,0,4.2];a.abilityCD=0;run(m,{altId:3,z:1});for(let i=0;i<20;i++)run(m,{altId:3,z:1});assert(a.p[2]>=3.8,'dash must stop at reactor cover');assert.equal(a.parry,0);
});
