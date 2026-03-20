# Fu Breakdown Display Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a per-component fu breakdown in the expanded score panel, and fix the scoring bug where open hands (with locked/called melds) incorrectly used 30 base fu instead of 20.

**Architecture:** Two tasks. Task 1 is purely engine-level (`fu.ts` + tests). Task 2 is purely display (`ScoreReveal.tsx`). No other files are touched.

**Tech Stack:** React 18, TypeScript (strict), Zustand, Vitest, Vite

**Spec:** `docs/superpowers/specs/2026-03-20-fu-breakdown-design.md`

---

## File Map

| File | What changes |
|------|-------------|
| `src/engine/fu.ts` | Fix `baseFu` for open hands; add `FuComponent` type + `getFuBreakdown` + private label helpers |
| `src/engine/fu.test.ts` | Fix existing open-hand test expectation; add open-base test; add `getFuBreakdown` tests |
| `src/components/ScoreReveal.tsx` | Import `getFuBreakdown`; compute breakdown; render `fu-breakdown` section in expanded panel |

---

## Task 1: Fix `baseFu` and add `getFuBreakdown` to `fu.ts`

**Files:**
- Modify: `src/engine/fu.ts`
- Modify: `src/engine/fu.test.ts`

- [ ] **Step 1: Fix the existing open-hand test expectation**

In `src/engine/fu.test.ts`, update the "open triplet of simples" test. This test has one open meld, so with the bug fix the base becomes 20 (not 30):

```ts
it('open triplet of simples: +2 fu each', () => {
  const hand: Hand = {
    structure: 'standard',
    melds: [tri([m(5),m(5),m(5)], true), seq([p(3),p(4),p(5)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
    seatWind: 'S', roundWind: 'E',
  }
  // 20 base (open hand) + 2 (open simples triplet) = 22 → 30
  expect(calculateFu(hand)).toBe(30)
})
```

- [ ] **Step 2: Add a new test for open-hand base fu**

```ts
it('open hand: base is 20 fu', () => {
  const hand: Hand = {
    structure: 'standard',
    melds: [seq([m(2),m(3),m(4)], true), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
    seatWind: 'S', roundWind: 'E',
  }
  // 20 base (open hand) + 0 pair + 0 melds = 20 → 20
  expect(calculateFu(hand)).toBe(20)
})
```

- [ ] **Step 3: Add `getFuBreakdown` tests**

Add `getFuBreakdown` to the import at the top of `fu.test.ts`:

```ts
import { calculateFu, getFuBreakdown } from './fu'
```

Add a new describe block:

```ts
describe('getFuBreakdown', () => {
  it('chiitoitsu returns single Chiitoitsu row', () => {
    const hand: Hand = {
      structure: 'chiitoitsu',
      pairs: [[m(1),m(1)],[m(3),m(3)],[p(2),p(2)],[p(4),p(4)],[s(6),s(6)],[s(8),s(8)],[E,E]],
      seatWind: 'E', roundWind: 'E',
    }
    expect(getFuBreakdown(hand)).toEqual([{ label: 'Chiitoitsu', fu: 25 }])
  })

  it('kokushi returns empty array', () => {
    const hand: Hand = {
      structure: 'kokushi',
      tiles: [m(1),m(9),p(1),p(9),s(1),s(9),E,E,E,E,E,E,E,E],
      seatWind: 'E', roundWind: 'E',
    }
    expect(getFuBreakdown(hand)).toEqual([])
  })

  it('closed hand with all sequences and simple pair: base only', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(getFuBreakdown(hand)).toEqual([
      { label: 'Base (closed ron)', fu: 30 },
    ])
  })

  it('open hand: base label says open hand', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)], true), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(getFuBreakdown(hand)).toEqual([
      { label: 'Base (open hand)', fu: 20 },
    ])
  })

  it('dragon pair adds a labeled row', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([Haku,Haku])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(getFuBreakdown(hand)).toEqual([
      { label: 'Base (closed ron)', fu: 30 },
      { label: 'Pair — White dragon', fu: 2 },
    ])
  })

  it('seat wind pair labeled correctly', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([E,E])],
      seatWind: 'E', roundWind: 'S',
    }
    expect(getFuBreakdown(hand)).toEqual([
      { label: 'Base (closed ron)', fu: 30 },
      { label: 'Pair — East wind (seat)', fu: 2 },
    ])
  })

  it('closed terminal triplet adds labeled row', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [tri([m(1),m(1),m(1)], false), seq([p(3),p(4),p(5)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(getFuBreakdown(hand)).toEqual([
      { label: 'Base (closed ron)', fu: 30 },
      { label: 'Triplet — 1m (closed, terminal)', fu: 8 },
    ])
  })

  it('seat and round wind pair labeled with both', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([E,E])],
      seatWind: 'E', roundWind: 'E',
    }
    expect(getFuBreakdown(hand)).toEqual([
      { label: 'Base (closed ron)', fu: 30 },
      { label: 'Pair — East wind (seat & round)', fu: 4 },
    ])
  })

  it('round wind pair (not seat) labeled with round only', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([E,E])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(getFuBreakdown(hand)).toEqual([
      { label: 'Base (closed ron)', fu: 30 },
      { label: 'Pair — East wind (round)', fu: 2 },
    ])
  })

  it('open simple triplet adds labeled row', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [tri([m(5),m(5),m(5)], true), seq([p(3),p(4),p(5)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(getFuBreakdown(hand)).toEqual([
      { label: 'Base (open hand)', fu: 20 },
      { label: 'Triplet — 5m (open)', fu: 2 },
    ])
  })
})
```

- [ ] **Step 4: Run tests — expect failures** (function not yet exported)

```bash
npm test
```

Expected: `getFuBreakdown is not a function` / import errors, and the updated `calculateFu` test now expects 30 but gets 40.

- [ ] **Step 5: Fix `baseFu` in `fu.ts`**

Change `let fu = 30` to:

```ts
const isOpen = hand.melds.some(m => m.open)
let fu = isOpen ? 20 : 30
```

- [ ] **Step 6: Add `FuComponent` type and `getFuBreakdown` to `fu.ts`**

Add before the existing `calculateFu`:

```ts
export type FuComponent = { label: string; fu: number }
```

Add after the existing `calculateFu`:

```ts
export function getFuBreakdown(hand: Hand): FuComponent[] {
  if (hand.structure === 'chiitoitsu') return [{ label: 'Chiitoitsu', fu: 25 }]
  if (hand.structure === 'kokushi') return []

  const isOpen = hand.melds.some(m => m.open)
  const components: FuComponent[] = [
    { label: isOpen ? 'Base (open hand)' : 'Base (closed ron)', fu: isOpen ? 20 : 30 },
  ]

  const pair = hand.melds.find(m => m.type === 'pair')!
  const pairFuVal = pairFu(pair, hand.seatWind, hand.roundWind)
  if (pairFuVal > 0) {
    components.push({ label: describePairLabel(pair, hand.seatWind, hand.roundWind), fu: pairFuVal })
  }

  for (const meld of hand.melds.filter(m => m.type !== 'pair')) {
    const meldFuVal = meldFu(meld)
    if (meldFuVal > 0) {
      components.push({ label: describeMeldLabel(meld), fu: meldFuVal })
    }
  }

  return components
}

function describeTile(tile: Tile): string {
  if (tile.suit === 'man') return `${tile.value}m`
  if (tile.suit === 'pin') return `${tile.value}p`
  if (tile.suit === 'sou') return `${tile.value}s`
  if (tile.suit === 'wind') {
    const names: Record<string, string> = { E: 'East', S: 'South', W: 'West', N: 'North' }
    return `${names[tile.value as string]} wind`
  }
  const names: Record<string, string> = { W: 'White', G: 'Green', R: 'Red' }
  return `${names[tile.value as string]} dragon`
}

function describePairLabel(pair: Meld, seatWind: string, roundWind: string): string {
  const tile = pair.tiles[0]
  const name = describeTile(tile)
  if (tile.suit === 'wind') {
    const isSeat = tile.value === seatWind
    const isRound = tile.value === roundWind
    if (isSeat && isRound) return `Pair — ${name} (seat & round)`
    if (isSeat) return `Pair — ${name} (seat)`
    return `Pair — ${name} (round)`
  }
  return `Pair — ${name}`
}

function describeMeldLabel(meld: Meld): string {
  const tile = meld.tiles[0]
  const tileName = describeTile(tile)
  const openStr = meld.open ? 'open' : 'closed'
  const terminal = isTerminalOrHonor(tile) ? ', terminal' : ''
  return `Triplet — ${tileName} (${openStr}${terminal})`
}
```

Also update the import at the top of `fu.ts` to include `Tile` (needed by `describeTile`):

```ts
import type { Hand, Meld, Tile } from './types'
```

Note: `describePairLabel` receives `seatWind` and `roundWind` as `string` (the wind value strings like `'E'`, `'S'`). Comparison with `tile.value` works since both are the same union type underlying string.

- [ ] **Step 7: Run tests — expect all pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/engine/fu.ts src/engine/fu.test.ts
git commit -m "fix: use 20 base fu for open hands; add getFuBreakdown"
```

---

## Task 2: Add fu breakdown to ScoreReveal

**Files:**
- Modify: `src/components/ScoreReveal.tsx`

- [ ] **Step 1: Update ScoreReveal**

Add `getFuBreakdown` to the import at the top:

```tsx
import { getFuBreakdown } from '../engine/fu'
```

Add two derived values after the existing `const mm`/`const ss` lines:

```tsx
const fuComponents = getFuBreakdown(submittedSolution.hand)
const rawFu = fuComponents.reduce((sum, c) => sum + c.fu, 0)
```

In the `expanded` block, replace the `{/* TO DO: Show fu breakdown too */}` comment with:

```tsx
{fuComponents.length > 0 && (
  <div className="fu-breakdown">
    {fuComponents.map((c, i) => (
      <div key={i} className="fu-row">
        <span>{c.label}</span>
        <span>{c.fu} fu</span>
      </div>
    ))}
    <div className="fu-total">
      {rawFu !== submittedSolution.fu
        ? `${rawFu} → ${submittedSolution.fu} fu`
        : `${submittedSolution.fu} fu`}
    </div>
  </div>
)}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Smoke test in browser**

```bash
npm run dev
```

Verify:
1. Select 14 tiles forming a valid hand and commit
2. Open the "Details" panel — a fu breakdown section appears below the yaku list
3. Each contributing component (base, pair if valued, triplets) appears as a labeled row
4. The summary line shows `{raw} → {rounded} fu` if rounding occurred, or just `{fu} fu` if not
5. For a hand with locked (open) melds, base shows "Base (open hand) — 20 fu"
6. The fu-breakdown section is absent for a hand where `getFuBreakdown` returns `[]` (kokushi — rare but possible)

- [ ] **Step 4: Commit**

```bash
git add src/components/ScoreReveal.tsx
git commit -m "feat: show fu breakdown in expanded score panel"
```
