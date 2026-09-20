-- Direct messages + message replies
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "is_dm" boolean DEFAULT false NOT NULL;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "dm_key" varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS "rooms_dm_key_idx" ON "rooms" ("dm_key");

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "reply_to_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_reply_to_id_messages_id_fk'
  ) THEN
    ALTER TABLE "messages"
      ADD CONSTRAINT "messages_reply_to_id_messages_id_fk"
      FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "messages_reply_to_idx" ON "messages" ("reply_to_id");
