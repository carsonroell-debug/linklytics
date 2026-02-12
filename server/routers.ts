import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { generateQRCode } from "./qrcode";
import { createCheckoutSession, createStripeCustomer, createPortalSession } from "./stripe";
import { PRODUCTS } from "./products";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";

const FREE_TIER_LINK_LIMIT = 5;

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  links: router({
    // Create a new short link
    create: protectedProcedure
      .input(z.object({
        slug: z.string().min(1).max(255).regex(/^[a-zA-Z0-9-_]+$/, "Slug can only contain letters, numbers, hyphens, and underscores"),
        originalUrl: z.string().url(),
        title: z.string().max(500).optional(),
        description: z.string().optional(),
        password: z.string().optional(),
        expiresAt: z.date().optional(),
        campaignId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user has reached their link limit
        const linkCount = await db.countUserLinks(ctx.user.id);
        
        if (ctx.user.subscriptionTier === "free" && linkCount >= FREE_TIER_LINK_LIMIT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Free tier is limited to ${FREE_TIER_LINK_LIMIT} links. Please upgrade to create more.`,
          });
        }

        // Check if slug is already taken
        const existingLink = await db.getLinkBySlug(input.slug);
        if (existingLink) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This slug is already taken. Please choose a different one.",
          });
        }

        // Hash password if provided
        let hashedPassword: string | undefined;
        if (input.password) {
          hashedPassword = await bcrypt.hash(input.password, 10);
        }

        await db.createLink({
          userId: ctx.user.id,
          slug: input.slug,
          originalUrl: input.originalUrl,
          title: input.title,
          description: input.description,
          password: hashedPassword,
          expiresAt: input.expiresAt,
        });

        return { success: true, slug: input.slug };
      }),

    // Get all links for current user
    list: protectedProcedure.query(async ({ ctx }) => {
      const userLinks = await db.getLinksByUserId(ctx.user.id);
      return userLinks;
    }),

    // Bulk import links from CSV data
    bulkImport: protectedProcedure
      .input(z.object({
        links: z.array(z.object({
          slug: z.string().min(1).max(255).regex(/^[a-zA-Z0-9-_]+$/, "Slug can only contain letters, numbers, hyphens, and underscores"),
          originalUrl: z.string().url(),
          title: z.string().max(500).optional(),
          description: z.string().optional(),
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        const linkCount = await db.countUserLinks(ctx.user.id);
        const newLinkCount = linkCount + input.links.length;
        
        // Check if user will exceed their link limit
        if (ctx.user.subscriptionTier === "free" && newLinkCount > FREE_TIER_LINK_LIMIT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Free tier is limited to ${FREE_TIER_LINK_LIMIT} links. You currently have ${linkCount} links and are trying to add ${input.links.length} more. Please upgrade to create more links.`,
          });
        }

        const results = {
          successful: [] as string[],
          failed: [] as { slug: string; error: string }[],
        };

        for (const linkData of input.links) {
          try {
            // Check if slug is already taken
            const existingLink = await db.getLinkBySlug(linkData.slug);
            if (existingLink) {
              results.failed.push({
                slug: linkData.slug,
                error: "Slug already exists",
              });
              continue;
            }

            await db.createLink({
              userId: ctx.user.id,
              slug: linkData.slug,
              originalUrl: linkData.originalUrl,
              title: linkData.title,
              description: linkData.description,
            });

            results.successful.push(linkData.slug);
          } catch (error) {
            results.failed.push({
              slug: linkData.slug,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        return results;
      }),

    // Get single link details with analytics
    get: protectedProcedure
      .input(z.object({ linkId: z.number() }))
      .query(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.linkId);
        
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link not found",
          });
        }

        if (link.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view this link",
          });
        }

        const recentClicks = await db.getClicksByLinkId(link.id, 100);
        
        return {
          link,
          recentClicks,
        };
      }),

    // Update a link
    update: protectedProcedure
      .input(z.object({
        linkId: z.number(),
        originalUrl: z.string().url().optional(),
        title: z.string().max(500).optional(),
        description: z.string().optional(),
        password: z.string().optional().nullable(),
        expiresAt: z.date().optional().nullable(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.linkId);
        
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link not found",
          });
        }

        if (link.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this link",
          });
        }

        const updateData: Record<string, string | boolean | Date | null | undefined> = {};

        if (input.originalUrl !== undefined) updateData.originalUrl = input.originalUrl;
        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt;

        if (input.password !== undefined) {
          if (input.password === null) {
            updateData.password = null;
          } else if (input.password) {
            updateData.password = await bcrypt.hash(input.password, 10);
          }
        }

        await db.updateLink(input.linkId, updateData);
        
        return { success: true };
      }),

    // Delete a link
    delete: protectedProcedure
      .input(z.object({ linkId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.linkId);
        
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link not found",
          });
        }

        if (link.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete this link",
          });
        }

        await db.deleteLink(input.linkId);
        
        return { success: true };
      }),

    // Generate QR code for a link
    generateQR: protectedProcedure
      .input(z.object({ linkId: z.number() }))
      .query(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.linkId);
        
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link not found",
          });
        }

        if (link.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to generate QR code for this link",
          });
        }

        const shortUrl = `${ctx.req.protocol}://${ctx.req.get('host')}/${link.slug}`;
        const qrCodeDataUrl = await generateQRCode(shortUrl);
        
        return { qrCode: qrCodeDataUrl, shortUrl };
      }),

    // Verify password for protected link (public endpoint)
    verifyPassword: publicProcedure
      .input(z.object({
        slug: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const link = await db.getLinkBySlug(input.slug);
        
        if (!link || !link.password) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link not found or not password protected",
          });
        }

        const isValid = await bcrypt.compare(input.password, link.password);
        
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Incorrect password",
          });
        }

        return { valid: true, originalUrl: link.originalUrl };
      }),
  }),

  analytics: router({
    // Get analytics for a specific link
    getLinkAnalytics: protectedProcedure
      .input(z.object({
        linkId: z.number(),
        daysAgo: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.linkId);
        
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link not found",
          });
        }

        if (link.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view this link's analytics",
          });
        }

        const clickData = await db.getClickStats(input.linkId, input.daysAgo);
        
        // Aggregate data for charts
        const clicksByDate: Record<string, number> = {};
        const clicksByCountry: Record<string, number> = {};
        const clicksByDevice: Record<string, number> = {};
        const clicksByBrowser: Record<string, number> = {};
        const geoData: Array<{ lat: number; lng: number; city: string }> = [];

        clickData.forEach(click => {
          // Date aggregation
          const dateKey = click.clickedAt.toISOString().split('T')[0];
          clicksByDate[dateKey] = (clicksByDate[dateKey] || 0) + 1;

          // Country aggregation
          if (click.country) {
            clicksByCountry[click.country] = (clicksByCountry[click.country] || 0) + 1;
          }

          // Device aggregation
          if (click.device) {
            clicksByDevice[click.device] = (clicksByDevice[click.device] || 0) + 1;
          }

          // Browser aggregation
          if (click.browser) {
            clicksByBrowser[click.browser] = (clicksByBrowser[click.browser] || 0) + 1;
          }

          // Geo data for heatmap
          if (click.latitude && click.longitude) {
            geoData.push({
              lat: parseFloat(click.latitude),
              lng: parseFloat(click.longitude),
              city: click.city || 'Unknown',
            });
          }
        });

        return {
          totalClicks: clickData.length,
          clicksByDate,
          clicksByCountry,
          clicksByDevice,
          clicksByBrowser,
          geoData,
          recentClicks: clickData.slice(0, 20),
        };
      }),

    // Get overview analytics for all user's links
    getOverview: protectedProcedure
      .input(z.object({
        daysAgo: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        const userLinks = await db.getLinksByUserId(ctx.user.id);
        const allClicks = await db.getClicksByUserId(ctx.user.id, input.daysAgo);

        const totalLinks = userLinks.length;
        const totalClicks = allClicks.length;
        
        // Calculate top performing links
        const linkPerformance: Record<number, { link: any; clicks: number }> = {};
        
        allClicks.forEach(({ click, link }) => {
          if (!linkPerformance[link.id]) {
            linkPerformance[link.id] = { link, clicks: 0 };
          }
          linkPerformance[link.id].clicks++;
        });

        const topLinks = Object.values(linkPerformance)
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 5);

        return {
          totalLinks,
          totalClicks,
          topLinks,
          linkLimit: ctx.user.subscriptionTier === "free" ? FREE_TIER_LINK_LIMIT : null,
        };
      }),
  }),

  apiKeys: router({
    // Create a new API key
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        const key = `lnk_${nanoid(48)}`;
        
        await db.createApiKey({
          userId: ctx.user.id,
          key,
          name: input.name,
        });

        return { key, name: input.name };
      }),

    // List all API keys for user
    list: protectedProcedure.query(async ({ ctx }) => {
      const keys = await db.getApiKeysByUserId(ctx.user.id);
      // Don't return the actual key value for security
      return keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPreview: `${k.key.substring(0, 12)}...`,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        isActive: k.isActive,
      }));
    }),

    // Delete an API key
    delete: protectedProcedure
      .input(z.object({ keyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const keys = await db.getApiKeysByUserId(ctx.user.id);
        const keyToDelete = keys.find(k => k.id === input.keyId);
        
        if (!keyToDelete) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        await db.deleteApiKey(input.keyId);
        
        return { success: true };
      }),
  }),

  subscription: router({
    // Create checkout session for upgrading to Pro
    createCheckout: protectedProcedure
      .input(z.object({
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create Stripe customer if doesn't exist
        let customerId = ctx.user.stripeCustomerId;
        
        if (!customerId) {
          const customer = await createStripeCustomer({
            email: ctx.user.email || "",
            name: ctx.user.name || undefined,
            userId: ctx.user.id,
          });
          
          customerId = customer.id;
          await db.updateUserSubscription(ctx.user.id, {
            stripeCustomerId: customerId,
          });
        }

        const session = await createCheckoutSession({
          priceId: PRODUCTS.PRO_MONTHLY.priceId,
          customerId,
          customerEmail: ctx.user.email || "",
          customerName: ctx.user.name || undefined,
          userId: ctx.user.id,
          successUrl: `${input.origin}/dashboard?payment=success`,
          cancelUrl: `${input.origin}/dashboard?payment=canceled`,
        });

        return { checkoutUrl: session.url };
      }),

    // Create portal session for managing subscription
    createPortal: protectedProcedure
      .input(z.object({
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.stripeCustomerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active subscription found",
          });
        }

        const session = await createPortalSession({
          customerId: ctx.user.stripeCustomerId,
          returnUrl: `${input.origin}/dashboard`,
        });

        return { portalUrl: session.url };
      }),

    // Get current subscription status
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      return {
        tier: ctx.user.subscriptionTier,
        status: ctx.user.subscriptionStatus,
        endsAt: ctx.user.subscriptionEndsAt,
        hasStripeCustomer: !!ctx.user.stripeCustomerId,
      };
      }),
  }),

  campaigns: router({
    // Create a new campaign
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createCampaign({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          color: input.color,
        });
        return { success: true };
      }),

    // List all campaigns
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCampaignsByUserId(ctx.user.id);
    }),

    // Get campaign with links
    get: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        
        if (!campaign) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign not found",
          });
        }

        if (campaign.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view this campaign",
          });
        }

        const links = await db.getLinksByCampaignId(input.campaignId);
        
        return {
          ...campaign,
          links,
          linkCount: links.length,
          totalClicks: links.reduce((sum, link) => sum + link.clickCount, 0),
        };
      }),

    // Update campaign
    update: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this campaign",
          });
        }

        await db.updateCampaign(input.campaignId, {
          name: input.name,
          description: input.description,
          color: input.color,
        });

        return { success: true };
      }),

    // Delete campaign
    delete: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete this campaign",
          });
        }

        await db.deleteCampaign(input.campaignId);
        return { success: true };
      }),
  }),

  webhooks: router({
    // Create a new webhook
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        url: z.string().url(),
        platform: z.enum(["slack", "discord", "custom"]),
        events: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createWebhook({
          userId: ctx.user.id,
          name: input.name,
          url: input.url,
          platform: input.platform,
          events: JSON.stringify(input.events),
        });
        return { success: true };
      }),

    // List all webhooks
    list: protectedProcedure.query(async ({ ctx }) => {
      const webhooks = await db.getWebhooksByUserId(ctx.user.id);
      return webhooks.map(w => ({
        ...w,
        events: JSON.parse(w.events),
      }));
    }),

    // Update webhook
    update: protectedProcedure
      .input(z.object({
        webhookId: z.number(),
        name: z.string().min(1).max(255).optional(),
        url: z.string().url().optional(),
        platform: z.enum(["slack", "discord", "custom"]).optional(),
        events: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const webhook = await db.getWebhookById(input.webhookId);
        
        if (!webhook || webhook.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this webhook",
          });
        }

        await db.updateWebhook(input.webhookId, {
          name: input.name,
          url: input.url,
          platform: input.platform,
          events: input.events ? JSON.stringify(input.events) : undefined,
          isActive: input.isActive,
        });

        return { success: true };
      }),

    // Delete webhook
    delete: protectedProcedure
      .input(z.object({ webhookId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const webhook = await db.getWebhookById(input.webhookId);
        
        if (!webhook || webhook.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete this webhook",
          });
        }

        await db.deleteWebhook(input.webhookId);
        return { success: true };
      }),

    // Get webhook logs
    getLogs: protectedProcedure
      .input(z.object({ webhookId: z.number() }))
      .query(async ({ ctx, input }) => {
        const webhook = await db.getWebhookById(input.webhookId);
        
        if (!webhook || webhook.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view this webhook's logs",
          });
        }

        return await db.getWebhookLogsByWebhookId(input.webhookId);
      }),
  }),

  insights: router({
    // Generate AI-powered insights for a link
    generateLinkInsights: protectedProcedure
      .input(z.object({ linkId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.linkId);
        
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link not found",
          });
        }

        if (link.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view insights for this link",
          });
        }

        // Check if user has Pro subscription
        if (ctx.user.subscriptionTier !== "paid") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "AI insights are only available for Pro users. Please upgrade to access this feature.",
          });
        }

        // Get analytics data
        const clickData = await db.getClickStats(input.linkId, 30);
        
        // Aggregate data for AI analysis
        const clicksByHour: Record<number, number> = {};
        const clicksByDay: Record<string, number> = {};
        const deviceStats: Record<string, number> = {};
        const locationStats: Record<string, number> = {};
        
        clickData.forEach(click => {
          const hour = new Date(click.clickedAt).getHours();
          clicksByHour[hour] = (clicksByHour[hour] || 0) + 1;
          
          const day = new Date(click.clickedAt).toLocaleDateString('en-US', { weekday: 'long' });
          clicksByDay[day] = (clicksByDay[day] || 0) + 1;
          
          if (click.device) {
            deviceStats[click.device] = (deviceStats[click.device] || 0) + 1;
          }
          
          if (click.country) {
            locationStats[click.country] = (locationStats[click.country] || 0) + 1;
          }
        });

        const analyticsData = {
          totalClicks: clickData.length,
          clicksByHour,
          clicksByDay,
          deviceStats,
          locationStats,
          linkTitle: link.title || link.slug,
          linkUrl: link.originalUrl,
        };

        // Generate insights using LLM
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert marketing analyst specializing in link performance optimization. Analyze the provided link analytics data and provide actionable insights.",
            },
            {
              role: "user",
              content: `Analyze this link performance data and provide insights:\n\nLink: ${analyticsData.linkTitle}\nTotal Clicks: ${analyticsData.totalClicks}\n\nClicks by Hour: ${JSON.stringify(analyticsData.clicksByHour)}\nClicks by Day: ${JSON.stringify(analyticsData.clicksByDay)}\nDevice Distribution: ${JSON.stringify(analyticsData.deviceStats)}\nTop Locations: ${JSON.stringify(analyticsData.locationStats)}\n\nProvide:\n1. Key performance insights (2-3 bullet points)\n2. Optimal posting times based on click patterns\n3. Audience behavior patterns\n4. Actionable recommendations to improve engagement`,
            },
          ],
        });

        const insights = response.choices[0]?.message?.content || "Unable to generate insights at this time.";

        return {
          insights,
          analyticsData,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
