import type { Tile, Meld, Puzzle, Solution, WindValue } from './types'
import { m, p, s, wind, dragon, E, S, W, N, Haku, Hatsu, Chun, sortTiles, tileEquals } from './tiles'
import { scoreSelection } from './scorer'

// ── Mulberry32 PRNG ──────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let st = seed
  return () => {
    st |= 0; st = st + 0x6D2B79F5 | 0
    let t = Math.imul(st ^ st >>> 15, 1 | st)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function pickWeighted<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Tile pool (full set of tiles) ────────────────────────────────────────────
function fullTileSet(): Tile[] {
  const tiles: Tile[] = []
  for (const suit of ['man', 'pin', 'sou'] as const) {
    for (let v = 1; v <= 9; v++) {
      for (let i = 0; i < 4; i++) tiles.push({ suit, value: v as any })
    }
  }
  for (const v of ['E', 'S', 'W', 'N'] as WindValue[]) {
    for (let i = 0; i < 4; i++) tiles.push({ suit: 'wind', value: v })
  }
  for (const v of ['W', 'G', 'R'] as const) {
    for (let i = 0; i < 4; i++) tiles.push({ suit: 'dragon', value: v })
  }
  return tiles
}

// ── Hand templates ────────────────────────────────────────────────────────────
type HandTemplate = {
  name: string
  closed: boolean
  build: (rng: () => number, ctx: { seatWind: WindValue; roundWind: WindValue }) => Tile[] | null
}

const TEMPLATES: HandTemplate[] = [
  {
    name: 'tanyao',
    closed: false,
    build: (rng) => {
      const suits = ['man', 'pin', 'sou'] as const
      const tiles: Tile[] = []
      // 4 sequences of simples + pair of simples
      for (let i = 0; i < 4; i++) {
        const suit = suits[Math.floor(rng() * 3)]
        const start = 2 + Math.floor(rng() * 6) // 2–7
        tiles.push({ suit, value: start as any }, { suit, value: (start + 1) as any }, { suit, value: (start + 2) as any })
      }
      const pairSuit = suits[Math.floor(rng() * 3)]
      const pairVal = 2 + Math.floor(rng() * 7) as any // 2–8
      tiles.push({ suit: pairSuit, value: pairVal }, { suit: pairSuit, value: pairVal })
      return tiles
    }
  },
  {
    name: 'yakuhai',
    closed: false,
    build: (rng, ctx) => {
      const valueTiles = [
        wind(ctx.seatWind), wind(ctx.roundWind),
        Haku, Hatsu, Chun,
      ]
      const vt = valueTiles[Math.floor(rng() * valueTiles.length)]
      const tiles: Tile[] = [vt, vt, vt]
      const suits = ['man', 'pin', 'sou'] as const
      for (let i = 0; i < 3; i++) {
        const suit = suits[Math.floor(rng() * 3)]
        const start = 1 + Math.floor(rng() * 7) as any
        tiles.push({ suit, value: start }, { suit, value: (start + 1) as any }, { suit, value: (start + 2) as any })
      }
      const pairSuit = suits[Math.floor(rng() * 3)]
      const pairVal = 1 + Math.floor(rng() * 9) as any
      tiles.push({ suit: pairSuit, value: pairVal }, { suit: pairSuit, value: pairVal })
      return tiles
    }
  },
  {
    name: 'chinitsu',
    closed: true,
    build: (rng) => {
      const suits = ['man', 'pin', 'sou'] as const
      const suit = suits[Math.floor(rng() * 3)]
      const tiles: Tile[] = []
      for (let i = 0; i < 4; i++) {
        const start = 1 + Math.floor(rng() * 7) as any
        tiles.push({ suit, value: start }, { suit, value: (start + 1) as any }, { suit, value: (start + 2) as any })
      }
      const pairVal = 1 + Math.floor(rng() * 9) as any
      tiles.push({ suit, value: pairVal }, { suit, value: pairVal })
      return tiles
    }
  },
  {
    name: 'honitsu',
    closed: false,
    build: (rng, ctx) => {
      const suits = ['man', 'pin', 'sou'] as const
      const suit = suits[Math.floor(rng() * 3)]
      const honors = [wind(ctx.seatWind), wind(ctx.roundWind), Haku, Hatsu, Chun]
      const tiles: Tile[] = []
      for (let i = 0; i < 3; i++) {
        const start = 1 + Math.floor(rng() * 7) as any
        tiles.push({ suit, value: start }, { suit, value: (start + 1) as any }, { suit, value: (start + 2) as any })
      }
      const honor = honors[Math.floor(rng() * honors.length)]
      tiles.push(honor, honor, honor)
      const pairVal = 1 + Math.floor(rng() * 9) as any
      tiles.push({ suit, value: pairVal }, { suit, value: pairVal })
      return tiles
    }
  },
]

// ── Main generator ────────────────────────────────────────────────────────────
export function generatePuzzle(seed: number, maxRetries = 20): Puzzle {
  const hardCap = maxRetries * 5
  for (let attempt = 0; attempt < hardCap; attempt++) {
    const rng = mulberry32(seed + attempt * 1000)
    const puzzle = tryGenerate(rng)
    if (puzzle) return puzzle
  }
  throw new Error(`generatePuzzle: failed after ${hardCap} attempts (seed=${seed})`)
}

function tryGenerate(rng: () => number): Puzzle | null {
  const roundWind = pickWeighted(rng, ['E', 'S', 'W', 'N'] as WindValue[], [60, 25, 10, 5])
  const winds: WindValue[] = ['E', 'S', 'W', 'N']
  const seatWind = winds[Math.floor(rng() * 4)]
  const ctx = { seatWind, roundWind }

  // Pick two different templates
  const shuffledTemplates = shuffle(TEMPLATES, rng)
  const templateA = shuffledTemplates[0]
  const templateB = shuffledTemplates[1]

  const tilesA = templateA.build(rng, ctx)
  const tilesB = templateB.build(rng, ctx)
  if (!tilesA || !tilesB) return null

  // Decide open melds (0–2); only from non-closed templates
  const lockedMelds: Meld[] = []
  const openCount = rng() < 0.4 ? (rng() < 0.5 ? 1 : 2) : 0
  if (openCount > 0 && !templateA.closed) {
    lockedMelds.push({ type: 'sequence', tiles: tilesA.slice(0, 3), open: true })
  }
  if (openCount > 1 && !templateB.closed) {
    lockedMelds.push({ type: 'sequence', tiles: tilesB.slice(0, 3), open: true })
  }

  // Merge tiles — both hands, deduplicating beyond 4 copies
  const combined: Tile[] = []
  for (const tile of [...tilesA, ...tilesB]) {
    const count = combined.filter(t => tileEquals(t, tile)).length
    if (count < 4) combined.push(tile)
  }

  // Pad to 24 with noise tiles
  const pool = fullTileSet()
  const shuffledPool = shuffle(pool, rng)
  for (const tile of shuffledPool) {
    if (combined.length >= 24) break
    const count = combined.filter(t => tileEquals(t, tile)).length
    if (count < 4) combined.push(tile)
  }

  const allTiles = shuffle(combined.slice(0, 24), rng)

  // Draw dora indicators
  const doraCount = rng() < 0.8 ? 1 : 2
  const doraPool = shuffle(allTiles, rng)
  const doraIndicators = doraPool.slice(0, doraCount)

  // Find all valid solutions using multiple strategies
  const solutions = findAllSolutions(allTiles, tilesA, tilesB, lockedMelds, doraIndicators, ctx)
  if (solutions.length < 2) return null

  return {
    tiles: allTiles,
    lockedMelds,
    doraIndicators,
    seatWind,
    roundWind,
    solutions: solutions.sort((a, b) => b.points - a.points),
  }
}

function findAllSolutions(
  tiles: Tile[],
  tilesA: Tile[],
  tilesB: Tile[],
  lockedMelds: Meld[],
  doraIndicators: Tile[],
  ctx: { seatWind: WindValue; roundWind: WindValue }
): Solution[] {
  const solutions: Solution[] = []

  const addSolution = (candidate: Tile[]) => {
    if (candidate.length !== 14) return
    const sol = scoreSelection(candidate, lockedMelds, doraIndicators, ctx)
    if (!sol) return
    // Deduplicate by tile set (sorted) + points
    const key = JSON.stringify(sortTiles(candidate)) + ':' + sol.points
    if (!seen.has(key)) {
      seen.add(key)
      solutions.push(sol)
    }
  }

  const seen = new Set<string>()

  // Strategy 1: try the intended hands directly
  if (tilesA.length === 14) addSolution(tilesA)
  if (tilesB.length === 14) addSolution(tilesB)

  // Strategy 2: scan contiguous 14-tile windows
  for (let i = 0; i <= tiles.length - 14; i++) {
    addSolution(tiles.slice(i, i + 14))
  }

  // Strategy 3: try all combinations of 14 tiles from the pool
  // This is C(24,14) ≈ 1,307,504 — too large for brute force.
  // Instead, sample random subsets to increase coverage.
  // Use a deterministic approach: try subsets anchored on each tile
  for (let anchor = 0; anchor < tiles.length; anchor++) {
    // Build candidate: the anchor tile + next 13 tiles (wrapping)
    const candidate: Tile[] = []
    for (let j = 0; j < 14; j++) {
      candidate.push(tiles[(anchor + j) % tiles.length])
    }
    addSolution(candidate)
  }

  return solutions
}
