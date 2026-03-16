import { describe, it, expect } from 'vitest'
import { m, p, s, E, Haku } from './tiles'
import { calculateFu } from './fu'
import type { Hand } from './types'

function seq(tiles: import('./types').Tile[], open = false) {
  return { type: 'sequence' as const, tiles, open }
}
function tri(tiles: import('./types').Tile[], open = false) {
  return { type: 'triplet' as const, tiles, open }
}
function pair(tiles: import('./types').Tile[]) {
  return { type: 'pair' as const, tiles, open: false }
}

describe('calculateFu', () => {
  it('chiitoitsu is always 25 fu', () => {
    const hand: Hand = {
      structure: 'chiitoitsu',
      pairs: [[m(1),m(1)],[m(3),m(3)],[p(2),p(2)],[p(4),p(4)],[s(6),s(6)],[s(8),s(8)],[E,E]],
      seatWind: 'E', roundWind: 'E',
    }
    expect(calculateFu(hand)).toBe(25)
  })

  it('standard hand: base 30 + 0 pair + 0 meld + 0 wait → 30 fu', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(calculateFu(hand)).toBe(30)
  })

  it('pair of dragons adds 2 fu → 30 + 2 = 32 → rounds to 40', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([Haku,Haku])],
      seatWind: 'S', roundWind: 'E',
    }
    expect(calculateFu(hand)).toBe(40)
  })

  it('open triplet of simples: +2 fu each', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [tri([m(5),m(5),m(5)], true), seq([p(3),p(4),p(5)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    // 30 base + 2 (open simples triplet) = 32 → 40
    expect(calculateFu(hand)).toBe(40)
  })

  it('closed triplet of terminals: +8 fu', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [tri([m(1),m(1),m(1)], false), seq([p(3),p(4),p(5)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])],
      seatWind: 'S', roundWind: 'E',
    }
    // 30 base + 8 = 38 → 40
    expect(calculateFu(hand)).toBe(40)
  })

  it('seat wind pair adds 2 fu', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([E,E])],
      seatWind: 'E', roundWind: 'S',
    }
    // 30 + 2 = 32 → 40
    expect(calculateFu(hand)).toBe(40)
  })

  it('pair that is both seat and round wind adds 4 fu', () => {
    const hand: Hand = {
      structure: 'standard',
      melds: [seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), seq([m(6),m(7),m(8)]), pair([E,E])],
      seatWind: 'E', roundWind: 'E',
    }
    // 30 + 4 = 34 → 40
    expect(calculateFu(hand)).toBe(40)
  })
})
