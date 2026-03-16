import { describe, it, expect } from 'vitest'
import {
  m, p, s,
  E, S, W, N, Haku, Hatsu, Chun,
  isTerminal, isHonor, isSimple,
  tileEquals, sortTiles, doraOf, countDora,
} from './tiles'

describe('tile constructors', () => {
  it('creates a man tile', () => expect(m(3)).toEqual({ suit: 'man', value: 3 }))
  it('creates E wind', () => expect(E).toEqual({ suit: 'wind', value: 'E' }))
  it('creates Haku (white dragon)', () => expect(Haku).toEqual({ suit: 'dragon', value: 'W' }))
  it('W wind and Haku are different tiles', () => expect(tileEquals(W, Haku)).toBe(false))
})

describe('isTerminal', () => {
  it('1-man is terminal', () => expect(isTerminal(m(1))).toBe(true))
  it('9-pin is terminal', () => expect(isTerminal(p(9))).toBe(true))
  it('5-sou is not terminal', () => expect(isTerminal(s(5))).toBe(false))
  it('wind is not terminal', () => expect(isTerminal(E)).toBe(false))
})

describe('isHonor', () => {
  it('wind is honor', () => expect(isHonor(N)).toBe(true))
  it('dragon is honor', () => expect(isHonor(Chun)).toBe(true))
  it('numbered tile is not honor', () => expect(isHonor(m(7))).toBe(false))
})

describe('isSimple', () => {
  it('2–8 numbered tiles are simple', () => expect(isSimple(m(5))).toBe(true))
  it('1 is not simple', () => expect(isSimple(m(1))).toBe(false))
  it('honor is not simple', () => expect(isSimple(E)).toBe(false))
})

describe('tileEquals', () => {
  it('same suit and value → true', () => expect(tileEquals(m(3), m(3))).toBe(true))
  it('different value → false', () => expect(tileEquals(m(3), m(4))).toBe(false))
  it('different suit same value → false', () => expect(tileEquals(m(1), p(1))).toBe(false))
})

describe('sortTiles', () => {
  it('orders man < pin < sou < wind < dragon', () => {
    expect(sortTiles([Chun, E, s(1), p(1), m(1)])).toEqual([m(1), p(1), s(1), E, Chun])
  })
  it('sorts within man numerically', () => {
    expect(sortTiles([m(9), m(1), m(5)])).toEqual([m(1), m(5), m(9)])
  })
  it('sorts winds E S W N', () => {
    expect(sortTiles([N, W, S, E])).toEqual([E, S, W, N])
  })
  it('sorts dragons Haku Hatsu Chun', () => {
    expect(sortTiles([Chun, Haku, Hatsu])).toEqual([Haku, Hatsu, Chun])
  })
})

describe('doraOf', () => {
  it('3-man → 4-man', () => expect(doraOf(m(3))).toEqual(m(4)))
  it('9-pin wraps to 1-pin', () => expect(doraOf(p(9))).toEqual(p(1)))
  it('E wind → S wind', () => expect(doraOf(E)).toEqual(S))
  it('N wind wraps to E wind', () => expect(doraOf(N)).toEqual(E))
  it('Haku → Hatsu', () => expect(doraOf(Haku)).toEqual(Hatsu))
  it('Chun wraps to Haku', () => expect(doraOf(Chun)).toEqual(Haku))
  it('W wind dora is N (not Hatsu)', () => {
    expect(doraOf(W)).toEqual(N)
    expect(doraOf(W)).not.toEqual(Hatsu)
  })
})

describe('countDora', () => {
  it('counts matching dora tiles', () => {
    // indicator is m(3), so dora is m(4)
    expect(countDora([m(4), m(4), m(5)], [m(3)])).toBe(2)
  })
  it('returns 0 when no dora in hand', () => {
    expect(countDora([m(1), m(2), m(3)], [m(5)])).toBe(0)
  })
  it('counts dora across multiple indicators', () => {
    // indicators m(3) and p(5) → dora m(4) and p(6)
    expect(countDora([m(4), p(6), m(4)], [m(3), p(5)])).toBe(3)
  })
})
