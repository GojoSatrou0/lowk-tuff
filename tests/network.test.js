import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createArenaServer} from '../server.js';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('HTTP katana parry blocks a WebSocket shooter and expires on the authoritative server',async t=>{
  const app=createArenaServer({port:0,host:'127.0.0.1'}),address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const post=async d=>{const r=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});assert.equal(r.status,200);return r.json();};
  const profile=await post({action:'profile'});app.profiles.reward(profile.profileToken,200);
  await post({action:'purchase',profileToken:profile.profileToken,weapon:10});await post({action:'loadout',profileToken:profile.profileToken,loadout:[10,1,2,3,4]});
  const a=await post({action:'create',name:'Shooter'}),b=await post({action:'join',name:'Guard',room:a.room,profileToken:profile.profileToken});
  const ws=new WebSocket(`ws://127.0.0.1:${address.port}/socket`);t.after(()=>ws.close());await new Promise(resolve=>ws.on('open',resolve));ws.send(JSON.stringify({token:a.token}));
  const match=app.rooms.get(a.room).match;match.phase='live';match.clock=90;const shooter=match.players.find(p=>p.id===a.you),guard=match.players.find(p=>p.id===b.you);shooter.p=[-12,0,12];guard.p=[-12,0,4];shooter.cooldown=0;
  await post({action:'input',token:b.token,input:{seq:1,weapon:10,altId:1}});await delay(40);
  ws.send(JSON.stringify({action:'input',input:{seq:1,weapon:0,fireId:1,ads:true}}));await delay(100);
  let view=await post({action:'poll',token:b.token});assert.equal(view.players.find(p=>p.id===b.you).hp,100);assert(view.events.some(e=>e.type==='parry'&&e.player===b.you));
  assert(!JSON.stringify(view).includes(profile.profileToken));
  await delay(720);ws.send(JSON.stringify({action:'input',input:{seq:2,weapon:0,fireId:2,ads:true}}));await delay(100);
  view=await post({action:'poll',token:b.token});assert(view.players.find(p=>p.id===b.you).hp<100);assert.equal(view.players.find(p=>p.id===b.you).parry,0);
});
test('two real HTTP clients create/join/ready/move; invalid session and third player rejected',async t=>{
  const app=createArenaServer({port:0,host:'127.0.0.1'});const address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const request=async data=>{const r=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
  const a=(await request({action:'create',name:'Alpha',map:'canyon'})).data;assert(a.token);assert.equal(a.map,'canyon');
  const b=(await request({action:'join',name:'Bravo',room:a.room})).data;assert.equal(b.players.length,2);assert.notEqual(a.you,b.you);assert.equal((await request({action:'join',room:a.room})).status,409);assert.equal((await request({action:'input',token:'fake',input:{}})).status,410);
  await request({action:'ready',token:a.token});let s=(await request({action:'ready',token:b.token})).data;assert.equal(s.phase,'countdown');
  await delay(3100);
  for(let seq=1;seq<=10;seq++){await request({action:'input',token:a.token,input:{seq,z:1,yaw:0,sprint:true}});await delay(50);}
  s=(await request({action:'poll',token:b.token})).data;assert.equal(s.phase,'live');const p=s.players.find(p=>p.id===a.you);assert(p.p[2]<21);assert.equal(p.hp,100);
  // Client-supplied health/position/score are ignored.
  await request({action:'input',token:a.token,input:{seq:20,hp:999,score:5,p:[500,500,500]}});s=(await request({action:'poll',token:a.token})).data;assert.equal(s.players[0].score,0);assert.equal(s.players[0].hp,100);
  await request({action:'leave',token:b.token});s=(await request({action:'poll',token:a.token})).data;assert.equal(s.phase,'waiting');assert.equal(s.players.length,1);
  assert.equal((await fetch(base+'/server.js')).status,404);assert.equal((await fetch(base+'/src/shared.js')).status,200);assert.equal((await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.invalid'},body:'{}'})).status,403);
});
test('WebSocket and HTTP compatibility client share authoritative state',async t=>{
  const app=createArenaServer({port:0,host:'127.0.0.1'});const address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const post=async d=>(await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})).json();
  const a=await post({action:'create',name:'WS'}),b=await post({action:'join',name:'HTTP',room:a.room});
  const ws=new WebSocket(`ws://127.0.0.1:${address.port}/socket`);t.after(()=>ws.close());let latest;
  const first=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('WS snapshot timeout')),2000);ws.on('message',raw=>{latest=JSON.parse(raw);if(latest.type==='snapshot'){clearTimeout(timeout);resolve(latest);}});});
  await new Promise(resolve=>ws.on('open',resolve));ws.send(JSON.stringify({token:a.token}));assert.equal((await first).players.length,2);
  ws.send(JSON.stringify({action:'ready'}));await post({action:'ready',token:b.token});await delay(120);assert.equal(latest.phase,'countdown');assert.equal(latest.you,a.you);
  ws.send(JSON.stringify({action:'input',input:{seq:1,hp:1000,damage:999}}));await delay(80);assert(latest.players.every(p=>p.hp===100));
});
test('HTTP melee inputs produce one shared clash and stun snapshot over WebSocket and polling',async t=>{
  const app=createArenaServer({port:0,host:'127.0.0.1'}),address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const post=async data=>{const r=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,200);return r.json();};
  const a=await post({action:'create'}),b=await post({action:'join',room:a.room});
  const ws=new WebSocket(base.replace('http:','ws:')+'/socket');t.after(()=>ws.terminate());
  let received;ws.on('message',raw=>{const s=JSON.parse(raw);if(s.events?.some(e=>e.type==='clash'))received=s;});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({token:a.token}));
  await Promise.all([post({action:'input',token:a.token,input:{seq:1,weapon:4,fireId:1,yaw:0,speed:999,stun:0}}),post({action:'input',token:b.token,input:{seq:1,weapon:4,fireId:1,yaw:Math.PI}})]);
  const match=app.rooms.get(a.room).match;
  for(const p of match.players){const first=p.id===a.you;p.weapon=4;p.cooldown=0;p.p=[-12,0,first?1.1:-1.1];p.v=[0,0,first?-18:8];p.dash=.15;}
  match.phase='live';match.clock=90;await delay(100);
  const polled=await post({action:'poll',token:b.token});const clash=polled.events.find(e=>e.type==='clash');assert.equal(clash.winner,a.you);assert(clash.speeds.every(v=>v<33));assert(polled.players.find(p=>p.id===b.you).stun>0);
  assert.equal(received.events.find(e=>e.type==='clash').id,clash.id);assert.equal(received.players.find(p=>p.id===b.you).hp,100);
  for(const file of ['/robots.txt','/sitemap.xml']){const r=await fetch(base+file);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/plain|application\/xml/);}
});
test('network grapple anchors are server chosen and stale or released input drops the rope',async t=>{
  const app=createArenaServer({port:0,host:'127.0.0.1'}),address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const post=async data=>{const r=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,200);return r.json();};
  const a=await post({action:'create'}),b=await post({action:'join',room:a.room});await post({action:'ready',token:a.token});await post({action:'ready',token:b.token});await delay(3100);
  const ws=new WebSocket(base.replace('http:','ws:')+'/socket');t.after(()=>ws.terminate());let hooked;
  ws.on('message',raw=>{const s=JSON.parse(raw);if(s.players?.find(p=>p.id===a.you)?.grapple)hooked=s;});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({token:a.token}));
  ws.send(JSON.stringify({action:'input',input:{seq:1,grapple:true,grappleId:1,yaw:0,anchor:[999,999,999]}}));await delay(120);
  const view=await post({action:'poll',token:b.token}),p=view.players.find(p=>p.id===a.you);assert(p.grapple);assert(p.grapple.anchor.every(v=>Math.abs(v)<30));assert(p.v[2]<0);assert(hooked);
  assert.deepEqual(hooked.players.find(p=>p.id===a.you).grapple.anchor,p.grapple.anchor);
  await delay(300);const released=(await post({action:'poll',token:b.token})).players.find(p=>p.id===a.you);assert.equal(released.grapple,null);assert(released.grappleCD>0);
});
