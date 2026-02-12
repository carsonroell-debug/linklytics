import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(user?: AuthenticatedUser): TrpcContext {
  const defaultUser: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    subscriptionTier: "free",
    subscriptionStatus: "active",
    subscriptionEndsAt: null,
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user: user || defaultUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("links.create", () => {
  it("should create a link with valid data", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.links.create({
      slug: "test-link",
      originalUrl: "https://example.com",
      title: "Test Link",
    });

    expect(result.slug).toBe("test-link");
    expect(result.originalUrl).toBe("https://example.com");
    expect(result.title).toBe("Test Link");
  });

  it("should enforce free tier link limit", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create 5 links (free tier limit)
    for (let i = 1; i <= 5; i++) {
      await caller.links.create({
        slug: `test-link-${i}`,
        originalUrl: `https://example.com/${i}`,
      });
    }

    // Attempt to create 6th link should fail
    await expect(
      caller.links.create({
        slug: "test-link-6",
        originalUrl: "https://example.com/6",
      })
    ).rejects.toThrow("Free tier is limited to 5 links");
  });

  it("should allow unlimited links for paid tier", async () => {
    const paidUser: AuthenticatedUser = {
      id: 2,
      openId: "paid-user",
      email: "paid@example.com",
      name: "Paid User",
      loginMethod: "manus",
      role: "user",
      subscriptionTier: "paid",
      subscriptionStatus: "active",
      subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stripeCustomerId: "cus_test123",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx = createTestContext(paidUser);
    const caller = appRouter.createCaller(ctx);

    // Create 10 links (more than free tier limit)
    for (let i = 1; i <= 10; i++) {
      const result = await caller.links.create({
        slug: `paid-link-${i}`,
        originalUrl: `https://example.com/${i}`,
      });
      expect(result.slug).toBe(`paid-link-${i}`);
    }
  });
});

describe("links.list", () => {
  it("should return user's links only", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create some links
    await caller.links.create({
      slug: "my-link-1",
      originalUrl: "https://example.com/1",
    });
    await caller.links.create({
      slug: "my-link-2",
      originalUrl: "https://example.com/2",
    });

    const links = await caller.links.list();
    
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links.every(link => link.slug.startsWith("my-link") || link.slug.startsWith("test-link") || link.slug.startsWith("paid-link"))).toBe(true);
  });
});

describe("links.delete", () => {
  it("should delete a link", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a link
    const created = await caller.links.create({
      slug: "delete-me",
      originalUrl: "https://example.com",
    });

    // Delete it
    await caller.links.delete({ linkId: created.id });

    // Verify it's gone
    const links = await caller.links.list();
    expect(links.find(l => l.id === created.id)).toBeUndefined();
  });

  it("should not allow deleting another user's link", async () => {
    const user1Ctx = createTestContext();
    const user1Caller = appRouter.createCaller(user1Ctx);

    // User 1 creates a link
    const created = await user1Caller.links.create({
      slug: "user1-link",
      originalUrl: "https://example.com",
    });

    // User 2 tries to delete it
    const user2: AuthenticatedUser = {
      id: 999,
      openId: "user2",
      email: "user2@example.com",
      name: "User 2",
      loginMethod: "manus",
      role: "user",
      subscriptionTier: "free",
      subscriptionStatus: "active",
      subscriptionEndsAt: null,
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const user2Ctx = createTestContext(user2);
    const user2Caller = appRouter.createCaller(user2Ctx);

    await expect(
      user2Caller.links.delete({ linkId: created.id })
    ).rejects.toThrow("You don't have permission");
  });
});

describe("subscription.getStatus", () => {
  it("should return free tier status", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const status = await caller.subscription.getStatus();

    expect(status.tier).toBe("free");
    expect(status.linkLimit).toBe(5);
  });

  it("should return paid tier status", async () => {
    const paidUser: AuthenticatedUser = {
      id: 3,
      openId: "paid-user-2",
      email: "paid2@example.com",
      name: "Paid User 2",
      loginMethod: "manus",
      role: "user",
      subscriptionTier: "paid",
      subscriptionStatus: "active",
      subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stripeCustomerId: "cus_test456",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx = createTestContext(paidUser);
    const caller = appRouter.createCaller(ctx);

    const status = await caller.subscription.getStatus();

    expect(status.tier).toBe("paid");
    expect(status.linkLimit).toBeNull();
  });
});
