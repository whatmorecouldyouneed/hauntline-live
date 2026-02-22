import { useState } from "react"

interface NameInputProps {
  initialName?: string
  onSubmit: (name: string) => void
  onBack: () => void
}

export function NameInput({ initialName = "", onSubmit, onBack }: NameInputProps) {
  const [name, setName] = useState(initialName)

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit(name.trim())
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
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="name-input"
        autoFocus
      />
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
