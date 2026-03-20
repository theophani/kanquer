# Fu Breakdown Display

**Date:** 2026-03-20
**Status:** Approved

## Summary

Add a fu breakdown section to the expanded details panel in ScoreReveal. Each component that contributes to fu (base, pair, triplets) is shown as a labeled row, followed by a summary line showing the pre-rounding total and the rounded result.

---

## `fu.ts`

**Add `FuComponent` export type:**

```ts
export type FuComponent = { label: string; fu: number }
```

**Add `getFuBreakdown(hand: Hand): FuComponent[]` export function:**

- If `hand.structure === 'chiitoitsu'`: return `[{ label: 'Chiitoitsu', fu: 25 }]`
- If `hand.structure === 'kokushi'`: return `[]` (fu is 0, no breakdown to show)
- For `'standard'` (narrow type with `hand.structure === 'standard'` before accessing `hand.melds`):
  1. Start with `{ label: 'Base', fu: 30 }` (engine always assumes closed ron; open-hand base of 20 fu is out of scope)
  2. Find the pair meld with a non-null assertion (`hand.melds.find(m => m.type === 'pair')!`) — a valid standard hand always has exactly one pair, matching the assumption in `baseFu`
  3. Call `pairFu`; if > 0 push `{ label: describePairLabel(pair, hand.seatWind, hand.roundWind), fu: pairFuVal }`
  4. For each non-pair meld, call `meldFu`; if > 0 push `{ label: describeMeldLabel(meld), fu: meldFuVal }`. Sequences always return 0 from `meldFu` so they are excluded by the `> 0` guard — no separate type pre-filter needed. Kans are not in the current engine (`MeldType` has no `'kan'`); this exclusion is intentional.
  5. Return the array

**Add private `describeTile(tile: Tile): string` helper:**

```ts
function describeTile(tile: Tile): string {
  if (tile.suit === 'man') return `${tile.value}m`
  if (tile.suit === 'pin') return `${tile.value}p`
  if (tile.suit === 'sou') return `${tile.value}s`
  if (tile.suit === 'wind') {
    const names: Record<string, string> = { E: 'East', S: 'South', W: 'West', N: 'North' }
    return `${names[tile.value as string]} wind`
  }
  // dragon
  const names: Record<string, string> = { W: 'White', G: 'Green', R: 'Red' }
  return `${names[tile.value as string]} dragon`
}
```

**Add private `describePairLabel(pair, seatWind, roundWind): string`:**

- Dragon: `"Pair — {color} dragon"`
- Wind (seat & round): `"Pair — {dir} wind (seat & round)"`
- Wind (seat only): `"Pair — {dir} wind (seat)"`
- Wind (round only): `"Pair — {dir} wind (round)"`

**Add private `describeMeldLabel(meld): string`:**

- Sequences: never called (excluded by `meldFu` returning 0 and the `> 0` guard)
- Triplet: `"Triplet — {describeTile(meld.tiles[0])} ({open/closed}{, terminal if applicable})"`
  - Closed simple: `"Triplet — 4m (closed)"`
  - Closed terminal/honor: `"Triplet — 1m (closed, terminal)"`, `"Triplet — East wind (closed, terminal)"`
  - Open simple: `"Triplet — 4m (open)"`
  - Open terminal/honor: `"Triplet — 9p (open, terminal)"`, `"Triplet — East wind (open, terminal)"`

**No changes to `calculateFu`.** `getFuBreakdown` uses the same internal helpers (`pairFu`, `meldFu`) but returns labeled components instead of a sum.

---

## `ScoreReveal.tsx`

Import `getFuBreakdown` from `'../engine/fu'`.

Compute before the return statement (not inside JSX):

```tsx
const fuComponents = getFuBreakdown(submittedSolution.hand)
const rawFu = fuComponents.reduce((sum, c) => sum + c.fu, 0)
```

In the `expanded` block, between the yaku rows and the existing `yaku-total` div, add a `fu-breakdown` section. **Only render it when `fuComponents` is non-empty** (i.e. hide for kokushi):

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

Use array index as `key` (labels are unique in practice but index is safer).

---

## Out of Scope

- Wait type fu (currently hardcoded as 0/ryanmen — not shown in breakdown)
- Kan fu (not in current engine)
- Tsumo fu (not in current engine)
- CSS styling beyond structural class names
