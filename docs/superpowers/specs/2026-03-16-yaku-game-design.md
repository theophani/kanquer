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
| `tiles.ts` | Tile definitions, suit/value types, dora sequence logic |
| `hand.ts` | Validates whether a tile set forms a complete winning hand (standard, chiitoitsu, kokushi) |
| `yaku.ts` | Detects all valid yaku for a given hand + context (seat wind, round wind, open/closed) |
| `fu.ts` | Calculates fu from hand structure + wait type (assumes best-case wait for player) |
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
type DragonValue = 'W' | 'G' | 'R'  // White, Green, Red

type Tile =
  | { suit: 'man' | 'pin' | 'sou'; value: NumberValue }
  | { suit: 'wind'; value: WindValue }
  | { suit: 'dragon'; value: DragonValue }
```

No aka-dora. Dora are identified at scoring time by checking tiles against `doraIndicators`.

### Melds & Hands

```ts
type MeldType = 'sequence' | 'triplet' | 'kan' | 'pair'
type Meld = { type: MeldType; tiles: Tile[]; open: boolean }

type Hand =
  | { structure: 'standard';   melds: Meld[];   seatWind: WindValue; roundWind: WindValue }
  | { structure: 'chiitoitsu'; pairs: Tile[][]; seatWind: WindValue; roundWind: WindValue }
  | { structure: 'kokushi';    tiles: Tile[];   seatWind: WindValue; roundWind: WindValue }
```

No `winningTile`, no `isRiichi`, no `isTsumo` — these are not applicable to this game format.

### Puzzle

```ts
type Puzzle = {
  tiles: Tile[]           // 24 tiles shown to the player
  lockedMelds: Meld[]     // 0–2 pre-committed open melds
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

---

## Puzzle Generation Algorithm

The generator builds puzzles backward from valid solutions:

1. **Pick context** — round wind drawn with weighted probability (60% E, 25% S, 10% W, 5% N); seat wind assigned randomly
2. **Generate hand A** — pick a target yaku combination, construct tiles that satisfy it
3. **Generate hand B** — independently generate a different valid hand that shares some tiles with A but is not identical
4. **Decide open melds** — randomly assign 0–2 melds as open, respecting yaku that require closed hands (e.g. pinfu, iipeikou)
5. **Merge + pad** — combine A and B tiles into a pool, fill to 24 with noise tiles
6. **Validate** — run the full hand validator across relevant tile combinations to confirm both hands are reachable and no unintended extra solutions exist. Retry if validation fails (bounded retries).
7. **Score all solutions** — rank by points descending; the top-scorer is the "optimal" answer
8. **Shuffle** — randomize tile display order before presenting

The "optimal" vs "decoy" distinction is not baked into generation — it emerges purely from scoring.

**Dora:** After generating the tile pool, draw 1 (80%) or 2 (20%) dora indicators. The actual dora tile is the next tile in sequence after the indicator.

---

## Scoring

- **Han:** Sum of all applicable yaku han values + dora count
- **Fu:** Calculated from hand structure (meld types, pair type, wait type). Best-case wait assumed for the player (fairest interpretation).
- **Points:** Standard Riichi Mahjong point table (han × fu → points). Dealer/non-dealer distinction is omitted for simplicity — a fixed non-dealer table is used.
- **Yakuman:** Scored at maximum value. If kokushi is achievable, it always dominates.
- **Chiitoitsu:** Always 2 han, 25 fu (special fixed scoring).

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
│ Your hand: [selected tiles...]  │  ← 14 slots, fills as selected
│                    [COMMIT] →   │  ← active when 14 tiles selected
└─────────────────────────────────┘
```

- Locked open melds are visually distinct (rotated or labeled) and pre-populated in the hand area
- Selecting a tile highlights it; clicking again deselects
- COMMIT button is active only when exactly 14 tiles are selected (including locked meld tiles)
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

- Seed: `PRNG(sha256(YYYY-MM-DD + SECRET_SALT))` — deterministic, same puzzle worldwide for a given date
- Puzzle number: count of days since launch date
- Result stored in `localStorage` — revisiting shows your result, not a fresh puzzle

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
- User accounts or server-side leaderboards
- Difficulty settings
- Multiplayer or real-time competition
- Ippatsu, double riichi, or other riichi-dependent yaku
