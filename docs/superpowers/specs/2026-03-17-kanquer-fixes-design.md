# Kanquer Fixes & Improvements — Design Spec

**Date:** 2026-03-17

## Overview

Six improvements to the Kanquer Riichi Mahjong puzzle app, addressing bugs in tile selection and timer behavior, adding missing features (reset button, dealer scoring), improving navigation semantics (buttons → links), and expanding test coverage.

---

## 1. Tile Identity Fix (Selection Bug)

**Problem:** `toggleTile` compares tiles by value. When duplicate tiles exist in the puzzle (e.g., two `3M`), selecting one selects all matching tiles, making duplicates impossible to individually select.

**Solution:** Change selection tracking from `selectedTiles: Tile[]` to `selectedIndices: Set<number>`, where each number is the index of a tile in `puzzle.tiles`.

**Changes:**
- `gameStore.ts`: Replace `selectedTiles: Tile[]` with `selectedIndices: Set<number>`
- `loadPuzzle`: Pre-populate `selectedIndices` with the indices of locked meld tiles (derived by matching locked tiles to their positions in `puzzle.tiles`)
- `toggleTile(index: number)`: Add/remove from the set; locked indices are non-toggleable
- `TileGrid.tsx`: Pass tile index to `onClick` instead of tile value
- `HandSlots.tsx`: Reconstruct display tiles as `[...selectedIndices].sort().map(i => puzzle.tiles[i])`
- All consumers of `selectedTiles` updated to use `selectedIndices`

---

## 2. Timer

**Problem:** Timer starts on first tile selection. Should start immediately when puzzle is shown, and should pause when the user navigates away.

**Solution:** Use accumulated time + current segment tracking for pause/resume support.

**Store changes:**
- Remove `startTime: number | null` (current)
- Add `timerStartedAt: number | null` — when the current running segment began
- Add `accumulatedMs: number` — total elapsed time before the current segment
- `loadPuzzle`: sets `timerStartedAt = Date.now()`, `accumulatedMs = 0`, `phase = 'playing'` immediately (no more `'idle'` phase)
- `pauseTimer()`: saves `accumulatedMs += Date.now() - timerStartedAt`, sets `timerStartedAt = null`
- `resumeTimer()`: sets `timerStartedAt = Date.now()`
- `commitHand()`: freezes `elapsed = accumulatedMs + (Date.now() - timerStartedAt)`, calls `pauseTimer()`

**UI changes:**
- `ContextBar.tsx`: Adds a `visibilitychange` event listener via `useEffect`; calls `pauseTimer()` on `hidden`, `resumeTimer()` on `visible`
- Live elapsed display = `accumulatedMs + (Date.now() - timerStartedAt)` while running; frozen `elapsed` after commit

**Note:** The elapsed time calculation may need revisiting — flagged for review during implementation.

---

## 3. Reset Button

**Problem:** No way to clear the current hand selection without starting a new puzzle.

**Solution:** Add a Reset button to `HandSlots`, next to the Commit button (placement option A).

**Store changes:**
- Add `resetHand()` action: restores `selectedIndices` to just the locked tile indices, clears `errorMessage`. Timer keeps running.

**UI changes:**
- `HandSlots.tsx`: Add a "Reset" button to the left of the "Commit Hand" button. Visible during `phase === 'playing'`. Disabled when only locked tiles are selected (nothing to reset).

---

## 4. Buttons → Links (Routing)

**Problem:** Home page navigation buttons are `<button>` elements that call `history.pushState`. They should be real links so users can right-click, copy URL, open in new tab.

**Solution:** Replace buttons with `<a href="/daily">` and `<a href="/random">`, and add routing logic to handle these paths.

**Changes:**
- `HomePage.tsx`: Replace `<button>` elements with `<a href="/daily">` and `<a href="/random">`
- `App.tsx`: Add path-based routing alongside existing param-based routing:
  - `/daily` → compute daily puzzle number from today's date, load puzzle, update URL to `/?p=N`
  - `/random` → generate random seed, load puzzle, update URL to `/?seed=HEX`
  - `?p=N` and `?seed=HEX` → existing behavior unchanged
- **Already-solved daily:** If `/daily` is loaded and localStorage has a saved result for today, load the puzzle in committed state (restore `selectedIndices`, `submittedSolution`, `phase: 'committed'`) so ScoreReveal is shown. `loadPuzzle` accepts an optional `savedResult` parameter for this.
- The daily link is always navigable (no `disabled` state); the home page badge showing the solved result remains as-is.

---

## 5. Dealer Scoring

**Problem:** Scoring always uses non-dealer points. When seat wind is East, the player is the dealer and should use dealer scoring.

**Solution:** Parameterize `hanFuToPoints` with a `dealer` boolean.

**Engine changes (`scorer.ts`):**
- `hanFuToPoints(han: number, fu: number, dealer: boolean)`:
  - Non-dealer: `ceil(fu * 2^(han+2) * 4 / 100) * 100` (existing behavior)
  - Dealer: `ceil(fu * 2^(han+2) * 6 / 100) * 100`
  - Dealer thresholds: mangan = 12000, haneman = 18000, baiman = 24000, sanbaiman = 36000, yakuman = 48000
- `scoreSelection(tiles, context)`: derives `dealer = context.seatWind === 'East'`, passes to `hanFuToPoints`

**Generator changes (`generator.ts`):**
- When finding the best solution for a puzzle, pass `dealer` based on the puzzle's seat wind

---

## 6. New Tests

Two new test cases covering scoring edge cases:

**In `scorer.test.ts` or a new `scoring-edge-cases.test.ts`:**

1. **Two identical sequences (Iipeikou):** A closed hand with two identical sequences (e.g., `[2M 3M 4M] [2M 3M 4M] [6P 7P 8P] [1S 2S 3S] pair:9Z`). Verify Iipeikou (1 han) is detected and scored correctly.

2. **Same number pair across suits:** A hand where the optimal decomposition could assign the pair to `1M`, `1P`, or `1S`. Verify that fu and yaku detection are consistent regardless of which suit ends up as the pair (tests robustness of the hand decomposition logic).

---

## Files Affected

| File | Change |
|------|--------|
| `src/store/gameStore.ts` | selectedIndices, timer refactor, resetHand, loadPuzzle savedResult |
| `src/engine/scorer.ts` | hanFuToPoints dealer param |
| `src/engine/generator.ts` | pass dealer to scorer |
| `src/components/TileGrid.tsx` | pass index to onClick |
| `src/components/HandSlots.tsx` | use selectedIndices, add Reset button |
| `src/components/ContextBar.tsx` | visibilitychange listener |
| `src/components/HomePage.tsx` | buttons → links |
| `src/App.tsx` | /daily and /random path routing |
| `src/engine/scorer.test.ts` | two new test cases |
