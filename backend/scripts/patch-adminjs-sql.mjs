/**
 * @adminjs/sql PostgresParser fails on Supabase when auth.users and public.users
 * both exist (unqualified pg_class.relname subquery). Re-apply after npm install.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const target = join(
  process.cwd(),
  'node_modules',
  '@adminjs',
  'sql',
  'lib',
  'dialects',
  'postgres.parser.js',
);

if (!existsSync(target)) {
  console.warn('[patch-adminjs-sql] @adminjs/sql not installed; skip');
  process.exit(0);
}

const broken = `where c.conrelid = (select oid from pg_class where relname = '\${table}')`;
const fixed = `where c.conrelid = (
        select c2.oid from pg_class c2
        join pg_namespace n on n.oid = c2.relnamespace
        where c2.relname = '\${table}' and n.nspname = '\${schemaName}' and c2.relkind = 'r'
      )`;

let source = readFileSync(target, 'utf8');
if (source.includes('n.nspname = \'${schemaName}\'')) {
  console.log('[patch-adminjs-sql] already applied');
  process.exit(0);
}
if (!source.includes(broken)) {
  console.warn('[patch-adminjs-sql] unexpected parser source; skip');
  process.exit(0);
}
source = source.replace(broken, fixed);
writeFileSync(target, source);
console.log('[patch-adminjs-sql] patched postgres.parser.js for schema-qualified FKs');
