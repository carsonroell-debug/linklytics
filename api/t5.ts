// Test: nanoid (ESM-only package)
import { nanoid } from "nanoid";
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, test: "nanoid", sample: nanoid(10) });
}
