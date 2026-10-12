/** Curated catalog of 10 minable asteroid resource classes (SI masses elsewhere). */

export type ResourceTag =
  | 'silicate'
  | 'metal'
  | 'volatile'
  | 'precious'
  | 'radioactive'

export interface ResourceDef {
  id: string
  name: string
  /** Assay symbol shown on chips and hopper rows. */
  symbol: string
  tag: ResourceTag
  /**
   * Relative rarity weight base. Higher = rarer (lower spawn weight).
   * Common ≈ 1–5, uncommon ≈ 8–20, rare ≈ 30–80, exotic ≈ 100+.
   */
  rarity: number
  /** Survey instruments must reach this search level to detect the species. */
  minSearchLevel: number
}

/** Exactly ten assay classes — ids must match upgrade pay bands. */
export const RESOURCE_CATALOG: readonly ResourceDef[] = [
  { id: 'rock', name: 'Silicate rock', symbol: 'Si', tag: 'silicate', rarity: 1, minSearchLevel: 1 },
  { id: 'iron', name: 'Iron', symbol: 'Fe', tag: 'metal', rarity: 1.4, minSearchLevel: 1 },
  { id: 'nickel', name: 'Nickel', symbol: 'Ni', tag: 'metal', rarity: 2.2, minSearchLevel: 1 },
  { id: 'water-ice', name: 'Water ice', symbol: 'H₂O', tag: 'volatile', rarity: 2.5, minSearchLevel: 2 },
  { id: 'titanium', name: 'Titanium', symbol: 'Ti', tag: 'metal', rarity: 5, minSearchLevel: 3 },
  { id: 'copper', name: 'Copper', symbol: 'Cu', tag: 'metal', rarity: 6, minSearchLevel: 4 },
  { id: 'platinum', name: 'Platinum', symbol: 'Pt', tag: 'precious', rarity: 28, minSearchLevel: 8 },
  { id: 'gold', name: 'Gold', symbol: 'Au', tag: 'precious', rarity: 36, minSearchLevel: 10 },
  { id: 'uranium', name: 'Uranium', symbol: 'U', tag: 'radioactive', rarity: 48, minSearchLevel: 14 },
  { id: 'helium-3', name: 'Helium-3', symbol: '³He', tag: 'volatile', rarity: 80, minSearchLevel: 18 },
] as const

export const RESOURCE_BY_ID: ReadonlyMap<string, ResourceDef> = new Map(
  RESOURCE_CATALOG.map((r) => [r.id, r]),
)

export const ROCK_ID = 'rock'
export const IRON_ID = 'iron'

/** Legacy / removed ids folded into silicate rock on save load. */
const LEGACY_TO_ROCK = new Set(['silver', 'silicate-rock', 'regolith-fines'])

export const CATALOG_SIZE = 10

export function assertCatalogSize(): void {
  if (RESOURCE_CATALOG.length !== CATALOG_SIZE) {
    throw new Error(`Expected ${CATALOG_SIZE} resources, got ${RESOURCE_CATALOG.length}`)
  }
}

assertCatalogSize()

export function resourcesUnlockedAt(searchLevel: number): ResourceDef[] {
  return RESOURCE_CATALOG.filter((r) => r.minSearchLevel <= searchLevel)
}

export function isKnownResourceId(id: string): boolean {
  return RESOURCE_BY_ID.has(id)
}

/** Map unknown or retired resource ids onto a catalog id (default: silicate rock). */
export function canonicalizeResourceId(id: string): string {
  if (RESOURCE_BY_ID.has(id)) return id
  if (LEGACY_TO_ROCK.has(id)) return ROCK_ID
  return ROCK_ID
}
