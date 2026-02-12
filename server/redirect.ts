import { Router } from "express";
import * as db from "./db";
import bcrypt from "bcryptjs";
import { checkAndTriggerMilestones } from "./webhookService";

const router = Router();

/**
 * Parse user agent to extract device, browser, and OS info
 */
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  // Device detection
  let device = "desktop";
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
    device = /ipad|tablet/.test(ua) ? "tablet" : "mobile";
  }
  
  // Browser detection
  let browser = "unknown";
  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";
  
  // OS detection
  let os = "unknown";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  
  return { device, browser, os };
}

/**
 * Get geographic location from IP address
 * Using a simple IP geolocation API
 */
async function getLocationFromIP(ip: string) {
  try {
    // Use ip-api.com free tier (no auth required, 45 req/min limit)
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,city,regionName,lat,lon`);
    const data = await response.json();
    
    if (data.status === "success") {
      return {
        country: data.country,
        city: data.city,
        region: data.regionName,
        latitude: data.lat?.toString(),
        longitude: data.lon?.toString(),
      };
    }
  } catch (error) {
    console.error("Geolocation error:", error);
  }
  
  return {
    country: undefined,
    city: undefined,
    region: undefined,
    latitude: undefined,
    longitude: undefined,
  };
}

/**
 * Handle short link redirects
 */
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  
  try {
    const link = await db.getLinkBySlug(slug);
    
    if (!link) {
      return res.status(404).send("Link not found");
    }
    
    // Check if link is active
    if (!link.isActive) {
      return res.status(410).send("This link has been deactivated");
    }
    
    // Check if link has expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(410).send("This link has expired");
    }
    
    // Check if link is password protected
    if (link.password) {
      // Redirect to password entry page
      return res.redirect(`/link/${slug}/verify`);
    }
    
    // Track the click asynchronously (don't wait for it)
    const userAgent = req.headers["user-agent"] || "";
    const referrerHeader = req.headers["referer"] || req.headers["referrer"];
    const referrer = Array.isArray(referrerHeader) ? referrerHeader[0] : (referrerHeader || "");
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
                      req.socket.remoteAddress || 
                      "";
    
    const { device, browser, os } = parseUserAgent(userAgent);
    const location = await getLocationFromIP(ipAddress);
    
    // Record click analytics
    db.recordClick({
      linkId: link.id,
      country: location.country,
      city: location.city,
      region: location.region,
      latitude: location.latitude,
      longitude: location.longitude,
      device,
      browser,
      os,
      referrer,
      ipAddress,
      userAgent,
    }).catch(err => console.error("Failed to record click:", err));
    
    // Increment click count and check for milestones
    db.incrementLinkClicks(link.id)
      .then(async () => {
        // Get updated link to check new click count
        const updatedLink = await db.getLinkById(link.id);
        if (updatedLink) {
          await checkAndTriggerMilestones(link.id, link.userId, updatedLink.clickCount);
        }
      })
      .catch(err => console.error("Failed to increment clicks:", err));
    
    // Validate URL before redirect to prevent open redirect attacks
    try {
      const targetUrl = new URL(link.originalUrl);
      if (!["http:", "https:"].includes(targetUrl.protocol)) {
        return res.status(400).send("Invalid redirect URL");
      }
    } catch {
      return res.status(400).send("Invalid redirect URL");
    }

    res.redirect(link.originalUrl);
    
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send("Internal server error");
  }
});

export default router;
