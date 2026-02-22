import { useState, useRef, useCallback } from "react"
import { type CharacterIndex } from "../../game/meshes"
import { CharacterViewer3D } from "../../game/CharacterViewer3D"

const CHARACTER_NAMES: Record<CharacterIndex, string> = {
  0: "wisp",
  1: "spark",
  2: "classic",
  3: "wraith",
}

const SWIPE_THRESHOLD = 50

interface CharacterSelectProps {
  onSelect: (characterIndex: CharacterIndex) => void
  onBack: () => void
}

export function CharacterSelect({ onSelect, onBack }: CharacterSelectProps) {
  const [selected, setSelected] = useState<CharacterIndex>(0)
  const touchStartX = useRef<number | null>(null)

  const goPrev = useCallback(
    () => setSelected((s) => ((s - 1 + 4) % 4) as CharacterIndex),
    []
  )
  const goNext = useCallback(
    () => setSelected((s) => ((s + 1) % 4) as CharacterIndex),
    []
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartX.current
      touchStartX.current = null
      if (start == null) return
      const end = e.changedTouches[0]?.clientX ?? start
      const delta = start - end
      if (delta > SWIPE_THRESHOLD) goNext()
      else if (delta < -SWIPE_THRESHOLD) goPrev()
    },
    [goNext, goPrev]
  )

  return (
    <div className="screen character-select">
      <h2 className="screen-title character-select-title">choose your ghost</h2>
      <div
        className="character-viewer-fullscreen"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <CharacterViewer3D characterIndex={selected} />
        <button
          type="button"
          className="character-arrow character-arrow-left"
          aria-label="previous character"
          onClick={goPrev}
        >
          ‹
        </button>
        <button
          type="button"
          className="character-arrow character-arrow-right"
          aria-label="next character"
          onClick={goNext}
        >
          ›
        </button>
      </div>
      <div className="character-select-footer">
        <p className="character-display-name">{CHARACTER_NAMES[selected]}</p>
        <div className="screen-actions">
          <button type="button" onClick={onBack} className="btn btn-secondary">
            Back
          </button>
          <button
            type="button"
            onClick={() => onSelect(selected)}
            className="btn btn-primary"
          >
            Play
          </button>
        </div>
      </div>
    </div>
  )
}
