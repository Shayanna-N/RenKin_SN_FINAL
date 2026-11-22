import { boolean, jsonb, pgTable, primaryKey, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'

// --- Better Auth required tables (camelCase columns match Better Auth defaults) ---

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- RenKin app tables ---

/** A user's published card, discoverable by handle. */
export const profile = pgTable('profile', {
  userId: text('userId').primaryKey(),
  handle: text('handle').notNull().unique(),
  card: jsonb('card').notNull(),
  preferredChannel: text('preferredChannel').notNull().default('email'),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

/** One-directional "I saved you". Two rows in opposite directions = mutual connection. */
export const connection = pgTable(
  'connection',
  {
    id: serial('id').primaryKey(),
    userId: text('userId').notNull(),
    contactUserId: text('contactUserId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.contactUserId)],
)

/** Notification to `userId` that `fromUserId` changed how they want to be reached. */
export const contactUpdate = pgTable('contact_update', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  fromUserId: text('fromUserId').notNull(),
  fromName: text('fromName').notNull(),
  changes: jsonb('changes').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

/** Backup of a user's local address book (including offline-scanned cards). */
export const syncedContact = pgTable(
  'synced_contact',
  {
    userId: text('userId').notNull(),
    contactId: text('contactId').notNull(),
    data: jsonb('data').notNull(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.contactId] })],
)
