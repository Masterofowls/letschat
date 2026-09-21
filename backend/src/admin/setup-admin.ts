import type { INestApplication } from '@nestjs/common';

type AdminUser = {
  email: string;
  password: string;
};

/** Keep ESM imports out of tsc's CommonJS rewrite (AdminJS is ESM-only). */
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<any>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function resourceOptions(overrides: Record<string, unknown> = {}) {
  return {
    navigation: { name: 'LetsChat', icon: 'Chat' },
    ...overrides,
  };
}

function databaseNameFromUrl(connectionString: string): string {
  try {
    const normalized = connectionString.replace(/^postgresql:/i, 'http:');
    const pathname = new URL(normalized).pathname.replace(/^\//, '');
    return pathname || 'letschat';
  } catch {
    return 'letschat';
  }
}

export async function setupAdmin(app: INestApplication): Promise<void> {
  const AdminJSModule = await importEsm('adminjs');
  const AdminJSExpress = await importEsm('@adminjs/express');
  const AdminJSSql = await importEsm('@adminjs/sql');

  const AdminJS = AdminJSModule.default ?? AdminJSModule;
  const { Adapter, Database, Resource } = AdminJSSql;

  AdminJS.registerAdapter({ Database, Resource });

  const connectionString = requireEnv('DATABASE_URL');
  const databaseName = process.env.ADMIN_DATABASE_NAME || databaseNameFromUrl(connectionString);
  const relaxSsl =
    process.env.DATABASE_SSL === 'relax' ||
    (process.env.DATABASE_SSL !== 'strict' && /supabase\.com/i.test(connectionString));

  const db = await new Adapter('postgresql', {
    connectionString,
    database: databaseName,
    schema: process.env.ADMIN_SCHEMA || 'public',
    ...(relaxSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  }).init();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || '2015';
  const cookieSecret = process.env.ADMIN_COOKIE_SECRET || requireEnv('JWT_SECRET');

  const admin = new AdminJS({
    rootPath: '/admin',
    branding: {
      companyName: 'LetsChat Admin',
      withMadeWithLove: false,
    },
    resources: [
      {
        resource: db.table('users'),
        options: resourceOptions({
          properties: {
            password_hash: {
              isVisible: { list: false, filter: false, show: false, edit: true },
            },
            totp_secret: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
          },
          listProperties: [
            'id',
            'email',
            'username',
            'totp_enabled',
            'created_at',
            'updated_at',
          ],
        }),
      },
      {
        resource: db.table('rooms'),
        options: resourceOptions({
          listProperties: ['id', 'name', 'description', 'created_by_id', 'created_at'],
        }),
      },
      {
        resource: db.table('room_members'),
        options: resourceOptions({
          listProperties: ['id', 'room_id', 'user_id', 'joined_at'],
        }),
      },
      {
        resource: db.table('messages'),
        options: resourceOptions({
          listProperties: ['id', 'room_id', 'sender_id', 'content', 'created_at'],
        }),
      },
      {
        resource: db.table('notifications'),
        options: resourceOptions({
          listProperties: [
            'id',
            'user_id',
            'type',
            'title',
            'is_read',
            'room_id',
            'created_at',
          ],
        }),
      },
      {
        resource: db.table('passkey_credentials'),
        options: resourceOptions({
          properties: {
            public_key: {
              isVisible: { list: false, filter: false, show: true, edit: false },
            },
          },
          listProperties: [
            'id',
            'user_id',
            'credential_id',
            'device_type',
            'backed_up',
            'created_at',
          ],
        }),
      },
      {
        resource: db.table('qr_login_sessions'),
        options: resourceOptions({
          properties: {
            access_token: {
              isVisible: { list: false, filter: false, show: false, edit: false },
            },
          },
          listProperties: ['id', 'status', 'user_id', 'expires_at', 'created_at'],
        }),
      },
    ],
  });

  const authenticate = async (email: string, password: string): Promise<AdminUser | null> => {
    if (email === adminEmail && password === adminPassword) {
      return { email, password };
    }
    return null;
  };

  const buildRouter =
    AdminJSExpress.buildAuthenticatedRouter ??
    AdminJSExpress.default?.buildAuthenticatedRouter;

  const router = buildRouter(
    admin,
    {
      authenticate,
      cookieName: 'letschat_adminjs',
      cookiePassword: cookieSecret,
    },
    null,
    {
      secret: cookieSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    },
  );

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(admin.options.rootPath, router);
}
