import { ALLY_X_MIN } from './constants'

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function pointAtProgress(points: [number, number, number][], progress: number): [number, number, number] | null {
  if (points.length === 0) return null
  const scaled = clamp(progress, 0, 1) * (points.length - 1)
  const lo = Math.floor(scaled)
  const hi = Math.min(points.length - 1, lo + 1)
  const t = scaled - lo
  const a = points[lo]
  const b = points[hi]
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function pointXAtProgress(points: [number, number, number][], progress: number): number | null {
  return pointAtProgress(points, progress)?.[0] ?? null
}

export function nearestProgressAtReach(
  points: [number, number, number][],
  targetProgress: number,
  reachM: number,
  requireAllyCourt: boolean
): number | null {
  if (points.length < 2) return null
  const maxIndex = points.length - 1
  let bestProgress: number | null = null
  let bestDistance = Infinity

  for (let i = 0; i < maxIndex; i++) {
    const a = points[i]
    const b = points[i + 1]
    const dyA = a[1] - reachM
    const dyB = b[1] - reachM

    if (dyA === 0) {
      const progress = i / maxIndex
      const x = pointXAtProgress(points, progress)
      if (x !== null && (!requireAllyCourt || x >= ALLY_X_MIN)) {
        const distance = Math.abs(progress - targetProgress)
        if (distance < bestDistance) {
          bestDistance = distance
          bestProgress = progress
        }
      }
    }

    if (dyA * dyB > 0) continue
    if (dyA === 0 && dyB === 0) continue

    const t = dyA === dyB ? 0 : -dyA / (dyB - dyA)
    const progress = (i + clamp(t, 0, 1)) / maxIndex
    const x = pointXAtProgress(points, progress)
    if (x === null || (requireAllyCourt && x < ALLY_X_MIN)) continue
    const distance = Math.abs(progress - targetProgress)
    if (distance < bestDistance) {
      bestDistance = distance
      bestProgress = progress
    }
  }

  return bestProgress
}

export function progressCandidatesAtReach(
  points: [number, number, number][],
  reachM: number,
  requireAllyCourt: boolean
): number[] {
  if (points.length < 2) return []
  const maxIndex = points.length - 1
  const candidates: number[] = []

  for (let i = 0; i < maxIndex; i++) {
    const a = points[i]
    const b = points[i + 1]
    const dyA = a[1] - reachM
    const dyB = b[1] - reachM

    if (dyA * dyB > 0) continue

    const t = dyA === dyB ? 0 : -dyA / (dyB - dyA)
    const progress = (i + clamp(t, 0, 1)) / maxIndex
    const x = pointXAtProgress(points, progress)
    if (x === null || (requireAllyCourt && x < ALLY_X_MIN)) continue
    if (!candidates.some((candidate) => Math.abs(candidate - progress) < 0.001)) {
      candidates.push(progress)
    }
  }

  return candidates
}

export function isHitzoneInAllyCourt(
  points: [number, number, number][],
  progress: number
): boolean {
  return (pointAtProgress(points, progress)?.[0] ?? ALLY_X_MIN) >= ALLY_X_MIN
}
