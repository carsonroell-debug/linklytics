import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("campaigns", () => {
  it("creates a campaign successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.campaigns.create({
      name: "Test Campaign",
      description: "Test Description",
      color: "#3b82f6",
    });

    expect(result.success).toBe(true);
    
    // Verify it was created by listing campaigns
    const campaigns = await caller.campaigns.list();
    const created = campaigns.find(c => c.name === "Test Campaign");
    expect(created).toBeDefined();
    expect(created?.description).toBe("Test Description");
  });

  it("lists campaigns for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaigns = await caller.campaigns.list();

    expect(Array.isArray(campaigns)).toBe(true);
    // Should include the campaign created in previous test
    expect(campaigns.length).toBeGreaterThan(0);
  });

  it("gets campaign with link count and total clicks", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a campaign
    await caller.campaigns.create({
      name: "Analytics Test Campaign",
      description: "Testing analytics",
      color: "#10b981",
    });

    // Find the created campaign
    const campaigns = await caller.campaigns.list();
    const campaign = campaigns.find(c => c.name === "Analytics Test Campaign");
    expect(campaign).toBeDefined();

    // Get the campaign details
    const details = await caller.campaigns.get({ campaignId: campaign!.id });

    expect(details).toBeDefined();
    expect(details.id).toBe(campaign!.id);
    expect(details.linkCount).toBe(0); // No links assigned yet
    expect(details.totalClicks).toBe(0);
    expect(details.links).toEqual([]);
  });
});

describe("webhooks", () => {
  it("creates a webhook successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.webhooks.create({
      name: "Test Slack Webhook",
      url: "https://hooks.slack.com/services/TEST/TEST/TEST",
      platform: "slack",
      events: ["milestone_reached"],
    });

    expect(result.success).toBe(true);
    
    // Verify it was created by listing webhooks
    const webhooks = await caller.webhooks.list();
    const created = webhooks.find(w => w.name === "Test Slack Webhook");
    expect(created).toBeDefined();
    expect(created?.platform).toBe("slack");
  });

  it("lists webhooks for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const webhooks = await caller.webhooks.list();

    expect(Array.isArray(webhooks)).toBe(true);
    expect(webhooks.length).toBeGreaterThan(0);
  });

  it("toggles webhook active status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a webhook
    await caller.webhooks.create({
      name: "Toggle Test Webhook",
      url: "https://discord.com/api/webhooks/TEST/TEST",
      platform: "discord",
      events: ["milestone_reached"],
    });

    // Find the created webhook
    let webhooks = await caller.webhooks.list();
    const webhook = webhooks.find(w => w.name === "Toggle Test Webhook");
    expect(webhook).toBeDefined();
    expect(webhook?.isActive).toBe(true);

    // Toggle to inactive
    await caller.webhooks.update({
      webhookId: webhook!.id,
      isActive: false,
    });

    webhooks = await caller.webhooks.list();
    const updatedWebhook = webhooks.find(w => w.id === webhook!.id);
    expect(updatedWebhook?.isActive).toBe(false);
  });
});
