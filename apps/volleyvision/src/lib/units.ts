export type Units = 'metric' | 'imperial'

export function fmtHeight(m: number, units: Units): string {
  if (units === 'metric') return `${Math.round(m * 100)} cm`
  const totalIn = m * 39.3701
  const ft = Math.floor(totalIn / 12)
  const inch = Math.round(totalIn % 12)
  if (inch >= 12) return `${ft + 1}'0"`
  return `${ft}'${inch}"`
}

export function fmtNetHeight(m: number, units: Units): string {
  if (units === 'metric') return `${Math.round(m * 100)} cm`
  const totalIn = m * 39.3701
  const ft = Math.floor(totalIn / 12)
  const inch = totalIn % 12
  return `${ft}'${inch.toFixed(1)}"`
}
