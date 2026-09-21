import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 100 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 100 }),
    bio: text('bio'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    platform: varchar('platform', { length: 32 }),
    totpSecret: varchar('totp_secret', { length: 255 }),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
    uniqueIndex('users_username_idx').on(table.username),
  ],
);

export const passkeyCredentials = pgTable(
  'passkey_credentials',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull(),
    publicKey: text('public_key').notNull(),
    counter: integer('counter').default(0).notNull(),
    transports: text('transports'),
    deviceType: varchar('device_type', { length: 50 }),
    backedUp: boolean('backed_up').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('passkey_credential_id_idx').on(table.credentialId),
    index('passkey_user_idx').on(table.userId),
  ],
);

export const qrLoginSessions = pgTable(
  'qr_login_sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('qr_login_status_idx').on(table.status)],
);

export const rooms = pgTable(
  'rooms',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    inviteCode: varchar('invite_code', { length: 32 }).notNull(),
    isDm: boolean('is_dm').default(false).notNull(),
    dmKey: varchar('dm_key', { length: 64 }),
    createdById: integer('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('rooms_created_by_idx').on(table.createdById),
    uniqueIndex('rooms_invite_code_idx').on(table.inviteCode),
    uniqueIndex('rooms_dm_key_idx').on(table.dmKey),
  ],
);

export const friendships = pgTable(
  'friendships',
  {
    id: serial('id').primaryKey(),
    requesterId: integer('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: integer('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('friendships_pair_idx').on(table.requesterId, table.addresseeId),
    index('friendships_addressee_idx').on(table.addresseeId),
    index('friendships_requester_idx').on(table.requesterId),
  ],
);

export const roomMembers = pgTable(
  'room_members',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('room_members_room_user_idx').on(table.roomId, table.userId),
    index('room_members_user_idx').on(table.userId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    replyToId: integer('reply_to_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('messages_room_idx').on(table.roomId),
    index('messages_sender_idx').on(table.senderId),
    index('messages_created_at_idx').on(table.createdAt),
    index('messages_reply_to_idx').on(table.replyToId),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body'),
    roomId: integer('room_id').references(() => rooms.id, { onDelete: 'set null' }),
    messageId: integer('message_id').references(() => messages.id, { onDelete: 'set null' }),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId),
    index('notifications_user_unread_idx').on(table.userId, table.isRead),
  ],
);

export const calls = pgTable(
  'calls',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    createdById: integer('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaType: varchar('media_type', { length: 16 }).notNull(),
    status: varchar('status', { length: 20 }).default('ringing').notNull(),
    maxParticipants: integer('max_participants').default(4).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    index('calls_room_idx').on(table.roomId),
    index('calls_status_idx').on(table.status),
    index('calls_created_by_idx').on(table.createdById),
  ],
);

export const callParticipants = pgTable(
  'call_participants',
  {
    id: serial('id').primaryKey(),
    callId: integer('call_id')
      .notNull()
      .references(() => calls.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    leftAt: timestamp('left_at', { withTimezone: true }),
    muted: boolean('muted').default(false).notNull(),
    cameraOff: boolean('camera_off').default(false).notNull(),
  },
  (table) => [
    uniqueIndex('call_participants_call_user_idx').on(table.callId, table.userId),
    index('call_participants_user_idx').on(table.userId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  roomsCreated: many(rooms),
  memberships: many(roomMembers),
  messages: many(messages),
  notifications: many(notifications),
  passkeys: many(passkeyCredentials),
}));

export const passkeyCredentialsRelations = relations(passkeyCredentials, ({ one }) => ({
  user: one(users, {
    fields: [passkeyCredentials.userId],
    references: [users.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [rooms.createdById],
    references: [users.id],
  }),
  members: many(roomMembers),
  messages: many(messages),
}));

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(rooms, {
    fields: [roomMembers.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomMembers.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  room: one(rooms, {
    fields: [messages.roomId],
    references: [rooms.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
    relationName: 'message_replies',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [notifications.roomId],
    references: [rooms.id],
  }),
  message: one(messages, {
    fields: [notifications.messageId],
    references: [messages.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type PasskeyCredential = typeof passkeyCredentials.$inferSelect;
export type QrLoginSession = typeof qrLoginSessions.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type CallParticipant = typeof callParticipants.$inferSelect;
export type NewCallParticipant = typeof callParticipants.$inferInsert;
