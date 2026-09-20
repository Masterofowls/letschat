-- Profile fields for public pages, avatars, and platform detection
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" varchar(500);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "platform" varchar(32);
