import { useCallback } from "react"
import { HapticButton } from "../../components/HapticButton"
import { primeAudio } from "../../utils/audio"

interface HomeProps {
  onPlay: () => void
  onViewLeaderboard?: () => void
}

export function Home({ onPlay, onViewLeaderboard }: HomeProps) {
  const handlePlayClick = useCallback(() => {
    // warm the audio context inside this user gesture so the first in-game tap
    // has zero perceived latency (mobile browsers suspend ctx until then)
    primeAudio()
    onPlay()
  }, [onPlay])

  return (
    <div className="screen home">
      <h1 className="home-title">
        <span className="home-title-line home-title-haunt">HAUNT</span>
        <span className="home-title-line home-title-line-word">LINE</span>
      </h1>
      <HapticButton
        type="button"
        onClick={handlePlayClick}
        className="btn btn-primary home-play-btn"
        haptic="success"
      >
        PLAY
      </HapticButton>
      {onViewLeaderboard && (
        <HapticButton
          type="button"
          onClick={onViewLeaderboard}
          className="btn btn-secondary"
        >
          Leaderboard
        </HapticButton>
      )}
      <div className="how-to-play">
        <p>mobile only</p>
        <p>tap to jump</p>
        <p>survive as long as possible</p>
      </div>
    </div>
  )
}
