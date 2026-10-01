// Run only from the owner's server console while the game process is stopped.
// Never place passwords or connection strings in command arguments.
import {ProfileStore} from '../profile-store.js';
import {fileURLToPath} from 'node:url';
try{
  const username=process.argv[2];if(!username||process.argv.length!==3)throw Error('Usage: node scripts/grant-admin.mjs EXISTING_USERNAME');
  let store;
  if(process.env.DATABASE_URL){const {database,snapshotRepository}=await import('../database/neon.js');const {openDatabaseProfiles}=await import('../database/profile-store.js');store=await openDatabaseProfiles(snapshotRepository(database(process.env.DATABASE_URL)));}
  else if(process.env.REQUIRE_DATABASE==='true')throw Error('Database connection is required.');
  else store=new ProfileStore(process.env.DATA_DIR||fileURLToPath(new URL('../data/',import.meta.url)));
  const result=store.grantAdmin(username);await store.flush();console.log(`Admin toys enabled for ${result.username}; ${result.weapons} items unlocked. Coins and loadout preserved.`);
}catch(error){console.error(error.status===404||error.message.startsWith('Usage:')?error.message:'Admin grant failed. Check the private server configuration and account name.');process.exitCode=1;}
