/** converts elapsed seconds to a score (10 points per second) */
export function toScore(sec: number): number {
  return Math.floor(sec * 10)
}
