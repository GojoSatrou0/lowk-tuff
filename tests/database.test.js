import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabaseProfiles} from '../database/profile-store.js';
import {createArenaServer} from '../server.js';

function repository(){
  let state=null,revision=0;
  return {
    async load(initial){state??=structuredClone(initial);return {data:structuredClone(state),revision};},
    async write(expected,data){assert.equal(expected,revision,'stale writer');state=structuredClone(data);return ++revision;},
  };
}
test('cloud storage survives server replacement with email login, wallet, loadout and revoked sessions',async()=>{
  const repo=repository(),first=await openDatabaseProfiles(repo),guest=first.create();
  first.reward(guest.profileToken,500);
  const session=await first.register('CloudFixture','Disposable fixture password 473!',guest.profileToken,()=>{},'cloud@example.test');
  first.purchaseById(session.profileId,5);first.equipById(session.profileId,[5,1,2,3,4]);
  await first.flush();const expected=structuredClone(first.getById(session.profileId));
  const second=await openDatabaseProfiles(repo),signedIn=await second.login('CLOUD@example.test','Disposable fixture password 473!');
  await second.flush();assert.deepEqual(second.getById(signedIn.profileId),expected);assert.equal(second.guestId(guest.profileToken),null);
  second.logout(signedIn.token);await second.flush();const third=await openDatabaseProfiles(repo);
  assert.equal(third.authenticate(signedIn.token),null);assert.deepEqual(third.getById(session.profileId),expected);
});
test('overlapping saves are ordered and a stale server cannot overwrite a newer wallet',async()=>{
  const repo=repository(),one=await openDatabaseProfiles(repo),two=await openDatabaseProfiles(repo);
  const guest=one.create();for(let i=0;i<12;i++)one.reward(guest.profileToken,10);
  await one.flush();assert.equal((await openDatabaseProfiles(repo)).get(guest.profileToken).coins,220);
  two.create();await assert.rejects(two.flush(),/storage is unavailable/);assert.throws(()=>two.assertHealthy());
  assert.equal((await openDatabaseProfiles(repo)).get(guest.profileToken).coins,220);
});
test('HTTP does not acknowledge a new account or send its cookie until the database commits',async t=>{
  const repo=repository(),write=repo.write;let release,entered;
  const started=new Promise(resolve=>{entered=resolve;});const gate=new Promise(resolve=>{release=resolve;});
  repo.write=async(...args)=>{entered();await gate;return write(...args);};
  const store=await openDatabaseProfiles(repo),app=createArenaServer({port:0,host:'127.0.0.1',profileStore:store});
  const address=await app.listen();t.after(()=>app.close());
  let finished=false;const response=fetch(`http://127.0.0.1:${address.port}/api`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'account',operation:'register',username:'CommittedFixture',email:'committed@example.test',password:'Disposable committed fixture 473!'})}).then(r=>{finished=true;return r;});
  await started;assert.equal(finished,false);assert.equal(store.settled,false);release();
  const result=await response;assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/velocity_session=/);
  const restored=await openDatabaseProfiles(repo);assert.equal((await restored.login('committed@example.test','Disposable committed fixture 473!')).user.username,'CommittedFixture');await restored.flush();
});
test('failed database writes return 503 without cookies or database credentials and mark health unavailable',async t=>{
  const repo=repository();repo.write=async()=>{throw Error('postgresql://private:secret@database.test');};
  const store=await openDatabaseProfiles(repo),app=createArenaServer({port:0,host:'127.0.0.1',profileStore:store});
  const address=await app.listen();t.after(()=>app.close().catch(()=>{}));const base=`http://127.0.0.1:${address.port}`;
  const response=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'account',operation:'register',username:'FailedFixture',email:'failed@example.test',password:'Disposable failed fixture 473!'})});
  assert.equal(response.status,503);assert.equal(response.headers.get('set-cookie'),null);assert.doesNotMatch(await response.text(),/secret|postgresql/);
  assert.equal((await fetch(base+'/health')).status,503);
  assert.equal((await repo.load({})).data.accounts.failedfixture,undefined);
});
