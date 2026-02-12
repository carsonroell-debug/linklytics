import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, links, clicks, apiKeys, campaigns, webhooks, webhookLogs, InsertLink, InsertClick, InsertApiKey, InsertCampaign, InsertWebhook, InsertWebhookLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserSubscription(userId: number, data: {
  subscriptionTier?: "free" | "paid";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing";
  subscriptionEndsAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set(data).where(eq(users.id, userId));
}

// Link operations
export async function createLink(linkData: InsertLink) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(links).values(linkData);
  return result;
}

export async function getLinksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(links).where(eq(links.userId, userId)).orderBy(desc(links.createdAt));
}

export async function getLinkBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLinkById(linkId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(links).where(eq(links.id, linkId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateLink(linkId: number, data: Partial<InsertLink>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(links).set(data).where(eq(links.id, linkId));
}

export async function deleteLink(linkId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(links).where(eq(links.id, linkId));
}

export async function incrementLinkClicks(linkId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(links).set({
    clickCount: sql`${links.clickCount} + 1`
  }).where(eq(links.id, linkId));
}

export async function countUserLinks(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: count() }).from(links).where(eq(links.userId, userId));
  return result[0]?.count ?? 0;
}

// Click analytics operations
export async function recordClick(clickData: InsertClick) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(clicks).values(clickData);
}

export async function getClicksByLinkId(linkId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(clicks).where(eq(clicks.linkId, linkId)).orderBy(desc(clicks.clickedAt));
  
  if (limit) {
    query = query.limit(limit) as any;
  }
  
  return await query;
}

export async function getClickStats(linkId: number, daysAgo: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  
  return await db.select().from(clicks)
    .where(and(
      eq(clicks.linkId, linkId),
      gte(clicks.clickedAt, startDate)
    ))
    .orderBy(desc(clicks.clickedAt));
}

export async function getClicksByUserId(userId: number, daysAgo: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  
  return await db.select({
    click: clicks,
    link: links
  })
  .from(clicks)
  .innerJoin(links, eq(clicks.linkId, links.id))
  .where(and(
    eq(links.userId, userId),
    gte(clicks.clickedAt, startDate)
  ))
  .orderBy(desc(clicks.clickedAt));
}

// API Key operations
export async function createApiKey(apiKeyData: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(apiKeys).values(apiKeyData);
  return result;
}

export async function getApiKeysByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
}

export async function getApiKeyByKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(apiKeys).where(and(
    eq(apiKeys.key, key),
    eq(apiKeys.isActive, true)
  )).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateApiKeyLastUsed(keyId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(apiKeys).set({
    lastUsedAt: new Date()
  }).where(eq(apiKeys.id, keyId));
}

export async function deleteApiKey(keyId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
}

// ========== Campaign Functions ==========

export async function createCampaign(campaign: InsertCampaign) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(campaigns).values(campaign);
}

export async function getCampaignsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function updateCampaign(id: number, data: Partial<InsertCampaign>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

export async function deleteCampaign(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Remove campaign assignment from links
  await db.update(links).set({ campaignId: null }).where(eq(links.campaignId, id));
  
  // Delete the campaign
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

export async function getLinksByCampaignId(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(links).where(eq(links.campaignId, campaignId)).orderBy(desc(links.createdAt));
}

// ========== Webhook Functions ==========

export async function createWebhook(webhook: InsertWebhook) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(webhooks).values(webhook);
}

export async function getWebhooksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(webhooks).where(eq(webhooks.userId, userId)).orderBy(desc(webhooks.createdAt));
}

export async function getWebhookById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
  return result[0];
}

export async function updateWebhook(id: number, data: Partial<InsertWebhook>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(webhooks).set(data).where(eq(webhooks.id, id));
}

export async function deleteWebhook(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(webhooks).where(eq(webhooks.id, id));
}

export async function getActiveWebhooksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(webhooks).where(and(
    eq(webhooks.userId, userId),
    eq(webhooks.isActive, true)
  ));
}

export async function createWebhookLog(log: InsertWebhookLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(webhookLogs).values(log);
}

export async function getWebhookLogsByWebhookId(webhookId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(webhookLogs)
    .where(eq(webhookLogs.webhookId, webhookId))
    .orderBy(desc(webhookLogs.createdAt))
    .limit(limit);
}
