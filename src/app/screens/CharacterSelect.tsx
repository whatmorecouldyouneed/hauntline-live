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
  const [isLoading, setIsLoading] = useState(true)
  const touchStartX = useRef<number | null>(null)

  const handleReady = useCallback(() => setIsLoading(false), [])

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
        <CharacterViewer3D characterIndex={selected} onReady={handleReady} />
        {isLoading && (
          <div className="character-select-loading">
            <span className="character-select-loading-text">Loading</span>
          </div>
        )}
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
      <p className="character-display-name character-display-name-floating">{CHARACTER_NAMES[selected]}</p>
      <div className="character-select-footer">
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
