import { useState } from "react"
import { GameCanvas } from "../../game/GameCanvas"

interface GameRunProps {
  onDeath: (elapsed: number) => void
}

function toScore(sec: number): number {
  return Math.floor(sec * 10)
}

export function GameRun({ onDeath }: GameRunProps) {
  const [elapsed, setElapsed] = useState(0)

  return (
    <div className="screen game-run">
      <GameCanvas
        onDeath={onDeath}
        onElapsed={setElapsed}
      />
      <div className="game-hud">
        <span className="hud-score">{toScore(elapsed)}</span>
      </div>
    </div>
  )
}
