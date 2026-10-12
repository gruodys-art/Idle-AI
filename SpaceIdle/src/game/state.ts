import { generateAsteroid, resolveSearchTarget } from './asteroidGen.ts'
import { appendLog } from './log.ts'
import type { GameState, MiningDrone } from './types.ts'

export const INITIAL_QUEUE_CAPACITY = 5

/** Base seconds for one auto-search at search level 1. */
export const BASE_SEARCH_SECONDS = 180

/** Minimum search cycle time (s) after log speedups. */
export const SEARCH_DURATION_FLOOR_SECONDS = 20

/** Time to complete one search at the given search level (log speedup, floored). */
export function searchDurationSeconds(searchLevel: number): number {
  const L = Math.max(1, searchLevel)
  const t = BASE_SEARCH_SECONDS / (1 + 0.55 * Math.log2(L))
  return Math.max(SEARCH_DURATION_FLOOR_SECONDS, t)
}

export function resourceAmount(state: GameState, resourceId: string): number {
  return state.resources[resourceId] ?? 0
}

export function totalResourceKg(state: GameState): number {
  let sum = 0
  for (const v of Object.values(state.resources)) {
    sum += v
  }
  return sum
}

export function addResource(state: GameState, resourceId: string, kg: number): GameState {
  if (kg <= 0) return state
  const prev = state.resources[resourceId] ?? 0
  return {
    ...state,
    resources: {
      ...state.resources,
      [resourceId]: prev + kg,
    },
  }
}

function sumDronePower(drones: readonly MiningDrone[]): number {
  let sum = 0
  for (const d of drones) sum += d.powerKgPerS
  return sum
}

function starterDrone(): MiningDrone {
  // Keep in sync with drones.BASE_DRONE_POWER_KG_PER_S / tech-1 (avoid import cycle).
  return { id: 'drone-1', techLevel: 1, powerKgPerS: 2 }
}

export function createInitialState(): GameState {
  const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0
  const { asteroid, nextSeed } = generateAsteroid(1, 1, seed, {
    minerPayBiasIds: ['rock'],
  })
  const drones = [starterDrone()]
  const base: GameState = {
    resources: {},
    drones,
    miningRateKgPerS: sumDronePower(drones),
    droneTechLevel: 1,
    droneSerial: 1,
    droneBuildActive: false,
    droneBuildProgressSeconds: 0,
    droneBuildTechLevel: 1,
    droneTargetCount: 1,
    droneAutoBuild: false,
    droneFabLevel: 1,
    droneSafetyLevel: 1,
    searchLevel: 1,
    searchTargetResourceId: null,
    queueCapacity: INITIAL_QUEUE_CAPACITY,
    asteroidQueue: [asteroid],
    activeAsteroidId: asteroid.id,
    searchProgressSeconds: 0,
    prospectIndex: 1,
    rngSeed: nextSeed,
    gameTimeSeconds: 0,
    gameLog: [],
    logSerial: 0,
  }
  return appendLog(
    base,
    `Operations online. ${asteroid.name} queued (${formatMassPlain(asteroid.totalKg)}).`,
    'success',
  )
}

function formatMassPlain(kg: number): string {
  if (kg >= 1e3) return `${(kg / 1e3).toFixed(kg >= 1e4 ? 0 : 1)} t`
  return `${Math.round(kg)} kg`
}

export function getActiveAsteroid(state: GameState) {
  return state.asteroidQueue[0] ?? null
}

/** Keep activeAsteroidId aligned with queue[0]. */
export function syncActiveToQueueFront(state: GameState): GameState {
  const activeAsteroidId = state.asteroidQueue[0]?.id ?? null
  if (state.activeAsteroidId === activeAsteroidId) return state
  return { ...state, activeAsteroidId }
}

/** Recalculate derived rates from fleet / search target validity. */
export function syncDerivedStats(state: GameState): GameState {
  let drones = state.drones
  let droneSerial = state.droneSerial
  if (!drones.length) {
    droneSerial = Math.max(1, droneSerial + 1)
    drones = [{ id: `drone-${droneSerial}`, techLevel: 1, powerKgPerS: 2 }]
  }
  const searchTargetResourceId = resolveSearchTarget(
    state.searchLevel,
    state.searchTargetResourceId,
  )
  return {
    ...syncActiveToQueueFront({
      ...state,
      drones,
      droneSerial,
      searchTargetResourceId,
    }),
    miningRateKgPerS: sumDronePower(drones),
  }
}
