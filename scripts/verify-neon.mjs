import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,snapshotRepository} from '../database/neon.js';
import {openDatabaseProfiles} from '../database/profile-store.js';

// Run only against an isolated validation branch, never production.
if(process.env.ARENA_VALIDATION_DATABASE!=='true')throw Error('Set ARENA_VALIDATION_DATABASE=true for a disposable validation branch.');
try{
  const repo=snapshotRepository(database(process.env.DATABASE_URL));
  const first=await openDatabaseProfiles(repo),guest=first.create();
  const suffix=randomUUID().slice(0,8),username=`Check${suffix}`,email=`${suffix}@example.test`,password=randomUUID();
  const session=await first.register(username,password,guest.profileToken,()=>{},email);
  first.rewardById(session.profileId,500);
  first.purchaseById(session.profileId,5);first.equipById(session.profileId,[5,1,2,3,4]);
  await first.flush();const expected=structuredClone(first.getById(session.profileId));
  const restarted=await openDatabaseProfiles(repo),login=await restarted.login(email,password);
  await restarted.flush();assert.deepEqual(restarted.getById(login.profileId),expected);
  restarted.logout(login.token);await restarted.flush();
  const final=await openDatabaseProfiles(repo);assert.equal(final.authenticate(login.token),null);
  assert.equal(final.getById(login.profileId).coins,expected.coins);
  console.log('Hosted Neon validation passed: email login, purchases, loadout, coins, restart persistence, logout.');
}catch{
  console.error('Hosted database validation failed. Check the validation branch configuration; credentials are not logged.');
  process.exitCode=1;
}
