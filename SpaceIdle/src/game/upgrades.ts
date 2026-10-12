import { RESOURCE_BY_ID } from './resources/catalog.ts'
import { resourceAmount } from './state.ts'
import type { CostLine, GameState } from './types.ts'

export type { CostLine }

export type UpgradeTrack =
  | 'droneBuild'
  | 'droneTech'
  | 'droneFab'
  | 'droneSafety'
  | 'search'
  | 'queue'

/** Curated pay resources by rarity band (bulk + optional rare). */
export interface PayBand {
  band: number
  bulkId: string
  rareId: string | null
}

/**
 * Survey / queue ladder — shared progression pay sheet.
 * Ids must exist in the resource catalog.
 */
export const CURATED_PAY_BANDS: readonly PayBand[] = [
  { band: 0, bulkId: 'rock', rareId: null },
  { band: 1, bulkId: 'rock', rareId: 'iron' },
  { band: 2, bulkId: 'iron', rareId: 'nickel' },
  { band: 3, bulkId: 'nickel', rareId: 'copper' },
  { band: 4, bulkId: 'rock', rareId: 'titanium' },
  { band: 5, bulkId: 'copper', rareId: 'platinum' },
  { band: 6, bulkId: 'titanium', rareId: 'gold' },
  { band: 7, bulkId: 'platinum', rareId: 'uranium' },
  { band: 8, bulkId: 'gold', rareId: 'helium-3' },
]

/** Hull fab — structural rock / metals (not R&D materials). */
export const BUILD_PAY_BANDS: readonly PayBand[] = [
  { band: 0, bulkId: 'rock', rareId: null },
  { band: 1, bulkId: 'rock', rareId: 'iron' },
  { band: 2, bulkId: 'iron', rareId: 'nickel' },
  { band: 3, bulkId: 'iron', rareId: 'titanium' },
  { band: 4, bulkId: 'nickel', rareId: 'titanium' },
  { band: 5, bulkId: 'titanium', rareId: 'copper' },
  { band: 6, bulkId: 'titanium', rareId: 'platinum' },
  { band: 7, bulkId: 'platinum', rareId: 'gold' },
  { band: 8, bulkId: 'gold', rareId: 'helium-3' },
]

/** Blueprint R&D — conductors / precious (avoids early rock/iron hull sink). */
export const TECH_PAY_BANDS: readonly PayBand[] = [
  { band: 0, bulkId: 'nickel', rareId: null },
  { band: 1, bulkId: 'nickel', rareId: 'water-ice' },
  { band: 2, bulkId: 'copper', rareId: 'nickel' },
  { band: 3, bulkId: 'copper', rareId: 'titanium' },
  { band: 4, bulkId: 'copper', rareId: 'platinum' },
  { band: 5, bulkId: 'platinum', rareId: 'gold' },
  { band: 6, bulkId: 'gold', rareId: 'platinum' },
  { band: 7, bulkId: 'gold', rareId: 'uranium' },
  { band: 8, bulkId: 'gold', rareId: 'helium-3' },
]

/** Fab speed — coolant / tooling. */
export const FAB_PAY_BANDS: readonly PayBand[] = [
  { band: 0, bulkId: 'water-ice', rareId: null },
  { band: 1, bulkId: 'water-ice', rareId: 'copper' },
  { band: 2, bulkId: 'copper', rareId: 'titanium' },
  { band: 3, bulkId: 'titanium', rareId: 'water-ice' },
  { band: 4, bulkId: 'copper', rareId: 'platinum' },
  { band: 5, bulkId: 'titanium', rareId: 'gold' },
  { band: 6, bulkId: 'platinum', rareId: 'gold' },
  { band: 7, bulkId: 'gold', rareId: 'uranium' },
  { band: 8, bulkId: 'uranium', rareId: 'helium-3' },
]

/** Safety / shielding — ice early, rad materials late. */
export const SAFETY_PAY_BANDS: readonly PayBand[] = [
  { band: 0, bulkId: 'water-ice', rareId: null },
  { band: 1, bulkId: 'water-ice', rareId: 'nickel' },
  { band: 2, bulkId: 'nickel', rareId: 'copper' },
  { band: 3, bulkId: 'copper', rareId: 'titanium' },
  { band: 4, bulkId: 'water-ice', rareId: 'platinum' },
  { band: 5, bulkId: 'platinum', rareId: 'gold' },
  { band: 6, bulkId: 'platinum', rareId: 'uranium' },
  { band: 7, bulkId: 'uranium', rareId: 'helium-3' },
  { band: 8, bulkId: 'gold', rareId: 'helium-3' },
]

const BASE_BULK_KG: Record<UpgradeTrack, number> = {
  droneBuild: 40,
  droneTech: 40,
  droneFab: 35,
  droneSafety: 45,
  search: 50,
  queue: 100,
}

function payBandsFor(track: UpgradeTrack): readonly PayBand[] {
  switch (track) {
    case 'droneBuild':
      return BUILD_PAY_BANDS
    case 'droneTech':
      return TECH_PAY_BANDS
    case 'droneFab':
      return FAB_PAY_BANDS
    case 'droneSafety':
      return SAFETY_PAY_BANDS
    case 'search':
    case 'queue':
      return CURATED_PAY_BANDS
  }
}

/** Round to 1 / 2 / 5 × 10ⁿ (engineering-friendly masses). */
export function roundNiceMass(kg: number): number {
  if (!Number.isFinite(kg) || kg <= 0) return 0
  const exp = Math.floor(Math.log10(kg))
  const base = 10 ** exp
  const norm = kg / base
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return nice * base
}

/** Log-chart bulk mass for purchasing the next level from `currentLevel`. */
export function logBulkCostKg(baseKg: number, currentLevel: number): number {
  const L = Math.max(1, currentLevel)
  return roundNiceMass(baseKg * L ** 1.15)
}

function clampBand(track: UpgradeTrack, band: number): PayBand {
  const ladder = payBandsFor(track)
  const max = ladder.length - 1
  const i = Math.max(0, Math.min(max, Math.floor(band)))
  return ladder[i]!
}

/**
 * Band index from level. Search stays common longer; drone tracks share miner cadence.
 * Fab/safety slightly slower early so copper/platinum softlocks are rarer.
 */
export function rarityBandFor(track: UpgradeTrack, currentLevel: number): number {
  const L = Math.max(1, currentLevel)
  if (track === 'search') {
    if (L < 5) return 0
    if (L < 9) return 1
    if (L < 14) return 2
    if (L < 20) return 3
    if (L < 28) return 4
    if (L < 36) return 5
    if (L < 48) return 6
    if (L < 64) return 7
    return 8
  }
  if (track === 'queue') {
    const steps = Math.max(0, L - 5)
    if (steps < 1) return 0
    if (steps < 2) return 1
    if (steps < 3) return 2
    if (steps < 5) return 3
    if (steps < 7) return 4
    if (steps < 9) return 5
    if (steps < 12) return 6
    if (steps < 16) return 7
    return 8
  }
  if (track === 'droneFab' || track === 'droneSafety' || track === 'droneTech') {
    // Stay on early unlocked ores longer (water-ice L2, copper L4, platinum L8).
    if (L < 4) return 0
    if (L < 7) return 1
    if (L < 11) return 2
    if (L < 16) return 3
    if (L < 22) return 4
    if (L < 30) return 5
    if (L < 40) return 6
    if (L < 52) return 7
    return 8
  }
  // droneBuild — hull cadence (can use rock/iron from L1)
  if (L < 3) return 0
  if (L < 5) return 1
  if (L < 8) return 2
  if (L < 12) return 3
  if (L < 17) return 4
  if (L < 24) return 5
  if (L < 32) return 6
  if (L < 44) return 7
  return 8
}

function rareFraction(band: number): number {
  return Math.max(0.02, 0.2 / (1 + band * 0.35))
}

/** Search track swaps copper → water ice at band 3 (cooling / survey). */
function rareIdFor(track: UpgradeTrack, band: PayBand): string | null {
  if (!band.rareId) return null
  if (track === 'search' && band.band === 3) return 'water-ice'
  return band.rareId
}

export function upgradeCosts(track: UpgradeTrack, currentLevel: number): CostLine[] {
  const band = clampBand(track, rarityBandFor(track, currentLevel))
  const bulkKg = logBulkCostKg(BASE_BULK_KG[track], currentLevel)
  const lines: CostLine[] = [{ resourceId: band.bulkId, amountKg: bulkKg }]

  const rareId = rareIdFor(track, band)
  if (rareId) {
    const rareKg = roundNiceMass(Math.max(1, bulkKg * rareFraction(band.band)))
    if (rareId === band.bulkId) {
      lines[0] = { resourceId: band.bulkId, amountKg: roundNiceMass(bulkKg + rareKg) }
    } else {
      lines.push({ resourceId: rareId, amountKg: rareKg })
    }
  }

  for (const line of lines) {
    if (!RESOURCE_BY_ID.has(line.resourceId)) {
      throw new Error(`Upgrade pay resource missing from catalog: ${line.resourceId}`)
    }
  }
  return lines
}

export function canAffordCosts(state: GameState, costs: readonly CostLine[]): boolean {
  for (const line of costs) {
    if (resourceAmount(state, line.resourceId) + 1e-9 < line.amountKg) {
      return false
    }
  }
  return true
}

/** Exact spend of listed resources; fails closed if any line is short. */
export function spendCosts(state: GameState, costs: readonly CostLine[]): GameState | null {
  if (!canAffordCosts(state, costs)) return null
  const resources = { ...state.resources }
  for (const line of costs) {
    const next = (resources[line.resourceId] ?? 0) - line.amountKg
    if (next <= 1e-9) delete resources[line.resourceId]
    else resources[line.resourceId] = next
  }
  return { ...state, resources }
}

export function formatCostLines(costs: readonly CostLine[]): string {
  return costs
    .map((c) => {
      const name = RESOURCE_BY_ID.get(c.resourceId)?.name ?? c.resourceId
      return `${formatCostMass(c.amountKg)} ${name}`
    })
    .join(' + ')
}

function formatCostMass(kg: number): string {
  if (kg >= 1e12) return `${kg / 1e12} Tt`
  if (kg >= 1e9) return `${kg / 1e9} Gt`
  if (kg >= 1e6) return `${kg / 1e6} kt`
  if (kg >= 1e3) return `${kg / 1e3} t`
  return `${kg} kg`
}
