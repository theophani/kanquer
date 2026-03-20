# HandSlots: Selection Order + Click-to-Deselect

**Date:** 2026-03-20
**Status:** Approved

## Summary

Two related improvements to HandSlots:
1. Tiles in the hand display in the order they were selected (not sorted by puzzle index)
2. Clicking a tile in the hand deselects it (same behavior as clicking it in TileGrid)

Both features require knowing the puzzle index for each hand tile. The root change is replacing `selectedIndices: Set<number>` with `selectedIndices: number[]` so insertion order is preserved intrinsically.

---

## Store (`gameStore.ts`)

**Type change:** `selectedIndices: Set<number>` → `selectedIndices: number[]`

**`toggleTile`:**
- Membership check: `.has(index)` → `.includes(index)`
- Cap check: `selectedIndices.size >= 14` → `selectedIndices.length >= 14`
- Two branches replace the `new Set` mutation pattern:

```ts
// remove branch (filter returns a new array — must be assigned)
const next = selectedIndices.filter(i => i !== index)

// add branch
const next = [...selectedIndices, index]
```

**`resetHand`:** `new Set(lockedIndices)` → `[...lockedIndices]`

**`loadPuzzle` (normal path):** `selectedIndices: new Set(lockedIndices)` → `selectedIndices: [...lockedIndices]`

**`loadPuzzle` (savedResult path):** `new Set(savedResult.selectedIndices)` → `[...savedResult.selectedIndices]`; scoring already spreads and sorts the array, no change needed there.

**`getInitialState`:** `selectedIndices: new Set<number>()` → `selectedIndices: []`

**`INITIAL`:** `selectedIndices: new Set<number>()` → `selectedIndices: [] as number[]`

---

## TileGrid (`TileGrid.tsx`)

Single change: `selectedIndices.has(i)` → `selectedIndices.includes(i)`

---

## HandSlots (`HandSlots.tsx`)

**Size references:** Three lines use `selectedIndices.size` — change all to `.length`:
- `const emptySlots = 14 - selectedIndices.length`
- `const isReady = selectedIndices.length === 14`
- `const canReset = selectedIndices.length > lockedIndices.size` (lockedIndices stays a Set)

**Free tile derivation:** Rename `freeTiles` to `freeTileEntries` (the shape changes from `Tile[]` to `{ index: number, tile: Tile }[]`). Remove `.sort((a, b) => a - b)` to preserve selection order. Keep the index alongside the tile so it can be passed to `toggleTile`.

```tsx
const freeTileEntries = [...selectedIndices]
  .filter(i => !lockedIndices.has(i))
  .map(i => ({ index: i, tile: puzzle.tiles[i] }))
```

**Rendering:** Change free tile `<span>` to `<button>` with `onClick={() => toggleTile(index)}`. Add `toggleTile` to the `useGameStore` destructure on line 5.

**Locked tiles** remain non-interactive `<span>` elements.

---

## Tests (`gameStore.test.ts`)

Replace all Set-specific API calls on `selectedIndices` with array equivalents:

| Before | After |
|--------|-------|
| `selectedIndices.size` | `selectedIndices.length` |
| `selectedIndices.has(i)` | `selectedIndices.includes(i)` |
| `new Set([0,1,...,13])` (direct setState) | `[0,1,...,13]` |
| `const indices = new Set<number>()` + `indices.add(idx)` (commitHand test) | `const indices: number[] = []` + `indices.push(idx)` |
| `useGameStore.setState({ selectedIndices: indices, ... })` (commitHand test) | unchanged — `indices` is now already `number[]` |
| `selectedIndices.size` (cap test) | `selectedIndices.length` |
| `selectedIndices.has(i)` (cap test) | `selectedIndices.includes(i)` |

The `lockedIndices` field remains a `Set<number>` — no changes to assertions about it.

---

## Out of Scope

- Locked tile order (locked tiles are always pre-sorted by puzzle index; order is not meaningful here)
- Visual styling for the new clickable hand tiles (use existing `selected` class behavior)
