/**
 * audio utilities: procedural SFX + background music with mute toggle.
 * BGM kept quiet so SFX remain audible.
 */

const MUTED_KEY = "hauntline-muted"

let audioContext: AudioContext | null = null
let bgm: HTMLAudioElement | null = null
let muted = (() => {
  try {
    return localStorage.getItem(MUTED_KEY) === "1"
  } catch {
    return false
  }
})()

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

function getBgm(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null
  if (!bgm) {
    bgm = new Audio("/hyper-pop-beat.mp3")
    bgm.loop = true
    bgm.volume = 0.08
  }
  return bgm
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  try {
    localStorage.setItem(MUTED_KEY, value ? "1" : "0")
  } catch {
    /* ignore */
  }
  const b = getBgm()
  if (b) b.muted = value
}

export function toggleMuted(): boolean {
  muted = !muted
  setMuted(muted)
  return muted
}

/** play procedural tap/jump SFX */
export function playTap(): void {
  if (muted) return
  const ctx = getContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(440, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.05)
  osc.type = "sine"
  gain.gain.setValueAtTime(0.12, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.12)
}

/** play procedural death SFX */
export function playDeath(): void {
  if (muted) return
  const ctx = getContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(120, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15)
  osc.type = "sawtooth"
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.25)
}

/** start BGM (call when game/AR starts); respects mute */
export function startBgm(): void {
  const b = getBgm()
  if (!b) return
  b.muted = muted
  b.currentTime = 0
  b.play().catch(() => {})
}

/** stop BGM */
export function stopBgm(): void {
  const b = getBgm()
  if (b) b.pause()
}
