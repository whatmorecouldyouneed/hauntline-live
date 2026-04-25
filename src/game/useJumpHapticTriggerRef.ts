import { useRef } from "react"
import { useWebHaptics } from "web-haptics/react"

/** web-haptics built-in: two taps (see package readme) */
export const JUMP_HAPTIC_PRESET = "success" as const

/**
 * stable access to web-haptics `trigger` for handlers registered inside useEffect
 * (pointer/touch listeners), where hooks cannot run.
 */
export function useJumpHapticTriggerRef() {
  const { trigger } = useWebHaptics()
  const ref = useRef(trigger)
  ref.current = trigger
  return ref
}
