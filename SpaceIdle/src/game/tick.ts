import {
  generateAsteroid,
  resolveSearchTarget,
  SIZE_TIERS,
} from './asteroidGen.ts'
import {
  buyDroneTechUpgrade,
  buyDroneFabUpgrade,
  buyDroneSafetyUpgrade,
  droneBuildDurationSeconds,
  DRONE_TECH_PAY_BIAS_UNTIL_LEVEL,
  dronePayResourceIds,
  ensureMinimumDrone,
  meanTimeToFailureSeconds,
  oreHazardMultiplier,
  previewDroneBuild,
  previewDroneTechUpgrade,
  previewDroneFabUpgrade,
  previewDroneSafetyUpgrade,
  startDroneBuild,
  tickDroneBuild,
  tickDroneHazards,
  tryAutoBuildDrone,
  setDroneAutoBuild,
  setDroneTargetCount,
} from './drones.ts'
import { formatDurationSeconds, formatMassKg } from './format.ts'
import { appendLog } from './log.ts'
import {
  addResource,
  getActiveAsteroid,
  searchDurationSeconds,
  syncActiveToQueueFront,
} from './state.ts'
import type {
  Asteroid,
  DroneBuildPreview,
  DroneFabUpgradePreview,
  DroneSafetyUpgradePreview,
  DroneTechUpgradePreview,
  GameState,
  QueueUpgradePreview,
  SearchUpgradePreview,
} from './types.ts'
import { canAffordCosts, spendCosts, upgradeCosts } from './upgrades.ts'

function asteroidGenOptions(state: GameState) {
  return {
    minerPayBiasIds:
      state.droneTechLevel < DRONE_TECH_PAY_BIAS_UNTIL_LEVEL
        ? dronePayResourceIds(
            state.droneTechLevel,
            state.droneFabLevel,
            state.droneSafetyLevel,
          )
        : undefined,
    desiredResourceId: resolveSearchTarget(
      state.searchLevel,
      state.searchTargetResourceId,
    ),
  }
}

const MASS_EPS = 1e-6

function sizeLabel(tier: Asteroid['sizeTier']): string {
  return SIZE_TIERS.find((s) => s.tier === tier)?.label ?? tier
}

function updateQueueAsteroid(state: GameState, asteroid: Asteroid): GameState {
  return {
    ...state,
    asteroidQueue: state.asteroidQueue.map((a) => (a.id === asteroid.id ? asteroid : a)),
  }
}

function removeAsteroid(state: GameState, id: string): GameState {
  const asteroidQueue = state.asteroidQueue.filter((a) => a.id !== id)
  return syncActiveToQueueFront({ ...state, asteroidQueue })
}

function creditMined(state: GameState, asteroid: Asteroid, minedKg: number): GameState {
  let next = state
  for (const entry of asteroid.composition) {
    const portion = minedKg * entry.fraction
    if (portion > 0) {
      next = addResource(next, entry.resourceId, portion)
    }
  }
  return next
}

function mineActive(state: GameState, dtSeconds: number): GameState {
  if (dtSeconds <= 0 || state.miningRateKgPerS <= 0) return state

  let next = syncActiveToQueueFront(state)
  let timeLeft = dtSeconds

  while (timeLeft > 0) {
    const active = getActiveAsteroid(next)
    if (!active || active.remainingKg <= MASS_EPS) {
      if (active) {
        next = removeAsteroid(next, active.id)
        continue
      }
      break
    }

    const mined = Math.min(next.miningRateKgPerS * timeLeft, active.remainingKg)
    if (mined <= MASS_EPS) break

    next = creditMined(next, active, mined)
    const remainingKg = active.remainingKg - mined
    timeLeft -= mined / next.miningRateKgPerS

    if (remainingKg <= MASS_EPS) {
      next = appendLog(
        removeAsteroid(next, active.id),
        `Mined out ${active.name} (${formatMassKg(active.totalKg)}).`,
        'info',
      )
    } else {
      next = updateQueueAsteroid(next, { ...active, remainingKg })
    }
  }

  return next
}

function runSearch(state: GameState, dtSeconds: number): GameState {
  if (dtSeconds <= 0) return state
  if (state.asteroidQueue.length >= state.queueCapacity) {
    return state
  }

  let next = state
  let timeLeft = dtSeconds

  while (timeLeft > 0 && next.asteroidQueue.length < next.queueCapacity) {
    const need = searchDurationSeconds(next.searchLevel)
    const have = next.searchProgressSeconds
    const step = Math.min(timeLeft, need - have)
    next = {
      ...next,
      searchProgressSeconds: have + step,
    }
    timeLeft -= step

    if (next.searchProgressSeconds + MASS_EPS >= need) {
      const prospectIndex = next.prospectIndex + 1
      const { asteroid, nextSeed } = generateAsteroid(
        prospectIndex,
        next.searchLevel,
        next.rngSeed,
        asteroidGenOptions(next),
      )
      const asteroidQueue = [...next.asteroidQueue, asteroid]
      next = syncActiveToQueueFront({
        ...next,
        prospectIndex,
        rngSeed: nextSeed,
        asteroidQueue,
        searchProgressSeconds: 0,
      })
      next = appendLog(
        next,
        `Survey found ${asteroid.name} · ${sizeLabel(asteroid.sizeTier)} · ${formatMassKg(asteroid.totalKg)}.`,
        'info',
      )
    } else {
      break
    }
  }

  return next
}

/**
 * Advance simulation by `dtSeconds` of game time.
 * Mines, fabricates drones (chaining auto-build), applies hazards, then auto-searches.
 */
export function tick(state: GameState, dtSeconds: number): GameState {
  if (dtSeconds <= 0) return state
  let next = {
    ...state,
    gameTimeSeconds: state.gameTimeSeconds + dtSeconds,
  }
  next = mineActive(next, dtSeconds)

  let buildLeft = dtSeconds
  while (buildLeft > 0) {
    if (!next.droneBuildActive) {
      next = tryAutoBuildDrone(next)
      if (!next.droneBuildActive) break
    }
    const stepped = tickDroneBuild(next, buildLeft)
    next = stepped.state
    if (stepped.remainingSeconds >= buildLeft - 1e-12) {
      // No progress (shouldn't happen while active); avoid infinite loop.
      break
    }
    buildLeft = stepped.remainingSeconds
  }

  next = tickDroneHazards(next, dtSeconds, getActiveAsteroid(next))
  next = ensureMinimumDrone(next)
  next = tryAutoBuildDrone(next)
  return runSearch(next, dtSeconds)
}

export function moveAsteroidToTop(state: GameState, asteroidId: string): GameState {
  return moveAsteroidToIndex(state, asteroidId, 0)
}

export function discardAsteroid(state: GameState, asteroidId: string): GameState {
  const rock = state.asteroidQueue.find((a) => a.id === asteroidId)
  if (!rock) return state
  return appendLog(removeAsteroid(state, asteroidId), `Discarded ${rock.name}.`, 'warn')
}

export function moveAsteroidToIndex(
  state: GameState,
  asteroidId: string,
  toIndex: number,
): GameState {
  const from = state.asteroidQueue.findIndex((a) => a.id === asteroidId)
  if (from < 0) return state
  const clamped = Math.max(0, Math.min(state.asteroidQueue.length - 1, toIndex))
  if (from === clamped) return syncActiveToQueueFront(state)

  const asteroidQueue = [...state.asteroidQueue]
  const [item] = asteroidQueue.splice(from, 1)
  if (!item) return state
  asteroidQueue.splice(clamped, 0, item)
  return syncActiveToQueueFront({ ...state, asteroidQueue })
}

export function previewBuildDrone(state: GameState): DroneBuildPreview {
  return previewDroneBuild(state)
}

export function buildDrone(state: GameState): GameState {
  return startDroneBuild(state)
}

export function setAutoBuildDrones(state: GameState, enabled: boolean): GameState {
  let next = setDroneAutoBuild(state, enabled)
  if (enabled) next = tryAutoBuildDrone(next)
  return next
}

export function setRequestedDroneCount(state: GameState, count: number): GameState {
  let next = setDroneTargetCount(state, count)
  if (next.droneAutoBuild) next = tryAutoBuildDrone(next)
  return next
}

export function previewUpgradeDroneTech(state: GameState): DroneTechUpgradePreview {
  const preview = previewDroneTechUpgrade(state)
  return {
    level: preview.level,
    costs: preview.costs,
    nextDronePowerKgPerS: preview.nextDronePowerKgPerS,
    affordable: preview.affordable,
  }
}

export function upgradeDroneTech(state: GameState): GameState {
  return buyDroneTechUpgrade(state)
}

export function previewUpgradeDroneFab(state: GameState): DroneFabUpgradePreview {
  return previewDroneFabUpgrade(state)
}

export function upgradeDroneFab(state: GameState): GameState {
  return buyDroneFabUpgrade(state)
}

export function previewUpgradeDroneSafety(state: GameState): DroneSafetyUpgradePreview {
  return previewDroneSafetyUpgrade(state)
}

export function upgradeDroneSafety(state: GameState): GameState {
  return buyDroneSafetyUpgrade(state)
}

export function previewSearchUpgrade(state: GameState): SearchUpgradePreview {
  const costs = upgradeCosts('search', state.searchLevel)
  return {
    level: state.searchLevel + 1,
    costs,
    nextSearchSeconds: searchDurationSeconds(state.searchLevel + 1),
    affordable: canAffordCosts(state, costs),
  }
}

export function buySearchUpgrade(state: GameState): GameState {
  const preview = previewSearchUpgrade(state)
  if (!preview.affordable) return state
  const paid = spendCosts(state, preview.costs)
  if (!paid) return state
  const searchLevel = preview.level
  const searchTargetResourceId = resolveSearchTarget(
    searchLevel,
    paid.searchTargetResourceId,
  )
  return appendLog(
    { ...paid, searchLevel, searchTargetResourceId },
    `Search instruments → level ${searchLevel} (${formatDurationSeconds(preview.nextSearchSeconds)} / find).`,
    'success',
  )
}

export function setSearchTargetResource(
  state: GameState,
  resourceId: string | null,
): GameState {
  const searchTargetResourceId = resolveSearchTarget(state.searchLevel, resourceId)
  if (searchTargetResourceId === state.searchTargetResourceId) return state
  return { ...state, searchTargetResourceId }
}

export function previewQueueUpgrade(state: GameState): QueueUpgradePreview {
  const costs = upgradeCosts('queue', state.queueCapacity)
  return {
    capacity: state.queueCapacity,
    costs,
    nextCapacity: state.queueCapacity + 1,
    affordable: canAffordCosts(state, costs),
  }
}

export function buyQueueUpgrade(state: GameState): GameState {
  const preview = previewQueueUpgrade(state)
  if (!preview.affordable) return state
  const paid = spendCosts(state, preview.costs)
  if (!paid) return state
  return appendLog(
    {
      ...paid,
      queueCapacity: preview.nextCapacity,
    },
    `Asteroid queue expanded to ${preview.nextCapacity} slots.`,
    'success',
  )
}

export { droneBuildDurationSeconds, meanTimeToFailureSeconds, oreHazardMultiplier }
