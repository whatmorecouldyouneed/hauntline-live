import { useRef } from "react"
import { useWebHaptics } from "web-haptics/react"

/** short pulse — single tap on each jump */
export const JUMP_HAPTIC_MS = 48

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
