interface HomeProps {
  onPlay: () => void
  onAR?: () => void
}

export function Home({ onPlay, onAR }: HomeProps) {
  return (
    <div className="screen home">
      <h1 className="title">hauntline.live</h1>
      <button type="button" onClick={onPlay} className="btn btn-primary">
        Play
      </button>
      {onAR && (
        <button type="button" onClick={onAR} className="btn btn-secondary">
          AR Mode
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
