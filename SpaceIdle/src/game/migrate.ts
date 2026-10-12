import { generateAsteroid } from './asteroidGen.ts'
import {
  dronePayResourceIds,
  dronePowerAtTech,
  DRONE_TECH_PAY_BIAS_UNTIL_LEVEL,
} from './drones.ts'
import {
  canonicalizeResourceId,
  IRON_ID,
  ROCK_ID,
} from './resources/catalog.ts'
import { createInitialState, INITIAL_QUEUE_CAPACITY, syncDerivedStats } from './state.ts'
import type { Asteroid, CompositionEntry, GameState, MiningDrone } from './types.ts'

function isAsteroid(value: unknown): value is Asteroid {
  if (!value || typeof value !== 'object') return false
  const a = value as Asteroid
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    typeof a.remainingKg === 'number' &&
    typeof a.totalKg === 'number' &&
    Array.isArray(a.composition)
  )
}

function isDrone(value: unknown): value is MiningDrone {
  if (!value || typeof value !== 'object') return false
  const d = value as MiningDrone
  return (
    typeof d.id === 'string' &&
    typeof d.powerKgPerS === 'number' &&
    typeof d.techLevel === 'number'
  )
}

/** Fold unknown species into silicate rock and renormalize fractions. */
function sanitizeComposition(entries: CompositionEntry[] | undefined): CompositionEntry[] {
  if (!entries?.length) return [{ resourceId: ROCK_ID, fraction: 1 }]

  const merged = new Map<string, number>()
  for (const entry of entries) {
    if (!entry || typeof entry.resourceId !== 'string') continue
    const id = canonicalizeResourceId(entry.resourceId)
    const frac = typeof entry.fraction === 'number' && entry.fraction > 0 ? entry.fraction : 0
    merged.set(id, (merged.get(id) ?? 0) + frac)
  }

  if (merged.size === 0) return [{ resourceId: ROCK_ID, fraction: 1 }]

  const sum = [...merged.values()].reduce((a, b) => a + b, 0)
  if (sum <= 0) return [{ resourceId: ROCK_ID, fraction: 1 }]

  return [...merged.entries()].map(([resourceId, weight]) => ({
    resourceId,
    fraction: weight / sum,
  }))
}

/** Unknown stockpile mass rolls into silicate rock so total mass is preserved. */
function sanitizeResources(raw: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, kg] of Object.entries(raw)) {
    if (typeof kg !== 'number' || !(kg > 0)) continue
    const canon = canonicalizeResourceId(id)
    out[canon] = (out[canon] ?? 0) + kg
  }
  return out
}

/** Convert legacy minerLevel into a single drone + blueprint tech. */
function dronesFromLegacy(
  minerLevel: number,
  miningRateKgPerS: number,
): { drones: MiningDrone[]; droneTechLevel: number; droneSerial: number } {
  const tech = Math.max(1, Math.floor(minerLevel))
  const power =
    miningRateKgPerS > 0 ? miningRateKgPerS : dronePowerAtTech(Math.min(tech, 1))
  return {
    drones: [{ id: 'drone-1', techLevel: 1, powerKgPerS: power }],
    droneTechLevel: tech,
    droneSerial: 1,
  }
}

function migrateV1(raw: Record<string, unknown>): GameState {
  const oreKg = typeof raw.oreKg === 'number' ? raw.oreKg : 0
  const miningRateKgPerS =
    typeof raw.miningRateKgPerS === 'number' ? raw.miningRateKgPerS : 2
  const minerLevel = typeof raw.minerLevel === 'number' ? raw.minerLevel : 1
  const prospectIndex = typeof raw.prospectIndex === 'number' ? raw.prospectIndex : 1

  const base = createInitialState()
  let asteroid: Asteroid
  let rngSeed = base.rngSeed

  if (isAsteroid(raw.asteroid)) {
    const old = raw.asteroid
    asteroid = {
      ...old,
      sizeTier: old.sizeTier ?? 'small',
      composition: sanitizeComposition(old.composition),
    }
  } else {
    const gen = generateAsteroid(prospectIndex, 1, rngSeed, {
      minerPayBiasIds:
        minerLevel < DRONE_TECH_PAY_BIAS_UNTIL_LEVEL
          ? dronePayResourceIds(minerLevel)
          : undefined,
    })
    asteroid = gen.asteroid
    rngSeed = gen.nextSeed
  }

  const fleet = dronesFromLegacy(minerLevel, miningRateKgPerS)

  return {
    resources: oreKg > 0 ? { [IRON_ID]: oreKg } : {},
    miningRateKgPerS: fleet.drones[0]!.powerKgPerS,
    ...fleet,
    droneBuildActive: false,
    droneBuildProgressSeconds: 0,
    droneBuildTechLevel: fleet.droneTechLevel,
    droneTargetCount: Math.max(1, fleet.drones.length),
    droneAutoBuild: false,
    droneFabLevel: 1,
    droneSafetyLevel: 1,
    searchLevel: 1,
    searchTargetResourceId: null,
    queueCapacity: INITIAL_QUEUE_CAPACITY,
    asteroidQueue: [asteroid],
    activeAsteroidId: asteroid.id,
    searchProgressSeconds: 0,
    prospectIndex,
    rngSeed,
    gameTimeSeconds: 0,
    gameLog: [],
    logSerial: 0,
  }
}

function normalizeV2(raw: Record<string, unknown>): GameState | null {
  if (typeof raw.miningRateKgPerS !== 'number') return null
  if (!Array.isArray(raw.asteroidQueue)) return null
  if (typeof raw.resources !== 'object' || raw.resources === null) return null

  const asteroidQueue = (raw.asteroidQueue as unknown[])
    .filter(isAsteroid)
    .map((a) => ({
      ...a,
      sizeTier: a.sizeTier ?? 'small',
      composition: sanitizeComposition(a.composition),
    }))

  let drones: MiningDrone[]
  let droneTechLevel: number
  let droneSerial: number

  if (Array.isArray(raw.drones) && raw.drones.length > 0) {
    drones = raw.drones.filter(isDrone)
    droneTechLevel =
      typeof raw.droneTechLevel === 'number' ? Math.max(1, raw.droneTechLevel) : 1
    droneSerial =
      typeof raw.droneSerial === 'number'
        ? raw.droneSerial
        : Math.max(1, drones.length)
  } else {
    const minerLevel = typeof raw.minerLevel === 'number' ? raw.minerLevel : 1
    const fleet = dronesFromLegacy(minerLevel, raw.miningRateKgPerS)
    drones = fleet.drones
    droneTechLevel = fleet.droneTechLevel
    droneSerial = fleet.droneSerial
  }

  if (drones.length === 0) {
    drones = [{ id: 'drone-1', techLevel: 1, powerKgPerS: 2 }]
    droneSerial = Math.max(1, droneSerial)
  }

  return {
    resources: sanitizeResources(raw.resources as Record<string, number>),
    miningRateKgPerS: raw.miningRateKgPerS,
    drones,
    droneTechLevel,
    droneSerial,
    droneBuildActive: Boolean(raw.droneBuildActive),
    droneBuildProgressSeconds:
      typeof raw.droneBuildProgressSeconds === 'number' ? raw.droneBuildProgressSeconds : 0,
    droneBuildTechLevel:
      typeof raw.droneBuildTechLevel === 'number'
        ? raw.droneBuildTechLevel
        : droneTechLevel,
    droneTargetCount:
      typeof raw.droneTargetCount === 'number'
        ? Math.max(1, Math.min(500, Math.floor(raw.droneTargetCount)))
        : Math.max(1, drones.length),
    droneAutoBuild: Boolean(raw.droneAutoBuild),
    droneFabLevel:
      typeof raw.droneFabLevel === 'number' ? Math.max(1, raw.droneFabLevel) : 1,
    droneSafetyLevel:
      typeof raw.droneSafetyLevel === 'number' ? Math.max(1, raw.droneSafetyLevel) : 1,
    searchLevel: typeof raw.searchLevel === 'number' ? raw.searchLevel : 1,
    searchTargetResourceId:
      typeof raw.searchTargetResourceId === 'string' ? raw.searchTargetResourceId : null,
    queueCapacity:
      typeof raw.queueCapacity === 'number' ? raw.queueCapacity : INITIAL_QUEUE_CAPACITY,
    asteroidQueue,
    activeAsteroidId: asteroidQueue[0]?.id ?? null,
    searchProgressSeconds:
      typeof raw.searchProgressSeconds === 'number' ? raw.searchProgressSeconds : 0,
    prospectIndex: typeof raw.prospectIndex === 'number' ? raw.prospectIndex : 1,
    rngSeed: typeof raw.rngSeed === 'number' ? raw.rngSeed : (Date.now() >>> 0),
    gameTimeSeconds: typeof raw.gameTimeSeconds === 'number' ? raw.gameTimeSeconds : 0,
    gameLog: Array.isArray(raw.gameLog)
      ? (raw.gameLog as GameState['gameLog']).filter(
          (e) =>
            e &&
            typeof e.id === 'number' &&
            typeof e.atSeconds === 'number' &&
            typeof e.message === 'string',
        )
      : [],
    logSerial: typeof raw.logSerial === 'number' ? raw.logSerial : 0,
  }
}

/** Load and migrate saves from v1 (single ore) or v2 (+ miner→drone). */
export function hydrateState(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') return createInitialState()
  const obj = raw as Record<string, unknown>

  let state: GameState
  if (Array.isArray(obj.asteroidQueue) && typeof obj.resources === 'object') {
    state = normalizeV2(obj) ?? createInitialState()
  } else if (typeof obj.oreKg === 'number' || obj.asteroid) {
    state = migrateV1(obj)
  } else {
    return createInitialState()
  }

  return syncDerivedStats(state)
}
