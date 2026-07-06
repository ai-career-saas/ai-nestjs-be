import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  date,
  unique,
  uniqueIndex,
  boolean,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  
    locale: varchar('locale', { length: 5 }).notNull().default('en'), // 'en' | 'th'
    timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Bangkok'),
    notifyEmail: boolean('notify_email').notNull().default(true),
    notifyProduct: boolean('notify_product').notNull().default(true),
    notifyUsageAlerts: boolean('notify_usage_alerts').notNull().default(true),
  },
  (table) => [uniqueIndex('idx_users_email').on(table.email)],
);

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  priceInr: integer('price_inr').notNull().default(0),
  description: text('description'),
  stripePriceId: varchar('stripe_price_id', { length: 100 }),
  quota: jsonb('quota')
    .notNull()
    .default({ analyze: 5, interview_gen: 5, ats_score: 5 }),
  features: jsonb('features').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => plans.id),
    stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 100 }),
    status: varchar('status', { length: 20 }).default('active'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex('idx_subscriptions_user').on(table.userId)],
);

export const usageLogs = pgTable(
  'usage_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    feature: varchar('feature', { length: 50 }).notNull(),
    period: date('period').notNull(),
    count: integer('count').default(0),
  },
  (table) => [
    unique('usage_logs_user_feature_period').on(
      table.userId,
      table.feature,
      table.period,
    ),
    uniqueIndex('idx_usage_logs_user_feature').on(
      table.userId,
      table.feature,
      table.period,
    ),
  ],
);
