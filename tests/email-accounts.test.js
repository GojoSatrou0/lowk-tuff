import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ProfileStore,normalizeEmail} from '../profile-store.js';
import {createArenaServer} from '../server.js';
import {readApiResponse} from '../src/api.js';

const password='Disposable email fixture 473!';
test('email normalization validates format, folds case and IDNs, and retains dots and plus tags',()=>{
  assert.deepEqual(normalizeEmail(' Test.User+Tag@EXAMPLE.COM '),{email:'Test.User+Tag@EXAMPLE.COM',emailKey:'test.user+tag@example.com'});
  assert.equal(normalizeEmail('runner@bücher.de').emailKey,'runner@xn--bcher-kva.de');
  for(const email of [null,[],{},'', 'runner','runner@','@example.com','a@@b.com','a b@example.com','name\n@example.com','<a@example.com>','a@-invalid.com','a'.repeat(65)+'@example.com','a@'+'b'.repeat(255)+'.com'])assert.throws(()=>normalizeEmail(email),/email address/);
});
test('email signup preserves a guest wallet and email login restores it after restart',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'velocity-email-')),s=new ProfileStore(dir),guest=s.create();
  s.purchase(guest.profileToken,13);s.equip(guest.profileToken,[0,13,4,19]);s.reward(guest.profileToken,35);
  const account=await s.register('EmailRunner',password,guest.profileToken,undefined,'Runner+One@Example.com');
  assert.equal(account.user.email,'Runner+One@Example.com');assert.equal(account.user.emailVerified,false);assert.equal(s.get(guest.profileToken),null);
  const restored=new ProfileStore(dir),login=await restored.login(' RUNNER+ONE@EXAMPLE.COM ',password);
  assert.equal(restored.getById(login.profileId).coins,35);assert.equal(restored.getById(login.profileId).loadout[1],13);
  assert.equal((await restored.login('emailrunner',password)).profileId,login.profileId);
  await assert.rejects(restored.login('runner@example.com',password),{status:401});
  await assert.rejects(restored.login('runner+one@example.com','wrong'),{status:401});
});
test('duplicate and simultaneous email registrations cannot steal or double-claim an account',async()=>{
  const s=new ProfileStore();await s.register('One',password,null,undefined,'one@example.com');
  await assert.rejects(s.register('Two',password,null,undefined,'ONE@EXAMPLE.COM'),{status:409});
  const outcomes=await Promise.allSettled([s.register('RaceOne',password,null,undefined,'race@example.com'),s.register('RaceTwo',password,null,undefined,'RACE@example.com')]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(Object.keys(s.accounts).length,2);
});
test('old username accounts migrate and can add an email only with their password and active session',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'velocity-email-v2-')),s=new ProfileStore(dir),old=await s.register('Legacy',password);
  s.rewardById(old.profileId,155);
  const saved=JSON.parse(readFileSync(s.file,'utf8'));saved.version=2;delete saved.accounts.legacy.emailVerified;writeFileSync(s.file,JSON.stringify(saved));
  const current=new ProfileStore(dir);assert(existsSync(s.file+'.v2.bak'));assert.equal(current.authenticate(old.token).user.username,'Legacy');
  await assert.rejects(current.addEmail(old.token,'legacy@example.com','wrong'),{status:401});
  assert.equal(current.accounts.legacy.email,undefined);
  const added=await current.addEmail(old.token,'legacy@example.com',password);assert.equal(added.user.email,'legacy@example.com');
  assert.equal((await current.login('legacy@example.com',password)).profileId,old.profileId);assert.equal(current.getById(old.profileId).coins,255);
  await assert.rejects(current.addEmail(old.token,'different@example.com',password),{status:409});
  const other=await current.register('Other',password);await assert.rejects(current.addEmail(other.token,'LEGACY@example.com',password),{status:409});
  current.logout(other.token);await assert.rejects(current.addEmail(other.token,'free@example.com',password),{status:401});
});
test('main API supports email signup/login and email never appears in a game snapshot',async t=>{
  const app=createArenaServer({port:0,host:'127.0.0.1'}),address=await app.listen();t.after(()=>app.close());
  const base=`http://127.0.0.1:${address.port}`;
  const post=async(data,cookie='')=>{const r=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
  assert.equal((await post({action:'account',operation:'register',username:'NoEmail',password})).status,400);
  const signup=await post({action:'account',operation:'register',username:'EmailPlayer',email:'player@example.com',password});assert.equal(signup.status,200);
  const cookie=signup.cookie,room=await post({action:'create'},cookie);assert.equal(room.status,200);
  assert.equal(room.data.players[0].name,'EmailPlayer');assert(!JSON.stringify(room.data).includes('player@example.com'));
  await post({action:'account',operation:'logout'},cookie);
  const login=await post({action:'account',operation:'login',identifier:'PLAYER@EXAMPLE.COM',password});assert.equal(login.status,200);assert.equal(login.data.user.username,'EmailPlayer');
  const legacy=await app.profiles.register('LegacyApi',password),legacyCookie=`velocity_session=${legacy.token}`;
  assert.equal((await post({action:'account',operation:'add-email',email:'legacy-api@example.com',password},legacyCookie)).status,200);
  assert.equal((await post({action:'account',operation:'login',email:'legacy-api@example.com',password})).status,200);
  assert.equal((await fetch(base+'/health').then(r=>r.json())).emailAccounts,true);
});
test('HTML and malformed server replies show actionable errors without leaking page content',async()=>{
  for(const status of [200,404,502])await assert.rejects(readApiResponse(new Response('<!DOCTYPE html><h1>Server page</h1>',{status,headers:{'Content-Type':'text/html'}})),e=>e.code==='WRONG_SERVER'&&e.message.includes('Restart START_GAME.bat')&&!e.message.includes('<'));
  await assert.rejects(readApiResponse(new Response('{incomplete',{headers:{'Content-Type':'application/json'}})),{code:'INVALID_RESPONSE'});
  await assert.rejects(readApiResponse(new Response('null',{headers:{'Content-Type':'application/json'}})),{code:'INVALID_RESPONSE'});
  await assert.rejects(readApiResponse(Response.json({error:'Incorrect email, username, or password.'},{status:401})),{status:401,message:'Incorrect email, username, or password.'});
  assert.deepEqual(await readApiResponse(Response.json({ok:true})),{ok:true});
});
