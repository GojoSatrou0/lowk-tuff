import {migrate} from 'drizzle-orm/neon-http/migrator';
import {fileURLToPath} from 'node:url';
import {database} from '../database/neon.js';

try{
  const url=process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL;
  if(url&&new URL(url).hostname.includes('-pooler.'))throw Error('Use a direct Neon connection for DATABASE_URL_UNPOOLED when migrating.');
  await migrate(database(url),{migrationsFolder:fileURLToPath(new URL('../database/migrations/',import.meta.url))});
  console.log('Account database schema ready.');
}catch{
  console.error('Database migration failed. Check the private DATABASE_URL, direct connection, and Neon availability.');
  process.exitCode=1;
}
