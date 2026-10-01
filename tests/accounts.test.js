import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {ProfileStore} from '../profile-store.js';
import {createArenaServer} from '../server.js';
import {endRound} from '../src/shared.js';
import {setTimeout as delay} from 'node:timers/promises';

// Disposable fixtures only; never use a real player's password or data directory.
const password='Test fixture phrase 473!';
async function server(t,options={}){
  const app=createArenaServer({port:0,host:'127.0.0.1',...options}),address=await app.listen();t.after(()=>app.close());
  const base=`http://127.0.0.1:${address.port}`;
  async function post(data,{cookie='',auth=false,headers={}}={}){if(data.action==='register')data={email:`${data.username}@example.test`,...data};const r=await fetch(base+(auth?'/api/auth':'/api'),{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},body:JSON.stringify(data)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],setCookie:r.headers.get('set-cookie')};}
  return {app,base,post};
}
test('account claims guest purchases and loadout, invalidates old bearer, persists without plaintext secrets',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'velocity-account-')),store=new ProfileStore(dir),guest=store.create();
  store.purchase(guest.profileToken,13);store.equip(guest.profileToken,[0,13,2,3,4]);store.reward(guest.profileToken,35);
  const a=await store.register('TestRunner',password,guest.profileToken);
  assert.equal(store.get(guest.profileToken),null);assert.equal(store.getById(a.profileId).coins,35);
  const saved=readFileSync(path.join(dir,'profiles.json'),'utf8');
  assert(!saved.includes(password));assert(!saved.includes(guest.profileToken));assert(!saved.includes(a.token));
  const restored=new ProfileStore(dir),signed=await restored.login('TESTRUNNER',password);
  assert.deepEqual(restored.getById(signed.profileId).loadout,[0,13,2,3,4]);assert.equal(restored.authenticate(a.token).user.username,'TestRunner');
  restored.logout(a.token);assert.equal(restored.authenticate(a.token),null);assert(restored.authenticate(signed.token));
});
test('legacy v1 wallets migrate with a backup and retain their bearer access until claimed',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'velocity-account-v1-')),store=new ProfileStore(),guest=store.create();
  store.reward(guest.profileToken,155);
  writeFileSync(path.join(dir,'profiles.json'),JSON.stringify({version:1,profiles:store.profiles}));
  const restored=new ProfileStore(dir);assert.equal(restored.get(guest.profileToken).coins,255);assert(existsSync(path.join(dir,'profiles.json.v1.bak')));
  assert.equal(JSON.parse(readFileSync(path.join(dir,'profiles.json'),'utf8')).version,3);
});
test('validates credentials, uses unique salts, handles object-key usernames and concurrent claims',async()=>{
  const store=new ProfileStore();
  for(const name of ['', 'ab','bad name','<script>','a'.repeat(21),null])await assert.rejects(store.register(name,password),/username/);
  for(const pass of ['short','x'.repeat(129),null])await assert.rejects(store.register('GoodName',pass),/password/);
  const first=await store.register('__proto__',password),second=await store.register('Other',password);
  assert.equal(first.user.username,'__proto__');assert.notEqual(store.accounts.__proto__.password.salt,store.accounts.other.password.salt);
  await assert.rejects(store.register('OTHER',password),/unavailable/);
  const guest=store.create(),race=await Promise.allSettled([store.register('RaceA',password,guest.profileToken),store.register('RaceB',password,guest.profileToken)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(store.getById(second.profileId).coins,100);
});
test('expired sessions cannot authenticate; wrong or unknown credentials return the same error',async()=>{
  const store=new ProfileStore(),a=await store.register('Runner',password);
  for(const [name,pass] of [['Runner','wrong'],['Missing',password],['constructor',password],['Runner',null]])await assert.rejects(store.login(name,pass),{message:'Incorrect email, username, or password.',status:401});
  store.authSessions[a.sessionId].expiresAt=Date.now()-1;assert.equal(store.authenticate(a.token),null);assert.equal(store.sessionActive(a.sessionId),false);
});
test('real HTTP signup, login on another device, purchase and logout load independent account progress',async t=>{
  const {post}=await server(t),guest=await post({action:'profile'});
  await post({action:'purchase',profileToken:guest.body.profileToken,weapon:13});
  const signup=await post({action:'register',username:'BrowserOne',password,profileToken:guest.body.profileToken},{auth:true});
  assert.equal(signup.status,200);assert.equal(signup.body.profile.coins,0);assert(!('token' in signup.body));assert(!('profileToken' in signup.body));
  assert.match(signup.setCookie,/HttpOnly/);assert.match(signup.setCookie,/SameSite=Strict/);assert.match(signup.setCookie,/Max-Age=2592000/);
  const cookie=signup.cookie;
  assert.equal((await post({action:'profile',profileToken:guest.body.profileToken})).status,410);
  assert.equal((await post({action:'profile'},{cookie})).body.user.username,'BrowserOne');
  const login=await post({action:'login',username:'browserone',password},{auth:true});assert.equal(login.status,200);assert.notEqual(login.cookie,cookie);assert(login.body.profile.owned.includes(13));
  assert.equal((await post({action:'loadout',loadout:[0,13,2,3,4],expectedUser:'BrowserOne'},{cookie:login.cookie})).status,200);
  assert.deepEqual((await post({action:'profile'},{cookie})).body.profile.loadout,[0,13,2,3,4]);
  const out=await post({action:'logout'},{cookie,auth:true});assert.match(out.setCookie,/Max-Age=0/);
  assert.equal((await post({action:'profile'},{cookie})).status,401);
  assert.equal((await post({action:'profile'},{cookie:login.cookie})).status,200);
  const separate=await post({action:'register',username:'Separate',password},{auth:true});assert.equal(separate.body.profile.coins,100);assert.equal(separate.body.profile.revision,0);
  assert.equal((await post({action:'purchase',weapon:13,expectedUser:'BrowserOne'},{cookie:separate.cookie})).status,409);
  assert.equal((await post({action:'purchase',weapon:13},{cookie:separate.cookie})).body.profile.coins,0);
});
test('account rooms use saved loadout, earn authoritative rewards, and logout revokes room sockets',async t=>{
  const {post,app,base}=await server(t),signup=await post({action:'register',username:'Fighter',password},{auth:true}),cookie=signup.cookie;
  await post({action:'purchase',weapon:13},{cookie});await post({action:'loadout',loadout:[0,13,2,3,4]},{cookie});
  const room=await post({action:'practice',name:'Fighter'},{cookie});assert.equal(room.status,200);assert.equal(room.body.profileToken,null);assert.equal(room.body.players[0].loadout[1],13);
  const second=await post({action:'login',username:'Fighter',password},{auth:true});assert.equal((await post({action:'practice'},{cookie:second.cookie})).status,409);
  const ws=new WebSocket(base.replace('http:','ws:')+'/socket');t.after(()=>ws.terminate());await once(ws,'open');
  const got=once(ws,'message');ws.send(JSON.stringify({token:room.body.token}));assert.equal(JSON.parse((await got)[0]).type,'snapshot');
  await post({action:'input',token:room.body.token,input:{seq:1,paused:false}},{cookie});
  const match=app.rooms.get(room.body.room).match;match.phase='live';endRound(match,match.players[0]);await delay(80);
  assert.equal((await post({action:'profile'},{cookie})).body.profile.coins,35);
  assert.equal((await post({action:'purchase',weapon:6},{cookie})).status,409);
  const closed=once(ws,'close');await post({action:'logout'},{cookie,auth:true});await closed;
  assert.equal(app.rooms.size,0);assert.equal((await post({action:'poll',token:room.body.token})).status,410);
  assert.equal((await post({action:'profile'},{cookie:second.cookie})).body.profile.coins,35);
});
test('account endpoints reject cross-origin requests, private files, non-JSON and excessive attempts',async t=>{
  const {post,base}=await server(t,{secureCookies:true});
  assert.equal((await post({action:'login',username:'Any',password},{auth:true,headers:{Origin:'https://attacker.example'}})).status,403);
  assert.equal((await post({action:'logout'},{auth:true,headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
  assert.equal((await fetch(base+'/api/auth')).status,405);
  assert.equal((await post({action:'login'},{auth:true,headers:{'Content-Type':'text/plain'}})).status,415);
  for(const file of ['/data/profiles.json','/data/profiles.json.v1.bak','/profile-store.js'])assert.equal((await fetch(base+file)).status,404);
  const signup=await post({action:'register',username:'SecureUser',password},{auth:true});assert.match(signup.setCookie,/; Secure/);
  for(let i=0;i<10;i++)assert.equal((await post({action:'login',username:'NoSuchUser',password},{auth:true})).status,401);
  assert.equal((await post({action:'login',username:'NoSuchUser',password},{auth:true})).status,429);
});
test('registration cannot claim a guest wallet while its game is running',async t=>{
  const {post}=await server(t),guest=await post({action:'profile'}),profileToken=guest.body.profileToken;
  const room=await post({action:'practice',profileToken});
  assert.equal((await post({action:'register',username:'BusyGuest',password,profileToken},{auth:true})).status,409);
  await post({action:'leave',token:room.body.token});
  assert.equal((await post({action:'register',username:'BusyGuest',password,profileToken},{auth:true})).status,200);
});
