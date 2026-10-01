import {pgTable,integer,bigint,jsonb} from 'drizzle-orm/pg-core';

// One arena process owns the current account snapshot. Revision checks fence out
// an older process during redeployment instead of silently overwriting its data.
export const arenaState=pgTable('velocity_arena_state',{
  id:integer('id').primaryKey(),
  revision:bigint('revision',{mode:'number'}).notNull().default(0),
  data:jsonb('data').notNull(),
});
