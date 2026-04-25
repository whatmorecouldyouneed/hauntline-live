import { useCallback } from "react"
import { useWebHaptics } from "web-haptics/react"

interface HomeProps {
  onPlay: () => void
  onViewLeaderboard?: () => void
}

export function Home({ onPlay, onViewLeaderboard }: HomeProps) {
  const { trigger } = useWebHaptics()

  const handlePlayClick = useCallback(() => {
    console.log("[haptics] play button: tap → trigger() default (quick test)")
    void trigger()
    onPlay()
  }, [trigger, onPlay])

  return (
    <div className="screen home">
      <h1 className="home-title">
        <span className="home-title-line home-title-haunt">HAUNT</span>
        <span className="home-title-line home-title-line-word">LINE</span>
      </h1>
      <button type="button" onClick={handlePlayClick} className="btn btn-primary home-play-btn">
        PLAY
      </button>
      {onViewLeaderboard && (
        <button
          type="button"
          onClick={onViewLeaderboard}
          className="btn btn-secondary"
        >
          Leaderboard
        </button>
      )}
      <div className="how-to-play">
        <p>mobile only</p>
        <p>tap to jump</p>
        <p>survive as long as possible</p>
      </div>
    </div>
  )
}
