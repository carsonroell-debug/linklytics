// Test: trpc + superjson
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, test: "trpc", hasInitTRPC: typeof initTRPC });
}
