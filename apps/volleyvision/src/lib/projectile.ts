import { MAX_PEAK_HEIGHT, ARC_STEPS } from './constants'

const G = 9.81

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

  const points: [number, number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const t = u * T
    const y = sy + vy0 * t - 0.5 * G * t * t
    const x = sx + (lx - sx) * u
    const z = sz + (lz - sz) * u
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
