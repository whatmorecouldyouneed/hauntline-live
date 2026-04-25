import { HapticButton } from "../../components/HapticButton"

interface TurnIntroProps {
  playerName: string
  onStart: () => void
}

export function TurnIntro({ playerName, onStart }: TurnIntroProps) {
  return (
    <div className="screen turn-intro">
      <p className="turn-name">{playerName} — you&apos;re up</p>
      <p className="turn-hint">tap to jump. survive.</p>
      <HapticButton type="button" onClick={onStart} className="btn btn-primary" haptic="success">
        Start
      </HapticButton>
    </div>
  )
}
