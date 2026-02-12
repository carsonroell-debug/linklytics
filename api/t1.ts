// Test: just drizzle-orm/mysql2 import
import { drizzle } from "drizzle-orm/mysql2";
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, test: "drizzle-mysql2", hasDrizzle: typeof drizzle });
}
