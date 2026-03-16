import type { Hand, Meld, Tile, YakuResult, WindValue } from './types'
import { tileEquals, isTerminalOrHonor, isHonor, isSimple, isTerminal } from './tiles'

const YAKUMAN = 13 // sentinel han value for yakuman

export function detectYaku(hand: Hand): YakuResult[] {
  if (hand.structure === 'kokushi') return [{ name: 'Kokushi', han: YAKUMAN, openHan: null }]
  if (hand.structure === 'chiitoitsu') return detectChiitoitsuYaku(hand)
  return detectStandardYaku(hand as Extract<Hand, { structure: 'standard' }>)
}

function isOpen(hand: { structure: 'standard'; melds: Meld[] }): boolean {
  return hand.melds.some(m => m.open)
}

// ── Chiitoitsu ───────────────────────────────────────────────────────────────
function detectChiitoitsuYaku(hand: Extract<Hand, { structure: 'chiitoitsu' }>): YakuResult[] {
  const tiles = hand.pairs.flat()
  // Tsuuiisou: all honors (yakuman — return early, no stacking)
  if (tiles.every(isHonor))
    return [{ name: 'Tsuuiisou', han: YAKUMAN, openHan: null }]
  const yaku: YakuResult[] = [{ name: 'Chiitoitsu', han: 2, openHan: null }]
  const suits = new Set(tiles.map(t => t.suit))
  const numSuits = [...suits].filter(s => s === 'man' || s === 'pin' || s === 'sou')
  // Tanyao
  if (tiles.every(isSimple)) yaku.push({ name: 'Tanyao', han: 1, openHan: 1 })
  // Honitsu: exactly one numbered suit + at least one honor tile
  if (numSuits.length === 1 && tiles.some(isHonor))
    yaku.push({ name: 'Honitsu', han: 3, openHan: 2 })
  // Chinitsu
  if (suits.size === 1 && (suits.has('man') || suits.has('pin') || suits.has('sou')))
    yaku.push({ name: 'Chinitsu', han: 6, openHan: 5 })
  return yaku
}

// ── Standard ────────────────────────────────────────────────────────────────
function detectStandardYaku(hand: Extract<Hand, { structure: 'standard' }>): YakuResult[] {
  const yaku: YakuResult[] = []
  const open = isOpen(hand)
  const melds = hand.melds
  const nonPair = melds.filter(m => m.type !== 'pair')
  const pairMeld = melds.find(m => m.type === 'pair')!
  const allTiles = melds.flatMap(m => m.tiles)
  const sequences = nonPair.filter(m => m.type === 'sequence')
  const triplets = nonPair.filter(m => m.type === 'triplet')

  // ── Yakuman checks first (return early if any found) ──────────────────────

  const concealedTriplets = triplets.filter(m => !m.open)

  // Daisangen: triplets of all 3 dragons
  const dragonTriplets = triplets.filter(m => m.tiles[0].suit === 'dragon')
  if (dragonTriplets.length === 3)
    return [{ name: 'Daisangen', han: YAKUMAN, openHan: null }]

  // Shousuushii: triplets of 3 winds + wind pair
  const windTriplets = triplets.filter(m => m.tiles[0].suit === 'wind')
  if (windTriplets.length === 3 && pairMeld.tiles[0].suit === 'wind')
    return [{ name: 'Shousuushii', han: YAKUMAN, openHan: null }]

  // Daisuushii: triplets of all 4 winds
  if (windTriplets.length === 4)
    return [{ name: 'Daisuushii', han: YAKUMAN, openHan: null }]

  // Tsuuiisou: all honors
  if (allTiles.every(isHonor))
    return [{ name: 'Tsuuiisou', han: YAKUMAN, openHan: null }]

  // Chinroutou: all terminals
  if (allTiles.every(isTerminal))
    return [{ name: 'Chinroutou', han: YAKUMAN, openHan: null }]

  // Ryuuiisou: all green tiles (2s,3s,4s,6s,8s,Hatsu)
  const GREEN: Tile[] = [
    {suit:'sou',value:2},{suit:'sou',value:3},{suit:'sou',value:4},
    {suit:'sou',value:6},{suit:'sou',value:8},{suit:'dragon',value:'G'},
  ]
  if (allTiles.every(t => GREEN.some(g => tileEquals(g, t))))
    return [{ name: 'Ryuuiisou', han: YAKUMAN, openHan: null }]

  // Chuurenpoutou: 1112345678999 in one suit + 1 duplicate
  const chuuren = detectChuurenpoutou(melds)
  if (chuuren) return [{ name: 'Chuurenpoutou', han: YAKUMAN, openHan: null }]

  // ── Regular yaku ─────────────────────────────────────────────────────────

  // Tanyao
  if (allTiles.every(isSimple)) yaku.push({ name: 'Tanyao', han: 1, openHan: 1 })

  // Yakuhai (value tiles: seat wind, round wind, any dragon)
  for (const t of triplets) {
    const tile = t.tiles[0]
    if (
      (tile.suit === 'wind' && (tile.value === hand.seatWind || tile.value === hand.roundWind)) ||
      tile.suit === 'dragon'
    ) {
      yaku.push({ name: 'Yakuhai', han: 1, openHan: 1 })
    }
  }

  // Pinfu (closed only: all sequences, non-value pair)
  if (!open && sequences.length === 4) {
    const pair = pairMeld.tiles[0]
    const isValuePair =
      (pair.suit === 'wind' && (pair.value === hand.seatWind || pair.value === hand.roundWind)) ||
      pair.suit === 'dragon'
    if (!isValuePair) yaku.push({ name: 'Pinfu', han: 1, openHan: null })
  }

  // Iipeikou (closed only: two identical sequences)
  if (!open) {
    const seqKeys = sequences.map(m => JSON.stringify(m.tiles.map(t => [t.suit, t.value]).sort()))
    const dupCount = seqKeys.filter((k, i) => seqKeys.indexOf(k) !== i).length
    if (dupCount === 2) yaku.push({ name: 'Ryanpeikou', han: 3, openHan: null })
    else if (dupCount === 1) yaku.push({ name: 'Iipeikou', han: 1, openHan: null })
  }

  // Toitoi: all 4 non-pair melds are triplets
  if (triplets.length === 4) yaku.push({ name: 'Toitoi', han: 2, openHan: 2 })

  // Sanankou: 3 concealed triplets
  if (concealedTriplets.length === 3) yaku.push({ name: 'Sanankou', han: 2, openHan: 2 })

  // Sanshoku Doujun
  const sanshokuDoujun = detectSanshokuDoujun(sequences)
  if (sanshokuDoujun) yaku.push({ name: 'Sanshoku Doujun', han: open ? 1 : 2, openHan: 1 })

  // Sanshoku Doukou
  const sanshokuDoukou = detectSanshokuDoukou(triplets)
  if (sanshokuDoukou) yaku.push({ name: 'Sanshoku Doukou', han: 2, openHan: 2 })

  // Ittsu
  const ittsu = detectIttsu(sequences)
  if (ittsu) yaku.push({ name: 'Ittsu', han: open ? 1 : 2, openHan: 1 })

  // Junchan: every meld + pair contains a terminal (1 or 9, no honors); at least one sequence
  // Detected before Chanta because Junchan supersedes it (Junchan is a stricter superset)
  const isJunchan = sequences.length >= 1 &&
    [...nonPair, pairMeld].every(m => m.tiles.some(isTerminal)) &&
    !allTiles.some(isHonor)
  if (isJunchan) yaku.push({ name: 'Junchan', han: open ? 2 : 3, openHan: 2 })

  // Chanta: every meld + pair contains terminal/honor; at least one sequence
  // Mutually exclusive with Junchan (Junchan is the higher-scoring superset)
  if (!isJunchan && sequences.length >= 1 && [...nonPair, pairMeld].every(m => m.tiles.some(isTerminalOrHonor)))
    yaku.push({ name: 'Chanta', han: open ? 1 : 2, openHan: 1 })

  // Shousangen: two dragon triplets + dragon pair
  if (dragonTriplets.length === 2 && pairMeld.tiles[0].suit === 'dragon')
    yaku.push({ name: 'Shousangen', han: 2, openHan: 2 })

  // Honitsu: one numbered suit + honors
  const honitsu = detectHonitsu(allTiles)
  if (honitsu) yaku.push({ name: 'Honitsu', han: open ? 2 : 3, openHan: 2 })

  // Chinitsu: one numbered suit only
  const chinitsu = detectChinitsu(allTiles)
  if (chinitsu) yaku.push({ name: 'Chinitsu', han: open ? 5 : 6, openHan: 5 })

  return yaku
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectSanshokuDoujun(sequences: Meld[]): boolean {
  for (const seq of sequences) {
    const v = seq.tiles[0].value
    const suits = ['man', 'pin', 'sou'] as const
    if (suits.every(suit =>
      sequences.some(s => s.tiles[0].suit === suit && s.tiles[0].value === v)
    )) return true
  }
  return false
}

function detectSanshokuDoukou(triplets: Meld[]): boolean {
  for (const t of triplets) {
    const v = t.tiles[0].value
    if (['man', 'pin', 'sou'].every(suit =>
      triplets.some(tr => tr.tiles[0].suit === suit && tr.tiles[0].value === v)
    )) return true
  }
  return false
}

function detectIttsu(sequences: Meld[]): boolean {
  const suits = ['man', 'pin', 'sou'] as const
  return suits.some(suit => {
    const suitSeqs = sequences.filter(s => s.tiles[0].suit === suit)
    return (
      suitSeqs.some(s => s.tiles[0].value === 1) &&
      suitSeqs.some(s => s.tiles[0].value === 4) &&
      suitSeqs.some(s => s.tiles[0].value === 7)
    )
  })
}

function detectHonitsu(tiles: Tile[]): boolean {
  const numSuits = new Set(tiles.filter(t => !isHonor(t)).map(t => t.suit))
  return numSuits.size === 1 && tiles.some(isHonor)
}

function detectChinitsu(tiles: Tile[]): boolean {
  const suits = new Set(tiles.map(t => t.suit))
  return suits.size === 1 && !isHonor(tiles[0])
}

function detectChuurenpoutou(melds: Meld[]): boolean {
  const tiles = melds.flatMap(m => m.tiles)
  if (melds.some(m => m.open)) return false
  const suits = new Set(tiles.map(t => t.suit))
  if (suits.size !== 1 || isHonor(tiles[0])) return false
  const vals = tiles.map(t => t.value as number).sort((a, b) => a - b)
  const required = [1,1,1,2,3,4,5,6,7,8,9,9,9]
  const remaining = [...vals]
  for (const r of required) {
    const i = remaining.indexOf(r)
    if (i === -1) return false
    remaining.splice(i, 1)
  }
  return remaining.length === 1
}
