/** All masses and rates use SI: kilograms and kilograms per second. */

export type SizeTier = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal'

export interface CompositionEntry {
  resourceId: string
  /** Mass fraction of accessible material (entries sum to ~1). */
  fraction: number
}

export interface Asteroid {
  id: string
  name: string
  sizeTier: SizeTier
  /** Accessible material remaining (kg). */
  remainingKg: number
  /** Original accessible material at discovery (kg). */
  totalKg: number
  composition: CompositionEntry[]
}

/** One mining drone; power is frozen at the tech level used when it was built. */
export interface MiningDrone {
  id: string
  /** Blueprint tier at fabrication (informational; power is authoritative). */
  techLevel: number
  /** Mining throughput contributed by this drone (kg/s). */
  powerKgPerS: number
}

export interface GameState {
  /** Stockpiled resources by id (kg). */
  resources: Record<string, number>
  /** Continuous mining throughput (kg/s) — sum of drone powers. */
  miningRateKgPerS: number
  /** Active mining drones. */
  drones: MiningDrone[]
  /** Blueprint level for newly built drones (not applied retroactively). */
  droneTechLevel: number
  /** Monotonic serial for drone ids. */
  droneSerial: number
  /** True while machinery is fabricating a drone. */
  droneBuildActive: boolean
  /** Seconds accumulated toward the current drone build. */
  droneBuildProgressSeconds: number
  /** Tech level locked when the current build started. */
  droneBuildTechLevel: number
  /** Desired fleet size when auto-build is enabled. */
  droneTargetCount: number
  /** Automatically start fab when fleet is below droneTargetCount. */
  droneAutoBuild: boolean
  /** Machinery speed level — shortens drone fab time. */
  droneFabLevel: number
  /** Shielding / safety level — lowers explosion rate. */
  droneSafetyLevel: number
  /** Survey / prospecting instruments. */
  searchLevel: number
  /**
   * Prefer asteroids containing this resource when eligible.
   * Null = unconstrained survey.
   */
  searchTargetResourceId: string | null
  /** Max asteroids held in the find queue. */
  queueCapacity: number
  /** Discovered asteroids waiting / being mined. */
  asteroidQueue: Asteroid[]
  /** Which queue asteroid is currently mined; always queue[0] when present. */
  activeAsteroidId: string | null
  /** Seconds accumulated toward the next auto-search completion. */
  searchProgressSeconds: number
  /** Prospecting counter for naming. */
  prospectIndex: number
  /** Seeded RNG state for searches and drone hazards. */
  rngSeed: number
  /** Total simulated seconds since this run started. */
  gameTimeSeconds: number
  /** Event log (newest first). */
  gameLog: GameLogEntry[]
  /** Monotonic id for log entries. */
  logSerial: number
}

export type GameLogKind = 'info' | 'success' | 'warn' | 'danger'

export interface GameLogEntry {
  id: number
  /** Game time (s) when the event occurred. */
  atSeconds: number
  kind: GameLogKind
  message: string
}

export interface CostLine {
  resourceId: string
  amountKg: number
}

export interface DroneBuildPreview {
  costs: CostLine[]
  durationSeconds: number
  nextPowerKgPerS: number
  affordable: boolean
  busy: boolean
}

export interface DroneTechUpgradePreview {
  level: number
  costs: CostLine[]
  nextDronePowerKgPerS: number
  affordable: boolean
}

export interface DroneFabUpgradePreview {
  level: number
  costs: CostLine[]
  nextBuildSeconds: number
  affordable: boolean
}

export interface DroneSafetyUpgradePreview {
  level: number
  costs: CostLine[]
  /** Expected seconds between explosions per drone on rock (H≈1). */
  nextMttfRockSeconds: number
  affordable: boolean
}

export interface SearchUpgradePreview {
  level: number
  costs: CostLine[]
  nextSearchSeconds: number
  affordable: boolean
}

export interface QueueUpgradePreview {
  capacity: number
  costs: CostLine[]
  nextCapacity: number
  affordable: boolean
}
