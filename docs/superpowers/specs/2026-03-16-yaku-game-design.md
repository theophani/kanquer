# Kanquer — Yaku Recognition Game: Design Spec

**Date:** 2026-03-16
**Status:** Approved

---

## Overview

Kanquer is a browser-based mini-game to help players learn to recognize Riichi Mahjong yaku and scoring. Each puzzle presents 24 tiles; the player selects a valid 14-tile winning hand, and the game scores it automatically. The goal is to find the highest-scoring hand possible within the time limit. Results can be shared with friends in a spoiler-free format.

---

## Tech Stack

- **Framework:** React + TypeScript
- **Build tool:** Vite
- **State management:** Zustand
- **Backend:** None — fully client-side SPA
- **Deployment:** Vercel (or equivalent static host)

---

## Architecture

The app is split into three layers with strict separation:

### Engine (`src/engine/`)
Pure TypeScript, zero React dependencies. Fully unit-testable in isolation.

| Module | Responsibility |
|---|---|
| `tiles.ts` | Tile definitions, suit/value types, dora sequence logic (including honor wrap rules) |
| `hand.ts` | Validates whether a tile set forms a complete winning hand (standard, chiitoitsu, kokushi) |
| `yaku.ts` | Detects all valid yaku for a given hand + context (seat wind, round wind, open/closed) |
| `fu.ts` | Calculates fu from hand structure; enumerates all valid decompositions and selects the highest-scoring one |
| `scorer.ts` | Combines han + fu → point value |
| `generator.ts` | Builds valid puzzles with ≥2 winning hands |

### Store (`src/store/`)
Zustand store managing all game state: current puzzle, tile selection, timer, game phase, mode (daily vs practice).

### UI (`src/components/`)
React components rendering the tile grid, selection state, score reveal, and share button.

---

## Data Model

### Tiles

```ts
type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon'
type NumberValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type WindValue = 'E' | 'S' | 'W' | 'N'
type DragonValue = 'W' | 'G' | 'R'  // White (Haku), Green (Hatsu), Red (Chun)

type Tile =
  | { suit: 'man' | 'pin' | 'sou'; value: NumberValue }
  | { suit: 'wind'; value: WindValue }
  | { suit: 'dragon'; value: DragonValue }
```

**Important:** `WindValue` and `DragonValue` both include `'W'` (West wind vs. White dragon). All tile logic — display names, dora sequences, yaku checks — must always discriminate on `suit` before `value`.

No aka-dora. Dora are identified at scoring time by checking each tile against `doraIndicators` using the dora sequence rules (see Scoring).

### Melds & Hands

```ts
type MeldType = 'sequence' | 'triplet' | 'pair'
type Meld = { type: MeldType; tiles: Tile[]; open: boolean }

type Hand =
  | { structure: 'standard';   melds: Meld[];   seatWind: WindValue; roundWind: WindValue }
  | { structure: 'chiitoitsu'; pairs: Tile[][]; seatWind: WindValue; roundWind: WindValue }
  | { structure: 'kokushi';    tiles: Tile[];   seatWind: WindValue; roundWind: WindValue }
```

No `winningTile`, no `isRiichi`, no `isTsumo` — these are not applicable to this game format.

**Kans are not supported.** A complete hand with a kan requires 15 tiles (4 + 3 + 3 + 3 + 2), but this game always operates on a fixed 14-tile selection. Kans are structurally impossible and excluded from the data model entirely.

### Puzzle

```ts
type Puzzle = {
  tiles: Tile[]           // all 24 tiles shown to the player, INCLUDING locked meld tiles
  lockedMelds: Meld[]     // 0–2 pre-committed open melds (their tiles are a subset of `tiles`)
  doraIndicators: Tile[]  // 1 tile (80% probability) or 2 tiles (20%)
  seatWind: WindValue
  roundWind: WindValue
  solutions: Solution[]   // ≥2 valid hands, sorted by score descending
}

type Solution = {
  melds: Meld[]
  yaku: YakuResult[]
  han: number
  fu: number
  points: number
}
```

**Tile pool and selection:** `tiles` always contains all 24 tiles, including the tiles that belong to any `lockedMelds`. Locked meld tiles are pre-populated in the player's hand area and cannot be deselected. The player must select an additional `14 - (lockedMelds tiles count)` tiles from the remaining pool: 14 tiles total with no locked melds, 11 with one locked 3-tile meld, 8 with two locked 3-tile melds.

---

## Puzzle Generation Algorithm

The generator builds puzzles backward from valid solutions:

1. **Pick context** — round wind drawn with weighted probability (60% E, 25% S, 10% W, 5% N); seat wind assigned randomly
2. **Generate hand A** — pick a target yaku combination, construct tiles that satisfy it
3. **Generate hand B** — independently generate a different valid hand that shares some tiles with A but is not identical
4. **Decide open melds** — randomly assign 0–2 melds as open, respecting yaku that require closed hands (e.g. pinfu, iipeikou)
5. **Merge + pad** — combine A and B tiles into a pool, fill to 24 with noise tiles
6. **Validate** — a "valid solution" is any 14-tile subset of the pool (including all locked meld tiles) that forms a complete winning hand with at least one yaku. Run the full hand validator to confirm both intended hands are reachable. If any valid solution scores higher than the intended top hand, the puzzle is invalid — reject and regenerate. Retry on failure (bounded retries, e.g. 20 attempts before changing the seed).
7. **Score all solutions** — rank by points descending; the true top-scorer is the "optimal" answer shown on the result screen
8. **Shuffle** — randomize tile display order before presenting

The "optimal" vs "other" distinction is not baked into generation — it emerges purely from scoring.

**Dora:** After generating the tile pool, draw 1 (80%) or 2 (20%) dora indicator tiles. The actual dora tile is the next tile in sequence after the indicator (see Scoring for wrap rules).

---

## Scoring

- **Han:** Sum of all applicable yaku han values + dora count. Dora do not contribute han to yakuman hands — yakuman value is fixed regardless of dora.
- **Fu:** Calculated from hand structure (meld types, pair type, wait type). When a hand admits multiple valid decompositions (different meld breakdowns or wait types), the engine selects the decomposition that produces the highest point total.
- **Points:** Standard Riichi Mahjong point table (han × fu → points). Dealer/non-dealer distinction is omitted for simplicity — a fixed non-dealer table is used.
- **Yakuman:** Scored at maximum value (~32,000 pts non-dealer). If kokushi is achievable in the pool, it will always be the top-scoring solution.
- **Chiitoitsu:** Always scored as 2 han, 25 fu as the base. Additional yaku that apply to the hand (e.g. tanyao, honitsu, chinitsu) stack normally on top of the 2 han base.

### Dora Sequence Rules

The dora tile is the tile immediately following the indicator in sequence:

- **Numbered suits (man/pin/sou):** 1→2→3→4→5→6→7→8→9→1 (wraps)
- **Winds:** E→S→W→N→E (wraps)
- **Dragons:** W→G→R→W (White→Green→Red→White, wraps)

---

## Game UI

### Layout: Single Column, Stacked

```
┌─────────────────────────────────┐
│ Round: East  Seat: South  ⏱1:42 │  ← context bar
│ Dora: [tile]                    │
├─────────────────────────────────┤
│ [  tile pool: 24 tiles grid  ]  │  ← click to select/deselect
├─────────────────────────────────┤
│ Your hand: [selected tiles...]  │  ← 14 slots total; locked meld
│                                 │    tiles pre-filled, unremovable
│                    [COMMIT] →   │  ← active when all 14 slots filled
└─────────────────────────────────┘
```

- Locked open melds are visually distinct (rotated or labeled) and pre-populated in the hand area; they cannot be deselected
- The number of free selection slots = 14 minus the tile count of all locked melds
- Selecting a tile highlights it; clicking again deselects
- COMMIT button is active only when all 14 hand slots are filled
- Submitting an invalid hand (no valid structure, or no yaku) shows an inline error message — the player can adjust their selection. Timer keeps running. Unlimited retries.

### Score Reveal: Score First, Details on Demand

```
✅ Valid winning hand!
━━━━━━━━━━━━━━━━━━━━
6 han · 12,000 pts  ⭐ (if optimal)
40 fu · Tanyao · Ittsu · Yakuhai · Dora 2  [Details ▼]

[Details expanded:]
  Tanyao       1 han
  Ittsu        2 han
  Yakuhai (E)  1 han
  Dora 2       2 han
  Total: 6 han 40 fu → 12,000 pts

[If not optimal:]
  Best possible: 18,000 pts (Chinitsu + Ittsu + Yakuhai)

⏱ Solved in 1:42          [📋 Share]
```

---

## Game Flow

```
Home
├── Daily Puzzle → Game → Result (cached in localStorage, no replay)
└── Practice    → Game → Result → [New Puzzle] → Game → ...
```

### Game State Machine

| State | Description |
|---|---|
| `idle` | Puzzle loaded, timer not started, waiting for first tile selection |
| `playing` | Timer running, player selecting tiles |
| `committed` | Valid hand submitted, timer stopped, score reveal shown |

### Home Screen
Minimal: game title, **Today's Puzzle** button (greyed out with your score shown if already played today), **Practice** button.

---

## Daily Puzzle

- Seed: `PRNG(sha256(YYYY-MM-DD + PUZZLE_SALT))` — deterministic, same puzzle worldwide for a given date. The salt is shipped client-side and is not secret in a security sense; its purpose is to prevent trivial date-guessing of puzzle content without inspecting the source.
- Puzzle number: count of days since launch date
- Result stored in `localStorage` — revisiting shows your result, not a fresh puzzle
- **Timer behavior:** The timer is wall-clock based. If the user navigates away and returns mid-puzzle (daily mode), elapsed time continues to accumulate. In practice mode, navigating away and returning discards the in-progress puzzle and starts fresh.

---

## Sharing

Spoiler-free Wordle-style share text. No tiles or yaku names revealed.

```
Kanquer #42 ⭐
12,000 pts · 1:42
```

- ⭐ appears only if the player found the optimal hand
- No ⭐ if they found a valid but suboptimal hand
- Copied to clipboard via the Share button on the result screen

---

## Out of Scope (v1)

- Riichi declaration mechanic
- Tsumo / ron distinction
- Aka-dora (red fives)
- Ippatsu, double riichi, or other riichi-dependent yaku
- Kans (a hand with a kan requires 15 tiles; this game fixes selection at 14)
- Yaku that require kans: sankantsu, suukantsu
- User accounts or server-side leaderboards
- Difficulty settings
- Multiplayer or real-time competition
