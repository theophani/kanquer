# Miniichi Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix tile selection identity bug, add dealer scoring, refactor timer to start on load with pause support, add a reset button, convert nav buttons to links, and add tests for Iipeikou and Sanshoku Doukou.

**Architecture:** Changes flow from engine (scorer.ts) → store (gameStore.ts) → components (TileGrid, HandSlots, ContextBar, HomePage, App). Each task is independently committable. Tasks 3–4 (tile identity) must be done together before committing since the store and component APIs change in tandem.

**Tech Stack:** React 18, TypeScript (strict), Zustand, Vitest + @testing-library/react, Vite

---

## File Map

| File | What changes |
|------|-------------|
| `src/engine/scorer.ts` | `hanFuToPoints` gains `dealer` param; `scoreSelection` derives dealer from ctx |
| `src/store/gameStore.ts` | Replace `selectedTiles`→`selectedIndices`+`lockedIndices`; remove `startTime`→`timerStartedAt`+`accumulatedMs`; add `resetHand`, `pauseTimer`, `resumeTimer`; `loadPuzzle` accepts optional `savedResult`; remove `'idle'` phase |
| `src/components/TileGrid.tsx` | `toggleTile(index)` instead of tile value; `isSelected`/`isLocked` use index |
| `src/components/HandSlots.tsx` | Derive tiles from `selectedIndices`; add Reset button |
| `src/components/ContextBar.tsx` | Start timer at load; `visibilitychange` listener; `useGameStore.getState()` in interval |
| `src/components/HomePage.tsx` | `<button>` → `<a href>` links; remove `startDaily`/`startPractice` |
| `src/App.tsx` | Add `/daily` and `/random` path routing; handle `savedResult` restore |
| `src/store/gameStore.test.ts` | Update for new API (`selectedIndices`, index-based toggle, no `'idle'`) |
| `src/engine/scorer.test.ts` | Update yakuman test; add Iipeikou + Sanshoku Doukou tests |

---

## Task 1: Dealer Scoring

**Files:**
- Modify: `src/engine/scorer.ts`
- Modify: `src/engine/scorer.test.ts`

- [ ] **Step 1.1: Write a failing test for non-dealer vs dealer scoring**

Add to `src/engine/scorer.test.ts` (inside `describe('scoreSelection', ...)`):

```typescript
it('scores higher when seat wind is East (dealer)', () => {
  // 3 han 30 fu hand: Tanyao + Pinfu + one more han from dora
  const tiles = [m(2),m(3),m(4), p(5),p(6),p(7), s(3),s(4),s(5), m(6),m(7),m(8), p(2),p(2)]
  const ctxDealer = { seatWind: 'E' as const, roundWind: 'E' as const }
  const ctxNonDealer = { seatWind: 'S' as const, roundWind: 'E' as const }
  // dora indicator m(1) → dora is m(2) → hand has m(2) = 1 dora → at least 3 han total
  const dealer = scoreSelection(tiles, [], [m(1)], ctxDealer)!
  const nonDealer = scoreSelection(tiles, [], [m(1)], ctxNonDealer)!
  expect(dealer.points).toBeGreaterThan(nonDealer.points)
})
```

Also update the existing yakuman test to use non-dealer (so it keeps expecting 32000):

```typescript
it('yakuman returns 32000 points', () => {
  const kokushiTiles = [m(1),m(9),p(1),p(9),s(1),s(9),E,wind('S'),wind('W'),wind('N'),dragon('W'),dragon('G'),dragon('R'),m(1)]
  const sol = scoreSelection(kokushiTiles, [], [], { seatWind: 'S', roundWind: 'E' })!
  expect(sol.points).toBe(32000)
})
```

- [ ] **Step 1.2: Run tests to confirm failure**

```bash
cd /Users/tiffany/PersonalProjects/miniichi && npx vitest run src/engine/scorer.test.ts
```

Expected: dealer test fails (dealer === nonDealer currently). Yakuman test passes if seatWind is already 'S', otherwise fails.

- [ ] **Step 1.3: Implement dealer scoring in `scorer.ts`**

Replace the entire `hanFuToPoints` function and update `scoreSelection`:

```typescript
// In scorer.ts — replace hanFuToPoints and update scoreSelection

export function hanFuToPoints(han: number, fu: number, dealer: boolean): number {
  if (dealer) {
    if (han >= 13) return 48000
    if (han >= 11) return 36000
    if (han >= 8)  return 24000
    if (han >= 6)  return 18000
    if (han >= 5)  return 12000
    const raw = fu * Math.pow(2, han + 2)
    if (raw >= 8000) return 12000
    const ndPts = Math.ceil(raw / 100) * 100
    return Math.ceil(ndPts * 1.5 / 100) * 100
  } else {
    if (han >= 13) return 32000
    if (han >= 11) return 24000
    if (han >= 8)  return 16000
    if (han >= 6)  return 12000
    if (han >= 5)  return 8000
    const raw = fu * Math.pow(2, han + 2)
    if (raw >= 8000) return 8000
    return Math.ceil(raw / 100) * 100
  }
}
```

In `scoreSelection`, add `dealer` derivation and pass it:

```typescript
export function scoreSelection(
  tiles: Tile[],
  lockedMelds: Meld[],
  doraIndicators: Tile[],
  ctx: Ctx
): Solution | null {
  const dealer = ctx.seatWind === 'E'          // ← add this line
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
    const points = hanFuToPoints(han, fu, dealer)   // ← pass dealer
    if (best === null || points > best.points) {
      best = { tiles, hand, yaku, han, fu, points }
    }
  }
  return best
}
```

- [ ] **Step 1.4: Run tests to confirm they pass**

```bash
npx vitest run src/engine/scorer.test.ts
```

Expected: all scorer tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/engine/scorer.ts src/engine/scorer.test.ts
git commit -m "feat(engine): add dealer scoring to hanFuToPoints"
```

---

## Task 2: New Scorer Tests (Iipeikou + Sanshoku Doukou)

**Files:**
- Modify: `src/engine/scorer.test.ts`

- [ ] **Step 2.1: Add the two new tests**

Append inside `describe('scoreSelection', ...)` in `src/engine/scorer.test.ts`:

```typescript
it('detects Iipeikou and scores correctly', () => {
  // [2M 3M 4M] [2M 3M 4M] [6P 7P 8P] [1S 2S 3S] pair: dragon('G') (Hatsu)
  // Hatsu pair does NOT give Yakuhai (need a triplet); s(1) blocks Tanyao; Hatsu pair blocks Pinfu
  // Only yaku: Iipeikou (1 han closed)
  const tiles = [m(2),m(3),m(4), m(2),m(3),m(4), p(6),p(7),p(8), s(1),s(2),s(3), dragon('G'),dragon('G')]
  const sol = scoreSelection(tiles, [], [], { seatWind: 'S', roundWind: 'E' })!
  expect(sol).not.toBeNull()
  expect(sol.yaku.map(y => y.name)).toContain('Iipeikou')
  expect(sol.han).toBeGreaterThanOrEqual(1)
})

it('detects Sanshoku Doukou for the same triplet in all three suits', () => {
  // [3M 3M 3M] [3P 3P 3P] [3S 3S 3S] [5M 6M 7M] pair: m(9) m(9)
  // Sanshoku Doukou (2 han); sequence present so Toitoi does not apply
  const tiles = [m(3),m(3),m(3), p(3),p(3),p(3), s(3),s(3),s(3), m(5),m(6),m(7), m(9),m(9)]
  const sol = scoreSelection(tiles, [], [], { seatWind: 'S', roundWind: 'E' })!
  expect(sol).not.toBeNull()
  expect(sol.yaku.map(y => y.name)).toContain('Sanshoku Doukou')
  expect(sol.han).toBeGreaterThanOrEqual(2)
})
```

- [ ] **Step 2.2: Run tests**

```bash
npx vitest run src/engine/scorer.test.ts
```

Expected: both new tests pass (the engine already implements these yaku). If either fails, investigate `src/engine/yaku.ts` for the relevant detection logic before proceeding.

- [ ] **Step 2.3: Commit**

```bash
git add src/engine/scorer.test.ts
git commit -m "test(engine): add Iipeikou and Sanshoku Doukou scorer tests"
```

---

## Task 3: Tile Identity — Store Refactor

This task replaces the value-based tile selection model with index-based. The store tests will be updated first (they'll fail), then the store implementation is updated to make them pass. **Note:** TileGrid and HandSlots will have TypeScript errors after this step until Task 4 is complete — that is expected.

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

- [ ] **Step 3.1: Update store tests to use the new index-based API**

Replace the entire contents of `src/store/gameStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { generatePuzzle } from '../engine/generator'

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState())
  })

  it('starts in playing phase after loadPuzzle', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    expect(useGameStore.getState().phase).toBe('playing')
  })

  it('loadPuzzle sets puzzle and pre-selects locked tiles by index', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const state = useGameStore.getState()
    expect(state.puzzle).toBe(puzzle)
    // locked tiles are pre-selected
    const lockedCount = puzzle.lockedMelds.reduce((sum, m) => sum + m.tiles.length, 0)
    expect(state.selectedIndices.size).toBe(lockedCount)
    // all locked indices are in selectedIndices
    state.lockedIndices.forEach(i => {
      expect(state.selectedIndices.has(i)).toBe(true)
    })
  })

  it('toggling a free tile adds it to selectedIndices', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const { lockedIndices } = useGameStore.getState()
    // find first non-locked index
    const freeIdx = puzzle.tiles.findIndex((_, i) => !lockedIndices.has(i))
    useGameStore.getState().toggleTile(freeIdx)
    expect(useGameStore.getState().selectedIndices.has(freeIdx)).toBe(true)
  })

  it('toggling a tile twice deselects it', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const { lockedIndices } = useGameStore.getState()
    const freeIdx = puzzle.tiles.findIndex((_, i) => !lockedIndices.has(i))
    useGameStore.getState().toggleTile(freeIdx)
    useGameStore.getState().toggleTile(freeIdx)
    expect(useGameStore.getState().selectedIndices.has(freeIdx)).toBe(false)
  })

  it('locked tile indices cannot be toggled off', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const { lockedIndices } = useGameStore.getState()
    if (lockedIndices.size > 0) {
      const lockedIdx = [...lockedIndices][0]
      useGameStore.getState().toggleTile(lockedIdx)
      expect(useGameStore.getState().selectedIndices.has(lockedIdx)).toBe(true)
    }
  })

  it('commitHand transitions to committed phase', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const validIndices = puzzle.solutions[0].tiles.map(tile =>
      puzzle.tiles.findIndex((t, i) => t.suit === tile.suit && t.value === tile.value &&
        !useGameStore.getState().selectedIndices.has(i))
    )
    // set selectedIndices to the solution's tile indices directly
    const bestTiles = puzzle.solutions[0].tiles
    const indices = new Set<number>()
    const used = new Set<number>()
    for (const tile of bestTiles) {
      const idx = puzzle.tiles.findIndex((t, i) => !used.has(i) && t.suit === tile.suit && t.value === tile.value)
      if (idx !== -1) { indices.add(idx); used.add(idx) }
    }
    useGameStore.setState({ selectedIndices: indices, phase: 'playing' })
    useGameStore.getState().commitHand()
    expect(useGameStore.getState().phase).toBe('committed')
    expect(useGameStore.getState().submittedSolution).not.toBeNull()
  })

  it('commitHand with invalid hand sets error message', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    // force first 14 indices selected (likely invalid)
    useGameStore.setState({
      selectedIndices: new Set([0,1,2,3,4,5,6,7,8,9,10,11,12,13]),
      phase: 'playing'
    })
    useGameStore.getState().commitHand()
    const state = useGameStore.getState()
    if (state.phase === 'playing') {
      expect(state.errorMessage).toBeTruthy()
    }
  })

  it('resetHand restores selectedIndices to locked only and clears error', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const { lockedIndices } = useGameStore.getState()
    // select some free tile
    const freeIdx = puzzle.tiles.findIndex((_, i) => !lockedIndices.has(i))
    useGameStore.getState().toggleTile(freeIdx)
    useGameStore.setState({ errorMessage: 'some error' })
    useGameStore.getState().resetHand()
    const state = useGameStore.getState()
    expect(state.selectedIndices.size).toBe(lockedIndices.size)
    expect(state.errorMessage).toBeNull()
  })
})
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
npx vitest run src/store/gameStore.test.ts
```

Expected: multiple failures (selectedIndices doesn't exist yet, phase is 'idle' not 'playing', etc.)

- [ ] **Step 3.3: Rewrite `gameStore.ts` with the new model**

Replace the entire file:

```typescript
import { create } from 'zustand'
import type { Puzzle, Tile, Solution } from '../engine/types'
import { tileEquals } from '../engine/tiles'
import { scoreSelection } from '../engine/scorer'

type Phase = 'playing' | 'committed'
type Mode = 'daily' | 'practice'

type SavedResult = { elapsed: number; selectedIndices: number[] }

interface GameState {
  puzzle: Puzzle | null
  selectedIndices: Set<number>
  lockedIndices: Set<number>
  phase: Phase
  mode: Mode
  timerStartedAt: number | null
  accumulatedMs: number
  elapsed: number
  submittedSolution: Solution | null
  errorMessage: string | null

  loadPuzzle: (puzzle: Puzzle, mode?: Mode, savedResult?: SavedResult) => void
  toggleTile: (index: number) => void
  commitHand: () => void
  resetHand: () => void
  pauseTimer: () => void
  resumeTimer: () => void
  getInitialState: () => Omit<GameState,
    'loadPuzzle' | 'toggleTile' | 'commitHand' | 'resetHand' |
    'pauseTimer' | 'resumeTimer' | 'getInitialState'>
}

function computeLockedIndices(puzzle: Puzzle): Set<number> {
  const lockedTiles = puzzle.lockedMelds.flatMap(m => m.tiles)
  const assigned = new Set<number>()
  for (const lockedTile of lockedTiles) {
    for (let i = 0; i < puzzle.tiles.length; i++) {
      if (!assigned.has(i) && tileEquals(puzzle.tiles[i], lockedTile)) {
        assigned.add(i)
        break
      }
    }
  }
  return assigned
}

const INITIAL = {
  puzzle: null,
  selectedIndices: new Set<number>(),
  lockedIndices: new Set<number>(),
  phase: 'playing' as Phase,
  mode: 'daily' as Mode,
  timerStartedAt: null,
  accumulatedMs: 0,
  elapsed: 0,
  submittedSolution: null,
  errorMessage: null,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL,

  getInitialState: () => ({ ...INITIAL }),

  loadPuzzle: (puzzle, mode = 'daily', savedResult) => {
    const lockedIndices = computeLockedIndices(puzzle)

    if (savedResult) {
      const selectedIndices = new Set(savedResult.selectedIndices)
      const tiles = [...selectedIndices].sort((a, b) => a - b).map(i => puzzle.tiles[i])
      const sol = scoreSelection(
        tiles, puzzle.lockedMelds, puzzle.doraIndicators,
        { seatWind: puzzle.seatWind, roundWind: puzzle.roundWind }
      )
      set({
        ...INITIAL,
        puzzle, mode, lockedIndices, selectedIndices,
        phase: 'committed',
        elapsed: savedResult.elapsed,
        submittedSolution: sol,
        timerStartedAt: null,
        accumulatedMs: 0,
      })
      return
    }

    set({
      ...INITIAL,
      puzzle, mode, lockedIndices,
      selectedIndices: new Set(lockedIndices),
      phase: 'playing',
      timerStartedAt: Date.now(),
      accumulatedMs: 0,
    })
  },

  toggleTile: (index) => {
    const { puzzle, selectedIndices, lockedIndices, phase } = get()
    if (!puzzle || phase === 'committed') return
    if (lockedIndices.has(index)) return

    const next = new Set(selectedIndices)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    set({ selectedIndices: next, errorMessage: null })
  },

  commitHand: () => {
    const { puzzle, selectedIndices, timerStartedAt, accumulatedMs } = get()
    if (!puzzle) return

    const elapsed = Math.floor(
      (accumulatedMs + (timerStartedAt ? Date.now() - timerStartedAt : 0)) / 1000
    )
    get().pauseTimer()

    const tiles = [...selectedIndices].sort((a, b) => a - b).map(i => puzzle.tiles[i])
    const sol = scoreSelection(
      tiles, puzzle.lockedMelds, puzzle.doraIndicators,
      { seatWind: puzzle.seatWind, roundWind: puzzle.roundWind }
    )

    if (!sol) {
      set({ errorMessage: 'Not a valid winning hand — check for a complete structure and at least one yaku.' })
      return
    }

    set({ phase: 'committed', elapsed, submittedSolution: sol, errorMessage: null })

    if (get().mode === 'daily') {
      const key = `miniichi-daily-${new Date().toISOString().slice(0, 10)}`
      localStorage.setItem(key, JSON.stringify({
        points: sol.points,
        elapsed,
        selectedIndices: [...selectedIndices].sort((a, b) => a - b),
      }))
    }
  },

  resetHand: () => {
    const { lockedIndices } = get()
    set({ selectedIndices: new Set(lockedIndices), errorMessage: null })
  },

  pauseTimer: () => {
    const { timerStartedAt, accumulatedMs } = get()
    if (timerStartedAt === null) return
    set({ accumulatedMs: accumulatedMs + (Date.now() - timerStartedAt), timerStartedAt: null })
  },

  resumeTimer: () => {
    const { timerStartedAt, phase } = get()
    if (timerStartedAt !== null || phase === 'committed') return
    set({ timerStartedAt: Date.now() })
  },
}))
```

- [ ] **Step 3.4: Run store tests**

```bash
npx vitest run src/store/gameStore.test.ts
```

Expected: all tests pass. If TypeScript errors appear from TileGrid/HandSlots referencing old fields, that's expected — those get fixed in Task 4.

- [ ] **Step 3.5: Run all tests**

```bash
npx vitest run
```

Note: TileGrid and HandSlots will have TypeScript compile errors at this point. That is expected. Proceed to Task 4.

---

## Task 4: Tile Identity — Component Wiring

Update TileGrid and HandSlots to use the new index-based API. Also add the Reset button to HandSlots.

**Files:**
- Modify: `src/components/TileGrid.tsx`
- Modify: `src/components/HandSlots.tsx`

- [ ] **Step 4.1: Update `TileGrid.tsx`**

Replace entire file:

```typescript
import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'

export default function TileGrid() {
  const { puzzle, selectedIndices, lockedIndices, phase, toggleTile } = useGameStore()
  if (!puzzle) return null

  return (
    <div className="tile-grid">
      {puzzle.tiles.map((tile, i) => (
        <button
          key={i}
          className={[
            'tile',
            tile.suit,
            selectedIndices.has(i) ? 'selected' : '',
            lockedIndices.has(i) ? 'locked' : '',
          ].join(' ')}
          onClick={() => phase !== 'committed' && toggleTile(i)}
          disabled={phase === 'committed'}
        >
          {tileDisplay(tile)}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4.2: Update `HandSlots.tsx`**

Replace entire file:

```typescript
import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'

export default function HandSlots() {
  const { puzzle, selectedIndices, lockedIndices, phase, commitHand, resetHand, errorMessage } = useGameStore()
  if (!puzzle) return null

  const lockedTiles = [...lockedIndices].sort((a, b) => a - b).map(i => puzzle.tiles[i])
  const freeTiles = [...selectedIndices]
    .filter(i => !lockedIndices.has(i))
    .sort((a, b) => a - b)
    .map(i => puzzle.tiles[i])
  const emptySlots = 14 - selectedIndices.size

  const isReady = selectedIndices.size === 14
  const canReset = selectedIndices.size > lockedIndices.size

  return (
    <div className="hand-area">
      <div className="hand-slots">
        {lockedTiles.map((tile, i) => (
          <span key={`locked-${i}`} className="tile locked">
            {tileDisplay(tile)}
          </span>
        ))}
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
      <div className="hand-actions">
        <button
          className="reset-button"
          disabled={!canReset || phase === 'committed'}
          onClick={resetHand}
        >
          Reset
        </button>
        <button
          className="commit-button"
          disabled={!isReady || phase === 'committed'}
          onClick={commitHand}
        >
          Commit Hand
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4.3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass and no TypeScript errors.

- [ ] **Step 4.4: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts \
  src/components/TileGrid.tsx src/components/HandSlots.tsx
git commit -m "feat: fix tile selection identity bug using index-based model; add reset button"
```

---

## Task 5: Timer Refactor

Update `ContextBar` to use the new timer model. The store changes were already done in Task 3.

**Files:**
- Modify: `src/components/ContextBar.tsx`

- [ ] **Step 5.1: Update `ContextBar.tsx`**

Replace entire file:

```typescript
import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import type { Tile } from '../engine/types'

function tileLabel(tile: Tile): string {
  if (tile.suit === 'wind') return `${tile.value} wind`
  if (tile.suit === 'dragon') {
    return ({ W: 'Haku', G: 'Hatsu', R: 'Chun' } as Record<string, string>)[tile.value] ?? tile.value
  }
  return `${tile.value} ${tile.suit}`
}

function windLabel(w: string): string {
  return { E: 'East', S: 'South', W: 'West', N: 'North' }[w] ?? w
}

export default function ContextBar() {
  const { puzzle, phase, elapsed, pauseTimer, resumeTimer } = useGameStore()
  const [display, setDisplay] = useState(0)

  // Tick the display every second while playing
  useEffect(() => {
    if (phase === 'committed') return
    const interval = setInterval(() => {
      const { timerStartedAt, accumulatedMs } = useGameStore.getState()
      const secs = Math.floor(
        (accumulatedMs + (timerStartedAt ? Date.now() - timerStartedAt : 0)) / 1000
      )
      setDisplay(secs)
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  // Pause/resume on tab visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pauseTimer()
      } else {
        resumeTimer()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [pauseTimer, resumeTimer])

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

- [ ] **Step 5.2: Run all tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/ContextBar.tsx
git commit -m "feat: timer starts on puzzle load with pause/resume on visibility change"
```

---

## Task 6: Routing — Buttons to Links

Convert the home page navigation buttons to `<a>` links and add `/daily` + `/random` path routing in `App.tsx`.

**Files:**
- Modify: `src/components/HomePage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 6.1: Update `HomePage.tsx`**

Replace entire file:

```typescript
export default function HomePage() {
  const cacheKey = `miniichi-daily-${new Date().toISOString().slice(0, 10)}`
  const dailyCache = localStorage.getItem(cacheKey)
  const dailyResult: { points: number; elapsed: number } | null = dailyCache
    ? JSON.parse(dailyCache)
    : null

  return (
    <div className="home-page">
      <h1>Miniichi</h1>
      <p>Find the highest-scoring winning hand from 24 tiles.</p>
      <a href="/daily" className="daily-button">
        {dailyResult
          ? `Today's Puzzle — ${dailyResult.points.toLocaleString()} pts`
          : "Today's Puzzle"}
      </a>
      <a href="/random" className="practice-button">
        Practice
      </a>
    </div>
  )
}
```

- [ ] **Step 6.2: Update `App.tsx`**

Replace entire file:

```typescript
import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { generatePuzzle } from './engine/generator'
import { seedFromPuzzleNumber, seedFromHex, puzzleNumberFromDate } from './engine/seed'
import HomePage from './components/HomePage'
import GamePage from './components/GamePage'

export default function App() {
  const { puzzle, loadPuzzle } = useGameStore()

  useEffect(() => {
    const pathname = window.location.pathname
    const params = new URLSearchParams(window.location.search)
    const pParam = params.get('p')
    const seedParam = params.get('seed')

    if (pathname === '/daily') {
      const n = puzzleNumberFromDate(new Date())
      const seed = seedFromPuzzleNumber(n)
      const puzz = generatePuzzle(seed)
      const key = `miniichi-daily-${new Date().toISOString().slice(0, 10)}`
      const cached = localStorage.getItem(key)
      if (cached) {
        const saved = JSON.parse(cached)
        if (Array.isArray(saved.selectedIndices)) {
          loadPuzzle(puzz, 'daily', { elapsed: saved.elapsed, selectedIndices: saved.selectedIndices })
        } else {
          loadPuzzle(puzz, 'daily')
        }
      } else {
        loadPuzzle(puzz, 'daily')
      }
      window.history.replaceState({}, '', `/?p=${n}`)

    } else if (pathname === '/random') {
      const seed = Math.floor(Math.random() * 0xFFFFFFFF)
      const seedHex = seed.toString(16).padStart(8, '0')
      loadPuzzle(generatePuzzle(seed), 'practice')
      window.history.replaceState({}, '', `/?seed=${seedHex}`)

    } else if (pParam) {
      const n = parseInt(pParam, 10)
      if (!isNaN(n)) {
        loadPuzzle(generatePuzzle(seedFromPuzzleNumber(n)), 'daily')
      }

    } else if (seedParam) {
      loadPuzzle(generatePuzzle(seedFromHex(seedParam)), 'practice')
    }
    // No params → show home screen
  }, [])

  if (!puzzle) return <HomePage />
  return <GamePage />
}
```

- [ ] **Step 6.3: Run all tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 6.4: Commit**

```bash
git add src/components/HomePage.tsx src/App.tsx
git commit -m "feat: convert nav buttons to links; add /daily and /random routing"
```

---

## Task 7: Final Verification

- [ ] **Step 7.1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 7.2: Build to confirm no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7.3: Smoke-test in browser**

```bash
npm run dev
```

Verify manually:
- Home page has two `<a>` links (right-click → "Open in New Tab" works)
- Navigating to `/daily` loads a puzzle, timer starts immediately
- Switching tabs pauses the timer; returning resumes it
- Selecting a tile selects only that specific tile (not all same-value tiles)
- Reset button clears selection but timer keeps running
- Committing a hand with seat wind East shows higher points than South (dealer bonus)
- `/?p=N` and `/?seed=HEX` still work for sharing
