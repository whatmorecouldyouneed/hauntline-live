import qrcode from "qrcode"

/**
 * generates a QR code data URL for the given url.
 * light-on-dark scheme to match the dark UI.
 */
export async function generateQRDataUrl(url: string): Promise<string> {
  return qrcode.toDataURL(url, {
    width: 256,
    margin: 2,
    color: {
      dark: "#00ff88",
      light: "#0a0a0a",
    },
  })
}
