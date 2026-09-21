import type { PoolConfig } from 'pg';

/** Supabase pooler/direct TLS often needs relaxed cert verification locally. */
export function needsRelaxedSsl(connectionString: string): boolean {
  if (process.env.DATABASE_SSL === 'strict') {
    return false;
  }
  if (process.env.DATABASE_SSL === 'relax') {
    return true;
  }
  return /supabase\.com/i.test(connectionString);
}

export function createPgPoolConfig(connectionString: string): PoolConfig {
  return {
    connectionString,
    ...(needsRelaxedSsl(connectionString)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  };
}
