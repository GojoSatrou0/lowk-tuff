CREATE TABLE IF NOT EXISTS "velocity_arena_state" (
  "id" integer PRIMARY KEY NOT NULL,
  "revision" bigint DEFAULT 0 NOT NULL,
  "data" jsonb NOT NULL
);
