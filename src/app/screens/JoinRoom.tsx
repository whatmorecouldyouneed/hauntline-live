import { useState } from "react"
import { HapticButton } from "../../components/HapticButton"

interface JoinRoomProps {
  onJoin: (roomCode: string) => void
  onBack: () => void
}

export function JoinRoom({ onJoin, onBack }: JoinRoomProps) {
  const [code, setCode] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase().slice(0, 4))
  }

  const handleSubmit = () => {
    if (code.length !== 4) return
    onJoin(code)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  return (
    <div className="screen join-room">
      <h2 className="screen-title">enter room code</h2>
      <input
        type="text"
        placeholder="ABCD"
        value={code}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="name-input room-code-input"
        autoFocus
        maxLength={4}
      />
      <div className="screen-actions">
        <HapticButton type="button" onClick={onBack} className="btn btn-secondary">
          Back
        </HapticButton>
        <HapticButton
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary"
          disabled={code.length !== 4}
          haptic="success"
        >
          Join
        </HapticButton>
      </div>
    </div>
  )
}
