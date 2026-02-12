import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "paid"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "canceled", "past_due", "trialing"]),
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Short links created by users
 */
export const links = mysqlTable("links", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  campaignId: int("campaignId"), // optional campaign assignment
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  originalUrl: text("originalUrl").notNull(),
  title: varchar("title", { length: 500 }),
  description: text("description"),
  password: varchar("password", { length: 255 }), // hashed password for protected links
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  clickCount: int("clickCount").default(0).notNull(),
  lastMilestone: int("lastMilestone").default(0).notNull(), // track last milestone reached for webhooks
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  slugIdx: index("slug_idx").on(table.slug),
}));

export type Link = typeof links.$inferSelect;
export type InsertLink = typeof links.$inferInsert;

/**
 * Click analytics for tracking link performance
 */
export const clicks = mysqlTable("clicks", {
  id: int("id").autoincrement().primaryKey(),
  linkId: int("linkId").notNull(),
  clickedAt: timestamp("clickedAt").defaultNow().notNull(),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 255 }),
  region: varchar("region", { length: 255 }),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  device: varchar("device", { length: 100 }), // mobile, desktop, tablet
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  referrer: text("referrer"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
}, (table) => ({
  linkIdIdx: index("linkId_idx").on(table.linkId),
  clickedAtIdx: index("clickedAt_idx").on(table.clickedAt),
}));

export type Click = typeof clicks.$inferSelect;
export type InsertClick = typeof clicks.$inferInsert;

/**
 * API keys for programmatic access
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  keyIdx: index("key_idx").on(table.key),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Campaigns for organizing links into groups/projects
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#3b82f6"), // hex color for UI
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Webhook configurations for notifications
 */
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  platform: mysqlEnum("platform", ["slack", "discord", "custom"]).notNull(),
  events: text("events").notNull(), // JSON array of event types
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

/**
 * Webhook delivery logs for tracking notifications
 */
export const webhookLogs = mysqlTable("webhookLogs", {
  id: int("id").autoincrement().primaryKey(),
  webhookId: int("webhookId").notNull(),
  linkId: int("linkId").notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  milestone: int("milestone"), // click count milestone (100, 1000, 10000)
  status: mysqlEnum("status", ["success", "failed"]).notNull(),
  response: text("response"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  webhookIdIdx: index("webhookId_idx").on(table.webhookId),
  linkIdIdx: index("linkId_idx").on(table.linkId),
}));

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;
