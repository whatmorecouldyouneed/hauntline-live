import { useEffect, useState } from "react"
import { isMobile } from "../../utils/device"
import { generateQRDataUrl } from "../../utils/qr"

const CANONICAL_URL = "https://hauntline.live"

interface DesktopGateProps {
  children: React.ReactNode
}

export function DesktopGate({ children }: DesktopGateProps) {
  const [mobile] = useState(() => isMobile())
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!mobile) {
      generateQRDataUrl(CANONICAL_URL).then(setQrUrl)
    }
  }, [mobile])

  if (mobile) {
    return <>{children}</>
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CANONICAL_URL)
    } catch {
      // fallback for older browsers
    }
  }

  return (
    <div className="screen desktop-gate">
      <p className="gate-message">uh oh — hauntline needs a phone</p>
      {qrUrl && (
        <img src={qrUrl} alt="QR code" className="gate-qr" />
      )}
      <button type="button" onClick={handleCopy} className="btn btn-primary">
        Copy link
      </button>
    </div>
  )
}
