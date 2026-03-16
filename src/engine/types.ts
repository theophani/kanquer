export type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon'
export type NumberValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type WindValue = 'E' | 'S' | 'W' | 'N'
export type DragonValue = 'W' | 'G' | 'R' // White (Haku), Green (Hatsu), Red (Chun)

// IMPORTANT: WindValue and DragonValue both contain 'W' (West wind vs White dragon).
// Always discriminate on `suit` before `value` in all tile logic.
export type Tile =
  | { suit: 'man' | 'pin' | 'sou'; value: NumberValue }
  | { suit: 'wind'; value: WindValue }
  | { suit: 'dragon'; value: DragonValue }

export type MeldType = 'sequence' | 'triplet' | 'pair'
export type Meld = { type: MeldType; tiles: Tile[]; open: boolean }

export type Hand =
  | { structure: 'standard';   melds: Meld[];   seatWind: WindValue; roundWind: WindValue }
  | { structure: 'chiitoitsu'; pairs: Tile[][]; seatWind: WindValue; roundWind: WindValue }
  | { structure: 'kokushi';    tiles: Tile[];   seatWind: WindValue; roundWind: WindValue }

export type YakuResult = {
  name: string
  han: number
  openHan: number | null // han value when open; null if closed-only
}

export type Solution = {
  tiles: Tile[]
  hand: Hand
  yaku: YakuResult[]
  han: number
  fu: number
  points: number
}

export type Puzzle = {
  tiles: Tile[]          // all 24 tiles, INCLUDING locked meld tiles
  lockedMelds: Meld[]    // 0–2 pre-committed open melds (their tiles ⊂ puzzle.tiles)
  doraIndicators: Tile[] // 1 (80%) or 2 (20%) indicator tiles
  seatWind: WindValue
  roundWind: WindValue
  solutions: Solution[]  // all valid winning hands, sorted by points descending
}
