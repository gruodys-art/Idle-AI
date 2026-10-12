import {
  RESOURCE_BY_ID,
  resourcesUnlockedAt,
  type ResourceDef,
} from './resources/catalog.ts'
import { createRng, pickWeighted } from './rng.ts'
import type { Asteroid, CompositionEntry, SizeTier } from './types.ts'

export interface SizeDef {
  tier: SizeTier
  label: string
  massKg: number
  /** Base weight before search-level bias (higher = more common). */
  baseWeight: number
  /** Survey level required before this tier can appear. */
  minSearchLevel: number
}

/**
 * Accessible mass tiers. Early search is almost only pebble / boulder class;
 * larger bodies unlock and become more common as search level rises.
 */
export const SIZE_TIERS: readonly SizeDef[] = [
  { tier: 'tiny', label: 'Tiny', massKg: 2e2, baseWeight: 48, minSearchLevel: 1 },
  { tier: 'small', label: 'Small', massKg: 1e3, baseWeight: 24, minSearchLevel: 1 },
  { tier: 'medium', label: 'Medium', massKg: 8e3, baseWeight: 12, minSearchLevel: 5 },
  { tier: 'large', label: 'Large', massKg: 6e4, baseWeight: 6, minSearchLevel: 12 },
  { tier: 'huge', label: 'Huge', massKg: 4e5, baseWeight: 1, minSearchLevel: 22 },
  { tier: 'colossal', label: 'Colossal', massKg: 3e6, baseWeight: 0.25, minSearchLevel: 35 },
]

export function sizeWeight(def: SizeDef, searchLevel: number): number {
  if (searchLevel < def.minSearchLevel) return 0
  const tierIndex = SIZE_TIERS.findIndex((s) => s.tier === def.tier)
  // Over-level gently boosts larger tiers; huge+ ramp much slower.
  const over = Math.max(0, searchLevel - def.minSearchLevel)
  const overScale = tierIndex >= 4 ? 0.08 : 0.35
  const unlockBoost = 1 + over * overScale * tierIndex
  // Extra penalty so the largest unlocked tiers stay uncommon until well past unlock.
  const scarcityBase = tierIndex >= 4 ? 2.4 : 1.55
  const scarcity = Math.pow(scarcityBase, tierIndex)
  return (def.baseWeight * unlockBoost) / scarcity
}

/** While miner is below this level, pay resources are injected into most finds. */
export const MINER_PAY_BIAS_UNTIL_LEVEL = 50

/** Chance that a find includes at least one current miner-upgrade pay resource. */
export const MINER_PAY_BIAS_CHANCE = 0.8

export interface GenerateAsteroidOptions {
  /**
   * Current miner-upgrade pay resource ids. When provided (miner below bias
   * cutoff), ~80% of finds include at least one unlocked id from this list.
   */
  minerPayBiasIds?: readonly string[]
  /**
   * When set (and eligible), this resource is forced into the composition.
   */
  desiredResourceId?: string | null
}

/** Search level required before a resource can be survey-targeted. */
export function searchTargetMinLevel(def: ResourceDef): number {
  return Math.ceil(def.rarity - 5)
}

/** Unlocked and searchLevel ≥ rarity − 5. */
export function isSearchTargetable(def: ResourceDef, searchLevel: number): boolean {
  return def.minSearchLevel <= searchLevel && searchLevel >= searchTargetMinLevel(def)
}

/** Valid desired target at current search level; otherwise null. */
export function resolveSearchTarget(
  searchLevel: number,
  targetResourceId: string | null | undefined,
): string | null {
  if (!targetResourceId) return null
  const def = RESOURCE_BY_ID.get(targetResourceId)
  if (!def || !isSearchTargetable(def, searchLevel)) return null
  return def.id
}

/** Catalog entries eligible for the target dropdown (unlocked + targetable). */
export function searchTargetableResources(searchLevel: number): ResourceDef[] {
  return resourcesUnlockedAt(searchLevel).filter((r) => isSearchTargetable(r, searchLevel))
}

function resourceWeight(def: ResourceDef, searchLevel: number): number {
  // Rarer resources get a soft unlock boost as search level rises above min.
  const overLevel = Math.max(0, searchLevel - def.minSearchLevel)
  const rarityPenalty = Math.pow(def.rarity, 1.15)
  const unlockBoost = 1 + overLevel * 0.08
  return (1 / rarityPenalty) * unlockBoost
}

function takeForced(
  available: ResourceDef[],
  resourceId: string,
): ResourceDef | null {
  const idx = available.findIndex((r) => r.id === resourceId)
  if (idx < 0) return null
  const [picked] = available.splice(idx, 1)
  return picked ?? null
}

function rollComposition(
  rng: () => number,
  searchLevel: number,
  size: SizeDef,
  options: GenerateAsteroidOptions,
): CompositionEntry[] {
  const unlocked = resourcesUnlockedAt(searchLevel)
  const pool = unlocked.length > 0 ? unlocked : resourcesUnlockedAt(1)
  const tierIndex = SIZE_TIERS.findIndex((s) => s.tier === size.tier)
  const speciesCount = Math.min(pool.length, 2 + Math.floor(rng() * (2 + tierIndex)))

  const picked: ResourceDef[] = []
  const available = [...pool]

  const desiredId = options.desiredResourceId
  if (desiredId) {
    const forced = takeForced(available, desiredId)
    if (forced) picked.push(forced)
  }

  const biasIds = options.minerPayBiasIds
  if (biasIds && biasIds.length > 0 && rng() < MINER_PAY_BIAS_CHANCE) {
    const payIds = [...new Set(biasIds)].filter((id) => available.some((r) => r.id === id))
    if (payIds.length > 0) {
      const choice = payIds[Math.floor(rng() * payIds.length)]!
      const forced = takeForced(available, choice)
      if (forced) picked.push(forced)
    }
  }

  while (picked.length < speciesCount && available.length > 0) {
    const choice = pickWeighted(rng, available, (r) => resourceWeight(r, searchLevel))
    picked.push(choice)
    const idx = available.findIndex((r) => r.id === choice.id)
    if (idx >= 0) available.splice(idx, 1)
  }

  const raw = picked.map((r) => ({
    resourceId: r.id,
    weight: resourceWeight(r, searchLevel) * (0.5 + rng()),
  }))
  const sum = raw.reduce((a, b) => a + b.weight, 0)
  return raw.map((r) => ({
    resourceId: r.resourceId,
    fraction: r.weight / sum,
  }))
}

export function generateAsteroid(
  prospectIndex: number,
  searchLevel: number,
  rngSeed: number,
  options: GenerateAsteroidOptions = {},
): { asteroid: Asteroid; nextSeed: number } {
  const rng = createRng(rngSeed)
  const size = pickWeighted(rng, SIZE_TIERS, (s) => sizeWeight(s, searchLevel))
  const composition = rollComposition(rng, searchLevel, size, options)
  const sizeLabel = size.label
  const asteroid: Asteroid = {
    id: `prospect-${prospectIndex}`,
    name: `${sizeLabel} A-${prospectIndex}`,
    sizeTier: size.tier,
    remainingKg: size.massKg,
    totalKg: size.massKg,
    composition,
  }
  // Advance seed with a few burns so successive calls diverge.
  const burn = 1 + Math.floor(rng() * 1e6)
  return { asteroid, nextSeed: (rngSeed + burn + prospectIndex * 997) >>> 0 }
}

export function dominantResources(
  composition: CompositionEntry[],
  limit = 3,
): CompositionEntry[] {
  return [...composition].sort((a, b) => b.fraction - a.fraction).slice(0, limit)
}
