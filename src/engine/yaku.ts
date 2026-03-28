import type { Hand, Meld, Tile, YakuResult } from './types'
import { tileEquals, isTerminalOrHonor, isHonor, isSimple, isTerminal } from './tiles'

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

function y(name: string, han: number, openHan: number | null): YakuResult {
  return { name, description: YAKU_DESCRIPTIONS[name] ?? name, han, openHan }
}

const YAKUMAN = 13 // sentinel han value for yakuman

export function detectYaku(hand: Hand): YakuResult[] {
  if (hand.structure === 'kokushi') return [y('Kokushi', YAKUMAN, null)]
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
    return [y('Tsuuiisou', YAKUMAN, null)]
  const yaku: YakuResult[] = [y('Chiitoitsu', 2, null)]
  const suits = new Set(tiles.map(t => t.suit))
  const numSuits = [...suits].filter(s => s === 'man' || s === 'pin' || s === 'sou')
  // Tanyao
  if (tiles.every(isSimple)) yaku.push(y('Tanyao', 1, 1))
  // Honitsu: exactly one numbered suit + at least one honor tile
  if (numSuits.length === 1 && tiles.some(isHonor))
    yaku.push(y('Honitsu', 3, 2))
  // Chinitsu
  if (suits.size === 1 && (suits.has('man') || suits.has('pin') || suits.has('sou')))
    yaku.push(y('Chinitsu', 6, 5))
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
    return [y('Daisangen', YAKUMAN, null)]

  // Shousuushii: triplets of 3 winds + wind pair
  const windTriplets = triplets.filter(m => m.tiles[0].suit === 'wind')
  if (windTriplets.length === 3 && pairMeld.tiles[0].suit === 'wind')
    return [y('Shousuushii', YAKUMAN, null)]

  // Daisuushii: triplets of all 4 winds
  if (windTriplets.length === 4)
    return [y('Daisuushii', YAKUMAN, null)]

  // Tsuuiisou: all honors
  if (allTiles.every(isHonor))
    return [y('Tsuuiisou', YAKUMAN, null)]

  // Chinroutou: all terminals
  if (allTiles.every(isTerminal))
    return [y('Chinroutou', YAKUMAN, null)]

  // Ryuuiisou: all green tiles (2s,3s,4s,6s,8s,Hatsu)
  const GREEN: Tile[] = [
    {suit:'sou',value:2},{suit:'sou',value:3},{suit:'sou',value:4},
    {suit:'sou',value:6},{suit:'sou',value:8},{suit:'dragon',value:'G'},
  ]
  if (allTiles.every(t => GREEN.some(g => tileEquals(g, t))))
    return [y('Ryuuiisou', YAKUMAN, null)]

  // Chuurenpoutou: 1112345678999 in one suit + 1 duplicate
  const chuuren = detectChuurenpoutou(melds)
  if (chuuren) return [y('Chuurenpoutou', YAKUMAN, null)]

  // ── Regular yaku ─────────────────────────────────────────────────────────

  // Tanyao
  if (allTiles.every(isSimple)) yaku.push(y('Tanyao', 1, 1))

  // Yakuhai (value tiles: seat wind, round wind, any dragon)
  for (const t of triplets) {
    const tile = t.tiles[0]
    if (
      (tile.suit === 'wind' && (tile.value === hand.seatWind || tile.value === hand.roundWind)) ||
      tile.suit === 'dragon'
    ) {
      yaku.push(y('Yakuhai', 1, 1))
    }
  }

  // Pinfu (closed only: all sequences, non-value pair)
  if (!open && sequences.length === 4) {
    const pair = pairMeld.tiles[0]
    const isValuePair =
      (pair.suit === 'wind' && (pair.value === hand.seatWind || pair.value === hand.roundWind)) ||
      pair.suit === 'dragon'
    if (!isValuePair) yaku.push(y('Pinfu', 1, null))
  }

  // Iipeikou (closed only: two identical sequences)
  if (!open) {
    const seqKeys = sequences.map(m => JSON.stringify(m.tiles.map(t => [t.suit, t.value]).sort()))
    const dupCount = seqKeys.filter((k, i) => seqKeys.indexOf(k) !== i).length
    if (dupCount === 2) yaku.push(y('Ryanpeikou', 3, null))
    else if (dupCount === 1) yaku.push(y('Iipeikou', 1, null))
  }

  // Toitoi: all 4 non-pair melds are triplets
  if (triplets.length === 4) yaku.push(y('Toitoi', 2, 2))

  // Sanankou: 3 concealed triplets
  if (concealedTriplets.length === 3) yaku.push(y('Sanankou', 2, 2))

  // Sanshoku Doujun
  const sanshokuDoujun = detectSanshokuDoujun(sequences)
  if (sanshokuDoujun) yaku.push(y('Sanshoku Doujun', open ? 1 : 2, 1))

  // Sanshoku Doukou
  const sanshokuDoukou = detectSanshokuDoukou(triplets)
  if (sanshokuDoukou) yaku.push(y('Sanshoku Doukou', 2, 2))

  // Ittsu
  const ittsu = detectIttsu(sequences)
  if (ittsu) yaku.push(y('Ittsu', open ? 1 : 2, 1))

  // Junchan: every meld + pair contains a terminal (1 or 9, no honors); at least one sequence
  // Detected before Chanta because Junchan supersedes it (Junchan is a stricter superset)
  const isJunchan = sequences.length >= 1 &&
    [...nonPair, pairMeld].every(m => m.tiles.some(isTerminal)) &&
    !allTiles.some(isHonor)
  if (isJunchan) yaku.push(y('Junchan', open ? 2 : 3, 2))

  // Chanta: every meld + pair contains terminal/honor; at least one sequence
  // Mutually exclusive with Junchan (Junchan is the higher-scoring superset)
  if (!isJunchan && sequences.length >= 1 && [...nonPair, pairMeld].every(m => m.tiles.some(isTerminalOrHonor)))
    yaku.push(y('Chanta', open ? 1 : 2, 1))

  // Shousangen: two dragon triplets + dragon pair
  if (dragonTriplets.length === 2 && pairMeld.tiles[0].suit === 'dragon')
    yaku.push(y('Shousangen', 2, 2))

  // Honitsu: one numbered suit + honors
  const honitsu = detectHonitsu(allTiles)
  if (honitsu) yaku.push(y('Honitsu', open ? 2 : 3, 2))

  // Chinitsu: one numbered suit only
  const chinitsu = detectChinitsu(allTiles)
  if (chinitsu) yaku.push(y('Chinitsu', open ? 5 : 6, 5))

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
