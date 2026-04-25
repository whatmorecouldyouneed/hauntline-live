import { useCallback, type ButtonHTMLAttributes } from "react"
import { useWebHaptics } from "web-haptics/react"

type Trigger = ReturnType<typeof useWebHaptics>["trigger"]
export type HapticPattern = Parameters<Trigger>[0]

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** web-haptics preset name or custom pattern; defaults to "selection" */
  haptic?: HapticPattern
}

/**
 * drop-in <button> replacement that fires a haptic on click before the
 * provided onClick handler. respects `disabled` (no haptic, no handler).
 * pattern defaults to "selection" — light tap good for menu items.
 */
export function HapticButton({
  haptic = "selection",
  onClick,
  disabled,
  ...rest
}: Props) {
  const { trigger } = useWebHaptics()

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      void trigger(haptic)
      onClick?.(e)
    },
    [haptic, onClick, disabled, trigger]
  )

  return <button {...rest} disabled={disabled} onClick={handleClick} />
}
