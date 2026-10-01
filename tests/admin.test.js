import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {ProfileStore} from '../profile-store.js';import {openDatabaseProfiles} from '../database/profile-store.js';import {createArenaServer} from '../server.js';
import {WEAPONS,createMatch,createPlayer,movePlayer,cleanInput,TICK,endRound,stepMatch,MAPS,snapshot,startRound} from '../src/shared.js';import {ADMIN_TOYS,applyAdminToy} from '../src/admin-rules.js';import {WebSocket} from 'ws';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),password='Disposable admin fixture 746!';
function match(){const m=createMatch();m.phase='live';m.clock=90;m.players=[createPlayer('owner','Owner'),createPlayer('rival','Rival',1)];m.players[0].p=[-12,0,12];m.players[1].p=[12,0,-12];return m;}
test('console grant targets an existing account, unlocks all weapons once, preserves coins and never grants by display name',async()=>{
  const store=new ProfileStore(),guest=store.create();store.reward(guest.profileToken,40);store.purchase(guest.profileToken,13);store.equip(guest.profileToken,[0,13,4,19]);
  const account=await store.register('OwnerFixture',password,guest.profileToken);const before=structuredClone(store.getById(account.profileId));
  assert.throws(()=>store.grantAdmin('MissingUser'),/Existing account not found/);assert(!store.isAdmin(account.profileId));
  const result=store.grantAdmin('ownerfixture');assert.equal(result.weapons,WEAPONS.length);const p=store.getById(account.profileId);assert.equal(p.coins,before.coins);assert.equal(p.earned,before.earned);assert.deepEqual(p.loadout,before.loadout);assert.equal(p.revision,before.revision+1);store.grantAdmin('OwnerFixture');assert.equal(p.revision,before.revision+1);
  const restored=new ProfileStore();restored.restore(store.serialize());assert(restored.isAdmin(account.profileId));assert.equal(restored.authenticate(account.token).user.admin,true);
  assert.equal(restored.isAdmin('OwnerFixture'),false);assert.equal(restored.isAdmin(guest.profileToken),false);assert.equal(restored.guestId(guest.profileToken),null);
});
test('admin grant persists through the database store and does not promote other accounts',async()=>{
  let data=null,revision=0;const repo={async load(initial){data??=structuredClone(initial);return {data:structuredClone(data),revision};},async write(expected,value){assert.equal(expected,revision);data=structuredClone(value);return ++revision;}};
  const s=await openDatabaseProfiles(repo),a=await s.register('PersistOwner',password),b=await s.register('Ordinary',password);s.grantAdmin('PersistOwner');await s.flush();
  const restored=await openDatabaseProfiles(repo);assert(restored.isAdmin(a.profileId));assert(!restored.isAdmin(b.profileId));assert.equal(restored.getById(b.profileId).owned.length,7);assert.equal(restored.getById(a.profileId).owned.length,22);
});
test('console grant command persists only the named existing account and fails safely for missing accounts',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'arena-admin-cli-')),store=new ProfileStore(dir),session=await store.register('ConsoleFixture',password);
  const run=promisify(execFile),options={env:{...process.env,DATA_DIR:dir,DATABASE_URL:'',REQUIRE_DATABASE:'false'},windowsHide:true};
  await assert.rejects(run(process.execPath,['scripts/grant-admin.mjs','MissingUser'],options));assert(!new ProfileStore(dir).isAdmin(session.profileId));
  const {stdout}=await run(process.execPath,['scripts/grant-admin.mjs','ConsoleFixture'],options);assert.match(stdout,/22 items unlocked/);assert(!stdout.includes(password));const restored=new ProfileStore(dir);assert(restored.isAdmin(session.profileId));assert.equal(restored.getById(session.profileId).coins,100);
});
test('toys reject unknown commands and invalid targets without tainting a normal room',()=>{
  const m=match();for(const [command,target]of [['grant','rival'],['freeze','someone'],['launch',{}]])assert.throws(()=>applyAdminToy(m,'owner',command,target));assert.equal(m.playground,undefined);
  m.phase='waiting';assert.throws(()=>applyAdminToy(m,'owner','launch'));assert.equal(m.playground,undefined);
  assert.equal(new Set(ADMIN_TOYS.map(t=>t.id)).size,ADMIN_TOYS.length);
});
test('launch, freeze, confetti and reset affect only selected players and preserve reward lock across rounds',()=>{
  const m=match(),[a,b]=m.players;applyAdminToy(m,a.id,'launch','rival');assert.equal(a.v[1],0);assert.equal(b.v[1],18);assert(!b.ground);
  applyAdminToy(m,a.id,'freeze','rival');assert.equal(b.stun,1.5);assert.equal(a.stun,0);const before=b.shots;stepMatch(m,{rival:{fireId:1,fire:true,weapon:0}});assert.equal(b.shots,before);
  applyAdminToy(m,a.id,'confetti','everyone');assert.equal(m.events.at(-1).positions.length,2);assert(snapshot(m).playground.used);
  applyAdminToy(m,a.id,'bigHeads');assert.equal(m.playground.bigHeads,true);applyAdminToy(m,a.id,'lowGravity');applyAdminToy(m,a.id,'turbo');
  applyAdminToy(m,a.id,'reset');assert.deepEqual(m.playground,{used:true,bigHeads:false,lowGravity:false,turbo:false});assert.equal(b.stun,0);assert.equal(b.v[1],0);startRound(m);assert(m.playground.used);
});
test('moon gravity and turbo produce the same movement for server and client prediction without changing defaults',()=>{
  const normal=createPlayer('n','Normal'),boosted=createPlayer('b','Boosted');normal.p=[-12,0,12];boosted.p=[-12,0,12];const input=cleanInput({z:1,sprint:true});
  for(let i=0;i<30;i++){movePlayer(normal,input,MAPS[0],TICK);movePlayer(boosted,input,MAPS[0],TICK,{turbo:true});}assert(Math.hypot(...boosted.v)>Math.hypot(...normal.v)*1.4);
  const a=createPlayer('a','A'),b=structuredClone(a);a.p=[-12,4,12];b.p=[-12,4,12];a.ground=b.ground=false;movePlayer(a,cleanInput(),MAPS[0],TICK);movePlayer(b,cleanInput(),MAPS[0],TICK,{lowGravity:true});assert(Math.abs(b.v[1])<Math.abs(a.v[1])*.4);
  const m=match();m.playground={turbo:true,lowGravity:true};const predicted=structuredClone(m.players[0]);movePlayer(predicted,input,MAPS[0],TICK,m.playground);stepMatch(m,{owner:input});assert.deepEqual(predicted.p,m.players[0].p);assert.deepEqual(predicted.v,m.players[0].v);
});
async function harness(t){const app=createArenaServer({port:0,host:'127.0.0.1'}),address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const post=async(data,cookie='')=>{const r=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],...await r.json()};};
  const owner=await post({action:'account',operation:'register',username:'ToyOwner',email:'toy-owner@example.test',password,admin:true});assert.equal(owner.user.admin,false);app.profiles.grantAdmin('ToyOwner');
  const guest=await post({action:'account',operation:'register',username:'NotAdmin',email:'not-admin@example.test',password});return {app,base,post,owner,guest};}
test('only the authenticated admin host can use toys; guest names, cookies from another session, payload roles and foreign rooms fail',async t=>{
  const {app,post,owner,guest}=await harness(t),a=await post({action:'create'},owner.cookie),b=await post({action:'join',room:a.room,name:'ToyOwner',admin:true},guest.cookie);assert.equal(a.canAdmin,true);assert.equal(b.canAdmin,false);
  const command={action:'admin',token:a.token,command:'turbo',admin:true,username:'ToyOwner'};
  for(const cookie of ['',guest.cookie])assert.equal((await post(command,cookie)).status,403);
  assert.equal((await post({...command,token:b.token},owner.cookie)).status,403);assert.equal(app.rooms.get(a.room).match.playground,undefined);
  const login=await post({action:'account',operation:'login',identifier:'ToyOwner',password});assert.equal((await post(command,login.cookie)).status,403);
  const accepted=await post(command,owner.cookie);assert.equal(accepted.status,200);assert.equal(accepted.playground.turbo,true);assert.equal((await post(command,owner.cookie)).status,429);
  await post({action:'leave',token:a.token});await post({action:'leave',token:b.token});
  const foreign=await post({action:'create'},guest.cookie),joined=await post({action:'join',room:foreign.room},owner.cookie);assert.equal(joined.canAdmin,false);assert.equal((await post({...command,token:joined.token},owner.cookie)).status,403);
});
test('HTTP toys replicate to a WebSocket opponent, coin rewards remain disabled after reset, and logout revokes control',async t=>{
  const {app,base,post,owner}=await harness(t),a=await post({action:'create'},owner.cookie),b=await post({action:'join',room:a.room});
  const ws=new WebSocket(base.replace('http:','ws:')+'/socket');t.after(()=>ws.terminate());let shared;ws.on('message',raw=>{const s=JSON.parse(raw);if(s.playground?.used)shared=s;});await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({token:b.token}));
  const r=app.rooms.get(a.room);r.match.phase='live';r.match.clock=90;const beforeA=app.profiles.getById(r.hostProfileId).coins,beforeB=(await post({action:'poll',token:b.token})).profile.coins;
  assert.equal((await post({action:'admin',token:a.token,command:'lowGravity'},owner.cookie)).status,200);await delay(120);assert(shared?.playground.lowGravity);assert.equal(shared.canAdmin,false);
  await delay(700);await post({action:'admin',token:a.token,command:'reset'},owner.cookie);endRound(r.match,r.match.players[0]);await delay(80);assert.equal(app.profiles.getById(r.hostProfileId).coins,beforeA);assert.equal((await post({action:'poll',token:b.token})).profile.coins,beforeB);assert(!r.match.events.some(e=>e.type==='coins'));
  await post({action:'account',operation:'logout'},owner.cookie);assert.equal((await post({action:'admin',token:a.token,command:'turbo'},owner.cookie)).status,401);assert.equal(r.match.playground.lowGravity,false);
});
