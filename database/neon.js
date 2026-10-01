import {neon,neonConfig} from '@neondatabase/serverless';
import {drizzle} from 'drizzle-orm/neon-http';
import {and,eq} from 'drizzle-orm';
import {arenaState} from './schema.js';

export function database(url){
  if(!url)throw Error('DATABASE_URL is required for cloud account storage.');
  neonConfig.fetchFunction=(input,options)=>fetch(input,{...options,signal:AbortSignal.timeout(15000)});
  return drizzle(neon(url));
}
export function snapshotRepository(db){
  return {
    async load(initial){
      await db.insert(arenaState).values({id:1,revision:0,data:initial}).onConflictDoNothing();
      const [row]=await db.select().from(arenaState).where(eq(arenaState.id,1));
      if(!row)throw Error('Account database is unavailable.');
      return row;
    },
    async write(revision,data){
      const rows=await db.update(arenaState).set({revision:revision+1,data})
        .where(and(eq(arenaState.id,1),eq(arenaState.revision,revision)))
        .returning({revision:arenaState.revision});
      if(rows.length!==1)throw Error('Another server updated the account database. Restart this server.');
      return rows[0].revision;
    },
  };
}
