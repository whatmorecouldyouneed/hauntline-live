import { useState } from "react"
import { Filter } from "bad-words"

const profanityFilter = new Filter()

interface NameInputProps {
  initialName?: string
  onSubmit: (name: string) => void
  onBack: () => void
}

export function NameInput({ initialName = "", onSubmit, onBack }: NameInputProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState("")

  const handleSubmit = () => {
    setError("")
    const trimmed = name.trim()
    if (!trimmed) return
    if (profanityFilter.isProfane(trimmed)) {
      setError("Please choose a different name")
      return
    }
    onSubmit(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  return (
    <div className="screen name-screen">
      <h2 className="screen-title">what's your ghost name?</h2>
      <input
        type="text"
        placeholder="enter name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError("")
        }}
        onKeyDown={handleKeyDown}
        className="name-input"
        autoFocus
      />
      {error && <p className="name-input-error">{error}</p>}
      <div className="screen-actions">
        <button type="button" onClick={onBack} className="btn btn-secondary">
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary"
          disabled={!name.trim()}
        >
          Next
        </button>
      </div>
    </div>
  )
}
