import { describe, it, expect } from 'vitest'
import { m, p, s, E, S, W, N, Haku, Hatsu, Chun } from './tiles'
import { parseHand, getAllDecompositions } from './hand'
import type { Meld } from './types'

const ctx = { seatWind: 'E' as const, roundWind: 'E' as const }

describe('parseHand — standard', () => {
  it('detects a valid all-sequence hand', () => {
    const tiles = [m(2),m(3),m(4), p(3),p(4),p(5), s(6),s(7),s(8), m(6),m(7),m(8), p(2),p(2)]
    const hand = parseHand(tiles, [], ctx)
    expect(hand?.structure).toBe('standard')
  })

  it('detects an all-triplets hand', () => {
    const tiles = [m(1),m(1),m(1), m(9),m(9),m(9), p(5),p(5),p(5), s(7),s(7),s(7), E,E]
    expect(parseHand(tiles, [], ctx)?.structure).toBe('standard')
  })

  it('returns null when 14 tiles cannot form a valid hand', () => {
    const tiles = [m(1),m(2),m(4),m(5),m(7),m(8), p(1),p(2),p(4),p(5),p(7),p(8), s(1),s(2)]
    expect(parseHand(tiles, [], ctx)).toBeNull()
  })

  it('respects locked melds: uses them as-is', () => {
    const locked: Meld[] = [{ type: 'sequence', tiles: [m(1), m(2), m(3)], open: true }]
    const free = [p(3),p(4),p(5), s(6),s(7),s(8), m(6),m(7),m(8), p(2),p(2)]
    const hand = parseHand([...locked[0].tiles, ...free], locked, ctx)
    expect(hand?.structure).toBe('standard')
    if (hand?.structure === 'standard') {
      expect(hand.melds.some(ml => ml.open)).toBe(true)
    }
  })
})

describe('parseHand — chiitoitsu', () => {
  it('detects 7 different pairs', () => {
    const tiles = [m(1),m(1), m(3),m(3), m(5),m(5), p(2),p(2), p(4),p(4), s(6),s(6), E,E]
    expect(parseHand(tiles, [], ctx)?.structure).toBe('chiitoitsu')
  })

  it('rejects 4-of-a-kind in the same position (not 7 different pairs)', () => {
    const tiles = [m(1),m(1),m(1),m(1), m(3),m(3), p(2),p(2), p(4),p(4), s(6),s(6), E,E]
    const hand = parseHand(tiles, [], ctx)
    expect(hand?.structure).not.toBe('chiitoitsu')
  })

  it('not available with locked melds', () => {
    const locked: Meld[] = [{ type: 'sequence', tiles: [m(1), m(2), m(3)], open: true }]
    const tiles = [...locked[0].tiles, m(4),m(4), m(5),m(5), p(2),p(2), p(4),p(4), s(6),s(6)]
    expect(parseHand(tiles, locked, ctx)?.structure).not.toBe('chiitoitsu')
  })
})

describe('parseHand — kokushi', () => {
  const kokushiBase = [m(1),m(9), p(1),p(9), s(1),s(9), E,S,W,N, Haku,Hatsu,Chun]

  it('detects kokushi with a duplicate', () => {
    const tiles = [...kokushiBase, m(1)]
    expect(parseHand(tiles, [], ctx)?.structure).toBe('kokushi')
  })

  it('rejects kokushi when a required tile is missing', () => {
    const tiles = [...kokushiBase.slice(1), m(2)] // replaced m(1) with m(2)
    expect(parseHand(tiles, [], ctx)?.structure).not.toBe('kokushi')
  })

  it('not available with locked melds', () => {
    const locked: Meld[] = [{ type: 'sequence', tiles: [m(1), m(2), m(3)], open: true }]
    expect(parseHand([...kokushiBase, m(1)], locked, ctx)?.structure).not.toBe('kokushi')
  })
})

describe('getAllDecompositions', () => {
  it('returns multiple decompositions when tiles admit seq×3 and triplet×3', () => {
    // m(1)×3 m(2)×3 m(3)×3 can be decomposed as:
    // A: triplet(111) + triplet(222) + triplet(333)
    // B: seq(123) + seq(123) + seq(123)
    const tiles = [
      m(1),m(1),m(1), m(2),m(2),m(2), m(3),m(3),m(3),
      p(5),p(5),
      s(7),s(7),s(7),
    ]
    const decomps = getAllDecompositions(tiles, [], ctx)
    expect(decomps.length).toBeGreaterThan(1)
    const structures = decomps.map(h => {
      if (h.structure !== 'standard') return 'other'
      const nonPair = h.melds.filter(ml => ml.type !== 'pair')
      return nonPair.every(ml => ml.type === 'triplet') ? 'all-triplets' : 'has-sequences'
    })
    expect(structures).toContain('all-triplets')
    expect(structures).toContain('has-sequences')
  })
})
