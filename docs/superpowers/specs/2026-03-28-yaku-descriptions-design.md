# Yaku Descriptions Design

## Overview

Add short English descriptions to each yaku result so they can be displayed in the score reveal section alongside the yaku name and han count.

## Type Change

Add a `description: string` field to `YakuResult` in `src/engine/types.ts`:

```ts
export type YakuResult = {
  name: string
  description: string
  han: number
  openHan: number | null
}
```

## Yaku Descriptions (static map in `yaku.ts`)

A `YAKU_DESCRIPTIONS` record maps each yaku name to a generic English description. Descriptions are generic (not hand-specific):

| Yaku | Description |
|------|-------------|
| Tanyao | No terminals or honors |
| Yakuhai | Triplet of value tiles |
| Pinfu | All sequences, non-value pair |
| Iipeikou | Two identical sequences |
| Ryanpeikou | Two pairs of identical sequences |
| Toitoi | All triplets |
| Sanankou | Three concealed triplets |
| Sanshoku Doujun | Same sequence across all three suits |
| Sanshoku Doukou | Same triplet across all three suits |
| Ittsu | Straight 1–9 in one suit |
| Junchan | Terminal in every meld and pair, no honors |
| Chanta | Terminal or honor in every meld and pair |
| Shousangen | Two dragon triplets plus dragon pair |
| Honitsu | One numbered suit plus honors |
| Chinitsu | One numbered suit only |
| Chiitoitsu | Seven pairs |
| Kokushi | One of each terminal and honor |
| Daisangen | All three dragon triplets |
| Shousuushii | Three wind triplets plus wind pair |
| Daisuushii | All four wind triplets |
| Tsuuiisou | All honor tiles |
| Chinroutou | All terminals |
| Ryuuiisou | All green tiles |
| Chuurenpoutou | Nine gates (1112345678999 in one suit) |

Every `YakuResult` literal in `yaku.ts` gets `description: YAKU_DESCRIPTIONS['<name>']` added.

## UI Change (`ScoreReveal.tsx`)

In the expanded yaku breakdown, each row currently shows:

```
Tanyao    1 han
```

It becomes:

```
Tanyao    No terminals or honors    1 han
```

The description sits between the name and the han count in the same `.score-row` layout. No new CSS classes are needed unless the three-column layout requires a small tweak.

## Scope

- `src/engine/types.ts` — add `description` field
- `src/engine/yaku.ts` — add `YAKU_DESCRIPTIONS` map, populate `description` on every `YakuResult`
- `src/components/ScoreReveal.tsx` — render `y.description` in the yaku row
- No changes to tests (descriptions are display-only data, not logic)
