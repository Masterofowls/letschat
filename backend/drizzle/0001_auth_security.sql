-- Auth extras: 2FA, passkeys, QR login
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "passkey_credentials" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "credential_id" text NOT NULL,
  "public_key" text NOT NULL,
  "counter" integer DEFAULT 0 NOT NULL,
  "transports" text,
  "device_type" varchar(50),
  "backed_up" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "qr_login_sessions" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "user_id" integer,
  "access_token" text,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "qr_login_sessions" ADD CONSTRAINT "qr_login_sessions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "passkey_credential_id_idx" ON "passkey_credentials" USING btree ("credential_id");
CREATE INDEX IF NOT EXISTS "passkey_user_idx" ON "passkey_credentials" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "qr_login_status_idx" ON "qr_login_sessions" USING btree ("status");
