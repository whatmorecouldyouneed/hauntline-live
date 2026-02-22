/** intro animation timeline utilities — pure functions, no accumulation */

export const INTRO_DURATION_MS = 3000

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** returns 0–1 eased progress for segment [start, end]; clamp, normalize, then ease */
export function seg01(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0
  const raw = clamp01((t - start) / (end - start))
  return easeOutCubic(raw)
}

export interface IntroAnimState {
  faceP: number
  spinP: number
  jumpP: number
  slideP: number
}

/** timeline: face → spin (reverse) → jump → slide to line */
export function getIntroAnimState(t01: number): IntroAnimState {
  const t = clamp01(t01)
  return {
    faceP: seg01(t, 0.0, 0.18),
    spinP: seg01(t, 0.18, 0.45),
    jumpP: seg01(t, 0.45, 0.68),
    slideP: seg01(t, 0.58, 1.0),
  }
}

/** arc 0→1→0 for jump; use as yOffset = height * jumpArc(jumpP) */
export function jumpArc(p: number): number {
  if (p <= 0 || p >= 1) return 0
  return Math.sin(p * Math.PI)
}
