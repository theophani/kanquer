# HandSlots Selection Order + Click-to-Deselect Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display hand tiles in selection order and allow deselecting them by clicking, by replacing `selectedIndices: Set<number>` with `selectedIndices: number[]` throughout the store and its consumers.

**Architecture:** The type change flows outward from the store: store first (with its tests), then the two consumers (TileGrid, HandSlots). Each task is independently committable. The store and its tests must change together since TypeScript will error if they diverge.

**Tech Stack:** React 18, TypeScript (strict), Zustand, Vitest, Vite

**Spec:** `docs/superpowers/specs/2026-03-20-handslots-selection-order-deselect-design.md`

---

## File Map

| File | What changes |
|------|-------------|
| `src/store/gameStore.ts` | `selectedIndices` type → `number[]`; all Set operations → array equivalents |
| `src/store/gameStore.test.ts` | All `.has()` → `.includes()`, `.size` → `.length`, `new Set(...)` → `[...]` |
| `src/components/TileGrid.tsx` | `selectedIndices.has(i)` → `selectedIndices.includes(i)` |
| `src/components/HandSlots.tsx` | `.size` → `.length` (3×); `freeTiles` → `freeTileEntries` with index; `<span>` → `<button>` with `onClick` |

---

## Task 1: Update store and tests

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

- [ ] **Step 1: Update tests to use array API**

In `src/store/gameStore.test.ts`, make the following changes:

*Line 22* — `selectedIndices.size` → `selectedIndices.length`:
```ts
expect(state.selectedIndices.length).toBe(lockedCount)
```

*Line 24* — `selectedIndices.has(i)` → `selectedIndices.includes(i)`:
```ts
expect(state.selectedIndices.includes(i)).toBe(true)
```

*Line 34* — `selectedIndices.has(freeIdx)` → `selectedIndices.includes(freeIdx)`:
```ts
expect(useGameStore.getState().selectedIndices.includes(freeIdx)).toBe(true)
```

*Line 44* — `selectedIndices.has(freeIdx)` → `selectedIndices.includes(freeIdx)`:
```ts
expect(useGameStore.getState().selectedIndices.includes(freeIdx)).toBe(false)
```

*Line 54* — `selectedIndices.has(lockedIdx)` → `selectedIndices.includes(lockedIdx)`:
```ts
expect(useGameStore.getState().selectedIndices.includes(lockedIdx)).toBe(true)
```

*Lines 63-69* — replace `Set` accumulation with array accumulation, and pass array to `setState`:
```ts
const bestTiles = puzzle.solutions[0].tiles
const indices: number[] = []
const used = new Set<number>()
for (const tile of bestTiles) {
  const idx = puzzle.tiles.findIndex((t, i) => !used.has(i) && t.suit === tile.suit && t.value === tile.value)
  if (idx !== -1) { indices.push(idx); used.add(idx) }
}
useGameStore.setState({ selectedIndices: indices, phase: 'playing' })
```

*Line 79* — `new Set([0,1,...,13])` → plain array:
```ts
useGameStore.setState({
  selectedIndices: [0,1,2,3,4,5,6,7,8,9,10,11,12,13],
  phase: 'playing'
})
```

*Line 98* — `selectedIndices.size` → `selectedIndices.length`:
```ts
expect(state.selectedIndices.length).toBe(lockedIndices.size)
```

*Lines 108, 112, 116* — `selectedIndices.size` → `selectedIndices.length`:
```ts
let count = useGameStore.getState().selectedIndices.length
// ...
count = useGameStore.getState().selectedIndices.length
// ...
expect(useGameStore.getState().selectedIndices.length).toBe(14)
```

*Line 120* — `selectedIndices.has(i)` → `selectedIndices.includes(i)`:
```ts
(_, i) => !useGameStore.getState().selectedIndices.includes(i) && !lockedIndices.has(i)
```

*Line 124* — `selectedIndices.size` → `selectedIndices.length`:
```ts
expect(useGameStore.getState().selectedIndices.length).toBe(14)
```

- [ ] **Step 2: Run tests — expect TypeScript/runtime failures** (store still returns `Set`)

```bash
npm test
```

Expected: failures on `.includes is not a function` or TypeScript errors — confirms tests are driving the change.

- [ ] **Step 3: Update the store**

In `src/store/gameStore.ts`:

*Interface* — change type:
```ts
selectedIndices: number[]
```

*`INITIAL` constant*:
```ts
selectedIndices: [] as number[],
```

*`getInitialState`*:
```ts
selectedIndices: [] as number[],
```

*`loadPuzzle` normal path* — replace `new Set(lockedIndices)`:
```ts
selectedIndices: [...lockedIndices],
```

*`loadPuzzle` savedResult path* — replace `new Set(savedResult.selectedIndices)`:
```ts
const selectedIndices = [...savedResult.selectedIndices]
```
The scoring call below (`[...selectedIndices].sort(...)`) already works since `selectedIndices` is now an array — just spread it.

*`toggleTile`* — replace the Set mutation block:
```ts
toggleTile: (index) => {
  const { puzzle, selectedIndices, lockedIndices, phase } = get()
  if (!puzzle || phase === 'committed') return
  if (lockedIndices.has(index)) return
  if (!selectedIndices.includes(index) && selectedIndices.length >= 14) return

  const next = selectedIndices.includes(index)
    ? selectedIndices.filter(i => i !== index)
    : [...selectedIndices, index]
  set({ selectedIndices: next, errorMessage: null })
},
```

*`resetHand`* — replace `new Set(lockedIndices)`:
```ts
resetHand: () => {
  const { lockedIndices } = get()
  set({ selectedIndices: [...lockedIndices], errorMessage: null })
},
```

*`commitHand` lines 126 and 144* — **no text change needed**. Both lines spread and sort `selectedIndices` before use (`[...selectedIndices].sort(...)`), which works identically whether `selectedIndices` is a `Set` or `number[]`. Leave them as-is.

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "refactor: change selectedIndices from Set to number[] to preserve selection order"
```

---

## Task 2: Update TileGrid

**Files:**
- Modify: `src/components/TileGrid.tsx:17`

- [ ] **Step 1: Update the membership check**

In `src/components/TileGrid.tsx`, lines 13–18, change `.has(i)` to `.includes(i)`:

```tsx
className={[
  'tile',
  tile.suit,
  selectedIndices.includes(i) ? 'selected' : '',
  lockedIndices.has(i) ? 'locked' : '',
].join(' ')}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/TileGrid.tsx
git commit -m "fix: update TileGrid to use array includes for selectedIndices"
```

---

## Task 3: Update HandSlots

**Files:**
- Modify: `src/components/HandSlots.tsx`

- [ ] **Step 1: Update HandSlots**

Replace the entire file content with:

```tsx
import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'

export default function HandSlots() {
  const { puzzle, selectedIndices, lockedIndices, phase, commitHand, resetHand, errorMessage, toggleTile } = useGameStore()
  if (!puzzle) return null

  const lockedTiles = [...lockedIndices].sort((a, b) => a - b).map(i => puzzle.tiles[i])
  const freeTileEntries = [...selectedIndices]
    .filter(i => !lockedIndices.has(i))
    .map(i => ({ index: i, tile: puzzle.tiles[i] }))
  const emptySlots = 14 - selectedIndices.length

  const isReady = selectedIndices.length === 14
  const canReset = selectedIndices.length > lockedIndices.size

  return (
    <div className="hand-area">
      <div className="hand-slots">
        {lockedTiles.map((tile, i) => (
          <span key={`locked-${i}`} className="tile locked">
            {tileDisplay(tile)}
          </span>
        ))}
        {freeTileEntries.map(({ index, tile }) => (
          <button
            key={`free-${index}`}
            className={`tile ${tile.suit} selected`}
            onClick={() => toggleTile(index)}
            disabled={phase === 'committed'}
          >
            {tileDisplay(tile)}
          </button>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <span key={`empty-${i}`} className="tile empty">·</span>
        ))}
      </div>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {phase !== 'committed' && (
        <div className="hand-actions">
          <button
            className="reset-button"
            disabled={!canReset}
            onClick={resetHand}
          >
            Reset
          </button>
          <button
            className="commit-button"
            disabled={!isReady}
            onClick={commitHand}
          >
            Commit Hand
          </button>
        </div>
      )}
    </div>
  )
}
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

Verify manually:
1. Select a few tiles — they appear in the hand in the order you clicked them
2. Click a tile in the hand — it disappears from the hand and un-highlights in the grid
3. Re-select it — it reappears at the end of the hand
4. Reset button clears free tiles; locked tiles remain
5. Commit Hand works after selecting 14 tiles
6. After committing, clicking tiles in the hand does nothing (buttons are visually disabled)

- [ ] **Step 4: Commit**

```bash
git add src/components/HandSlots.tsx
git commit -m "feat: show hand tiles in selection order and allow click-to-deselect"
```
