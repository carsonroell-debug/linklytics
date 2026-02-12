import { Router } from "express";
import { getStripe } from "./stripe";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

const router = Router();

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

router.post("/api/stripe/webhook", async (req, res) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return res.status(500).send("Webhook not configured");
  }

  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Webhook] No signature found");
    return res.status(400).send("No signature");
  }

  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  console.log("[Webhook] Processing event:", event.type, event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = parseInt(session.metadata?.user_id || "0");

        if (!userId) {
          console.error("[Webhook] No user_id in session metadata");
          break;
        }

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Update user subscription
        await db.updateUserSubscription(userId, {
          subscriptionTier: "paid",
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: "active",
        });

        // Notify owner of new subscription
        const user = await db.getUserById(userId);
        if (user) {
          await notifyOwner({
            title: "New Pro Subscription! 🎉",
            content: `${user.name || user.email || "A user"} just upgraded to Linklytics Pro!`,
          });
        }

        console.log(`[Webhook] User ${userId} upgraded to Pro`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = parseInt(subscription.metadata?.user_id || "0");

        if (!userId) {
          console.error("[Webhook] No user_id in subscription metadata");
          break;
        }

        const status = subscription.status;
        const endsAt = subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null;

        await db.updateUserSubscription(userId, {
          subscriptionStatus: status as any,
          subscriptionEndsAt: endsAt,
        });

        console.log(`[Webhook] Subscription updated for user ${userId}: ${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = parseInt(subscription.metadata?.user_id || "0");

        if (!userId) {
          console.error("[Webhook] No user_id in subscription metadata");
          break;
        }

        // Downgrade to free tier
        await db.updateUserSubscription(userId, {
          subscriptionTier: "free",
          subscriptionStatus: "canceled",
          stripeSubscriptionId: undefined,
          subscriptionEndsAt: undefined,
        });

        console.log(`[Webhook] User ${userId} downgraded to free tier`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        console.log(`[Webhook] Payment succeeded for invoice ${invoice.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log(`[Webhook] Payment failed for invoice ${invoice.id}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
