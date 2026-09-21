import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for drizzle-kit');
}

const url = process.env.DATABASE_URL;
const relaxSsl =
  process.env.DATABASE_SSL === 'relax' ||
  (process.env.DATABASE_SSL !== 'strict' && /supabase\.com/i.test(url));

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
    ...(relaxSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  },
});
