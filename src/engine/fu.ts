import type { Hand, Meld } from './types'
import { isTerminalOrHonor } from './tiles'

export function calculateFu(hand: Hand): number {
  if (hand.structure === 'chiitoitsu') return 25
  if (hand.structure === 'kokushi') return 0
  return bestFuForStandard(hand)
}

function bestFuForStandard(hand: Extract<Hand, { structure: 'standard' }>): number {
  // getAllDecompositions is expensive; for fu purposes we work with the hand as given
  // (caller should pass best decomposition via scorer.ts)
  return roundUpToTen(baseFu(hand))
}

function baseFu(hand: Extract<Hand, { structure: 'standard' }>): number {
  let fu = 30 // base for closed ron
  const pair = hand.melds.find(m => m.type === 'pair')!
  fu += pairFu(pair, hand.seatWind, hand.roundWind)
  for (const meld of hand.melds.filter(m => m.type !== 'pair')) {
    fu += meldFu(meld)
  }
  // Wait: assume ryanmen (0 fu) — best case for player
  return fu
}

function pairFu(pair: Meld, seatWind: string, roundWind: string): number {
  const tile = pair.tiles[0]
  if (tile.suit === 'dragon') return 2
  if (tile.suit === 'wind') {
    const isSeat = tile.value === seatWind
    const isRound = tile.value === roundWind
    if (isSeat && isRound) return 4
    if (isSeat || isRound) return 2
  }
  return 0
}

function meldFu(meld: Meld): number {
  if (meld.type === 'sequence') return 0
  if (meld.type !== 'triplet') return 0
  const terminal = isTerminalOrHonor(meld.tiles[0])
  if (meld.open) return terminal ? 4 : 2
  return terminal ? 8 : 4
}

function roundUpToTen(fu: number): number {
  return Math.ceil(fu / 10) * 10
}
