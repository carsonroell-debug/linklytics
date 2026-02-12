import QRCode from "qrcode";

export async function generateQRCode(url: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 512,
      margin: 2,
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error("QR code generation error:", error);
    throw new Error("Failed to generate QR code");
  }
}
