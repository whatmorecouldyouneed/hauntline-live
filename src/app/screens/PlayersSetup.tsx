import { useState } from "react"

export interface PlayerInput {
  name: string
  bestMs: number
}

interface PlayersSetupProps {
  onStart: (players: PlayerInput[]) => void
  onBack: () => void
}

export function PlayersSetup({ onStart, onBack }: PlayersSetupProps) {
  const [count, setCount] = useState(1)
  const [names, setNames] = useState<string[]>([""])

  const handleCountChange = (n: number) => {
    setCount(n)
    setNames((prev) => {
      const next = prev.slice(0, n)
      while (next.length < n) next.push("")
      return next
    })
  }

  const handleNameChange = (i: number, value: string) => {
    setNames((prev) => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  const allFilled = names.slice(0, count).every((n) => n.trim().length > 0)

  const handleSubmit = () => {
    if (!allFilled) return
    const players = names.slice(0, count).map((n) => ({
      name: n.trim(),
      bestMs: 0,
    }))
    onStart(players)
  }

  return (
    <div className="screen players-setup">
      <h2 className="screen-title">what's your ghost name?</h2>
      <div className="count-selector">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            className={`btn count-btn ${count === n ? "active" : ""}`}
            onClick={() => handleCountChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="name-inputs">
        {names.slice(0, count).map((name, i) => (
          <input
            key={i}
            type="text"
            placeholder={count === 1 ? "enter name" : `Player ${i + 1}`}
            value={name}
            onChange={(e) => handleNameChange(i, e.target.value)}
            className="name-input"
            autoFocus={i === 0}
          />
        ))}
      </div>
      <div className="screen-actions">
        <button type="button" onClick={onBack} className="btn btn-secondary">
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary"
          disabled={!allFilled}
        >
          Start
        </button>
      </div>
    </div>
  )
}
