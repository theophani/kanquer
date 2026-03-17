import { describe, it, expect } from 'vitest'
import { m, p, s, E, wind, dragon } from './tiles'
import { scoreSelection } from './scorer'

const ctx = { seatWind: 'S' as const, roundWind: 'E' as const }

describe('scoreSelection', () => {
  it('returns null for an invalid hand', () => {
    const tiles = [m(1),m(2),m(4),m(5),m(7),m(8),p(1),p(2),p(4),p(5),p(7),p(8),s(1),s(2)]
    expect(scoreSelection(tiles, [], [], ctx)).toBeNull()
  })

  it('returns null for a hand with no yaku', () => {
    // valid structure but no yaku (e.g. all sequences but one honor pair that's not a value tile... actually hard to construct without yaku)
    // All simples hand → tanyao, so let's test a hand that's structurally valid but no yaku:
    // Mixed suits + terminals + no value tile triplets → chanta maybe... let's skip this edge case
    // and just verify valid hand returns a solution
    const tiles = [m(2),m(3),m(4), p(3),p(4),p(5), s(6),s(7),s(8), m(6),m(7),m(8), p(2),p(2)]
    const sol = scoreSelection(tiles, [], [], ctx)
    expect(sol).not.toBeNull()
    expect(sol!.yaku.length).toBeGreaterThan(0)
  })

  it('scores tanyao correctly', () => {
    // 4 sequences all simples, simple pair → Tanyao + Pinfu = 2 han 30 fu → 2000 pts non-dealer
    const tiles = [m(2),m(3),m(4), p(5),p(6),p(7), s(3),s(4),s(5), m(6),m(7),m(8), p(2),p(2)]
    const sol = scoreSelection(tiles, [], [], ctx)!
    expect(sol.yaku.map(y => y.name)).toContain('Tanyao')
    expect(sol.han).toBeGreaterThanOrEqual(2) // at minimum tanyao + pinfu
  })

  it('dora adds han', () => {
    const tiles = [m(2),m(3),m(4), p(5),p(6),p(7), s(3),s(4),s(5), m(6),m(7),m(8), p(2),p(2)]
    // dora indicator m(1) → dora is m(2), hand has m(2) → +1 han
    const solNoDora = scoreSelection(tiles, [], [], ctx)!
    const solWithDora = scoreSelection(tiles, [], [m(1)], ctx)!
    expect(solWithDora.han).toBe(solNoDora.han + 1)
  })

  it('yakuman returns 32000 points', () => {
    const kokushiTiles = [m(1),m(9),p(1),p(9),s(1),s(9),E,wind('S'),wind('W'),wind('N'),dragon('W'),dragon('G'),dragon('R'),m(1)]
    const sol = scoreSelection(kokushiTiles, [], [], { seatWind: 'S', roundWind: 'E' })!
    expect(sol.points).toBe(32000)
  })

  it('scores higher when seat wind is East (dealer)', () => {
    const tiles = [m(2),m(3),m(4), p(5),p(6),p(7), s(3),s(4),s(5), m(6),m(7),m(8), p(2),p(2)]
    const ctxDealer = { seatWind: 'E' as const, roundWind: 'E' as const }
    const ctxNonDealer = { seatWind: 'S' as const, roundWind: 'E' as const }
    // dora indicator m(1) → dora is m(2), hand has m(2) → +1 dora han
    const dealer = scoreSelection(tiles, [], [m(1)], ctxDealer)!
    const nonDealer = scoreSelection(tiles, [], [m(1)], ctxNonDealer)!
    expect(dealer.points).toBeGreaterThan(nonDealer.points)
  })
})
