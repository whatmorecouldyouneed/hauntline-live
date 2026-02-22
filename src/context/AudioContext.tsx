import { createContext, useContext, useState, useCallback } from "react"
import {
  isMuted,
  setMuted,
  toggleMuted,
  startBgm,
  stopBgm,
} from "../utils/audio"

interface AudioContextValue {
  muted: boolean
  setMuted: (v: boolean) => void
  toggleMuted: () => void
  startBgm: () => void
  stopBgm: () => void
}

const ctx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMutedState] = useState(() => isMuted())

  const setMutedCallback = useCallback((v: boolean) => {
    setMuted(v)
    setMutedState(v)
  }, [])

  const toggle = useCallback(() => {
    const next = toggleMuted()
    setMutedState(next)
    return next
  }, [])

  // BGM started explicitly by GameRun/ARScreen when ready (avoids competing with AR camera init)

  return (
    <ctx.Provider
      value={{
        muted,
        setMuted: setMutedCallback,
        toggleMuted: toggle,
        startBgm,
        stopBgm,
      }}
    >
      {children}
    </ctx.Provider>
  )
}

export function useAudio() {
  const c = useContext(ctx)
  if (!c) return null
  return c
}
