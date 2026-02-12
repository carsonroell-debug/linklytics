import { Router } from "express";
import * as db from "./db";
import { z } from "zod";

const router = Router();

/**
 * Middleware to authenticate API requests using API key
 */
async function authenticateApiKey(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid authorization header. Use: Authorization: Bearer YOUR_API_KEY",
    });
  }

  const apiKey = authHeader.substring(7);
  const keyRecord = await db.getApiKeyByKey(apiKey);

  if (!keyRecord) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API key",
    });
  }

  // Update last used timestamp
  await db.updateApiKeyLastUsed(keyRecord.id);

  // Attach user ID to request
  req.userId = keyRecord.userId;
  next();
}

/**
 * GET /api/v1/links
 * List all links for the authenticated user
 */
router.get("/api/v1/links", authenticateApiKey, async (req: any, res) => {
  try {
    const links = await db.getLinksByUserId(req.userId);
    
    res.json({
      success: true,
      data: links.map(link => ({
        id: link.id,
        slug: link.slug,
        originalUrl: link.originalUrl,
        title: link.title,
        description: link.description,
        clickCount: link.clickCount,
        isActive: link.isActive,
        hasPassword: !!link.password,
        expiresAt: link.expiresAt,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      })),
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch links",
    });
  }
});

/**
 * POST /api/v1/links
 * Create a new short link
 */
router.post("/api/v1/links", authenticateApiKey, async (req: any, res) => {
  try {
    const schema = z.object({
      slug: z.string().min(1).max(255).regex(/^[a-zA-Z0-9-_]+$/),
      originalUrl: z.string().url(),
      title: z.string().max(500).optional(),
      description: z.string().optional(),
      expiresAt: z.string().datetime().optional(),
    });

    const validatedData = schema.parse(req.body);

    // Check link limit
    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    const linkCount = await db.countUserLinks(req.userId);
    if (user.subscriptionTier === "free" && linkCount >= 5) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Free tier is limited to 5 links. Please upgrade to Pro for unlimited links.",
      });
    }

    // Check if slug exists
    const existingLink = await db.getLinkBySlug(validatedData.slug);
    if (existingLink) {
      return res.status(409).json({
        error: "Conflict",
        message: "This slug is already taken",
      });
    }

    // Create link
    await db.createLink({
      userId: req.userId,
      slug: validatedData.slug,
      originalUrl: validatedData.originalUrl,
      title: validatedData.title,
      description: validatedData.description,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
    });

    const createdLink = await db.getLinkBySlug(validatedData.slug);

    res.status(201).json({
      success: true,
      data: {
        id: createdLink!.id,
        slug: createdLink!.slug,
        originalUrl: createdLink!.originalUrl,
        title: createdLink!.title,
        description: createdLink!.description,
        shortUrl: `${req.protocol}://${req.get('host')}/${createdLink!.slug}`,
        createdAt: createdLink!.createdAt,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid request data",
        details: error.issues,
      });
    }

    console.error("API Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create link",
    });
  }
});

/**
 * GET /api/v1/links/:slug/analytics
 * Get analytics for a specific link
 */
router.get("/api/v1/links/:slug/analytics", authenticateApiKey, async (req: any, res) => {
  try {
    const { slug } = req.params;
    const daysAgo = parseInt(req.query.days as string) || 30;

    const link = await db.getLinkBySlug(slug);

    if (!link) {
      return res.status(404).json({
        error: "Not Found",
        message: "Link not found",
      });
    }

    if (link.userId !== req.userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to view this link's analytics",
      });
    }

    const clickData = await db.getClickStats(link.id, daysAgo);

    // Aggregate data
    const clicksByDate: Record<string, number> = {};
    const clicksByCountry: Record<string, number> = {};
    const clicksByDevice: Record<string, number> = {};
    const clicksByBrowser: Record<string, number> = {};

    clickData.forEach(click => {
      const dateKey = click.clickedAt.toISOString().split('T')[0];
      clicksByDate[dateKey] = (clicksByDate[dateKey] || 0) + 1;

      if (click.country) {
        clicksByCountry[click.country] = (clicksByCountry[click.country] || 0) + 1;
      }

      if (click.device) {
        clicksByDevice[click.device] = (clicksByDevice[click.device] || 0) + 1;
      }

      if (click.browser) {
        clicksByBrowser[click.browser] = (clicksByBrowser[click.browser] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        link: {
          slug: link.slug,
          originalUrl: link.originalUrl,
          title: link.title,
        },
        period: {
          days: daysAgo,
          startDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
        summary: {
          totalClicks: clickData.length,
          uniqueCountries: Object.keys(clicksByCountry).length,
          uniqueDevices: Object.keys(clicksByDevice).length,
          uniqueBrowsers: Object.keys(clicksByBrowser).length,
        },
        clicksByDate,
        clicksByCountry,
        clicksByDevice,
        clicksByBrowser,
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch analytics",
    });
  }
});

/**
 * DELETE /api/v1/links/:slug
 * Delete a link
 */
router.delete("/api/v1/links/:slug", authenticateApiKey, async (req: any, res) => {
  try {
    const { slug } = req.params;
    const link = await db.getLinkBySlug(slug);

    if (!link) {
      return res.status(404).json({
        error: "Not Found",
        message: "Link not found",
      });
    }

    if (link.userId !== req.userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to delete this link",
      });
    }

    await db.deleteLink(link.id);

    res.json({
      success: true,
      message: "Link deleted successfully",
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete link",
    });
  }
});

export default router;
