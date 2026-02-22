import { useState } from "react"
import { GameCanvas } from "../../game/GameCanvas"
import { toScore } from "../../utils/score"
import type { CharacterIndex } from "../../game/meshes"

interface GameRunProps {
  onDeath: (elapsed: number) => void
  characterIndex?: CharacterIndex
}

export function GameRun({ onDeath, characterIndex = 0 }: GameRunProps) {
  const [elapsed, setElapsed] = useState(0)

  return (
    <div className="screen game-run">
      <GameCanvas
        onDeath={onDeath}
        onElapsed={setElapsed}
        characterIndex={characterIndex}
      />
      <div className="game-hud">
        <span className="hud-score">{toScore(elapsed)}</span>
      </div>
    </div>
  )
}
