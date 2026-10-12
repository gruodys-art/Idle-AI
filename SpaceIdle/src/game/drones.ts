import { appendLog } from './log.ts'
import { RESOURCE_BY_ID } from './resources/catalog.ts'
import { createRng } from './rng.ts'
import type { Asteroid, CostLine, GameState, MiningDrone } from './types.ts'
import {
  canAffordCosts,
  spendCosts,
  upgradeCosts,
} from './upgrades.ts'
import { formatRateKgPerS } from './format.ts'

/** Tech-1 drone mining power (kg/s). Free emergency respawns use this tier. */
export const BASE_DRONE_POWER_KG_PER_S = 2

/** Each tech level multiplies power of newly built drones (not retroactive). */
export const DRONE_POWER_MULT = 1.2

/** Base fab time at tech 1 / fab level 1 (seconds). */
export const BASE_DRONE_BUILD_SECONDS = 45

/** Build time scales mildly with drone tech (higher-tech frames take longer). */
export const DRONE_BUILD_TIME_MULT = 1.08

/** Each fab-speed level divides build time by this factor. */
export const DRONE_FAB_SPEED_MULT = 1.18

/** Floor on drone fab duration (seconds). */
export const DRONE_BUILD_DURATION_FLOOR_SECONDS = 5

/**
 * Base per-drone explosion hazard at safety L1 on hazard≈1 ore (1/s).
 * ~1 expected failure per hour — gentle early game.
 */
export const BASE_DRONE_EXPLOSION_RATE_PER_S = 1 / 3600

/** Each safety level divides explosion rate by this factor. */
export const DRONE_SAFETY_MULT = 1.22

/** Rarity reference for ore hazard (≈ iron). */
export const ORE_HAZARD_RARITY_REF = 2

/** How strongly catalog rarity scales operational hazard. */
export const ORE_HAZARD_RARITY_EXPONENT = 0.75

/** Radioactive species multiply their hazard contribution. */
export const RADIOACTIVE_HAZARD_MULT = 10

/** Cap on λ so hot ore + high speed cannot wipe fleets every frame (MTTF ≥ 30s). */
export const MAX_DRONE_EXPLOSION_RATE_PER_S = 1 / 30

/** @deprecated use explosionRatePerS — kept for any stray imports */
export const DRONE_EXPLOSION_RATE_PER_S = BASE_DRONE_EXPLOSION_RATE_PER_S

/** Pay-bias / soft progression still keyed to drone tech while below this. */
export const DRONE_TECH_PAY_BIAS_UNTIL_LEVEL = 50

export function dronePowerAtTech(techLevel: number): number {
  const L = Math.max(1, Math.floor(techLevel))
  return BASE_DRONE_POWER_KG_PER_S * DRONE_POWER_MULT ** (L - 1)
}

/** Emergency fab / free last-drone respawn — always tech 1. */
export function tech1DronePower(): number {
  return dronePowerAtTech(1)
}

export function droneBuildDurationSeconds(
  buildTechLevel: number,
  fabSpeedLevel = 1,
): number {
  const tech = Math.max(1, buildTechLevel)
  const fab = Math.max(1, fabSpeedLevel)
  const base = BASE_DRONE_BUILD_SECONDS * DRONE_BUILD_TIME_MULT ** (tech - 1)
  const sped = base / DRONE_FAB_SPEED_MULT ** (fab - 1)
  return Math.max(DRONE_BUILD_DURATION_FLOOR_SECONDS, sped)
}

/** Hull materials — structural rock / metals (separate from R&D upgrades). */
export function droneBuildCosts(techLevel: number): CostLine[] {
  return upgradeCosts('droneBuild', techLevel)
}

export function droneTechUpgradeCosts(currentTechLevel: number): CostLine[] {
  return upgradeCosts('droneTech', currentTechLevel)
}

export function droneFabUpgradeCosts(currentFabLevel: number): CostLine[] {
  return upgradeCosts('droneFab', currentFabLevel)
}

export function droneSafetyUpgradeCosts(currentSafetyLevel: number): CostLine[] {
  return upgradeCosts('droneSafety', currentSafetyLevel)
}

/**
 * Composition-weighted operational hazard. Idle / empty → 1.
 * Rarer ores raise H; radioactive tags apply ×10 on their share.
 */
export function oreHazardMultiplier(asteroid: Asteroid | null | undefined): number {
  if (!asteroid?.composition.length) return 1
  let h = 0
  for (const entry of asteroid.composition) {
    const def = RESOURCE_BY_ID.get(entry.resourceId)
    if (!def || entry.fraction <= 0) continue
    const rarityScale = Math.pow(
      Math.max(def.rarity, 0.5) / ORE_HAZARD_RARITY_REF,
      ORE_HAZARD_RARITY_EXPONENT,
    )
    const rad = def.tag === 'radioactive' ? RADIOACTIVE_HAZARD_MULT : 1
    h += entry.fraction * rarityScale * rad
  }
  return h > 0 ? h : 1
}

/** Base λ after safety upgrades, before ore hazard (1/s). */
export function baseExplosionRatePerS(safetyLevel: number): number {
  const L = Math.max(1, safetyLevel)
  return BASE_DRONE_EXPLOSION_RATE_PER_S / DRONE_SAFETY_MULT ** (L - 1)
}

/** Effective per-drone explosion rate given safety level and active rock. */
export function explosionRatePerS(
  safetyLevel: number,
  asteroid: Asteroid | null | undefined,
): number {
  const raw = baseExplosionRatePerS(safetyLevel) * oreHazardMultiplier(asteroid)
  return Math.min(MAX_DRONE_EXPLOSION_RATE_PER_S, Math.max(0, raw))
}

export function meanTimeToFailureSeconds(
  safetyLevel: number,
  asteroid: Asteroid | null | undefined,
): number {
  const rate = explosionRatePerS(safetyLevel, asteroid)
  if (rate <= 0) return Number.POSITIVE_INFINITY
  return 1 / rate
}

export function totalMiningPowerKgPerS(drones: readonly MiningDrone[]): number {
  let sum = 0
  for (const d of drones) sum += d.powerKgPerS
  return sum
}

export function createDrone(techLevel: number, serial: number): MiningDrone {
  const tech = Math.max(1, Math.floor(techLevel))
  return {
    id: `drone-${serial}`,
    techLevel: tech,
    powerKgPerS: dronePowerAtTech(tech),
  }
}

/** Free warranty unit — always tech-1 power, regardless of blueprint level. */
export function createEmergencyDrone(serial: number): MiningDrone {
  return {
    id: `drone-${serial}`,
    techLevel: 1,
    powerKgPerS: tech1DronePower(),
  }
}

export function withMiningRate(state: GameState): GameState {
  return {
    ...state,
    miningRateKgPerS: totalMiningPowerKgPerS(state.drones),
  }
}

export function ensureMinimumDrone(state: GameState, logEmergency = false): GameState {
  if (state.drones.length > 0) return withMiningRate(state)
  const serial = state.droneSerial + 1
  let next = withMiningRate({
    ...state,
    droneSerial: serial,
    drones: [createEmergencyDrone(serial)],
  })
  if (logEmergency) {
    next = appendLog(
      next,
      'Last drone lost — emergency tech-1 unit fabricated.',
      'warn',
    )
  }
  return next
}

/** Resource ids involved in next build or next tech upgrade (for asteroid pay bias). */
export function dronePayResourceIds(
  techLevel: number,
  fabLevel = 1,
  safetyLevel = 1,
): string[] {
  const ids = new Set<string>()
  for (const line of droneBuildCosts(techLevel)) ids.add(line.resourceId)
  for (const line of droneTechUpgradeCosts(techLevel)) ids.add(line.resourceId)
  for (const line of droneFabUpgradeCosts(fabLevel)) ids.add(line.resourceId)
  for (const line of droneSafetyUpgradeCosts(safetyLevel)) ids.add(line.resourceId)
  return [...ids]
}

export function previewDroneBuild(state: GameState): {
  costs: CostLine[]
  durationSeconds: number
  nextPowerKgPerS: number
  affordable: boolean
  busy: boolean
} {
  const costs = droneBuildCosts(state.droneTechLevel)
  const busy = state.droneBuildProgressSeconds > 0 || state.droneBuildActive
  return {
    costs,
    durationSeconds: droneBuildDurationSeconds(state.droneTechLevel, state.droneFabLevel),
    nextPowerKgPerS: dronePowerAtTech(state.droneTechLevel),
    affordable: canAffordCosts(state, costs),
    busy,
  }
}

/** Spend resources and start machinery build for one drone at current tech. */
export function startDroneBuild(
  state: GameState,
  options: { auto?: boolean } = {},
): GameState {
  const preview = previewDroneBuild(state)
  if (preview.busy || !preview.affordable) return state
  const paid = spendCosts(state, preview.costs)
  if (!paid) return state
  const label = options.auto ? 'Auto-fab' : 'Drone fab'
  return appendLog(
    {
      ...paid,
      droneBuildActive: true,
      droneBuildProgressSeconds: 0,
      droneBuildTechLevel: paid.droneTechLevel,
    },
    `${label} started (tech ${paid.droneTechLevel}, ${formatRateKgPerS(preview.nextPowerKgPerS)}).`,
    'info',
  )
}

export const MIN_DRONE_TARGET = 1
export const MAX_DRONE_TARGET = 500

export function clampDroneTarget(count: number): number {
  if (!Number.isFinite(count)) return MIN_DRONE_TARGET
  return Math.max(MIN_DRONE_TARGET, Math.min(MAX_DRONE_TARGET, Math.floor(count)))
}

export function setDroneTargetCount(state: GameState, count: number): GameState {
  const droneTargetCount = clampDroneTarget(count)
  if (droneTargetCount === state.droneTargetCount) return state
  return { ...state, droneTargetCount }
}

export function setDroneAutoBuild(state: GameState, enabled: boolean): GameState {
  if (state.droneAutoBuild === enabled) return state
  return appendLog(
    { ...state, droneAutoBuild: enabled },
    enabled
      ? `Auto-build on — target fleet ${state.droneTargetCount}.`
      : 'Auto-build off.',
    'info',
  )
}

/** Fleet size counting an in-progress fab as +1. */
export function effectiveDroneCount(state: GameState): number {
  return state.drones.length + (state.droneBuildActive ? 1 : 0)
}

/** If auto-build is on and under target, start one fab when affordable. */
export function tryAutoBuildDrone(state: GameState): GameState {
  if (!state.droneAutoBuild) return state
  if (effectiveDroneCount(state) >= state.droneTargetCount) return state
  return startDroneBuild(state, { auto: true })
}

export function previewDroneTechUpgrade(state: GameState): {
  level: number
  costs: CostLine[]
  nextDronePowerKgPerS: number
  nextBuildCostHint: CostLine[]
  affordable: boolean
} {
  const level = state.droneTechLevel + 1
  const costs = droneTechUpgradeCosts(state.droneTechLevel)
  return {
    level,
    costs,
    nextDronePowerKgPerS: dronePowerAtTech(level),
    nextBuildCostHint: droneBuildCosts(level),
    affordable: canAffordCosts(state, costs),
  }
}

/** Raise blueprint level only — existing drones keep their frozen power. */
export function buyDroneTechUpgrade(state: GameState): GameState {
  const preview = previewDroneTechUpgrade(state)
  if (!preview.affordable) return state
  const paid = spendCosts(state, preview.costs)
  if (!paid) return state
  return appendLog(
    {
      ...paid,
      droneTechLevel: preview.level,
    },
    `Drone tech → ${preview.level}. New builds: ${formatRateKgPerS(preview.nextDronePowerKgPerS)} (existing fleet unchanged).`,
    'success',
  )
}

export function previewDroneFabUpgrade(state: GameState): {
  level: number
  costs: CostLine[]
  nextBuildSeconds: number
  affordable: boolean
} {
  const level = state.droneFabLevel + 1
  const costs = droneFabUpgradeCosts(state.droneFabLevel)
  return {
    level,
    costs,
    nextBuildSeconds: droneBuildDurationSeconds(state.droneTechLevel, level),
    affordable: canAffordCosts(state, costs),
  }
}

/** Upgrade fab machinery — applies immediately to in-progress and future builds. */
export function buyDroneFabUpgrade(state: GameState): GameState {
  const preview = previewDroneFabUpgrade(state)
  if (!preview.affordable) return state
  const paid = spendCosts(state, preview.costs)
  if (!paid) return state
  return appendLog(
    {
      ...paid,
      droneFabLevel: preview.level,
    },
    `Fab speed → level ${preview.level} (≈${preview.nextBuildSeconds.toFixed(0)}s / drone at current tech).`,
    'success',
  )
}

export function previewDroneSafetyUpgrade(state: GameState): {
  level: number
  costs: CostLine[]
  nextMttfRockSeconds: number
  affordable: boolean
} {
  const level = state.droneSafetyLevel + 1
  const costs = droneSafetyUpgradeCosts(state.droneSafetyLevel)
  return {
    level,
    costs,
    nextMttfRockSeconds: meanTimeToFailureSeconds(level, null),
    affordable: canAffordCosts(state, costs),
  }
}

/** Upgrade drone shielding — lowers explosion rate for the whole fleet. */
export function buyDroneSafetyUpgrade(state: GameState): GameState {
  const preview = previewDroneSafetyUpgrade(state)
  if (!preview.affordable) return state
  const paid = spendCosts(state, preview.costs)
  if (!paid) return state
  const mttfMin = Math.round(preview.nextMttfRockSeconds / 60)
  return appendLog(
    {
      ...paid,
      droneSafetyLevel: preview.level,
    },
    `Drone safety → level ${preview.level} (≈${mttfMin}m MTTF on benign ore).`,
    'success',
  )
}

function completeBuild(state: GameState): GameState {
  const tech = state.droneBuildTechLevel || state.droneTechLevel
  const serial = state.droneSerial + 1
  const drone = createDrone(tech, serial)
  return appendLog(
    withMiningRate({
      ...state,
      droneSerial: serial,
      drones: [...state.drones, drone],
      droneBuildActive: false,
      droneBuildProgressSeconds: 0,
      droneBuildTechLevel: state.droneTechLevel,
    }),
    `${drone.id} online — tech ${drone.techLevel}, ${formatRateKgPerS(drone.powerKgPerS)}.`,
    'success',
  )
}

/**
 * Advance fab progress for up to `dtSeconds`.
 * Completes at most one drone; leftover time is returned so the caller can
 * start the next auto-build and continue.
 */
export function tickDroneBuild(
  state: GameState,
  dtSeconds: number,
): { state: GameState; remainingSeconds: number } {
  if (!state.droneBuildActive || dtSeconds <= 0) {
    return { state, remainingSeconds: dtSeconds }
  }
  const need = droneBuildDurationSeconds(
    state.droneBuildTechLevel || state.droneTechLevel,
    state.droneFabLevel,
  )
  const have = state.droneBuildProgressSeconds
  const step = Math.min(dtSeconds, Math.max(0, need - have))
  const nextProgress = have + step
  const remainingSeconds = dtSeconds - step

  if (nextProgress + 1e-9 >= need) {
    return {
      state: completeBuild({ ...state, droneBuildProgressSeconds: need }),
      remainingSeconds,
    }
  }
  return {
    state: { ...state, droneBuildProgressSeconds: nextProgress },
    remainingSeconds: 0,
  }
}

/**
 * Independent per-drone explosion checks. If the fleet is wiped, spawn a free tech-1 drone.
 * Advances rngSeed for determinism.
 */
export function tickDroneHazards(
  state: GameState,
  dtSeconds: number,
  activeAsteroid: Asteroid | null = null,
): GameState {
  if (dtSeconds <= 0) return ensureMinimumDrone(state)
  if (state.drones.length === 0) return ensureMinimumDrone(state, true)

  const before = state.drones.length
  const rate = explosionRatePerS(state.droneSafetyLevel, activeAsteroid)
  const rng = createRng(state.rngSeed)
  const surviveProb = Math.exp(-rate * dtSeconds)
  const survivors = state.drones.filter(() => rng() < surviveProb)

  // Burn a little extra so seed diverges even when counts match.
  const burn = 1 + Math.floor(rng() * 1e6)
  let next: GameState = {
    ...state,
    drones: survivors,
    rngSeed: (state.rngSeed + burn + state.drones.length * 131) >>> 0,
  }

  const lost = before - survivors.length
  if (lost > 0) {
    const hot = oreHazardMultiplier(activeAsteroid) >= 5
    next = appendLog(
      next,
      lost === 1
        ? hot
          ? 'A mining drone exploded (hot ore).'
          : 'A mining drone exploded.'
        : hot
          ? `${lost} mining drones exploded (hot ore).`
          : `${lost} mining drones exploded.`,
      'danger',
    )
  }

  if (next.drones.length === 0) {
    next = ensureMinimumDrone(next, true)
  } else {
    next = withMiningRate(next)
  }
  return next
}
