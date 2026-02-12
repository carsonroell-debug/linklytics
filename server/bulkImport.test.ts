import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(subscriptionTier: "free" | "paid" = "free"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "test-bulk-import-user",
    email: "bulktest@example.com",
    name: "Bulk Test User",
    loginMethod: "manus",
    role: "user",
    subscriptionTier,
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

describe("links.bulkImport", () => {
  it("validates input schema and rejects invalid URLs", async () => {
    const { ctx } = createAuthContext("paid");
    const caller = appRouter.createCaller(ctx);

    const invalidLinks = [
      { slug: "valid-slug", originalUrl: "not-a-url" },
    ];

    await expect(
      caller.links.bulkImport({ links: invalidLinks })
    ).rejects.toThrow();
  });

  it("validates slug format and rejects invalid characters", async () => {
    const { ctx } = createAuthContext("paid");
    const caller = appRouter.createCaller(ctx);

    const invalidLinks = [
      { slug: "invalid slug with spaces", originalUrl: "https://example.com" },
    ];

    await expect(
      caller.links.bulkImport({ links: invalidLinks })
    ).rejects.toThrow();
  });

  it("returns success and failure results for mixed input", async () => {
    const { ctx } = createAuthContext("paid");
    const caller = appRouter.createCaller(ctx);

    // Use unique slugs to avoid conflicts with existing test data
    const timestamp = Date.now();
    const links = [
      { slug: `bulk-test-${timestamp}-1`, originalUrl: "https://example.com/1" },
      { slug: `bulk-test-${timestamp}-2`, originalUrl: "https://example.com/2" },
    ];

    const result = await caller.links.bulkImport({ links });

    expect(result).toHaveProperty("successful");
    expect(result).toHaveProperty("failed");
    expect(Array.isArray(result.successful)).toBe(true);
    expect(Array.isArray(result.failed)).toBe(true);
  });
});
