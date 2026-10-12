import { tick } from './tick.ts'
import type { GameState } from './types.ts'

/** Cap offline catch-up (and tab-away RAF catch-up) at one week. */
export const MAX_CATCH_UP_SECONDS = 7 * 24 * 60 * 60

/** Don't show the welcome-back modal for brief absences. */
export const MIN_OFFLINE_MODAL_SECONDS = 60

/** Chunk size keeps drone fab + auto-build accurate without freezing the main thread. */
const CATCH_UP_CHUNK_SECONDS = 30

export interface OfflineResourceGain {
  resourceId: string
  kg: number
}

export interface OfflineSummary {
  /** Wall-clock seconds since last save. */
  elapsedSeconds: number
  /** Simulated seconds actually applied (after clamp). */
  appliedSeconds: number
  capped: boolean
  resourceGains: OfflineResourceGain[]
  dronesBuilt: number
  dronesLost: number
  asteroidsFound: number
  asteroidsDepleted: number
}

export function clampCatchUpSeconds(elapsedSeconds: number): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 0
  return Math.min(elapsedSeconds, MAX_CATCH_UP_SECONDS)
}

/** Apply simulated offline time in fixed chunks so fab/auto-build can chain. */
export function applyOfflineCatchUp(state: GameState, elapsedSeconds: number): GameState {
  let remaining = clampCatchUpSeconds(elapsedSeconds)
  if (remaining <= 0) return state

  let next = state
  while (remaining > 0) {
    const step = Math.min(remaining, CATCH_UP_CHUNK_SECONDS)
    next = tick(next, step)
    remaining -= step
  }
  return next
}

function countLogMatches(
  state: GameState,
  afterGameTime: number,
  beforeGameTime: number,
  test: (message: string) => boolean,
): number {
  let n = 0
  for (const entry of state.gameLog) {
    if (entry.atSeconds <= beforeGameTime) break
    if (entry.atSeconds > afterGameTime) continue
    if (test(entry.message)) n += 1
  }
  return n
}

export function buildOfflineSummary(
  before: GameState,
  after: GameState,
  elapsedSeconds: number,
): OfflineSummary {
  const appliedSeconds = clampCatchUpSeconds(elapsedSeconds)
  const resourceGains: OfflineResourceGain[] = []

  const ids = new Set([
    ...Object.keys(before.resources),
    ...Object.keys(after.resources),
  ])
  for (const resourceId of ids) {
    const delta = (after.resources[resourceId] ?? 0) - (before.resources[resourceId] ?? 0)
    if (delta > 1e-6) {
      resourceGains.push({ resourceId, kg: delta })
    }
  }
  resourceGains.sort((a, b) => b.kg - a.kg)

  const dronesBuilt = countLogMatches(
    after,
    after.gameTimeSeconds,
    before.gameTimeSeconds,
    (m) => m.includes(' online — '),
  )
  const dronesLost = countLogMatches(
    after,
    after.gameTimeSeconds,
    before.gameTimeSeconds,
    (m) => m.includes('exploded'),
  )
  const asteroidsFound = Math.max(0, after.prospectIndex - before.prospectIndex)
  const asteroidsDepleted = countLogMatches(
    after,
    after.gameTimeSeconds,
    before.gameTimeSeconds,
    (m) => m.startsWith('Mined out '),
  )

  return {
    elapsedSeconds: Math.max(0, elapsedSeconds),
    appliedSeconds,
    capped: elapsedSeconds > MAX_CATCH_UP_SECONDS,
    resourceGains: resourceGains.slice(0, 8),
    dronesBuilt,
    dronesLost,
    asteroidsFound,
    asteroidsDepleted,
  }
}
