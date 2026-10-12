/** Compact SI-ish formatting for masses and rates. */

const UNITS: ReadonlyArray<{ threshold: number; suffix: string; divisor: number }> = [
  { threshold: 1e12, suffix: 'Tt', divisor: 1e12 },
  { threshold: 1e9, suffix: 'Gt', divisor: 1e9 },
  { threshold: 1e6, suffix: 'kt', divisor: 1e6 },
  { threshold: 1e3, suffix: 't', divisor: 1e3 },
]

export function formatMassKg(kg: number): string {
  const abs = Math.abs(kg)
  for (const unit of UNITS) {
    if (abs >= unit.threshold) {
      return `${(kg / unit.divisor).toFixed(2)} ${unit.suffix}`
    }
  }
  if (abs >= 10) {
    return `${kg.toFixed(1)} kg`
  }
  return `${kg.toFixed(2)} kg`
}

export function formatRateKgPerS(rate: number): string {
  return `${formatMassKg(rate)}/s`
}

/** Hopper / header yield, always signed when positive. */
export function formatSignedRateKgPerS(rate: number): string {
  if (rate <= 1e-9) return formatRateKgPerS(0)
  return `+${formatRateKgPerS(rate)}`
}

/** Mission-control flight clock, e.g. T+14d 06:42:18 */
export function formatMissionClock(seconds: number): string {
  const t = Math.max(0, Math.floor(seconds))
  const d = Math.floor(t / 86400)
  const h = Math.floor((t % 86400) / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (d > 0) return `T+${d}d ${hh}:${mm}:${ss}`
  return `T+${hh}:${mm}:${ss}`
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`
}

export function formatDurationSeconds(seconds: number): string {
  if (seconds < 10) return `${seconds.toFixed(1)} s`
  if (seconds < 60) return `${Math.ceil(seconds)} s`
  const m = Math.floor(seconds / 60)
  const s = Math.ceil(seconds % 60)
  return `${m}m ${s}s`
}

/** Human-readable away time for the offline progress modal. */
export function formatAwayDuration(seconds: number): string {
  const t = Math.max(0, Math.floor(seconds))
  if (t < 60) return `${t}s`
  if (t < 3600) {
    const m = Math.floor(t / 60)
    const s = t % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  if (t < 86400) {
    const h = Math.floor(t / 3600)
    const m = Math.floor((t % 3600) / 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(t / 86400)
  const h = Math.floor((t % 86400) / 3600)
  return h > 0 ? `${d}d ${h}h` : `${d}d`
}

/** Compact clock for log timestamps (game time). */
export function formatGameClock(seconds: number): string {
  const t = Math.max(0, Math.floor(seconds))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

