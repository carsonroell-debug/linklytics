import axios from "axios";
import * as db from "./db";

const MILESTONES = [100, 1000, 10000];

interface WebhookPayload {
  linkSlug: string;
  linkUrl: string;
  milestone: number;
  totalClicks: number;
  timestamp: string;
}

export async function checkAndTriggerMilestones(linkId: number, userId: number, newClickCount: number) {
  try {
    const link = await db.getLinkById(linkId);
    if (!link) return;

    // Check if we've crossed any milestone
    const lastMilestone = link.lastMilestone || 0;
    const crossedMilestones = MILESTONES.filter(
      m => newClickCount >= m && lastMilestone < m
    );

    if (crossedMilestones.length === 0) return;

    // Get active webhooks for this user
    const webhooks = await db.getActiveWebhooksByUserId(userId);
    if (webhooks.length === 0) return;

    // Send notifications for each crossed milestone
    for (const milestone of crossedMilestones) {
      const payload: WebhookPayload = {
        linkSlug: link.slug,
        linkUrl: link.originalUrl,
        milestone,
        totalClicks: newClickCount,
        timestamp: new Date().toISOString(),
      };

      for (const webhook of webhooks) {
        let events: string[];
        try {
          events = JSON.parse(webhook.events);
        } catch {
          console.error(`[Webhook] Invalid events JSON for webhook ${webhook.id}`);
          continue;
        }
        if (!Array.isArray(events) || !events.includes("milestone_reached")) continue;

        try {
          await sendWebhook(webhook, payload);
          
          // Log successful delivery
          await db.createWebhookLog({
            webhookId: webhook.id,
            linkId,
            event: "milestone_reached",
            milestone,
            status: "success",
            response: "Webhook delivered successfully",
          });
        } catch (error: any) {
          console.error(`[Webhook] Failed to send to ${webhook.url}:`, error.message);
          
          // Log failed delivery
          await db.createWebhookLog({
            webhookId: webhook.id,
            linkId,
            event: "milestone_reached",
            milestone,
            status: "failed",
            response: error.message,
          });
        }
      }

      // Update the last milestone reached
      await db.updateLink(linkId, { lastMilestone: milestone });
    }
  } catch (error) {
    console.error("[Webhook] Error checking milestones:", error);
  }
}

async function sendWebhook(webhook: any, payload: WebhookPayload) {
  const { platform, url } = webhook;

  if (platform === "slack") {
    await sendSlackWebhook(url, payload);
  } else if (platform === "discord") {
    await sendDiscordWebhook(url, payload);
  } else {
    // Custom webhook - send generic JSON payload
    await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });
  }
}

async function sendSlackWebhook(url: string, payload: WebhookPayload) {
  const message = {
    text: `🎉 Milestone Reached!`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎉 Link Milestone Reached!",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Link:*\n${payload.linkSlug}`,
          },
          {
            type: "mrkdwn",
            text: `*Milestone:*\n${payload.milestone.toLocaleString()} clicks`,
          },
          {
            type: "mrkdwn",
            text: `*Total Clicks:*\n${payload.totalClicks.toLocaleString()}`,
          },
          {
            type: "mrkdwn",
            text: `*Destination:*\n${payload.linkUrl}`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Triggered at ${new Date(payload.timestamp).toLocaleString()}`,
          },
        ],
      },
    ],
  };

  await axios.post(url, message, {
    headers: { "Content-Type": "application/json" },
    timeout: 5000,
  });
}

async function sendDiscordWebhook(url: string, payload: WebhookPayload) {
  const message = {
    embeds: [
      {
        title: "🎉 Link Milestone Reached!",
        color: 0x3b82f6, // Blue color
        fields: [
          {
            name: "Link",
            value: payload.linkSlug,
            inline: true,
          },
          {
            name: "Milestone",
            value: `${payload.milestone.toLocaleString()} clicks`,
            inline: true,
          },
          {
            name: "Total Clicks",
            value: payload.totalClicks.toLocaleString(),
            inline: true,
          },
          {
            name: "Destination",
            value: payload.linkUrl,
            inline: false,
          },
        ],
        timestamp: payload.timestamp,
        footer: {
          text: "Linklytics",
        },
      },
    ],
  };

  await axios.post(url, message, {
    headers: { "Content-Type": "application/json" },
    timeout: 5000,
  });
}
