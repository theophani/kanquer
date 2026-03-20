import type { Hand, Meld, Tile } from './types'
import { isTerminalOrHonor } from './tiles'

export type FuComponent = { label: string; fu: number }

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
  const isOpen = hand.melds.some(m => m.open)
  let fu = isOpen ? 20 : 30
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

export function getFuBreakdown(hand: Hand): FuComponent[] {
  if (hand.structure === 'chiitoitsu') return [{ label: 'Chiitoitsu', fu: 25 }]
  if (hand.structure === 'kokushi') return []

  const isOpen = hand.melds.some(m => m.open)
  const components: FuComponent[] = [
    { label: isOpen ? 'Base (open hand)' : 'Base (closed ron)', fu: isOpen ? 20 : 30 },
  ]

  const pair = hand.melds.find(m => m.type === 'pair')!
  const pairFuVal = pairFu(pair, hand.seatWind, hand.roundWind)
  if (pairFuVal > 0) {
    components.push({ label: describePairLabel(pair, hand.seatWind, hand.roundWind), fu: pairFuVal })
  }

  for (const meld of hand.melds.filter(m => m.type !== 'pair')) {
    const meldFuVal = meldFu(meld)
    if (meldFuVal > 0) {
      components.push({ label: describeMeldLabel(meld), fu: meldFuVal })
    }
  }

  return components
}

function describeTile(tile: Tile): string {
  if (tile.suit === 'man') return `${tile.value}m`
  if (tile.suit === 'pin') return `${tile.value}p`
  if (tile.suit === 'sou') return `${tile.value}s`
  if (tile.suit === 'wind') {
    const names: Record<string, string> = { E: 'East', S: 'South', W: 'West', N: 'North' }
    return `${names[tile.value as string]} wind`
  }
  const names: Record<string, string> = { W: 'White', G: 'Green', R: 'Red' }
  return `${names[tile.value as string]} dragon`
}

function describePairLabel(pair: Meld, seatWind: string, roundWind: string): string {
  const tile = pair.tiles[0]
  const name = describeTile(tile)
  if (tile.suit === 'wind') {
    const isSeat = tile.value === seatWind
    const isRound = tile.value === roundWind
    if (isSeat && isRound) return `Pair — ${name} (seat & round)`
    if (isSeat) return `Pair — ${name} (seat)`
    return `Pair — ${name} (round)`
  }
  return `Pair — ${name}`
}

function describeMeldLabel(meld: Meld): string {
  const tile = meld.tiles[0]
  const tileName = describeTile(tile)
  const openStr = meld.open ? 'open' : 'closed'
  const terminal = isTerminalOrHonor(tile) ? ', terminal' : ''
  return `Triplet — ${tileName} (${openStr}${terminal})`
}
