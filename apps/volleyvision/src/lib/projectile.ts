import { MAX_PEAK_HEIGHT, ARC_STEPS } from './constants'

const G = 9.81
const PEAK_FORWARD_SHIFT = 0.15

function shiftedHorizontalProgress(u: number, peakU: number): number {
  const shiftedPeakU = Math.min(0.85, Math.max(0.15, peakU + PEAK_FORWARD_SHIFT))
  if (u <= peakU) {
    return peakU === 0 ? 0 : (u / peakU) * shiftedPeakU
  }
  return shiftedPeakU + ((u - peakU) / (1 - peakU)) * (1 - shiftedPeakU)
}

export function computeArc(
  start: [number, number, number],
  landing: [number, number, number],
  peakH: number,
  steps = ARC_STEPS
): [number, number, number][] {
  const [sx, sy, sz] = start
  const [lx, , lz] = landing

  if (sx === lx && sz === lz) return []

  const clampedPeak = Math.min(Math.max(peakH, sy + 0.1), MAX_PEAK_HEIGHT)

  const vy0 = Math.sqrt(2 * G * (clampedPeak - sy))
  const t_up = vy0 / G
  const t_dn = Math.sqrt(2 * clampedPeak / G)
  const T = t_up + t_dn
  const peakU = t_up / T

  const points: [number, number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const t = u * T
    const horizontalU = shiftedHorizontalProgress(u, peakU)
    const y = sy + vy0 * t - 0.5 * G * t * t
    const x = sx + (lx - sx) * horizontalU
    const z = sz + (lz - sz) * horizontalU
    points.push([x, Math.max(0, y), z])
  }
  return points
}

export function checkNetClearance(
  points: [number, number, number][],
  netHeightM: number
): boolean {
  if (points.length === 0) return true

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    // check if segment crosses x=0
    if ((x0 <= 0 && x1 >= 0) || (x0 >= 0 && x1 <= 0)) {
      const t = (0 - x0) / (x1 - x0)
      const yAtNet = y0 + t * (y1 - y0)
      return yAtNet >= netHeightM
    }
  }
  return true
}
