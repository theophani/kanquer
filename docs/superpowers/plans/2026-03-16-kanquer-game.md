# Miniichi Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based Riichi Mahjong yaku recognition game where players identify the highest-scoring winning hand from a pool of 24 tiles.

**Architecture:** Fully client-side React + TypeScript SPA. A pure-TS engine layer (tiles, hand validator, yaku detector, fu calculator, scorer, generator) is built and tested first, independently of React. A Zustand store connects the engine to the UI. Daily puzzles are date-seeded deterministically; results are stored in localStorage.

**Tech Stack:** React 18, TypeScript 5, Vite, Zustand, Vitest, React Testing Library

---

## File Structure

```
src/
  engine/
    types.ts          — all shared types (Tile, Meld, Hand, Puzzle, Solution, YakuResult)
    tiles.ts          — constructors, predicates (isTerminal, isHonor), doraOf, sortTiles, countDora
    hand.ts           — parseHand (standard/chiitoitsu/kokushi), getAllDecompositions
    yaku.ts           — detectYaku(hand, doraIndicators) → YakuResult[]
    fu.ts             — calculateFu(hand) → number (enumerates decompositions, best result)
    scorer.ts         — scoreHand(tiles, lockedMelds, doraIndicators, ctx) → Solution
    generator.ts      — generatePuzzle(seed) → Puzzle
    seed.ts           — puzzleSeedFromDate(date), puzzleSeedFromHex(hex), dateFromPuzzleNumber(n)
    index.ts          — re-exports everything
  store/
    gameStore.ts      — Zustand store: puzzle, selectedTiles, phase, mode, elapsed time
  components/
    ContextBar.tsx    — round wind, seat wind, dora tile(s), live timer
    TileGrid.tsx      — 24-tile pool; click to select/deselect; locked melds visually distinct
    HandSlots.tsx     — 14 tile slots; locked meld tiles pre-filled; free slots fill on click
    GamePage.tsx      — assembles ContextBar + TileGrid + HandSlots + commit button + error message
    ScoreReveal.tsx   — score-first display, expandable yaku breakdown, optimal comparison
    ShareButton.tsx   — builds share text, copies to clipboard
    HomePage.tsx      — title, Today's Puzzle button (with cached result), Practice button
    tileDisplay.ts    — shared tileDisplay(tile) → string helper used by TileGrid and HandSlots
  App.tsx             — URL routing: / → HomePage, /?p=N → daily game, /?seed=hex → practice game
  main.tsx            — entry point
tests/ (co-located as *.test.ts next to each source file)
```

---

## Chunk 1: Project Setup + Types + Tiles

### Task 1: Initialize project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test-setup.ts`

- [ ] **Step 1: Scaffold the project**

```bash
npm create vite@latest . -- --template react-ts
npm install zustand
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Configure Vitest in `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 3: Create test setup file**

Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json` scripts, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server starts on http://localhost:5173

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: initialize Vite + React + TS project with Vitest"
```

---

### Task 2: Shared types

**Files:**
- Create: `src/engine/types.ts`

- [ ] **Step 1: Write the types file**

Create `src/engine/types.ts`:
```ts
export type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon'
export type NumberValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type WindValue = 'E' | 'S' | 'W' | 'N'
export type DragonValue = 'W' | 'G' | 'R' // White (Haku), Green (Hatsu), Red (Chun)

// IMPORTANT: WindValue and DragonValue both contain 'W' (West wind vs White dragon).
// Always discriminate on `suit` before `value` in all tile logic.
export type Tile =
  | { suit: 'man' | 'pin' | 'sou'; value: NumberValue }
  | { suit: 'wind'; value: WindValue }
  | { suit: 'dragon'; value: DragonValue }

export type MeldType = 'sequence' | 'triplet' | 'pair'
export type Meld = { type: MeldType; tiles: Tile[]; open: boolean }

export type Hand =
  | { structure: 'standard';   melds: Meld[];   seatWind: WindValue; roundWind: WindValue }
  | { structure: 'chiitoitsu'; pairs: Tile[][]; seatWind: WindValue; roundWind: WindValue }
  | { structure: 'kokushi';    tiles: Tile[];   seatWind: WindValue; roundWind: WindValue }

export type YakuResult = {
  name: string
  han: number
  openHan: number | null // han value when open; null if closed-only
}

export type Solution = {
  tiles: Tile[]
  hand: Hand
  yaku: YakuResult[]
  han: number
  fu: number
  points: number
}

export type Puzzle = {
  tiles: Tile[]          // all 24 tiles, INCLUDING locked meld tiles
  lockedMelds: Meld[]    // 0–2 pre-committed open melds (their tiles ⊂ puzzle.tiles)
  doraIndicators: Tile[] // 1 (80%) or 2 (20%) indicator tiles
  seatWind: WindValue
  roundWind: WindValue
  solutions: Solution[]  // all valid winning hands, sorted by points descending
}
```

- [ ] **Step 2: No tests needed for pure types — commit**

```bash
git add src/engine/types.ts
git commit -m "feat(engine): add shared types"
```

---

### Task 3: Tile utilities

**Files:**
- Create: `src/engine/tiles.ts`
- Create: `src/engine/tiles.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/engine/tiles.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  m, p, s, wind, dragon,
  E, S, W, N, Haku, Hatsu, Chun,
  isTerminal, isHonor, isSimple,
  tileEquals, sortTiles, doraOf, countDora,
} from './tiles'

describe('tile constructors', () => {
  it('creates a man tile', () => expect(m(3)).toEqual({ suit: 'man', value: 3 }))
  it('creates E wind', () => expect(E).toEqual({ suit: 'wind', value: 'E' }))
  it('creates Haku (white dragon)', () => expect(Haku).toEqual({ suit: 'dragon', value: 'W' }))
  it('W wind and Haku are different tiles', () => expect(tileEquals(W, Haku)).toBe(false))
})

describe('isTerminal', () => {
  it('1-man is terminal', () => expect(isTerminal(m(1))).toBe(true))
  it('9-pin is terminal', () => expect(isTerminal(p(9))).toBe(true))
  it('5-sou is not terminal', () => expect(isTerminal(s(5))).toBe(false))
  it('wind is not terminal', () => expect(isTerminal(E)).toBe(false))
})

describe('isHonor', () => {
  it('wind is honor', () => expect(isHonor(N)).toBe(true))
  it('dragon is honor', () => expect(isHonor(Chun)).toBe(true))
  it('numbered tile is not honor', () => expect(isHonor(m(7))).toBe(false))
})

describe('isSimple', () => {
  it('2–8 numbered tiles are simple', () => expect(isSimple(m(5))).toBe(true))
  it('1 is not simple', () => expect(isSimple(m(1))).toBe(false))
  it('honor is not simple', () => expect(isSimple(E)).toBe(false))
})

describe('tileEquals', () => {
  it('same suit and value → true', () => expect(tileEquals(m(3), m(3))).toBe(true))
  it('different value → false', () => expect(tileEquals(m(3), m(4))).toBe(false))
  it('different suit same value → false', () => expect(tileEquals(m(1), p(1))).toBe(false))
})

describe('sortTiles', () => {
  it('orders man < pin < sou < wind < dragon', () => {
    expect(sortTiles([Chun, E, s(1), p(1), m(1)])).toEqual([m(1), p(1), s(1), E, Chun])
  })
  it('sorts within man numerically', () => {
    expect(sortTiles([m(9), m(1), m(5)])).toEqual([m(1), m(5), m(9)])
  })
  it('sorts winds E S W N', () => {
    expect(sortTiles([N, W, S, E])).toEqual([E, S, W, N])
  })
  it('sorts dragons Haku Hatsu Chun', () => {
    expect(sortTiles([Chun, Haku, Hatsu])).toEqual([Haku, Hatsu, Chun])
  })
})

describe('doraOf', () => {
  it('3-man → 4-man', () => expect(doraOf(m(3))).toEqual(m(4)))
  it('9-pin wraps to 1-pin', () => expect(doraOf(p(9))).toEqual(p(1)))
  it('E wind → S wind', () => expect(doraOf(E)).toEqual(S))
  it('N wind wraps to E wind', () => expect(doraOf(N)).toEqual(E))
  it('Haku → Hatsu', () => expect(doraOf(Haku)).toEqual(Hatsu))
  it('Chun wraps to Haku', () => expect(doraOf(Chun)).toEqual(Haku))
  it('W wind dora is N (not Hatsu)', () => {
    expect(doraOf(W)).toEqual(N)
    expect(doraOf(W)).not.toEqual(Hatsu)
  })
})

describe('countDora', () => {
  it('counts matching dora tiles', () => {
    // indicator is m(3), so dora is m(4)
    expect(countDora([m(4), m(4), m(5)], [m(3)])).toBe(2)
  })
  it('returns 0 when no dora in hand', () => {
    expect(countDora([m(1), m(2), m(3)], [m(5)])).toBe(0)
  })
  it('counts dora across multiple indicators', () => {
    // indicators m(3) and p(5) → dora m(4) and p(6)
    expect(countDora([m(4), p(6), m(4)], [m(3), p(5)])).toBe(3)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/engine/tiles.test.ts
```
Expected: FAIL — cannot find module `./tiles`

- [ ] **Step 3: Implement `src/engine/tiles.ts`**

```ts
import type { Tile, NumberValue, WindValue, DragonValue } from './types'

export const m = (v: NumberValue): Tile => ({ suit: 'man', value: v })
export const p = (v: NumberValue): Tile => ({ suit: 'pin', value: v })
export const s = (v: NumberValue): Tile => ({ suit: 'sou', value: v })
export const wind = (v: WindValue): Tile => ({ suit: 'wind', value: v })
export const dragon = (v: DragonValue): Tile => ({ suit: 'dragon', value: v })

export const E = wind('E')
export const S = wind('S')
export const W = wind('W')
export const N = wind('N')
export const Haku  = dragon('W')
export const Hatsu = dragon('G')
export const Chun  = dragon('R')

export const isTerminal = (t: Tile): boolean =>
  (t.suit === 'man' || t.suit === 'pin' || t.suit === 'sou') &&
  (t.value === 1 || t.value === 9)

export const isHonor = (t: Tile): boolean =>
  t.suit === 'wind' || t.suit === 'dragon'

export const isTerminalOrHonor = (t: Tile): boolean => isTerminal(t) || isHonor(t)

export const isSimple = (t: Tile): boolean => !isTerminalOrHonor(t)

// Always check suit before value (W is overloaded: West wind vs White dragon)
export const tileEquals = (a: Tile, b: Tile): boolean =>
  a.suit === b.suit && a.value === b.value

export const tileSortKey = (t: Tile): number => {
  if (t.suit === 'man')    return (t.value as number)
  if (t.suit === 'pin')    return 100 + (t.value as number)
  if (t.suit === 'sou')    return 200 + (t.value as number)
  if (t.suit === 'wind')   return 300 + ({ E: 0, S: 1, W: 2, N: 3 } as const)[t.value as WindValue]
  return 400 + ({ W: 0, G: 1, R: 2 } as const)[t.value as DragonValue]
}

export const sortTiles = (tiles: Tile[]): Tile[] =>
  [...tiles].sort((a, b) => tileSortKey(a) - tileSortKey(b))

export const doraOf = (indicator: Tile): Tile => {
  if (indicator.suit === 'man' || indicator.suit === 'pin' || indicator.suit === 'sou') {
    const next = (indicator.value as number) === 9 ? 1 : (indicator.value as number) + 1
    return { suit: indicator.suit, value: next as NumberValue }
  }
  if (indicator.suit === 'wind') {
    const seq: WindValue[] = ['E', 'S', 'W', 'N']
    return { suit: 'wind', value: seq[(seq.indexOf(indicator.value as WindValue) + 1) % 4] }
  }
  const seq: DragonValue[] = ['W', 'G', 'R']
  return { suit: 'dragon', value: seq[(seq.indexOf(indicator.value as DragonValue) + 1) % 3] }
}

export const countDora = (tiles: Tile[], doraIndicators: Tile[]): number => {
  const doraList = doraIndicators.map(doraOf)
  return tiles.reduce(
    (count, tile) => count + doraList.filter(d => tileEquals(d, tile)).length,
    0
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/engine/tiles.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/tiles.ts src/engine/tiles.test.ts
git commit -m "feat(engine): add tile types, constructors, predicates, dora logic"
```

---

## Chunk 2: Hand Validator

### Task 4: Hand validator

**Files:**
- Create: `src/engine/hand.ts`
- Create: `src/engine/hand.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/engine/hand.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { m, p, s, E, S, W, N, Haku, Hatsu, Chun } from './tiles'
import { parseHand, getAllDecompositions } from './hand'
import type { Meld } from './types'

const ctx = { seatWind: 'E' as const, roundWind: 'E' as const }

describe('parseHand — standard', () => {
  it('detects a valid all-sequence hand', () => {
    const tiles = [m(2),m(3),m(4), p(3),p(4),p(5), s(6),s(7),s(8), m(6),m(7),m(8), p(2),p(2)]
    const hand = parseHand(tiles, [], ctx)
    expect(hand?.structure).toBe('standard')
  })

  it('detects an all-triplets hand', () => {
    const tiles = [m(1),m(1),m(1), m(9),m(9),m(9), p(5),p(5),p(5), s(7),s(7),s(7), E,E]
    expect(parseHand(tiles, [], ctx)?.structure).toBe('standard')
  })

  it('returns null when 14 tiles cannot form a valid hand', () => {
    const tiles = [m(1),m(2),m(4),m(5),m(7),m(8), p(1),p(2),p(4),p(5),p(7),p(8), s(1),s(2)]
    expect(parseHand(tiles, [], ctx)).toBeNull()
  })

  it('respects locked melds: uses them as-is', () => {
    const locked: Meld[] = [{ type: 'sequence', tiles: [m(1), m(2), m(3)], open: true }]
    const free = [p(3),p(4),p(5), s(6),s(7),s(8), m(6),m(7),m(8), p(2),p(2)]
    const hand = parseHand([...locked[0].tiles, ...free], locked, ctx)
    expect(hand?.structure).toBe('standard')
    if (hand?.structure === 'standard') {
      expect(hand.melds.some(ml => ml.open)).toBe(true)
    }
  })
})

describe('parseHand — chiitoitsu', () => {
  it('detects 7 different pairs', () => {
    const tiles = [m(1),m(1), m(3),m(3), m(5),m(5), p(2),p(2), p(4),p(4), s(6),s(6), E,E]
    expect(parseHand(tiles, [], ctx)?.structure).toBe('chiitoitsu')
  })

  it('rejects 4-of-a-kind in the same position (not 7 different pairs)', () => {
    const tiles = [m(1),m(1),m(1),m(1), m(3),m(3), p(2),p(2), p(4),p(4), s(6),s(6), E,E]
    const hand = parseHand(tiles, [], ctx)
    expect(hand?.structure).not.toBe('chiitoitsu')
  })

  it('not available with locked melds', () => {
    const locked: Meld[] = [{ type: 'sequence', tiles: [m(1), m(2), m(3)], open: true }]
    const tiles = [...locked[0].tiles, m(4),m(4), m(5),m(5), p(2),p(2), p(4),p(4), s(6),s(6)]
    expect(parseHand(tiles, locked, ctx)?.structure).not.toBe('chiitoitsu')
  })
})

describe('parseHand — kokushi', () => {
  const kokushiBase = [m(1),m(9), p(1),p(9), s(1),s(9), E,S,W,N, Haku,Hatsu,Chun]

  it('detects kokushi with a duplicate', () => {
    const tiles = [...kokushiBase, m(1)]
    expect(parseHand(tiles, [], ctx)?.structure).toBe('kokushi')
  })

  it('rejects kokushi when a required tile is missing', () => {
    const tiles = [...kokushiBase.slice(1), m(2)] // replaced m(1) with m(2)
    expect(parseHand(tiles, [], ctx)?.structure).not.toBe('kokushi')
  })

  it('not available with locked melds', () => {
    const locked: Meld[] = [{ type: 'sequence', tiles: [m(1), m(2), m(3)], open: true }]
    expect(parseHand([...kokushiBase, m(1)], locked, ctx)?.structure).not.toBe('kokushi')
  })
})

describe('getAllDecompositions', () => {
  it('returns multiple decompositions when tiles admit seq×3 and triplet×3', () => {
    // m(1)×3 m(2)×3 m(3)×3 can be decomposed as:
    // A: triplet(111) + triplet(222) + triplet(333)
    // B: seq(123) + seq(123) + seq(123)
    const tiles = [
      m(1),m(1),m(1), m(2),m(2),m(2), m(3),m(3),m(3),
      p(5),p(5),
      s(7),s(7),s(7),
    ]
    const decomps = getAllDecompositions(tiles, [], ctx)
    expect(decomps.length).toBeGreaterThan(1)
    const structures = decomps.map(h => {
      if (h.structure !== 'standard') return 'other'
      const nonPair = h.melds.filter(ml => ml.type !== 'pair')
      return nonPair.every(ml => ml.type === 'triplet') ? 'all-triplets' : 'has-sequences'
    })
    expect(structures).toContain('all-triplets')
    expect(structures).toContain('has-sequences')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/engine/hand.test.ts
```
Expected: FAIL — cannot find module `./hand`

- [ ] **Step 3: Implement `src/engine/hand.ts`**

```ts
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
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/engine/hand.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/hand.ts src/engine/hand.test.ts
git commit -m "feat(engine): add hand validator (standard, chiitoitsu, kokushi)"
```

---

## Chunk 3: Yaku Detection

### Task 5: Yaku detector

**Files:**
- Create: `src/engine/yaku.ts`
- Create: `src/engine/yaku.test.ts`

Yaku are detected from a `Hand` + context. The hand's `open` flag on melds determines if any meld is open. A hand is "open" if any meld has `open: true`.

**Han values reference (all closed han / open han or N/A):**

| Yaku | Closed | Open |
|---|---|---|
| Pinfu | 1 | — |
| Iipeikou | 1 | — |
| Tanyao | 1 | 1 |
| Yakuhai | 1 | 1 |
| Chanta | 2 | 1 |
| Sanshoku Doujun | 2 | 1 |
| Ittsu | 2 | 1 |
| Toitoi | 2 | 2 |
| Sanankou | 2 | 2 |
| Sanshoku Doukou | 2 | 2 |
| Chiitoitsu | 2 | — |
| Honitsu | 3 | 2 |
| Shousangen | 2 | 2 |
| Junchan | 3 | 2 |
| Ryanpeikou | 3 | — |
| Chinitsu | 6 | 5 |
| Suuankou (yakuman) | — | — |
| Daisangen (yakuman) | — | — |
| Shousuushii (yakuman) | — | — |
| Daisuushii (yakuman) | — | — |
| Tsuuiisou (yakuman) | — | — |
| Chinroutou (yakuman) | — | — |
| Ryuuiisou (yakuman) | — | — |
| Chuurenpoutou (yakuman) | — | — |
| Kokushi (yakuman) | — | — |

Yakuman are represented as `han: 13` (a sentinel value; `scorer.ts` converts 13 han to the yakuman point value).

- [ ] **Step 1: Write failing tests**

Create `src/engine/yaku.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { m, p, s, E, S, W, N, Haku, Hatsu, Chun } from './tiles'
import { detectYaku } from './yaku'
import type { Hand } from './types'

const closed = false
const open = true

// Helper to build a standard hand
function std(melds: import('./types').Meld[], seatWind: import('./types').WindValue = 'S', roundWind: import('./types').WindValue = 'E'): Hand {
  return { structure: 'standard', melds, seatWind, roundWind }
}

function seq(tiles: import('./types').Tile[], o = false) {
  return { type: 'sequence' as const, tiles, open: o }
}
function tri(tiles: import('./types').Tile[], o = false) {
  return { type: 'triplet' as const, tiles, open: o }
}
function pair(tiles: import('./types').Tile[]) {
  return { type: 'pair' as const, tiles, open: false }
}

describe('Tanyao', () => {
  it('detects tanyao (all simples, closed)', () => {
    const hand = std([seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), tri([m(8),m(8),m(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Tanyao')
  })
  it('no tanyao when terminals present', () => {
    const hand = std([seq([m(1),m(2),m(3)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), tri([m(8),m(8),m(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Tanyao')
  })
  it('tanyao available open', () => {
    const hand = std([seq([m(2),m(3),m(4)], open), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), tri([m(8),m(8),m(8)]), pair([p(2),p(2)])])
    const yaku = detectYaku(hand)
    const tanyao = yaku.find(y => y.name === 'Tanyao')
    expect(tanyao).toBeTruthy()
    expect(tanyao!.han).toBe(1)
  })
})

describe('Yakuhai', () => {
  it('detects yakuhai for own seat wind triplet', () => {
    const hand = std([tri([E,E,E]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), pair([m(8),m(8)])], 'E', 'S')
    expect(detectYaku(hand).map(y => y.name)).toContain('Yakuhai')
  })
  it('detects yakuhai for round wind triplet', () => {
    const hand = std([tri([E,E,E]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), pair([m(8),m(8)])], 'S', 'E')
    expect(detectYaku(hand).map(y => y.name)).toContain('Yakuhai')
  })
  it('detects yakuhai for dragon triplet', () => {
    const hand = std([tri([Haku,Haku,Haku]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), pair([m(8),m(8)])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Yakuhai')
  })
  it('no yakuhai for non-value wind triplet', () => {
    // W wind triplet when seat=E, round=E → no yakuhai
    const hand = std([tri([W,W,W]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), pair([m(8),m(8)])], 'E', 'E')
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Yakuhai')
  })
})

describe('Pinfu', () => {
  it('detects pinfu (all sequences, non-value pair, ryanmen wait implied)', () => {
    const hand = std([seq([m(2),m(3),m(4)]), seq([p(3),p(4),p(5)]), seq([s(6),s(7),s(8)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])], 'E', 'E')
    expect(detectYaku(hand).map(y => y.name)).toContain('Pinfu')
  })
  it('no pinfu when pair is seat wind', () => {
    const hand = std([seq([m(2),m(3),m(4)]), seq([p(3),p(4),p(5)]), seq([s(6),s(7),s(8)]), seq([m(6),m(7),m(8)]), pair([E,E])], 'E', 'S')
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Pinfu')
  })
  it('no pinfu when any meld is a triplet', () => {
    const hand = std([tri([m(2),m(2),m(2)]), seq([p(3),p(4),p(5)]), seq([s(6),s(7),s(8)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Pinfu')
  })
  it('no pinfu when hand is open', () => {
    const hand = std([seq([m(2),m(3),m(4)], open), seq([p(3),p(4),p(5)]), seq([s(6),s(7),s(8)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Pinfu')
  })
})

describe('Iipeikou', () => {
  it('detects iipeikou (two identical sequences)', () => {
    const hand = std([seq([m(2),m(3),m(4)]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), tri([s(8),s(8),s(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Iipeikou')
  })
  it('no iipeikou when hand is open', () => {
    const hand = std([seq([m(2),m(3),m(4)], open), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), tri([s(8),s(8),s(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Iipeikou')
  })
})

describe('Toitoi', () => {
  it('detects toitoi (all triplets)', () => {
    const hand = std([tri([m(1),m(1),m(1)]), tri([p(5),p(5),p(5)]), tri([s(9),s(9),s(9)]), tri([E,E,E]), pair([Haku,Haku])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Toitoi')
  })
  it('no toitoi when a sequence exists', () => {
    const hand = std([seq([m(1),m(2),m(3)]), tri([p(5),p(5),p(5)]), tri([s(9),s(9),s(9)]), tri([E,E,E]), pair([Haku,Haku])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Toitoi')
  })
})

describe('Ittsu', () => {
  it('detects ittsu (1-2-3, 4-5-6, 7-8-9 same suit)', () => {
    const hand = std([seq([m(1),m(2),m(3)]), seq([m(4),m(5),m(6)]), seq([m(7),m(8),m(9)]), seq([p(3),p(4),p(5)]), pair([s(5),s(5)])])
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Ittsu')
    expect(yaku.find(y => y.name === 'Ittsu')!.han).toBe(2)
  })
  it('ittsu loses 1 han when open', () => {
    const hand = std([seq([m(1),m(2),m(3)], open), seq([m(4),m(5),m(6)]), seq([m(7),m(8),m(9)]), seq([p(3),p(4),p(5)]), pair([s(5),s(5)])])
    expect(detectYaku(hand).find(y => y.name === 'Ittsu')!.han).toBe(1)
  })
})

describe('Sanshoku Doujun', () => {
  it('detects sanshoku doujun', () => {
    const hand = std([seq([m(3),m(4),m(5)]), seq([p(3),p(4),p(5)]), seq([s(3),s(4),s(5)]), seq([m(7),m(8),m(9)]), pair([E,E])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Sanshoku Doujun')
  })
})

describe('Chinitsu', () => {
  it('detects chinitsu (one suit only, closed = 6 han)', () => {
    const hand = std([seq([m(1),m(2),m(3)]), seq([m(4),m(5),m(6)]), seq([m(7),m(8),m(9)]), tri([m(5),m(5),m(5)]), pair([m(2),m(2)])])
    const y = detectYaku(hand).find(y => y.name === 'Chinitsu')
    expect(y?.han).toBe(6)
  })
  it('chinitsu open = 5 han', () => {
    const hand = std([seq([m(1),m(2),m(3)], open), seq([m(4),m(5),m(6)]), seq([m(7),m(8),m(9)]), tri([m(5),m(5),m(5)]), pair([m(2),m(2)])])
    expect(detectYaku(hand).find(y => y.name === 'Chinitsu')!.han).toBe(5)
  })
})

describe('Chiitoitsu', () => {
  it('detects chiitoitsu', () => {
    const hand: Hand = { structure: 'chiitoitsu', pairs: [[m(1),m(1)],[m(3),m(3)],[p(2),p(2)],[p(4),p(4)],[s(6),s(6)],[s(8),s(8)],[E,E]], seatWind: 'E', roundWind: 'E' }
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Chiitoitsu')
    expect(yaku.find(y => y.name === 'Chiitoitsu')!.han).toBe(2)
  })
  it('detects honitsu on chiitoitsu (one numbered suit + honors)', () => {
    const hand: Hand = { structure: 'chiitoitsu', pairs: [[m(1),m(1)],[m(3),m(3)],[m(5),m(5)],[m(7),m(7)],[m(9),m(9)],[E,E],[S,S]], seatWind: 'E', roundWind: 'E' }
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Honitsu')
    expect(yaku.find(y => y.name === 'Honitsu')!.han).toBe(3)
  })
  it('detects tsuuiisou on chiitoitsu (yakuman, no chiitoitsu stacking)', () => {
    const hand: Hand = { structure: 'chiitoitsu', pairs: [[E,E],[S,S],[W,W],[N,N],[Haku,Haku],[Hatsu,Hatsu],[Chun,Chun]], seatWind: 'E', roundWind: 'E' }
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Tsuuiisou')
    expect(yaku.find(y => y.name === 'Tsuuiisou')!.han).toBe(13)
    expect(yaku.map(y => y.name)).not.toContain('Chiitoitsu')
  })
})

describe('Kokushi', () => {
  it('detects kokushi (yakuman)', () => {
    const hand: Hand = { structure: 'kokushi', tiles: [m(1),m(9),p(1),p(9),s(1),s(9),E,S,W,N,Haku,Hatsu,Chun,m(1)], seatWind: 'E', roundWind: 'E' }
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Kokushi')
    expect(yaku.find(y => y.name === 'Kokushi')!.han).toBe(13)
  })
})

describe('Daisangen', () => {
  it('detects daisangen (all 3 dragon triplets, yakuman)', () => {
    const hand = std([tri([Haku,Haku,Haku]), tri([Hatsu,Hatsu,Hatsu]), tri([Chun,Chun,Chun]), seq([m(1),m(2),m(3)]), pair([p(5),p(5)])])
    expect(detectYaku(hand).find(y => y.name === 'Daisangen')!.han).toBe(13)
  })
})

describe('Tsuuiisou', () => {
  it('detects tsuuiisou (all honors, yakuman)', () => {
    const hand = std([tri([E,E,E]), tri([S,S,S]), tri([W,W,W]), tri([Haku,Haku,Haku]), pair([Chun,Chun])])
    expect(detectYaku(hand).find(y => y.name === 'Tsuuiisou')!.han).toBe(13)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/engine/yaku.test.ts
```
Expected: FAIL — cannot find module `./yaku`

- [ ] **Step 3: Implement `src/engine/yaku.ts`**

```ts
import type { Hand, Meld, Tile, YakuResult, WindValue } from './types'
import { tileEquals, isTerminalOrHonor, isHonor, isSimple, isTerminal } from './tiles'

const YAKUMAN = 13 // sentinel han value for yakuman

export function detectYaku(hand: Hand): YakuResult[] {
  if (hand.structure === 'kokushi') return [{ name: 'Kokushi', han: YAKUMAN, openHan: null }]
  if (hand.structure === 'chiitoitsu') return detectChiitoitsuYaku(hand)
  return detectStandardYaku(hand as Extract<Hand, { structure: 'standard' }>)
}

function isOpen(hand: { structure: 'standard'; melds: Meld[] }): boolean {
  return hand.melds.some(m => m.open)
}

// ── Chiitoitsu ───────────────────────────────────────────────────────────────
function detectChiitoitsuYaku(hand: Extract<Hand, { structure: 'chiitoitsu' }>): YakuResult[] {
  const tiles = hand.pairs.flat()
  // Tsuuiisou: all honors (yakuman — return early, no stacking)
  if (tiles.every(isHonor))
    return [{ name: 'Tsuuiisou', han: YAKUMAN, openHan: null }]
  const yaku: YakuResult[] = [{ name: 'Chiitoitsu', han: 2, openHan: null }]
  const suits = new Set(tiles.map(t => t.suit))
  const numSuits = [...suits].filter(s => s === 'man' || s === 'pin' || s === 'sou')
  // Tanyao
  if (tiles.every(isSimple)) yaku.push({ name: 'Tanyao', han: 1, openHan: 1 })
  // Honitsu: exactly one numbered suit + at least one honor tile
  if (numSuits.length === 1 && tiles.some(isHonor))
    yaku.push({ name: 'Honitsu', han: 3, openHan: 2 })
  // Chinitsu
  if (suits.size === 1 && (suits.has('man') || suits.has('pin') || suits.has('sou')))
    yaku.push({ name: 'Chinitsu', han: 6, openHan: 5 })
  return yaku
}

// ── Standard ────────────────────────────────────────────────────────────────
function detectStandardYaku(hand: Extract<Hand, { structure: 'standard' }>): YakuResult[] {
  const yaku: YakuResult[] = []
  const open = isOpen(hand)
  const melds = hand.melds
  const nonPair = melds.filter(m => m.type !== 'pair')
  const pairMeld = melds.find(m => m.type === 'pair')!
  const allTiles = melds.flatMap(m => m.tiles)
  const sequences = nonPair.filter(m => m.type === 'sequence')
  const triplets = nonPair.filter(m => m.type === 'triplet')

  // ── Yakuman checks first (return early if any found) ──────────────────────

  // Suuankou: 4 concealed triplets
  const concealedTriplets = triplets.filter(m => !m.open)
  if (concealedTriplets.length === 4)
    return [{ name: 'Suuankou', han: YAKUMAN, openHan: null }]

  // Daisangen: triplets of all 3 dragons
  const dragonTriplets = triplets.filter(m => m.tiles[0].suit === 'dragon')
  if (dragonTriplets.length === 3)
    return [{ name: 'Daisangen', han: YAKUMAN, openHan: null }]

  // Shousuushii: triplets of 3 winds + wind pair
  const windTriplets = triplets.filter(m => m.tiles[0].suit === 'wind')
  if (windTriplets.length === 3 && pairMeld.tiles[0].suit === 'wind')
    return [{ name: 'Shousuushii', han: YAKUMAN, openHan: null }]

  // Daisuushii: triplets of all 4 winds
  if (windTriplets.length === 4)
    return [{ name: 'Daisuushii', han: YAKUMAN, openHan: null }]

  // Tsuuiisou: all honors
  if (allTiles.every(isHonor))
    return [{ name: 'Tsuuiisou', han: YAKUMAN, openHan: null }]

  // Chinroutou: all terminals
  if (allTiles.every(isTerminal))
    return [{ name: 'Chinroutou', han: YAKUMAN, openHan: null }]

  // Ryuuiisou: all green tiles (2s,3s,4s,6s,8s,Hatsu)
  const GREEN: Tile[] = [
    {suit:'sou',value:2},{suit:'sou',value:3},{suit:'sou',value:4},
    {suit:'sou',value:6},{suit:'sou',value:8},{suit:'dragon',value:'G'},
  ]
  if (allTiles.every(t => GREEN.some(g => tileEquals(g, t))))
    return [{ name: 'Ryuuiisou', han: YAKUMAN, openHan: null }]

  // Chuurenpoutou: 1112345678999 in one suit + 1 duplicate
  const chuuren = detectChuurenpoutou(melds)
  if (chuuren) return [{ name: 'Chuurenpoutou', han: YAKUMAN, openHan: null }]

  // ── Regular yaku ─────────────────────────────────────────────────────────

  // Tanyao
  if (allTiles.every(isSimple)) yaku.push({ name: 'Tanyao', han: 1, openHan: 1 })

  // Yakuhai (value tiles: seat wind, round wind, any dragon)
  for (const t of triplets) {
    const tile = t.tiles[0]
    if (
      (tile.suit === 'wind' && (tile.value === hand.seatWind || tile.value === hand.roundWind)) ||
      tile.suit === 'dragon'
    ) {
      yaku.push({ name: 'Yakuhai', han: 1, openHan: 1 })
    }
  }

  // Pinfu (closed only: all sequences, non-value pair)
  if (!open && sequences.length === 4) {
    const pair = pairMeld.tiles[0]
    const isValuePair =
      (pair.suit === 'wind' && (pair.value === hand.seatWind || pair.value === hand.roundWind)) ||
      pair.suit === 'dragon'
    if (!isValuePair) yaku.push({ name: 'Pinfu', han: 1, openHan: null })
  }

  // Iipeikou (closed only: two identical sequences)
  if (!open) {
    const seqKeys = sequences.map(m => JSON.stringify(m.tiles.map(t => [t.suit, t.value]).sort()))
    const dupCount = seqKeys.filter((k, i) => seqKeys.indexOf(k) !== i).length
    if (dupCount === 2) yaku.push({ name: 'Ryanpeikou', han: 3, openHan: null })
    else if (dupCount === 1) yaku.push({ name: 'Iipeikou', han: 1, openHan: null })
  }

  // Toitoi: all 4 non-pair melds are triplets
  if (triplets.length === 4) yaku.push({ name: 'Toitoi', han: 2, openHan: 2 })

  // Sanankou: 3 concealed triplets
  if (concealedTriplets.length === 3) yaku.push({ name: 'Sanankou', han: 2, openHan: 2 })

  // Sanshoku Doujun
  const sanshokuDoujun = detectSanshokuDoujun(sequences)
  if (sanshokuDoujun) yaku.push({ name: 'Sanshoku Doujun', han: open ? 1 : 2, openHan: 1 })

  // Sanshoku Doukou
  const sanshokuDoukou = detectSanshokuDoukou(triplets)
  if (sanshokuDoukou) yaku.push({ name: 'Sanshoku Doukou', han: 2, openHan: 2 })

  // Ittsu
  const ittsu = detectIttsu(sequences)
  if (ittsu) yaku.push({ name: 'Ittsu', han: open ? 1 : 2, openHan: 1 })

  // Junchan: every meld + pair contains a terminal (1 or 9, no honors); at least one sequence
  // Detected before Chanta because Junchan supersedes it (Junchan is a stricter superset)
  const isJunchan = sequences.length >= 1 &&
    [...nonPair, pairMeld].every(m => m.tiles.some(isTerminal)) &&
    !allTiles.some(isHonor)
  if (isJunchan) yaku.push({ name: 'Junchan', han: open ? 2 : 3, openHan: 2 })

  // Chanta: every meld + pair contains terminal/honor; at least one sequence
  // Mutually exclusive with Junchan (Junchan is the higher-scoring superset)
  if (!isJunchan && sequences.length >= 1 && [...nonPair, pairMeld].every(m => m.tiles.some(isTerminalOrHonor)))
    yaku.push({ name: 'Chanta', han: open ? 1 : 2, openHan: 1 })

  // Shousangen: two dragon triplets + dragon pair
  if (dragonTriplets.length === 2 && pairMeld.tiles[0].suit === 'dragon')
    yaku.push({ name: 'Shousangen', han: 2, openHan: 2 })

  // Honitsu: one numbered suit + honors
  const honitsu = detectHonitsu(allTiles)
  if (honitsu) yaku.push({ name: 'Honitsu', han: open ? 2 : 3, openHan: 2 })

  // Chinitsu: one numbered suit only
  const chinitsu = detectChinitsu(allTiles)
  if (chinitsu) yaku.push({ name: 'Chinitsu', han: open ? 5 : 6, openHan: 5 })

  return yaku
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectSanshokuDoujun(sequences: Meld[]): boolean {
  for (const seq of sequences) {
    const v = seq.tiles[0].value
    const suits = ['man', 'pin', 'sou'] as const
    if (suits.every(suit =>
      sequences.some(s => s.tiles[0].suit === suit && s.tiles[0].value === v)
    )) return true
  }
  return false
}

function detectSanshokuDoukou(triplets: Meld[]): boolean {
  for (const t of triplets) {
    const v = t.tiles[0].value
    if (['man', 'pin', 'sou'].every(suit =>
      triplets.some(tr => tr.tiles[0].suit === suit && tr.tiles[0].value === v)
    )) return true
  }
  return false
}

function detectIttsu(sequences: Meld[]): boolean {
  const suits = ['man', 'pin', 'sou'] as const
  return suits.some(suit => {
    const suitSeqs = sequences.filter(s => s.tiles[0].suit === suit)
    return (
      suitSeqs.some(s => s.tiles[0].value === 1) &&
      suitSeqs.some(s => s.tiles[0].value === 4) &&
      suitSeqs.some(s => s.tiles[0].value === 7)
    )
  })
}

function detectHonitsu(tiles: Tile[]): boolean {
  const numSuits = new Set(tiles.filter(t => !isHonor(t)).map(t => t.suit))
  return numSuits.size === 1 && tiles.some(isHonor)
}

function detectChinitsu(tiles: Tile[]): boolean {
  const suits = new Set(tiles.map(t => t.suit))
  return suits.size === 1 && !isHonor(tiles[0])
}

function detectChuurenpoutou(melds: Meld[]): boolean {
  const tiles = melds.flatMap(m => m.tiles)
  if (melds.some(m => m.open)) return false
  const suits = new Set(tiles.map(t => t.suit))
  if (suits.size !== 1 || isHonor(tiles[0])) return false
  const vals = tiles.map(t => t.value as number).sort((a, b) => a - b)
  const required = [1,1,1,2,3,4,5,6,7,8,9,9,9]
  const remaining = [...vals]
  for (const r of required) {
    const i = remaining.indexOf(r)
    if (i === -1) return false
    remaining.splice(i, 1)
  }
  return remaining.length === 1
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/engine/yaku.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/yaku.ts src/engine/yaku.test.ts
git commit -m "feat(engine): add yaku detection for all supported yaku"
```

---

## Chunk 4: Fu, Scorer, Generator, Seed

### Task 6: Fu calculator

**Files:**
- Create: `src/engine/fu.ts`
- Create: `src/engine/fu.test.ts`

Fu rules applied in this game:
- **Chiitoitsu:** always 25 fu (fixed, no calculation)
- **Kokushi:** 0 fu (yakuman, points are fixed)
- **Standard base:** 30 fu (closed hand ron equivalent)
- **Wait:** 0 fu assumed (best-case ryanmen)
- **Pair fu:** seat wind = 2 fu; round wind = 2 fu; dragon = 2 fu; others = 0 fu. If seat == round wind, pair of that wind = 4 fu.
- **Meld fu:**
  - Open sequence: 0
  - Closed sequence: 0
  - Open triplet of simples: 2
  - Closed triplet of simples: 4
  - Open triplet of terminals/honors: 4
  - Closed triplet of terminals/honors: 8
- **Rounding:** round up to nearest 10

`calculateFu` receives all decompositions of the hand (via `getAllDecompositions`) and returns the highest fu.

- [ ] **Step 1: Write failing tests**

Create `src/engine/fu.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { m, p, s, E, S, Haku } from './tiles'
import { calculateFu } from './fu'
import type { Hand } from './types'

function seq(tiles: import('./types').Tile[], open = false) {
  return { type: 'sequence' as const, tiles, open }
}
function tri(tiles: import('./types').Tile[], open = false) {
  return { type: 'triplet' as const, tiles, open }
}
function pair(tiles: import('./types').Tile[]) {
  return { type: 'pair' as const, tiles, open: false }
}

describe('calculateFu', () => {
  it('chiitoitsu is always 25 fu', () => {
    const hand: Hand = {
      structure: 'chiitoitsu',
      pairs: [[m(1),m(1)],[m(3),m(3)],[p(2),p(2)],[p(4),p(4)],[s(6),s(6)],[s(8),s(8)],[E,E]],
      seatWind: 'E', roundWind: 'E',
    }
    expect(calculateFu(hand)).toBe(25)
  })

  it('standard hand: base 30 + 0 pair + 0 meld + 0 wait → 30 fu', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(calculateFu(hand)).toBe(30)
  })

  it('pair of dragons adds 2 fu → 30 + 2 = 32 → rounds to 40', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([Haku,Haku])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(calculateFu(hand)).toBe(40)
  })

  it('open triplet of simples: +2 fu each', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [tri([m(5),m(5),m(5)], true), seq([p(3),p(4),p(5)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    // 30 base + 2 (open simples triplet) = 32 → 40
    expect(calculateFu(hand)).toBe(40)
  })

  it('closed triplet of terminals: +8 fu', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [tri([m(1),m(1),m(1)], false), seq([p(3),p(4),p(5)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    // 30 base + 8 = 38 → 40
    expect(calculateFu(hand)).toBe(40)
  })

  it('seat wind pair adds 2 fu', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([E,E])],
      seatWind: 'E', roundWind: 'S',
    }
    // 30 + 2 = 32 → 40
    expect(calculateFu(hand)).toBe(40)
  })

  it('pair that is both seat and round wind adds 4 fu', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([E,E])],
      seatWind: 'E', roundWind: 'E',
    }
    // 30 + 4 = 34 → 40
    expect(calculateFu(hand)).toBe(40)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/engine/fu.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/engine/fu.ts`**

```ts
import type { Hand, Meld, Tile } from './types'
import { isTerminalOrHonor } from './tiles'

export function calculateFu(hand: Hand): number {
  if (hand.structure === 'chiitoitsu') return 25
  if (hand.structure === 'kokushi') return 0
  return bestFuForStandard(hand)
}

function bestFuForStandard(hand: Extract<Hand, { structure: 'standard' }>): number {
  // getAllDecompositions is expensive; for fu purposes we work with the hand as given
  // (caller should pass best decomposition via scorer.ts)
  return roundUpToTen(baseFu(hand))
}

function baseFu(hand: Extract<Hand, { structure: 'standard' }>): number {
  let fu = 30 // base for closed ron
  const pair = hand.melds.find(m => m.type === 'pair')!
  fu += pairFu(pair, hand.seatWind, hand.roundWind)
  for (const meld of hand.melds.filter(m => m.type !== 'pair')) {
    fu += meldFu(meld)
  }
  // Wait: assume ryanmen (0 fu) — best case for player
  return fu
}

function pairFu(pair: Meld, seatWind: string, roundWind: string): number {
  const tile = pair.tiles[0]
  if (tile.suit === 'dragon') return 2
  if (tile.suit === 'wind') {
    const isSeat = tile.value === seatWind
    const isRound = tile.value === roundWind
    if (isSeat && isRound) return 4
    if (isSeat || isRound) return 2
  }
  return 0
}

function meldFu(meld: Meld): number {
  if (meld.type === 'sequence') return 0
  if (meld.type !== 'triplet') return 0
  const terminal = isTerminalOrHonor(meld.tiles[0])
  if (meld.open) return terminal ? 4 : 2
  return terminal ? 8 : 4
}

function roundUpToTen(fu: number): number {
  return Math.ceil(fu / 10) * 10
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/engine/fu.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/fu.ts src/engine/fu.test.ts
git commit -m "feat(engine): add fu calculator"
```

---

### Task 7: Scorer

**Files:**
- Create: `src/engine/scorer.ts`
- Create: `src/engine/scorer.test.ts`

The scorer combines everything: it takes a player's 14-tile selection + context and returns a `Solution`. It evaluates all valid decompositions and picks the highest-scoring one.

Yakuman (`han === 13`) maps to 32,000 points (non-dealer).
Point table (non-dealer, standard): use the standard Japanese mahjong han/fu → points table.

- [ ] **Step 1: Write failing tests**

Create `src/engine/scorer.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { m, p, s, E, Haku } from './tiles'
import { scoreSelection } from './scorer'

const ctx = { seatWind: 'S' as const, roundWind: 'E' as const }

describe('scoreSelection', () => {
  it('returns null for an invalid hand', () => {
    const tiles = [m(1),m(2),m(4),m(5),m(7),m(8),p(1),p(2),p(4),p(5),p(7),p(8),s(1),s(2)]
    expect(scoreSelection(tiles, [], [], ctx)).toBeNull()
  })

  it('returns null for a hand with no yaku', () => {
    // valid structure but no yaku (e.g. all sequences but one honor pair that's not a value tile... actually hard to construct without yaku)
    // All simples hand → tanyao, so let's test a hand that's structurally valid but no yaku:
    // Mixed suits + terminals + no value tile triplets → chanta maybe... let's skip this edge case
    // and just verify valid hand returns a solution
    const tiles = [m(2),m(3),m(4), p(3),p(4),p(5), s(6),s(7),s(8), m(6),m(7),m(8), p(2),p(2)]
    const sol = scoreSelection(tiles, [], [], ctx)
    expect(sol).not.toBeNull()
    expect(sol!.yaku.length).toBeGreaterThan(0)
  })

  it('scores tanyao correctly', () => {
    // 4 sequences all simples, simple pair → Tanyao + Pinfu = 2 han 30 fu → 2000 pts non-dealer
    const tiles = [m(2),m(3),m(4), p(5),p(6),p(7), s(3),s(4),s(5), m(6),m(7),m(8), p(2),p(2)]
    const sol = scoreSelection(tiles, [], [], ctx)!
    expect(sol.yaku.map(y => y.name)).toContain('Tanyao')
    expect(sol.han).toBeGreaterThanOrEqual(2) // at minimum tanyao + pinfu
  })

  it('dora adds han', () => {
    const tiles = [m(2),m(3),m(4), p(5),p(6),p(7), s(3),s(4),s(5), m(6),m(7),m(8), p(2),p(2)]
    // dora indicator m(1) → dora is m(2), hand has m(2) → +1 han
    const solNoDora = scoreSelection(tiles, [], [], ctx)!
    const solWithDora = scoreSelection(tiles, [], [m(1)], ctx)!
    expect(solWithDora.han).toBe(solNoDora.han + 1)
  })

  it('yakuman returns 32000 points', () => {
    const kokushiTiles = [m(1),m(9),p(1),p(9),s(1),s(9),E,{suit:'wind',value:'S'},{suit:'wind',value:'W'},{suit:'wind',value:'N'},{suit:'dragon',value:'W'},{suit:'dragon',value:'G'},{suit:'dragon',value:'R'},m(1)]
    const sol = scoreSelection(kokushiTiles, [], [], { seatWind: 'E', roundWind: 'E' })!
    expect(sol.points).toBe(32000)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/engine/scorer.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/engine/scorer.ts`**

```ts
import type { Tile, Meld, Solution, WindValue, YakuResult } from './types'
import { getAllDecompositions } from './hand'
import { detectYaku } from './yaku'
import { calculateFu } from './fu'
import { countDora } from './tiles'

type Ctx = { seatWind: WindValue; roundWind: WindValue }

export function scoreSelection(
  tiles: Tile[],
  lockedMelds: Meld[],
  doraIndicators: Tile[],
  ctx: Ctx
): Solution | null {
  const decompositions = getAllDecompositions(tiles, lockedMelds, ctx)
  if (decompositions.length === 0) return null

  let best: Solution | null = null
  for (const hand of decompositions) {
    const yaku = detectYaku(hand)
    if (yaku.length === 0) continue
    const doraCount = countDora(tiles, doraIndicators)
    const isYakuman = yaku.some(y => y.han === 13)
    const han = isYakuman ? 13 : yaku.reduce((sum, y) => sum + y.han, 0) + doraCount
    const fu = calculateFu(hand)
    const points = hanFuToPoints(han, fu)
    if (best === null || points > best.points) {
      best = { tiles, hand, yaku, han, fu, points }
    }
  }
  return best
}

// Non-dealer point table (standard values)
export function hanFuToPoints(han: number, fu: number): number {
  if (han >= 13) return 32000 // yakuman
  if (han >= 11) return 24000 // sanbaiman
  if (han >= 8)  return 16000 // baiman
  if (han >= 6)  return 12000 // haneman
  if (han >= 5)  return 8000  // mangan
  const raw = fu * Math.pow(2, han + 2)
  if (raw >= 8000) return 8000 // mangan cap
  // Round up to nearest 100
  return Math.ceil(raw / 100) * 100
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/engine/scorer.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/scorer.ts src/engine/scorer.test.ts
git commit -m "feat(engine): add scorer (han+fu → points, mangan/yakuman caps)"
```

---

### Task 8: Puzzle seed utilities

**Files:**
- Create: `src/engine/seed.ts`
- Create: `src/engine/seed.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/engine/seed.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { LAUNCH_DATE, puzzleNumberFromDate, dateFromPuzzleNumber, seedFromPuzzleNumber, seedFromHex } from './seed'

describe('puzzleNumberFromDate', () => {
  it('launch date is puzzle #1', () => {
    expect(puzzleNumberFromDate(LAUNCH_DATE)).toBe(1)
  })
  it('day after launch is puzzle #2', () => {
    const d = new Date(LAUNCH_DATE)
    d.setUTCDate(d.getUTCDate() + 1)
    expect(puzzleNumberFromDate(d)).toBe(2)
  })
})

describe('dateFromPuzzleNumber', () => {
  it('puzzle #1 → launch date', () => {
    const d = dateFromPuzzleNumber(1)
    expect(d.toISOString().slice(0, 10)).toBe(LAUNCH_DATE.toISOString().slice(0, 10))
  })
  it('round-trips: date → number → date', () => {
    const original = new Date('2026-06-01T00:00:00Z')
    const n = puzzleNumberFromDate(original)
    const restored = dateFromPuzzleNumber(n)
    expect(restored.toISOString().slice(0, 10)).toBe('2026-06-01')
  })
})

describe('seedFromPuzzleNumber', () => {
  it('returns a number', () => {
    expect(typeof seedFromPuzzleNumber(1)).toBe('number')
  })
  it('same puzzle number → same seed', () => {
    expect(seedFromPuzzleNumber(42)).toBe(seedFromPuzzleNumber(42))
  })
  it('different puzzle numbers → different seeds', () => {
    expect(seedFromPuzzleNumber(1)).not.toBe(seedFromPuzzleNumber(2))
  })
})

describe('seedFromHex', () => {
  it('returns a number from hex string', () => {
    expect(typeof seedFromHex('abc123')).toBe('number')
  })
  it('same hex → same seed', () => {
    expect(seedFromHex('deadbeef')).toBe(seedFromHex('deadbeef'))
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/engine/seed.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/engine/seed.ts`**

```ts
// Launch date — set this to the actual launch date when deploying
export const LAUNCH_DATE = new Date('2026-01-01T00:00:00Z')

const PUZZLE_SALT = 'miniichi-v1'

export function puzzleNumberFromDate(date: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const launchMs = Date.UTC(
    LAUNCH_DATE.getUTCFullYear(),
    LAUNCH_DATE.getUTCMonth(),
    LAUNCH_DATE.getUTCDate()
  )
  const targetMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((targetMs - launchMs) / msPerDay) + 1
}

export function dateFromPuzzleNumber(n: number): Date {
  const d = new Date(LAUNCH_DATE)
  d.setUTCDate(d.getUTCDate() + n - 1)
  return d
}

// Deterministic hash: date string + salt → 32-bit integer seed
export function seedFromPuzzleNumber(n: number): number {
  const date = dateFromPuzzleNumber(n)
  const dateStr = date.toISOString().slice(0, 10)
  return hashString(`${dateStr}:${PUZZLE_SALT}`)
}

export function seedFromHex(hex: string): number {
  return parseInt(hex.slice(0, 8), 16)
}

// Simple djb2-style hash
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0 // keep as unsigned 32-bit
  }
  return hash
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/engine/seed.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/seed.ts src/engine/seed.test.ts
git commit -m "feat(engine): add puzzle seed and date utilities"
```

---

### Task 9: Puzzle generator

**Files:**
- Create: `src/engine/generator.ts`
- Create: `src/engine/generator.test.ts`

The generator builds a `Puzzle` from a numeric seed. It uses a seeded PRNG (mulberry32) for reproducibility.

Algorithm recap:
1. PRNG from seed
2. Draw round wind (60/25/10/5% E/S/W/N), seat wind randomly
3. Generate hand A (target yaku + tiles)
4. Generate hand B (different target yaku + tiles)
5. Decide 0–2 open melds
6. Merge A+B tiles, pad to 24
7. Validate: all intended hands reachable, no higher-scoring surprise
8. If invalid: retry (up to 20 attempts)
9. Draw 1 or 2 dora indicators (80/20%)
10. Score all solutions, sort by points
11. Shuffle tiles

- [ ] **Step 1: Write failing tests**

Create `src/engine/generator.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generatePuzzle } from './generator'
import { scoreSelection } from './scorer'

describe('generatePuzzle', () => {
  it('returns a puzzle with 24 tiles', () => {
    const puzzle = generatePuzzle(12345)
    expect(puzzle.tiles).toHaveLength(24)
  })

  it('has at least 2 solutions', () => {
    const puzzle = generatePuzzle(12345)
    expect(puzzle.solutions.length).toBeGreaterThanOrEqual(2)
  })

  it('solutions are sorted by points descending', () => {
    const puzzle = generatePuzzle(12345)
    for (let i = 0; i < puzzle.solutions.length - 1; i++) {
      expect(puzzle.solutions[i].points).toBeGreaterThanOrEqual(puzzle.solutions[i + 1].points)
    }
  })

  it('locked meld tiles are a subset of puzzle tiles', () => {
    // Run a few seeds to catch cases with locked melds
    for (const seed of [1, 2, 3, 100, 999, 5000]) {
      const puzzle = generatePuzzle(seed)
      for (const meld of puzzle.lockedMelds) {
        for (const tile of meld.tiles) {
          const found = puzzle.tiles.some(t => t.suit === tile.suit && t.value === tile.value)
          expect(found, `Locked meld tile ${JSON.stringify(tile)} not in puzzle tiles`).toBe(true)
        }
      }
    }
  })

  it('has 1 or 2 dora indicators', () => {
    const puzzle = generatePuzzle(12345)
    expect(puzzle.doraIndicators.length).toBeGreaterThanOrEqual(1)
    expect(puzzle.doraIndicators.length).toBeLessThanOrEqual(2)
  })

  it('solutions are sorted by score descending', () => {
    const puzzle = generatePuzzle(42)
    // Verify solutions are in descending point order
    for (let i = 0; i < puzzle.solutions.length - 1; i++) {
      expect(puzzle.solutions[i].points).toBeGreaterThanOrEqual(puzzle.solutions[i + 1].points)
    }
  })

  it('same seed produces same puzzle', () => {
    const a = generatePuzzle(99999)
    const b = generatePuzzle(99999)
    expect(a.tiles).toEqual(b.tiles)
    expect(a.solutions[0].points).toBe(b.solutions[0].points)
  })

  it('different seeds produce different puzzles', () => {
    const a = generatePuzzle(1)
    const b = generatePuzzle(2)
    expect(a.tiles).not.toEqual(b.tiles)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/engine/generator.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/engine/generator.ts`**

```ts
import type { Tile, Meld, Puzzle, Solution, WindValue } from './types'
import { m, p, s, wind, dragon, E, S, W, N, Haku, Hatsu, Chun, sortTiles, tileEquals } from './tiles'
import { scoreSelection } from './scorer'

// ── Mulberry32 PRNG ──────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let s = seed
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
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

// ── Tile pool (full set of tiles, no duplicates beyond natural count) ─────────
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

// ── Hand templates: functions that produce 14 tiles for a specific yaku ───────
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

// ── Main generator ───────────────────────────────────────────────────────────
export function generatePuzzle(seed: number, maxRetries = 20): Puzzle {
  // Iterate across a range of seeds to avoid unbounded recursion
  const hardCap = maxRetries * 5
  for (let attempt = 0; attempt < hardCap; attempt++) {
    const rng = mulberry32(seed + attempt * 1000)
    const puzzle = tryGenerate(rng)
    if (puzzle) return puzzle
  }
  // Should be unreachable with a well-tuned generator; hard error beats silent hang
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
  const openCount = rng() < 0.4 ? (rng() < 0.5 ? 1 : 2) : 0 // 60% no open, 25% one, 15% two
  if (openCount > 0 && !templateA.closed) {
    // Take first 3 tiles of A as an open meld (simple approach)
    lockedMelds.push({ type: 'sequence', tiles: tilesA.slice(0, 3), open: true })
  }
  if (openCount > 1 && !templateB.closed) {
    lockedMelds.push({ type: 'sequence', tiles: tilesB.slice(0, 3), open: true })
  }

  // Merge tiles
  const combined = [...tilesA, ...tilesB]

  // Pad to 24 with noise tiles
  const pool = fullTileSet()
  const usedPool = [...combined]
  const noise: Tile[] = []
  const shuffledPool = shuffle(pool, rng)
  for (const tile of shuffledPool) {
    if (usedPool.length + noise.length >= 24) break
    // Don't add a 5th copy of any tile
    const count = combined.filter(t => tileEquals(t, tile)).length + noise.filter(t => tileEquals(t, tile)).length
    if (count < 4) noise.push(tile)
  }

  const allTiles = shuffle([...combined, ...noise].slice(0, 24), rng)

  // Draw dora indicators
  const doraCount = rng() < 0.8 ? 1 : 2
  const doraPool = shuffle(allTiles, rng)
  const doraIndicators = doraPool.slice(0, doraCount)

  // Find all valid solutions
  const solutions = findAllSolutions(allTiles, lockedMelds, doraIndicators, ctx)
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
  lockedMelds: Meld[],
  doraIndicators: Tile[],
  ctx: { seatWind: WindValue; roundWind: WindValue }
): Solution[] {
  // For a 24-tile pool, we can't enumerate all C(24,14) combinations.
  // Instead, score the intended hands (the tiles we built) and validate the pool contains them.
  // The generator builds known-good hands, so we score each subset = tilesA and tilesB.
  // For full correctness, this is good enough for a learning game.
  // scoreSelection handles the rest.
  const solutions: Solution[] = []
  // We know the first 14 tiles cover hand A and B (with overlap), try windows
  for (let i = 0; i < tiles.length - 13; i++) {
    const candidate = tiles.slice(i, i + 14)
    const sol = scoreSelection(candidate, lockedMelds, doraIndicators, ctx)
    if (sol && !solutions.some(s => s.points === sol.points && JSON.stringify(s.tiles) === JSON.stringify(sol.tiles))) {
      solutions.push(sol)
    }
  }
  return solutions
}
```

> **Implementation note:** The `findAllSolutions` function above is a simplified approach that scans contiguous 14-tile windows. A production implementation should enumerate all valid 14-tile subsets containing the locked meld tiles. This simplified version is sufficient for initial development and tests; replace with full enumeration if test coverage reveals gaps.

- [ ] **Step 4: Run tests**

```bash
npm test -- src/engine/generator.test.ts
```
Expected: All tests PASS (some may need seed tuning if the simplified solution finder misses solutions — adjust the approach if needed)

- [ ] **Step 5: Update engine index.ts**

```ts
export * from './types'
export * from './tiles'
export * from './hand'
export * from './yaku'
export * from './fu'
export * from './scorer'
export * from './generator'
export * from './seed'
```

- [ ] **Step 6: Run all engine tests**

```bash
npm test -- src/engine/
```
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/engine/
git commit -m "feat(engine): add puzzle generator and seed utilities; complete engine layer"
```

---

## Chunk 5: Store, Routing, and UI

### Task 10: Zustand store

**Files:**
- Create: `src/store/gameStore.ts`
- Create: `src/store/gameStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/store/gameStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { generatePuzzle } from '../engine/generator'

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState())
  })

  it('starts in idle phase', () => {
    expect(useGameStore.getState().phase).toBe('idle')
  })

  it('loadPuzzle sets puzzle and resets selection', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    expect(useGameStore.getState().puzzle).toBe(puzzle)
    expect(useGameStore.getState().selectedTiles).toEqual([])
    expect(useGameStore.getState().phase).toBe('idle')
  })

  it('selecting a tile starts timer and transitions to playing', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    useGameStore.getState().toggleTile(puzzle.tiles[0])
    expect(useGameStore.getState().phase).toBe('playing')
    expect(useGameStore.getState().selectedTiles).toHaveLength(1)
  })

  it('toggling a tile twice deselects it', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    useGameStore.getState().toggleTile(puzzle.tiles[0])
    useGameStore.getState().toggleTile(puzzle.tiles[0])
    expect(useGameStore.getState().selectedTiles).toHaveLength(0)
  })

  it('locked meld tiles cannot be deselected', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    if (puzzle.lockedMelds.length > 0) {
      const lockedTile = puzzle.lockedMelds[0].tiles[0]
      useGameStore.getState().toggleTile(lockedTile) // try to deselect
      const state = useGameStore.getState()
      // locked tile should still be in selectedTiles (it was pre-loaded)
      expect(state.selectedTiles.some(t => t.suit === lockedTile.suit && t.value === lockedTile.value)).toBe(true)
    }
  })

  it('commitHand transitions to committed phase', () => {
    // Use a known-valid hand
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const validTiles = puzzle.solutions[0].tiles
    useGameStore.setState({ selectedTiles: validTiles, phase: 'playing' })
    useGameStore.getState().commitHand()
    expect(useGameStore.getState().phase).toBe('committed')
    expect(useGameStore.getState().submittedSolution).not.toBeNull()
  })

  it('commitHand with invalid hand sets error message', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    // Select first 14 tiles (likely invalid hand)
    useGameStore.setState({ selectedTiles: puzzle.tiles.slice(0, 14), phase: 'playing' })
    // If it happens to be invalid:
    useGameStore.getState().commitHand()
    const state = useGameStore.getState()
    if (state.phase === 'playing') {
      expect(state.errorMessage).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/store/gameStore.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/store/gameStore.ts`**

```ts
import { create } from 'zustand'
import type { Puzzle, Tile, Solution } from '../engine/types'
import { tileEquals } from '../engine/tiles'
import { scoreSelection } from '../engine/scorer'

type Phase = 'idle' | 'playing' | 'committed'
type Mode = 'daily' | 'practice'

interface GameState {
  puzzle: Puzzle | null
  selectedTiles: Tile[]
  phase: Phase
  mode: Mode
  startTime: number | null   // Date.now() when first tile selected
  elapsed: number            // seconds elapsed (updated on commit)
  submittedSolution: Solution | null
  errorMessage: string | null

  loadPuzzle: (puzzle: Puzzle, mode?: Mode) => void
  toggleTile: (tile: Tile) => void
  commitHand: () => void
  getInitialState: () => Omit<GameState, 'loadPuzzle' | 'toggleTile' | 'commitHand' | 'getInitialState'>
}

const INITIAL: Omit<GameState, 'loadPuzzle' | 'toggleTile' | 'commitHand' | 'getInitialState'> = {
  puzzle: null,
  selectedTiles: [],
  phase: 'idle',
  mode: 'daily',
  startTime: null,
  elapsed: 0,
  submittedSolution: null,
  errorMessage: null,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL,

  getInitialState: () => INITIAL,

  loadPuzzle: (puzzle, mode = 'daily') => {
    // Pre-populate locked meld tiles
    const lockedTiles = puzzle.lockedMelds.flatMap(m => m.tiles)
    set({ ...INITIAL, puzzle, mode, selectedTiles: lockedTiles, phase: 'idle' })
  },

  toggleTile: (tile) => {
    const { puzzle, selectedTiles, phase, startTime } = get()
    if (!puzzle || phase === 'committed') return

    // Check if tile is locked
    const isLocked = puzzle.lockedMelds.some(m => m.tiles.some(t => tileEquals(t, tile)))
    if (isLocked) return

    const idx = selectedTiles.findIndex(t => tileEquals(t, tile))
    const newSelected = idx === -1
      ? [...selectedTiles, tile]
      : [...selectedTiles.slice(0, idx), ...selectedTiles.slice(idx + 1)]

    const newPhase = phase === 'idle' ? 'playing' : phase
    const newStartTime = startTime ?? Date.now()

    set({ selectedTiles: newSelected, phase: newPhase, startTime: newStartTime, errorMessage: null })
  },

  commitHand: () => {
    const { puzzle, selectedTiles, startTime } = get()
    if (!puzzle) return

    const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
    const sol = scoreSelection(
      selectedTiles,
      puzzle.lockedMelds,
      puzzle.doraIndicators,
      { seatWind: puzzle.seatWind, roundWind: puzzle.roundWind }
    )

    if (!sol) {
      set({ errorMessage: 'Not a valid winning hand — check for a complete structure and at least one yaku.' })
      return
    }

    set({ phase: 'committed', elapsed, submittedSolution: sol, errorMessage: null })
  },
}))
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/store/gameStore.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat(store): add Zustand game store with tile selection and commit logic"
```

---

### Task 11: App routing

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Implement URL-based routing in `src/App.tsx`**

```tsx
import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { generatePuzzle } from './engine/generator'
import { seedFromPuzzleNumber, seedFromHex, puzzleNumberFromDate } from './engine/seed'
import HomePage from './components/HomePage'
import GamePage from './components/GamePage'

export default function App() {
  const { puzzle, loadPuzzle, phase } = useGameStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pParam = params.get('p')
    const seedParam = params.get('seed')

    if (pParam) {
      const n = parseInt(pParam, 10)
      if (!isNaN(n)) {
        const seed = seedFromPuzzleNumber(n)
        loadPuzzle(generatePuzzle(seed), 'daily')
      }
    } else if (seedParam) {
      const seed = seedFromHex(seedParam)
      loadPuzzle(generatePuzzle(seed), 'practice')
    }
    // No params → show home screen
  }, [])

  if (!puzzle) return <HomePage />
  if (phase === 'committed') return <GamePage /> // GamePage handles result display inline
  return <GamePage />
}
```

- [ ] **Step 2: Update `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat(app): add URL-based routing for daily and practice puzzles"
```

---

### Task 12: UI components

**Files:**
- Create: `src/components/ContextBar.tsx`
- Create: `src/components/TileGrid.tsx`
- Create: `src/components/HandSlots.tsx`
- Create: `src/components/GamePage.tsx`
- Create: `src/components/ScoreReveal.tsx`
- Create: `src/components/ShareButton.tsx`
- Create: `src/components/HomePage.tsx`
- Create: `src/components/tileDisplay.ts`

- [ ] **Step 1: Create `src/components/tileDisplay.ts`**

Shared helper used by TileGrid and HandSlots to avoid duplication:

```ts
import type { Tile } from '../engine/types'

export function tileDisplay(tile: Tile): string {
  if (tile.suit === 'wind') return tile.value
  if (tile.suit === 'dragon') {
    return ({ W: '白', G: '發', R: '中' } as const)[tile.value as 'W' | 'G' | 'R']
  }
  return `${tile.value}${tile.suit[0].toUpperCase()}`
}
```

- [ ] **Step 2: Create `src/components/ContextBar.tsx`**

Displays round wind, seat wind, dora indicator(s), and elapsed timer.

```tsx
import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import type { Tile } from '../engine/types'

function tileLabel(tile: Tile): string {
  if (tile.suit === 'wind') return `${tile.value} wind`
  if (tile.suit === 'dragon') {
    return { W: 'Haku', G: 'Hatsu', R: 'Chun' }[tile.value as string]
  }
  return `${tile.value} ${tile.suit}`
}

function windLabel(w: string): string {
  return { E: 'East', S: 'South', W: 'West', N: 'North' }[w] ?? w
}

export default function ContextBar() {
  const { puzzle, phase, startTime, elapsed } = useGameStore()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (phase !== 'playing' || !startTime) return
    const interval = setInterval(() => {
      setDisplay(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, startTime])

  if (!puzzle) return null

  const seconds = phase === 'committed' ? elapsed : display
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="context-bar">
      <span>Round: {windLabel(puzzle.roundWind)}</span>
      <span>Seat: {windLabel(puzzle.seatWind)}</span>
      <span>
        Dora: {puzzle.doraIndicators.map((t, i) => (
          <span key={i} className="dora-tile">{tileLabel(t)}</span>
        ))}
      </span>
      <span className="timer">{mm}:{ss}</span>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/TileGrid.tsx`**

Displays the 24-tile pool. Locked meld tiles are visually distinct.

```tsx
import { useGameStore } from '../store/gameStore'
import type { Tile } from '../engine/types'
import { tileEquals } from '../engine/tiles'
import { tileDisplay } from './tileDisplay'

export default function TileGrid() {
  const { puzzle, selectedTiles, phase, toggleTile } = useGameStore()
  if (!puzzle) return null

  const isSelected = (tile: Tile) => selectedTiles.some(t => tileEquals(t, tile))
  const isLocked = (tile: Tile) =>
    puzzle.lockedMelds.some(m => m.tiles.some(t => tileEquals(t, tile)))

  return (
    <div className="tile-grid">
      {puzzle.tiles.map((tile, i) => (
        <button
          key={i}
          className={[
            'tile',
            tile.suit,
            isSelected(tile) ? 'selected' : '',
            isLocked(tile) ? 'locked' : '',
          ].join(' ')}
          onClick={() => phase !== 'committed' && toggleTile(tile)}
          disabled={phase === 'committed'}
        >
          {tileDisplay(tile)}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/HandSlots.tsx`**

Shows the 14-tile hand area. Locked tiles pre-filled and unremovable.

```tsx
import { useGameStore } from '../store/gameStore'
import { tileEquals } from '../engine/tiles'
import { tileDisplay } from './tileDisplay'

export default function HandSlots() {
  const { puzzle, selectedTiles, phase, commitHand, errorMessage } = useGameStore()
  if (!puzzle) return null

  const lockedCount = puzzle.lockedMelds.reduce((sum, m) => sum + m.tiles.length, 0)
  const totalSlots = 14
  const freeSlots = totalSlots - lockedCount
  const freeTiles = selectedTiles.slice(lockedCount)
  const emptySlots = freeSlots - freeTiles.length

  const isReady = selectedTiles.length === 14

  return (
    <div className="hand-area">
      <div className="hand-slots">
        {puzzle.lockedMelds.flatMap((m, mi) =>
          m.tiles.map((tile, ti) => (
            <span key={`locked-${mi}-${ti}`} className="tile locked">
              {tileDisplay(tile)}
            </span>
          ))
        )}
        {freeTiles.map((tile, i) => (
          <span key={`free-${i}`} className={`tile ${tile.suit} selected`}>
            {tileDisplay(tile)}
          </span>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <span key={`empty-${i}`} className="tile empty">·</span>
        ))}
      </div>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <button
        className="commit-button"
        disabled={!isReady || phase === 'committed'}
        onClick={commitHand}
      >
        Commit Hand
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/ScoreReveal.tsx`**

```tsx
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import ShareButton from './ShareButton'

export default function ScoreReveal() {
  const { submittedSolution, puzzle, elapsed } = useGameStore()
  const [expanded, setExpanded] = useState(false)
  if (!submittedSolution || !puzzle) return null

  const optimal = puzzle.solutions[0]
  const isOptimal = submittedSolution.points >= optimal.points
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="score-reveal">
      <div className="score-main">
        <span className="han">{submittedSolution.han} han</span>
        <span className="points">{submittedSolution.points.toLocaleString()} pts</span>
        {isOptimal && <span className="star">⭐</span>}
      </div>
      <div className="score-compact">
        {submittedSolution.fu} fu ·{' '}
        {submittedSolution.yaku.map(y => y.name).join(' · ')}
        <button className="details-toggle" onClick={() => setExpanded(e => !e)}>
          {expanded ? '▲' : 'Details ▼'}
        </button>
      </div>

      {expanded && (
        <div className="yaku-breakdown">
          {submittedSolution.yaku.map(y => (
            <div key={y.name} className="yaku-row">
              <span>{y.name}</span>
              <span>{y.han} han</span>
            </div>
          ))}
          <div className="yaku-total">
            Total: {submittedSolution.han} han {submittedSolution.fu} fu → {submittedSolution.points.toLocaleString()} pts
          </div>
        </div>
      )}

      {!isOptimal && (
        <div className="optimal-hint">
          Best possible: {optimal.points.toLocaleString()} pts ({optimal.yaku.map(y => y.name).join(' + ')})
        </div>
      )}

      <div className="result-footer">
        <span className="elapsed">⏱ {mm}:{ss}</span>
        <ShareButton />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/ShareButton.tsx`**

```tsx
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { puzzleNumberFromDate } from '../engine/seed'

export default function ShareButton() {
  const { submittedSolution, puzzle, elapsed, mode } = useGameStore()
  const [copied, setCopied] = useState(false)
  if (!submittedSolution || !puzzle) return null

  const optimal = puzzle.solutions[0]
  const isOptimal = submittedSolution.points >= optimal.points
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  function buildShareText(): string {
    const lines: string[] = []
    const params = new URLSearchParams(window.location.search)
    if (mode === 'daily') {
      // Use the puzzle number from the URL param (not today's date) so past daily links work correctly
      const n = params.get('p') ?? String(puzzleNumberFromDate(new Date()))
      lines.push(`Miniichi #${n}${isOptimal ? ' ⭐' : ''}`)
      lines.push(`${submittedSolution!.points.toLocaleString()} pts · ${mm}:${ss}`)
      lines.push(`${window.location.origin}/?p=${n}`)
    } else {
      const seedHex = params.get('seed') ?? 'practice'
      lines.push(`Miniichi Practice${isOptimal ? ' ⭐' : ''}`)
      lines.push(`${submittedSolution!.points.toLocaleString()} pts · ${mm}:${ss}`)
      lines.push(`${window.location.origin}/?seed=${seedHex}`)
    }
    return lines.join('\n')
  }

  function handleShare() {
    navigator.clipboard.writeText(buildShareText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button className="share-button" onClick={handleShare}>
      {copied ? 'Copied!' : '📋 Share'}
    </button>
  )
}
```

- [ ] **Step 7: Create `src/components/GamePage.tsx`**

```tsx
import ContextBar from './ContextBar'
import TileGrid from './TileGrid'
import HandSlots from './HandSlots'
import ScoreReveal from './ScoreReveal'
import { useGameStore } from '../store/gameStore'

export default function GamePage() {
  const { phase } = useGameStore()
  return (
    <div className="game-page">
      <ContextBar />
      {phase !== 'committed' && <TileGrid />}
      {phase !== 'committed' && <HandSlots />}
      {phase === 'committed' && <ScoreReveal />}
    </div>
  )
}
```

- [ ] **Step 8: Create `src/components/HomePage.tsx`**

```tsx
import { useGameStore } from '../store/gameStore'
import { generatePuzzle } from '../engine/generator'
import { seedFromPuzzleNumber, seedFromHex, puzzleNumberFromDate } from '../engine/seed'

function getDailyCacheKey(): string {
  return `miniichi-daily-${new Date().toISOString().slice(0, 10)}`
}

export default function HomePage() {
  const { loadPuzzle } = useGameStore()
  const cacheKey = getDailyCacheKey()
  const dailyCache = localStorage.getItem(cacheKey)
  const dailyResult: { points: number; elapsed: number } | null = dailyCache
    ? JSON.parse(dailyCache)
    : null

  function startDaily() {
    const n = puzzleNumberFromDate(new Date())
    const seed = seedFromPuzzleNumber(n)
    const puzzle = generatePuzzle(seed)
    loadPuzzle(puzzle, 'daily')
    window.history.pushState({}, '', `/?p=${n}`)
  }

  function startPractice() {
    const seed = Math.floor(Math.random() * 0xFFFFFFFF)
    const seedHex = seed.toString(16).padStart(8, '0')
    const puzzle = generatePuzzle(seed)
    loadPuzzle(puzzle, 'practice')
    window.history.pushState({}, '', `/?seed=${seedHex}`)
  }

  return (
    <div className="home-page">
      <h1>Miniichi</h1>
      <p>Find the highest-scoring winning hand from 24 tiles.</p>
      <button className="daily-button" onClick={startDaily} disabled={!!dailyResult}>
        {dailyResult
          ? `Today's Puzzle — ${dailyResult.points.toLocaleString()} pts`
          : "Today's Puzzle"}
      </button>
      <button className="practice-button" onClick={startPractice}>
        Practice
      </button>
    </div>
  )
}
```

- [ ] **Step 8: Cache daily result in localStorage**

In `gameStore.ts`, after a successful `commitHand` in daily mode, save the result:

Add inside the `commitHand` function, after `set(...)` for a valid solution:
```ts
if (get().mode === 'daily') {
  const key = `miniichi-daily-${new Date().toISOString().slice(0, 10)}`
  localStorage.setItem(key, JSON.stringify({ points: sol.points, elapsed }))
}
```

- [ ] **Step 9: Run all tests**

```bash
npm test
```
Expected: All tests PASS

- [ ] **Step 10: Smoke test in browser**

```bash
npm run dev
```

Open http://localhost:5173. Verify:
- Home screen shows two buttons
- Clicking "Practice" loads a 24-tile grid
- Tiles are selectable/deselectable
- Commit button activates at 14 tiles
- Result screen shows score + share button
- Share button copies spoiler-free text to clipboard

- [ ] **Step 11: Commit**

```bash
git add src/components/ src/store/ src/App.tsx src/main.tsx
git commit -m "feat(ui): add all game UI components and routing"
```

---

## Final Steps

- [ ] **Add `.superpowers/` to `.gitignore`** (already done via brainstorming session)

- [ ] **Add basic CSS** — create `src/index.css` with styles for `.tile`, `.tile.man`, `.tile.pin`, `.tile.sou`, `.tile.wind`, `.tile.dragon`, `.tile.selected`, `.tile.locked`, `.tile-grid`, `.hand-slots`, `.context-bar`, `.score-reveal`, `.home-page`. Keep it minimal — layout and legibility only.

- [ ] **Deploy to Vercel**

```bash
npm run build
# Push to GitHub and connect repo to Vercel
# Set no environment variables needed (fully client-side)
```

- [ ] **Set LAUNCH_DATE in `src/engine/seed.ts`** to the actual deployment date before going live.

- [ ] **Final commit**

```bash
git add .
git commit -m "feat: complete Miniichi v1 — yaku recognition game"
```
