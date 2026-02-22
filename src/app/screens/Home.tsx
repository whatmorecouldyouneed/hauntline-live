interface HomeProps {
  onPlay: () => void
  onViewLeaderboard?: () => void
}

export function Home({ onPlay, onViewLeaderboard }: HomeProps) {
  return (
    <div className="screen home">
      <h1 className="home-title">
        <span className="home-title-line home-title-haunt">HAUNT</span>
        <span className="home-title-line home-title-line-word">LINE</span>
      </h1>
      <button type="button" onClick={onPlay} className="btn btn-primary home-play-btn">
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
