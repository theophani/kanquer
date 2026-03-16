import type { Tile, Meld, Hand, WindValue } from './types'
import { tileEquals, sortTiles } from './tiles'

type Ctx = { seatWind: WindValue; roundWind: WindValue }

export function parseHand(tiles: Tile[], lockedMelds: Meld[], ctx: Ctx): Hand | null {
  if (lockedMelds.length === 0) {
    return tryKokushi(tiles, ctx) ?? tryChiitoitsu(tiles, ctx) ?? tryStandard(tiles, [], ctx)
  }
  return tryStandard(tiles, lockedMelds, ctx)
}

export function getAllDecompositions(tiles: Tile[], lockedMelds: Meld[], ctx: Ctx): Hand[] {
  const results: Hand[] = []
  if (lockedMelds.length === 0) {
    const k = tryKokushi(tiles, ctx); if (k) results.push(k)
    const c = tryChiitoitsu(tiles, ctx); if (c) results.push(c)
  }
  const pool = removeLockedTiles(tiles, lockedMelds)
  if (pool === null) return results
  const meldsNeeded = 4 - lockedMelds.length
  for (const [pair, ...free] of findDecompositions(pool, meldsNeeded)) {
    results.push({ structure: 'standard', melds: [...lockedMelds, ...free, pair], ...ctx })
  }
  return results
}

// ── Kokushi ─────────────────────────────────────────────────────────────────
const KOKUSHI_REQUIRED: Tile[] = [
  {suit:'man',value:1},{suit:'man',value:9},
  {suit:'pin',value:1},{suit:'pin',value:9},
  {suit:'sou',value:1},{suit:'sou',value:9},
  {suit:'wind',value:'E'},{suit:'wind',value:'S'},{suit:'wind',value:'W'},{suit:'wind',value:'N'},
  {suit:'dragon',value:'W'},{suit:'dragon',value:'G'},{suit:'dragon',value:'R'},
]

function tryKokushi(tiles: Tile[], ctx: Ctx): Hand | null {
  if (tiles.length !== 14) return null
  const pool = [...tiles]
  for (const req of KOKUSHI_REQUIRED) {
    const i = pool.findIndex(t => tileEquals(t, req))
    if (i === -1) return null
    pool.splice(i, 1)
  }
  if (pool.length !== 1) return null
  if (!KOKUSHI_REQUIRED.some(k => tileEquals(k, pool[0]))) return null
  return { structure: 'kokushi', tiles, ...ctx }
}

// ── Chiitoitsu ───────────────────────────────────────────────────────────────
function tryChiitoitsu(tiles: Tile[], ctx: Ctx): Hand | null {
  if (tiles.length !== 14) return null
  const sorted = sortTiles(tiles)
  const pairs: Tile[][] = []
  let i = 0
  while (i < sorted.length) {
    if (i + 1 < sorted.length && tileEquals(sorted[i], sorted[i + 1])) {
      if (i + 2 < sorted.length && tileEquals(sorted[i], sorted[i + 2])) return null // quad → invalid
      pairs.push([sorted[i], sorted[i + 1]])
      i += 2
    } else {
      return null
    }
  }
  return pairs.length === 7 ? { structure: 'chiitoitsu', pairs, ...ctx } : null
}

// ── Standard ────────────────────────────────────────────────────────────────
function tryStandard(tiles: Tile[], lockedMelds: Meld[], ctx: Ctx): Hand | null {
  const pool = removeLockedTiles(tiles, lockedMelds)
  if (pool === null) return null
  const meldsNeeded = 4 - lockedMelds.length
  const decomps = findDecompositions(pool, meldsNeeded)
  if (decomps.length === 0) return null
  const [pair, ...free] = decomps[0]
  return { structure: 'standard', melds: [...lockedMelds, ...free, pair], ...ctx }
}

function removeLockedTiles(tiles: Tile[], lockedMelds: Meld[]): Tile[] | null {
  const pool = [...tiles]
  for (const meld of lockedMelds) {
    for (const tile of meld.tiles) {
      const i = pool.findIndex(t => tileEquals(t, tile))
      if (i === -1) return null
      pool.splice(i, 1)
    }
  }
  return pool
}

// Returns arrays of [pair, meld1, meld2, ...]
function findDecompositions(tiles: Tile[], meldsNeeded: number): Meld[][] {
  const sorted = sortTiles(tiles)
  const results: Meld[][] = []
  const seen = new Set<string>()
  for (let i = 0; i < sorted.length - 1; i++) {
    if (!tileEquals(sorted[i], sorted[i + 1])) continue
    const key = JSON.stringify(sorted[i])
    if (seen.has(key)) continue
    seen.add(key)
    const remaining = [...sorted.slice(0, i), ...sorted.slice(i + 2)]
    for (const melds of findMelds(remaining, meldsNeeded)) {
      results.push([{ type: 'pair', tiles: [sorted[i], sorted[i + 1]], open: false }, ...melds])
    }
  }
  return results
}

function findMelds(tiles: Tile[], count: number): Meld[][] {
  if (count === 0) return tiles.length === 0 ? [[]] : []
  if (tiles.length < 3) return []
  const sorted = sortTiles(tiles)
  const first = sorted[0]
  const results: Meld[][] = []

  // Triplet
  if (tileEquals(sorted[1], first) && tileEquals(sorted[2], first)) {
    for (const r of findMelds(sorted.slice(3), count - 1)) {
      results.push([{ type: 'triplet', tiles: [first, first, first], open: false }, ...r])
    }
  }

  // Sequence (numbered suits only)
  if (first.suit === 'man' || first.suit === 'pin' || first.suit === 'sou') {
    const v = first.value as number
    if (v <= 7) {
      const midIdx = sorted.findIndex((t, i) => i > 0 && t.suit === first.suit && t.value === v + 1)
      const highIdx = sorted.findIndex((t, i) => i > 0 && i !== midIdx && t.suit === first.suit && t.value === v + 2)
      if (midIdx !== -1 && highIdx !== -1) {
        const remaining = sorted.filter((_, i) => i !== 0 && i !== midIdx && i !== highIdx)
        for (const r of findMelds(remaining, count - 1)) {
          results.push([{ type: 'sequence', tiles: [first, sorted[midIdx], sorted[highIdx]], open: false }, ...r])
        }
      }
    }
  }

  return results
}
