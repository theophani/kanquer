# Yaku Descriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `description` field to `YakuResult` with short generic English explanations, and display them in the score reveal UI.

**Architecture:** Add `description: string` to the `YakuResult` type, populate it via a static map in `yaku.ts` at each point where a `YakuResult` is created, then render it in `ScoreReveal.tsx` between the yaku name and han count.

**Tech Stack:** TypeScript, React, Vitest

---

## Files

- Modify: `src/engine/types.ts` — add `description` field to `YakuResult`
- Modify: `src/engine/yaku.ts` — add `YAKU_DESCRIPTIONS` map, populate `description` on every `YakuResult`
- Modify: `src/components/ScoreReveal.tsx` — render `y.description` in the yaku breakdown row

---

### Task 1: Add `description` to `YakuResult` type

**Files:**
- Modify: `src/engine/types.ts`

- [ ] **Step 1: Add the field**

In `src/engine/types.ts`, change:

```ts
export type YakuResult = {
  name: string
  han: number
  openHan: number | null
}
```

to:

```ts
export type YakuResult = {
  name: string
  description: string
  han: number
  openHan: number | null
}
```

- [ ] **Step 2: Verify TypeScript reports errors**

Run: `npx tsc --noEmit`

Expected: TypeScript errors in `yaku.ts` — every object literal that constructs a `YakuResult` is now missing the `description` property. This is the "failing test" that Task 2 will fix.

---

### Task 2: Populate `description` on every `YakuResult` in `yaku.ts`

**Files:**
- Modify: `src/engine/yaku.ts`

- [ ] **Step 1: Add the `YAKU_DESCRIPTIONS` map at the top of `yaku.ts`**

Add immediately after the imports, before `const YAKUMAN = 13`:

```ts
const YAKU_DESCRIPTIONS: Record<string, string> = {
  'Tanyao':           'No terminals or honors',
  'Yakuhai':          'Triplet of value tiles',
  'Pinfu':            'All sequences, non-value pair',
  'Iipeikou':         'Two identical sequences',
  'Ryanpeikou':       'Two pairs of identical sequences',
  'Toitoi':           'All triplets',
  'Sanankou':         'Three concealed triplets',
  'Sanshoku Doujun':  'Same sequence across all three suits',
  'Sanshoku Doukou':  'Same triplet across all three suits',
  'Ittsu':            'Straight 1–9 in one suit',
  'Junchan':          'Terminal in every meld and pair, no honors',
  'Chanta':           'Terminal or honor in every meld and pair',
  'Shousangen':       'Two dragon triplets plus dragon pair',
  'Honitsu':          'One numbered suit plus honors',
  'Chinitsu':         'One numbered suit only',
  'Chiitoitsu':       'Seven pairs',
  'Kokushi':          'One of each terminal and honor',
  'Daisangen':        'All three dragon triplets',
  'Shousuushii':      'Three wind triplets plus wind pair',
  'Daisuushii':       'All four wind triplets',
  'Tsuuiisou':        'All honor tiles',
  'Chinroutou':       'All terminals',
  'Ryuuiisou':        'All green tiles',
  'Chuurenpoutou':    'Nine gates (1112345678999 in one suit)',
}
```

- [ ] **Step 2: Add a helper and update every `YakuResult` literal**

Add a helper function right after the map:

```ts
function y(name: string, han: number, openHan: number | null): YakuResult {
  return { name, description: YAKU_DESCRIPTIONS[name] ?? name, han, openHan }
}
```

Now replace every `{ name: '...', han: ..., openHan: ... }` literal in `yaku.ts` with a call to `y(...)`. The full set of replacements:

In `detectYaku`:
```ts
if (hand.structure === 'kokushi') return [y('Kokushi', YAKUMAN, null)]
```

In `detectChiitoitsuYaku`:
```ts
if (tiles.every(isHonor))
  return [y('Tsuuiisou', YAKUMAN, null)]
const yaku: YakuResult[] = [y('Chiitoitsu', 2, null)]
// ...
if (tiles.every(isSimple)) yaku.push(y('Tanyao', 1, 1))
if (numSuits.length === 1 && tiles.some(isHonor))
  yaku.push(y('Honitsu', 3, 2))
if (suits.size === 1 && (suits.has('man') || suits.has('pin') || suits.has('sou')))
  yaku.push(y('Chinitsu', 6, 5))
```

In `detectStandardYaku`:
```ts
// Yakumans:
return [y('Daisangen', YAKUMAN, null)]
return [y('Shousuushii', YAKUMAN, null)]
return [y('Daisuushii', YAKUMAN, null)]
return [y('Tsuuiisou', YAKUMAN, null)]
return [y('Chinroutou', YAKUMAN, null)]
return [y('Ryuuiisou', YAKUMAN, null)]
return [y('Chuurenpoutou', YAKUMAN, null)]

// Regular yaku:
if (allTiles.every(isSimple)) yaku.push(y('Tanyao', 1, 1))
// (per yakuhai loop):
yaku.push(y('Yakuhai', 1, 1))
if (!isValuePair) yaku.push(y('Pinfu', 1, null))
if (dupCount === 2) yaku.push(y('Ryanpeikou', 3, null))
else if (dupCount === 1) yaku.push(y('Iipeikou', 1, null))
if (triplets.length === 4) yaku.push(y('Toitoi', 2, 2))
if (concealedTriplets.length === 3) yaku.push(y('Sanankou', 2, 2))
if (sanshokuDoujun) yaku.push(y('Sanshoku Doujun', open ? 1 : 2, 1))
if (sanshokuDoukou) yaku.push(y('Sanshoku Doukou', 2, 2))
if (ittsu) yaku.push(y('Ittsu', open ? 1 : 2, 1))
if (isJunchan) yaku.push(y('Junchan', open ? 2 : 3, 2))
if (!isJunchan && ...) yaku.push(y('Chanta', open ? 1 : 2, 1))
if (dragonTriplets.length === 2 && ...) yaku.push(y('Shousangen', 2, 2))
if (honitsu) yaku.push(y('Honitsu', open ? 2 : 3, 2))
if (chinitsu) yaku.push(y('Chinitsu', open ? 5 : 6, 5))
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Run tests**

Run: `npx vitest run`

Expected: All tests pass. (Tests access `y.name` and `y.han` only — the new field doesn't affect them.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/yaku.ts
git commit -m "feat: add description field to YakuResult with static English descriptions"
```

---

### Task 3: Display description in `ScoreReveal.tsx`

**Files:**
- Modify: `src/components/ScoreReveal.tsx`

- [ ] **Step 1: Update the yaku row to render the description**

Find this block in `ScoreReveal.tsx`:

```tsx
{submittedSolution.yaku.map(y => (
  <div key={y.name} className="score-row">
    <span>{y.name}</span>
    <span>{y.han} han</span>
  </div>
))}
```

Replace with:

```tsx
{submittedSolution.yaku.map(y => (
  <div key={y.name} className="score-row">
    <span>{y.name}</span>
    <span className="yaku-description">{y.description}</span>
    <span>{y.han} han</span>
  </div>
))}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ScoreReveal.tsx
git commit -m "feat: display yaku descriptions in score reveal breakdown"
```
