import test from 'node:test';
import assert from 'node:assert/strict';
import {TICK} from '../src/shared.js';
import {createTraining,stepTraining,resetTraining,toggleTrainingPace} from '../src/training.js';
test('parry drill rewards real timed blocks, records missed timing, and automatically retries',()=>{
  const m=createTraining('parry'),p=m.players[0];assert.deepEqual(p.loadout,[10]);
  for(let n=0;n<160;n++)stepTraining(m,{altId:n>=125?1:0});
  assert.equal(m.training.result.label,'PARRY LANDED');assert.equal(m.training.successes,1);assert.equal(m.training.streak,1);assert.equal(p.hp,100);assert(m.events.some(e=>e.type==='parry'));
  const revision=m.training.revision;for(let n=0;n<130;n++)stepTraining(m,{altId:1});assert(m.training.revision>revision);
  for(let n=0;n<170&&!m.training.result;n++)stepTraining(m,{altId:1});assert.equal(m.training.result.success,false);assert.equal(m.training.streak,0);assert.equal(m.training.best,1);
  assert(m.events.every(e=>!['coins','roundEnd','matchEnd'].includes(e.type)));assert.equal(m.phase,'live');
});
test('stun practice teaches a real speed win and preserves the full stun duration',()=>{
  const m=createTraining('stun'),[p,bot]=m.players;let fireId=0;
  for(let n=0;n<180&&!m.training.result;n++){const d=Math.hypot(p.p[0]-bot.p[0],p.p[2]-bot.p[2]);if(d<3.1)fireId=1;stepTraining(m,{yaw:0,z:1,sprint:true,fireId});}
  assert.equal(m.training.result?.label,'RIVAL STUNNED');assert.equal(m.training.successes,1);assert.equal(bot.stun,.75);assert.equal(p.hp,100);assert.equal(bot.hp,100);
  stepTraining(m,{yaw:0,fireId:1});assert(bot.stun>0&&bot.stun<.75);
});
test('charging trainer can win, stun the stationary player, then let them recover',()=>{
  const m=createTraining('stun');toggleTrainingPace(m);assert(m.training.charging);const [p,bot]=m.players;let fireId=0;
  for(let n=0;n<300&&!m.training.result;n++){const d=Math.hypot(p.p[0]-bot.p[0],p.p[2]-bot.p[2]);if(d<3.1)fireId=1;stepTraining(m,{yaw:0,fireId});}
  assert.equal(m.training.result?.label,'YOU WERE STUNNED');assert.equal(p.stun,.75);
  for(let i=0;i<50;i++)stepTraining(m,{yaw:0,fireId:1});assert.equal(p.stun,0);
  const count=m.training.attempts;resetTraining(m);assert.equal(m.training.attempts,count);assert.equal(p.grapple,null);assert.equal(p.abilityCD,0);
  resetTraining(m,{clearStats:true});assert.equal(m.training.attempts,0);
});
test('empty attempts finish with feedback and never mutate an account kit or grant rewards',()=>{
  for(const kind of ['parry','stun']){const m=createTraining(kind);for(let i=0;i<Math.ceil(8.1/TICK);i++)stepTraining(m,{});assert(m.training.attempts>0);assert.equal(m.round,0);assert.equal(m.players.length,2);assert(m.players.every(p=>p.hp===100&&p.score===0));assert(!m.events.some(e=>e.type==='coins'));}
});
