import { useState, useCallback, useRef, useEffect } from "react"
import { DesktopGate } from "./app/screens/DesktopGate"
import { Home } from "./app/screens/Home"
import {
  PlayersSetup,
  type PlayerInput,
} from "./app/screens/PlayersSetup"
import { TurnIntro } from "./app/screens/TurnIntro"
import { GameRun } from "./app/screens/GameRun"
import { Death } from "./app/screens/Death"
import { Results } from "./app/screens/Results"
import "./App.css"

// TODO: online room state sync

type Screen =
  | "home"
  | "setup"
  | "turnIntro"
  | "game"
  | "death"
  | "results"

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [players, setPlayers] = useState<PlayerInput[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [lastTime, setLastTime] = useState(0)

  const goHome = useCallback(() => {
    setScreen("home")
    setPlayers([])
    setCurrentPlayerIndex(0)
    setLastTime(0)
  }, [])

  const goSetup = useCallback(() => {
    setScreen("setup")
    setPlayers([])
    setCurrentPlayerIndex(0)
  }, [])

  const startGame = useCallback((newPlayers: PlayerInput[]) => {
    setPlayers(newPlayers)
    setCurrentPlayerIndex(0)
    setScreen("turnIntro")
  }, [])

  const startRun = useCallback(() => {
    setScreen("game")
  }, [])

  const handleNextPlayer = useCallback(() => {
    const nextIndex = currentPlayerIndex + 1
    if (nextIndex >= players.length) {
      setScreen("results")
    } else {
      setCurrentPlayerIndex(nextIndex)
      setScreen("turnIntro")
    }
  }, [currentPlayerIndex, players.length])

  const handleRetry = useCallback(() => {
    setScreen("turnIntro")
  }, [])

  const handleSeeResults = useCallback(() => {
    setScreen("results")
  }, [])

  const handleRematch = useCallback(() => {
    setPlayers((prev) => prev.map((p) => ({ ...p, bestMs: 0 })))
    setCurrentPlayerIndex(0)
    setScreen("turnIntro")
  }, [])

  const currentPlayerIndexRef = useRef(currentPlayerIndex)
  useEffect(() => {
    currentPlayerIndexRef.current = currentPlayerIndex
  }, [currentPlayerIndex])

  const handleDeath = useCallback((elapsed: number) => {
    const idx = currentPlayerIndexRef.current
    setLastTime(elapsed)
    setPlayers((prev) => {
      const next = [...prev]
      if (idx >= 0 && idx < next.length) {
        next[idx] = { ...next[idx], bestMs: elapsed }
      }
      return next
    })
    setScreen("death")
  }, [])

  const currentPlayer = players[currentPlayerIndex]
  const isLastPlayer = currentPlayerIndex >= players.length - 1
  const nextPlayer = players[currentPlayerIndex + 1]

  return (
    <DesktopGate>
      <div className="app">
        {screen === "home" && <Home onPlay={goSetup} />}
        {screen === "setup" && (
          <PlayersSetup onStart={startGame} onBack={goHome} />
        )}
        {screen === "turnIntro" && currentPlayer && (
          <TurnIntro
            playerName={currentPlayer.name}
            onStart={startRun}
          />
        )}
        {screen === "game" && (
          <GameRun onDeath={handleDeath} />
        )}
        {screen === "death" && currentPlayer && (
          <Death
            playerName={currentPlayer.name}
            timeSurvived={lastTime}
            isLastPlayer={isLastPlayer}
            nextPlayerName={nextPlayer?.name}
            onNextPlayer={handleNextPlayer}
            onRetry={handleRetry}
            onSeeResults={handleSeeResults}
          />
        )}
        {screen === "results" && (
          <Results
            players={players}
            onRematch={handleRematch}
            onNewMatch={goHome}
          />
        )}
      </div>
    </DesktopGate>
  )
}
