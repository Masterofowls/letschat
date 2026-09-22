# LetsChat

Real-time chat app: NestJS + GraphQL + Drizzle (backend) and Next.js + Apollo Client (frontend).

## Architecture

Controller/Resolver → Service → Repository. GraphQL resolvers stay thin; Drizzle queries live in `*.repository.ts`. Messages are persisted before `pubSub.publish()`.

```
backend/   NestJS GraphQL API (Render)
frontend/  Next.js App Router (Vercel)
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Local setup

### 1. Database

Create a Postgres database and set `DATABASE_URL` in `backend/.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env   # if needed
npm install
npm run db:push        # apply schema (or npm run db:migrate)
npm run start:dev      # http://localhost:9000/graphql
                       # AdminJS: http://localhost:9000/admin (ADMIN_EMAIL / ADMIN_PASSWORD)
npm test               # Jest unit tests
npm run test:e2e       # health e2e
```

Admin panel ([AdminJS](https://adminjs.co/)) manages users, rooms, messages, notifications, passkeys, and QR login sessions. Defaults: `admin` / `2015` (override via `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:9001
npm test               # Jest + React Testing Library
```

The UI uses Tailwind CSS, shadcn/ui components, and lucide-animated icons.

Point frontend env at the backend:

```
NEXT_PUBLIC_API_URL=http://localhost:9000/graphql
NEXT_PUBLIC_WS_URL=ws://localhost:9000/graphql
```

## Auth extras

- Realtime email/username availability checks (`checkEmail`, `checkUsername`)
- Password strength meter + generate secure password
- Settings menu (profile, account, security), platform detection, typing indicators
- Public profiles at `/u/[username]` + profile photo upload (`POST /uploads/avatar`)
- Global search for users/rooms, friends, join room, public invite links `/r/[code]`
- Direct messages with friends, emoji picker, reply-to-message
- Passkeys (WebAuthn) on sign-in and in Security settings
- QR code device login (`/qr-auth?session=…`)
- TOTP 2FA: setup QR in Security settings; required code prompt when enabled

| Op | Name |
|----|------|
| Mutation | `register`, `login` |
| Query | `me`, `users`, `rooms`, `myRooms`, `room`, `messages`, `notifications`, `unreadNotificationCount` |
| Mutation | `createRoom`, `joinRoom`, `sendMessage`, `markNotificationRead`, `markAllNotificationsRead` |
| Subscription | `messageAdded(roomId)`, `notificationAdded` |

## Deployment

**Backend must not be serverless** — WebSocket subscriptions need a persistent process (Render / Railway / Fly.io). Frontend can deploy to Vercel.

### Render (Postgres + NestJS)

1. Create a Render PostgreSQL instance; copy the **Internal Database URL**.
2. Create a Web Service from this repo:
   - Root directory: `backend`
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`
3. Env vars: `DATABASE_URL`, `JWT_SECRET`, optional `USE_PG_PUBSUB=true` for multi-instance.
4. Run migrations once:
   ```bash
   DATABASE_URL=postgresql://... npm run db:migrate
   ```
   or `npm run db:push`.

`main.ts` binds `0.0.0.0` and `process.env.PORT` for Render.

### Vercel (Next.js)

1. Import the repo; root directory `frontend`.
2. Env:
   - `NEXT_PUBLIC_API_URL=https://your-app.onrender.com/graphql`
   - `NEXT_PUBLIC_WS_URL=wss://your-app.onrender.com/graphql`

Apollo Client sends WS keep-alives every 30s so Render’s ~55s idle timeout does not drop subscriptions.

## Voice / video calls

Calls use **GetStream Video** for media only. Ringing, accept, leave, end, chat, and
notifications stay on our Nest GraphQL + database (max **4** participants).

Server env (never commit secrets):

- `STREAM_API_KEY`
- `STREAM_API_SECRET`
- `STREAM_APP_ID` (optional metadata)

Frontend flag: `frontend/src/lib/feature-flags.ts` → `CALLS_ENABLED`.

## Production tips

- Set `USE_PG_PUBSUB=true` when running multiple backend instances (PostgreSQL LISTEN/NOTIFY).
- After schema changes: `npm run db:generate`, review SQL, then migrate.
- Pass JWT via `connectionParams.Authorization` for subscriptions (already wired).
