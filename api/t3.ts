// Test: full server/routers import
import { appRouter } from "../server/routers";
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, test: "routers", type: typeof appRouter });
}
