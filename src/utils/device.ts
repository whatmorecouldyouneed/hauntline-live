/**
 * detects if the current device is mobile/tablet for the desktop gate.
 * combines user-agent checks with touch capability.
 */
export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent.toLowerCase()
  const mobilePattern =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i
  const hasTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  return mobilePattern.test(ua) || hasTouch
}
