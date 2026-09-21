CREATE TABLE IF NOT EXISTS "calls" (
  "id" serial PRIMARY KEY NOT NULL,
  "room_id" integer NOT NULL REFERENCES "rooms"("id") ON DELETE cascade,
  "created_by_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "media_type" varchar(16) NOT NULL,
  "status" varchar(20) DEFAULT 'ringing' NOT NULL,
  "max_participants" integer DEFAULT 4 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "call_participants" (
  "id" serial PRIMARY KEY NOT NULL,
  "call_id" integer NOT NULL REFERENCES "calls"("id") ON DELETE cascade,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "left_at" timestamp with time zone,
  "muted" boolean DEFAULT false NOT NULL,
  "camera_off" boolean DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS "calls_room_idx" ON "calls" ("room_id");
CREATE INDEX IF NOT EXISTS "calls_status_idx" ON "calls" ("status");
CREATE INDEX IF NOT EXISTS "calls_created_by_idx" ON "calls" ("created_by_id");
CREATE UNIQUE INDEX IF NOT EXISTS "call_participants_call_user_idx"
  ON "call_participants" ("call_id", "user_id");
CREATE INDEX IF NOT EXISTS "call_participants_user_idx" ON "call_participants" ("user_id");
