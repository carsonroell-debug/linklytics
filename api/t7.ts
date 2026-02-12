// Test: bcryptjs
import bcrypt from "bcryptjs";
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, test: "bcryptjs", hasHash: typeof bcrypt.hash });
}
