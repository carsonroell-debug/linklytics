// Test: stripe
import Stripe from "stripe";
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, test: "stripe", type: typeof Stripe });
}
