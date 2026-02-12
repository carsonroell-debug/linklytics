// Test: qrcode package
import QRCode from "qrcode";
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, test: "qrcode", hasToDataURL: typeof QRCode.toDataURL });
}
