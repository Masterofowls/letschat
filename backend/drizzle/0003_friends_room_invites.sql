-- Public room invite codes + friendships
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "invite_code" varchar(32);

UPDATE "rooms"
SET "invite_code" = substr(md5(random()::text || id::text), 1, 10)
WHERE "invite_code" IS NULL;

ALTER TABLE "rooms" ALTER COLUMN "invite_code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "rooms_invite_code_idx" ON "rooms" ("invite_code");

CREATE TABLE IF NOT EXISTS "friendships" (
  "id" serial PRIMARY KEY NOT NULL,
  "requester_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "addressee_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "friendships_pair_idx" ON "friendships" ("requester_id", "addressee_id");
CREATE INDEX IF NOT EXISTS "friendships_addressee_idx" ON "friendships" ("addressee_id");
CREATE INDEX IF NOT EXISTS "friendships_requester_idx" ON "friendships" ("requester_id");
