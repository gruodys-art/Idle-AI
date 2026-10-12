/** Mulberry32 — tiny seeded PRNG for reproducible rolls. */
export function createRng(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function pickWeighted<T>(
  rng: () => number,
  items: ReadonlyArray<T>,
  weightOf: (item: T) => number,
): T {
  let total = 0
  for (const item of items) {
    total += Math.max(0, weightOf(item))
  }
  if (total <= 0) {
    return items[Math.floor(rng() * items.length)]!
  }
  let roll = rng() * total
  for (const item of items) {
    roll -= Math.max(0, weightOf(item))
    if (roll <= 0) {
      return item
    }
  }
  return items[items.length - 1]!
}
