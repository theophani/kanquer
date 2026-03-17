# Kanquer Fixes & Improvements — Design Spec

**Date:** 2026-03-17

## Overview

Six improvements to the Kanquer Riichi Mahjong puzzle app, addressing bugs in tile selection and timer behavior, adding missing features (reset button, dealer scoring), improving navigation semantics (buttons → links), and expanding test coverage.

---

## 1. Tile Identity Fix (Selection Bug)

**Problem:** `toggleTile` compares tiles by value via `tileEquals`. When duplicate tiles exist in the puzzle (e.g., two `3M`), selecting one matches all of them by value, making duplicates impossible to individually select.

**Solution:** Change selection tracking from `selectedTiles: Tile[]` to `selectedIndices: Set<number>`, where each number is the index of a tile in `puzzle.tiles`. Store a parallel `lockedIndices: Set<number>` to know which indices are off-limits.

### Store changes (`gameStore.ts`)

**State shape:**
- Remove `selectedTiles: Tile[]`
- Add `selectedIndices: Set<number>` — indices into `puzzle.tiles`
- Add `lockedIndices: Set<number>` — computed once at `loadPuzzle`, never mutated
- Remove from `INITIAL`: `selectedTiles`
- Add to `INITIAL`: `selectedIndices: new Set()`, `lockedIndices: new Set()`
- Update `Omit` list in `getInitialState` type and `INITIAL` type to remove old fields and add new ones

**`loadPuzzle`:**
1. Compute `lockedIndices` by scanning `puzzle.tiles` left-to-right and matching against each tile in `puzzle.lockedMelds.flatMap(m => m.tiles)`. Use a consumed-count map keyed on `suit+value` (not just `value` alone — `WindValue` and `DragonValue` both contain `'W'`, so the key must be the full `suit+value` string, or use `tileEquals` for matching). For each meld tile, find the lowest index in `puzzle.tiles` with a matching tile that has not yet been consumed; mark it consumed.
2. Set `selectedIndices = new Set(lockedIndices)` (locked tiles start pre-selected).
3. Set `lockedIndices` in state.

**`toggleTile(index: number)`:**
- If `lockedIndices.has(index)` → return (no-op)
- If `selectedIndices.has(index)` → remove it; otherwise add it
- Clear `errorMessage`
- (Phase/timer logic changes in Section 2)

**`commitHand`:** reconstruct the tile array from `selectedIndices` before passing to `scoreSelection`:
```
const tiles = [...selectedIndices].sort((a,b) => a-b).map(i => puzzle.tiles[i])
```
Pass `tiles` to `scoreSelection` (replaces current `selectedTiles`).

**`getInitialState` / `INITIAL`:** updated to reflect new fields. The `Omit` union must also include `resetHand`, `pauseTimer`, `resumeTimer` (added in later sections).

**`Phase` type:** remove `'idle'` (timer starts immediately now — see Section 2). `type Phase = 'playing' | 'committed'`.

### Component changes

**`TileGrid.tsx`:**
- `onClick`: pass tile index (from `puzzle.tiles.indexOf` or the map index in `.map((tile, i) => ...)`) instead of tile value
- `isSelected(i: number)`: `selectedIndices.has(i)`
- `isLocked(i: number)`: `lockedIndices.has(i)`

**`HandSlots.tsx`:**
- Reconstruct display tiles: locked indices first (sorted numerically), then free selected indices (sorted numerically):
  ```
  const locked = [...lockedIndices].sort((a,b) => a-b).map(i => puzzle.tiles[i])
  const free = [...selectedIndices].filter(i => !lockedIndices.has(i)).sort((a,b) => a-b).map(i => puzzle.tiles[i])
  display = [...locked, ...free]
  ```
- Empty slots: `14 - selectedIndices.size`

### Test changes

**`gameStore.test.ts`:** Update all existing tests that reference `selectedTiles` or call `toggleTile(tile)` to use `selectedIndices` and `toggleTile(index)`.

---

## 2. Timer

**Problem:** Timer starts on first tile selection. Should start immediately when puzzle is shown, and should pause when the user navigates away (tab hidden or back to home).

**Solution:** Use accumulated-ms + segment-start tracking for pause/resume. Store `elapsed` as seconds (unchanged) to avoid breaking `ScoreReveal`.

### Store changes (`gameStore.ts`)

**State additions/changes:**
- Remove `startTime: number | null`
- Add `timerStartedAt: number | null` — `Date.now()` at start of current running segment; `null` when paused
- Add `accumulatedMs: number` — total elapsed ms across all completed segments
- `elapsed: number` — unchanged, still in **seconds**, frozen at commit

**`loadPuzzle`:** sets `timerStartedAt = Date.now()`, `accumulatedMs = 0`, `phase = 'playing'`. No more `'idle'` phase. The timer is running from this point — no separate `resumeTimer()` call is needed at load time.

**`resumeTimer()` call sites:** (1) `ContextBar.tsx` calls it when `visibilitychange` fires with `document.visibilityState === 'visible'`. (2) All other timer starts go through `loadPuzzle` directly. `toggleTile` no longer triggers timer start.

**`pauseTimer()`:**
- If `timerStartedAt === null` → no-op (already paused)
- Else: `accumulatedMs += Date.now() - timerStartedAt`, `timerStartedAt = null`

**`resumeTimer()`:**
- If `timerStartedAt !== null` → no-op (already running)
- Else: `timerStartedAt = Date.now()`

**`commitHand()`:**
- Compute `elapsed = Math.floor((accumulatedMs + (timerStartedAt ? Date.now() - timerStartedAt : 0)) / 1000)`
- Call `pauseTimer()` after recording elapsed

**`toggleTile`:** Remove the `startTime ?? Date.now()` logic and the `'idle' → 'playing'` phase transition (phase is always `'playing'` after `loadPuzzle`).

**`INITIAL`:** `timerStartedAt: null`, `accumulatedMs: 0`.

### Component changes

**`ContextBar.tsx`:**
- `useEffect` adds a `visibilitychange` listener: on `hidden` call `pauseTimer()`, on `visible` call `resumeTimer()`.
- Live display: `setInterval` reads `timerStartedAt` and `accumulatedMs` **from the store** on each tick (not captured at effect setup time) to compute `Math.floor((accumulatedMs + (timerStartedAt ? Date.now() - timerStartedAt : 0)) / 1000)`. After commit, shows frozen `elapsed`.
- Cleanup: remove listener and clear interval on unmount.

**Note:** The `accumulatedMs` / `timerStartedAt` null-guard in the display formula handles the paused state correctly (contributes 0 when paused).

---

## 3. Reset Button

**Problem:** No way to clear the current hand selection without starting a new puzzle. Timer should keep running after reset.

**Solution:** Add `resetHand()` to the store and a Reset button in `HandSlots`.

### Store changes

**`resetHand()`:**
- `selectedIndices = new Set(lockedIndices)` (restore to locked-only)
- `errorMessage = null`
- Timer untouched

### Component changes

**`HandSlots.tsx`:**
- Add a "Reset" button to the **left of** "Commit Hand", visible during `phase === 'playing'`
- `disabled` when `selectedIndices.size === lockedIndices.size` (nothing to reset)
- `onClick`: call `resetHand()`

---

## 4. Buttons → Links (Routing)

**Problem:** Home page `<button>` elements call `history.pushState`. They should be `<a>` links so users can right-click, copy, open in new tab.

**Solution:** Add `/daily` and `/random` path routes, replace buttons with links.

### `HomePage.tsx`

- Replace both `<button>` elements with `<a href="/daily">` and `<a href="/random">`
- Remove the `startDaily()` and `startPractice()` click handler functions entirely — navigation is fully URL-driven
- The home page badge showing a solved daily result is unchanged
- No `disabled` state on the daily link; it is always navigable

### `App.tsx`

Routing priority (evaluated in order):

1. `pathname === '/daily'` → call `handleDaily()`:
   - Compute today's puzzle number via `puzzleNumberFromDate` (timezone-safe, from `seed.ts`)
   - Check localStorage for `kanquer-daily-YYYY-MM-DD`
   - If **solved**: load puzzle in committed state (see below), `replaceState('/?p=N')`
   - If **not solved**: generate puzzle, call `loadPuzzle`, `replaceState('/?p=N')`

2. `pathname === '/random'` → call `handleRandom()`:
   - Generate random seed, load puzzle, `replaceState('/?seed=HEX')` (not `pushState` — avoids back-button loop through `/random`)

3. `?p=N` → existing daily-by-number logic (unchanged)

4. `?seed=HEX` → existing practice-by-seed logic (unchanged)

5. `/` with no params → show `HomePage`

### Restoring committed state

`loadPuzzle` gains an optional second parameter `savedResult?: { elapsed: number, selectedIndices: number[] }`.

When provided:
- Set `phase: 'committed'`
- Set `selectedIndices = new Set(savedResult.selectedIndices)`
- Re-run `scoreSelection` on those tiles to get `submittedSolution`
- Set `elapsed = savedResult.elapsed`
- Set `timerStartedAt = null`, `accumulatedMs = 0` (timer stays paused in committed state)

**localStorage schema change:** expand the daily save to include `selectedIndices`:
```json
{ "points": 8000, "elapsed": 142, "selectedIndices": [0,1,2,3,5,7,...] }
```
The existing `points`/`elapsed` fields remain; `selectedIndices` is added. Old saves without `selectedIndices` fall back to loading a fresh (uncommitted) puzzle.

**Points consistency:** When restoring, `scoreSelection` is re-run on the saved tile indices and will produce dealer-corrected points (since it now derives `dealer` from `ctx.seatWind`). The restored `submittedSolution.points` is the authoritative value shown in `ScoreReveal`. The `points` stored in localStorage is kept for the home-page badge only and may differ from the re-computed value on old saves. This divergence is accepted — it only affects puzzles solved before dealer scoring was deployed, and the `ScoreReveal` value is always freshly computed and correct.

---

## 5. Dealer Scoring

**Problem:** Scoring always uses non-dealer values. When seat wind is East, the player is the dealer and receives more points.

**Solution:** Add `dealer: boolean` to `hanFuToPoints`. Non-dealer formula is unchanged. Dealer is 1.5× non-dealer.

### `scorer.ts`

**`hanFuToPoints(han: number, fu: number, dealer: boolean)`:**

```
Non-dealer (existing):           Dealer (new):
han >= 13 → 32000                han >= 13 → 48000
han >= 11 → 24000                han >= 11 → 36000
han >= 8  → 16000                han >= 8  → 24000
han >= 6  → 12000                han >= 6  → 18000
han >= 5  → 8000                 han >= 5  → 12000
raw = fu * 2^(han+2)             (same raw)
if raw >= 8000 → 8000            if raw >= 8000 → 12000
else ceil(raw/100)*100           else ceil(ceil(raw/100)*100 * 1.5 / 100)*100
```

The dealer regular-hand formula is: compute non-dealer points first (`ndPts = ceil(raw/100)*100`), then `ceil(ndPts * 1.5 / 100) * 100`. This ensures rounding is applied correctly at each step. The mangan cap uses the same `raw >= 8000` threshold as non-dealer (since `8000 * 1.5 = 12000`).

**`scoreSelection`:** add `dealer = ctx.seatWind === 'East'` and pass it to `hanFuToPoints`.

### `generator.ts`

No change needed — `scoreSelection` already receives `ctx` (which includes `seatWind`) and will derive `dealer` internally.

### `gameStore.ts`

`commitHand` passes `ctx` to `scoreSelection` already. No store changes needed.

### Existing test

`scorer.test.ts` "yakuman returns 32000 points" uses `seatWind: 'E'` (dealer) and currently expects 32000. After the change, dealer yakuman = 48000. **Update this test** to use `seatWind: 'S'` (non-dealer) to preserve the existing 32000 expectation, OR add a separate dealer yakuman test expecting 48000.

---

## 6. New Tests

### `scorer.test.ts` additions

**Test 1 — Two identical sequences (Iipeikou):**

```typescript
it('detects Iipeikou and scores correctly', () => {
  // Closed hand: [2M 3M 4M] [2M 3M 4M] [6P 7P 8P] [1S 2S 3S] pair: dragon('G') (Hatsu)
  // Hatsu pair does NOT give Yakuhai (need a triplet for that); s(1) blocks Tanyao; Hatsu pair blocks Pinfu
  // Only yaku: Iipeikou (1 han closed)
  const tiles = [m(2),m(3),m(4), m(2),m(3),m(4), p(6),p(7),p(8), s(1),s(2),s(3), dragon('G'),dragon('G')]
  const sol = scoreSelection(tiles, [], [], { seatWind: 'S', roundWind: 'E' })!
  expect(sol).not.toBeNull()
  expect(sol.yaku.map(y => y.name)).toContain('Iipeikou')
  expect(sol.han).toBeGreaterThanOrEqual(1)
})
```

**Test 2 — Same triplet in all three suits (Sanshoku Doukou):**

```typescript
it('detects Sanshoku Doukou for the same triplet in all three suits', () => {
  // [3M 3M 3M] [3P 3P 3P] [3S 3S 3S] [5M 6M 7M] pair: m(9) m(9)
  // Sanshoku Doukou (2 han); hand also has a sequence so Toitoi does not apply
  const tiles = [m(3),m(3),m(3), p(3),p(3),p(3), s(3),s(3),s(3), m(5),m(6),m(7), m(9),m(9)]
  const sol = scoreSelection(tiles, [], [], { seatWind: 'S', roundWind: 'E' })!
  expect(sol).not.toBeNull()
  expect(sol.yaku.map(y => y.name)).toContain('Sanshoku Doukou')
  expect(sol.han).toBeGreaterThanOrEqual(2)
})
```

---

## Files Affected

| File | Change |
|------|--------|
| `src/store/gameStore.ts` | selectedIndices, lockedIndices, timer refactor, resetHand, loadPuzzle savedResult, Phase type |
| `src/engine/scorer.ts` | hanFuToPoints dealer param |
| `src/components/TileGrid.tsx` | pass index to onClick, isSelected/isLocked use index |
| `src/components/HandSlots.tsx` | use selectedIndices/lockedIndices, add Reset button |
| `src/components/ContextBar.tsx` | visibilitychange listener, interval reads from store |
| `src/components/ScoreReveal.tsx` | `elapsed` remains in seconds — no change needed; verify only |
| `src/components/HomePage.tsx` | buttons → links, remove startDaily/startPractice handlers |
| `src/App.tsx` | /daily and /random path routing, replaceState for /random |
| `src/store/gameStore.test.ts` | update selectedTiles refs, toggleTile calls, idle phase test |
| `src/engine/scorer.test.ts` | update yakuman test seatWind, add two new tests |
