import { describe, it, expect } from 'vitest'
import { m, p, s, E, S, W, N, Haku, Hatsu, Chun } from './tiles'
import { detectYaku } from './yaku'
import type { Hand } from './types'

const closed = false
const open = true

// Helper to build a standard hand
function std(melds: import('./types').Meld[], seatWind: import('./types').WindValue = 'S', roundWind: import('./types').WindValue = 'E'): Hand {
  return { structure: 'standard', melds, seatWind, roundWind }
}

function seq(tiles: import('./types').Tile[], o = false) {
  return { type: 'sequence' as const, tiles, open: o }
}
function tri(tiles: import('./types').Tile[], o = false) {
  return { type: 'triplet' as const, tiles, open: o }
}
function pair(tiles: import('./types').Tile[]) {
  return { type: 'pair' as const, tiles, open: false }
}

describe('Tanyao', () => {
  it('detects tanyao (all simples, closed)', () => {
    const hand = std([seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), tri([m(8),m(8),m(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Tanyao')
  })
  it('no tanyao when terminals present', () => {
    const hand = std([seq([m(1),m(2),m(3)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), tri([m(8),m(8),m(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Tanyao')
  })
  it('tanyao available open', () => {
    const hand = std([seq([m(2),m(3),m(4)], open), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), tri([m(8),m(8),m(8)]), pair([p(2),p(2)])])
    const yaku = detectYaku(hand)
    const tanyao = yaku.find(y => y.name === 'Tanyao')
    expect(tanyao).toBeTruthy()
    expect(tanyao!.han).toBe(1)
  })
})

describe('Yakuhai', () => {
  it('detects yakuhai for own seat wind triplet', () => {
    const hand = std([tri([E,E,E]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), pair([m(8),m(8)])], 'E', 'S')
    expect(detectYaku(hand).map(y => y.name)).toContain('Yakuhai')
  })
  it('detects yakuhai for round wind triplet', () => {
    const hand = std([tri([E,E,E]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), pair([m(8),m(8)])], 'S', 'E')
    expect(detectYaku(hand).map(y => y.name)).toContain('Yakuhai')
  })
  it('detects yakuhai for dragon triplet', () => {
    const hand = std([tri([Haku,Haku,Haku]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), pair([m(8),m(8)])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Yakuhai')
  })
  it('no yakuhai for non-value wind triplet', () => {
    // W wind triplet when seat=E, round=E → no yakuhai
    const hand = std([tri([W,W,W]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), seq([s(3),s(4),s(5)]), pair([m(8),m(8)])], 'E', 'E')
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Yakuhai')
  })
})

describe('Pinfu', () => {
  it('detects pinfu (all sequences, non-value pair, ryanmen wait implied)', () => {
    const hand = std([seq([m(2),m(3),m(4)]), seq([p(3),p(4),p(5)]), seq([s(6),s(7),s(8)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])], 'E', 'E')
    expect(detectYaku(hand).map(y => y.name)).toContain('Pinfu')
  })
  it('no pinfu when pair is seat wind', () => {
    const hand = std([seq([m(2),m(3),m(4)]), seq([p(3),p(4),p(5)]), seq([s(6),s(7),s(8)]), seq([m(6),m(7),m(8)]), pair([E,E])], 'E', 'S')
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Pinfu')
  })
  it('no pinfu when any meld is a triplet', () => {
    const hand = std([tri([m(2),m(2),m(2)]), seq([p(3),p(4),p(5)]), seq([s(6),s(7),s(8)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Pinfu')
  })
  it('no pinfu when hand is open', () => {
    const hand = std([seq([m(2),m(3),m(4)], open), seq([p(3),p(4),p(5)]), seq([s(6),s(7),s(8)]), seq([m(6),m(7),m(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Pinfu')
  })
})

describe('Iipeikou', () => {
  it('detects iipeikou (two identical sequences)', () => {
    const hand = std([seq([m(2),m(3),m(4)]), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), tri([s(8),s(8),s(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Iipeikou')
  })
  it('no iipeikou when hand is open', () => {
    const hand = std([seq([m(2),m(3),m(4)], open), seq([m(2),m(3),m(4)]), seq([p(5),p(6),p(7)]), tri([s(8),s(8),s(8)]), pair([p(2),p(2)])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Iipeikou')
  })
})

describe('Toitoi', () => {
  it('detects toitoi (all triplets)', () => {
    const hand = std([tri([m(1),m(1),m(1)]), tri([p(5),p(5),p(5)]), tri([s(9),s(9),s(9)]), tri([E,E,E]), pair([Haku,Haku])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Toitoi')
  })
  it('no toitoi when a sequence exists', () => {
    const hand = std([seq([m(1),m(2),m(3)]), tri([p(5),p(5),p(5)]), tri([s(9),s(9),s(9)]), tri([E,E,E]), pair([Haku,Haku])])
    expect(detectYaku(hand).map(y => y.name)).not.toContain('Toitoi')
  })
})

describe('Ittsu', () => {
  it('detects ittsu (1-2-3, 4-5-6, 7-8-9 same suit)', () => {
    const hand = std([seq([m(1),m(2),m(3)]), seq([m(4),m(5),m(6)]), seq([m(7),m(8),m(9)]), seq([p(3),p(4),p(5)]), pair([s(5),s(5)])])
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Ittsu')
    expect(yaku.find(y => y.name === 'Ittsu')!.han).toBe(2)
  })
  it('ittsu loses 1 han when open', () => {
    const hand = std([seq([m(1),m(2),m(3)], open), seq([m(4),m(5),m(6)]), seq([m(7),m(8),m(9)]), seq([p(3),p(4),p(5)]), pair([s(5),s(5)])])
    expect(detectYaku(hand).find(y => y.name === 'Ittsu')!.han).toBe(1)
  })
})

describe('Sanshoku Doujun', () => {
  it('detects sanshoku doujun', () => {
    const hand = std([seq([m(3),m(4),m(5)]), seq([p(3),p(4),p(5)]), seq([s(3),s(4),s(5)]), seq([m(7),m(8),m(9)]), pair([E,E])])
    expect(detectYaku(hand).map(y => y.name)).toContain('Sanshoku Doujun')
  })
})

describe('Chinitsu', () => {
  it('detects chinitsu (one suit only, closed = 6 han)', () => {
    const hand = std([seq([m(1),m(2),m(3)]), seq([m(4),m(5),m(6)]), seq([m(7),m(8),m(9)]), tri([m(5),m(5),m(5)]), pair([m(2),m(2)])])
    const y = detectYaku(hand).find(y => y.name === 'Chinitsu')
    expect(y?.han).toBe(6)
  })
  it('chinitsu open = 5 han', () => {
    const hand = std([seq([m(1),m(2),m(3)], open), seq([m(4),m(5),m(6)]), seq([m(7),m(8),m(9)]), tri([m(5),m(5),m(5)]), pair([m(2),m(2)])])
    expect(detectYaku(hand).find(y => y.name === 'Chinitsu')!.han).toBe(5)
  })
})

describe('Chiitoitsu', () => {
  it('detects chiitoitsu', () => {
    const hand: Hand = { structure: 'chiitoitsu', pairs: [[m(1),m(1)],[m(3),m(3)],[p(2),p(2)],[p(4),p(4)],[s(6),s(6)],[s(8),s(8)],[E,E]], seatWind: 'E', roundWind: 'E' }
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Chiitoitsu')
    expect(yaku.find(y => y.name === 'Chiitoitsu')!.han).toBe(2)
  })
  it('detects honitsu on chiitoitsu (one numbered suit + honors)', () => {
    const hand: Hand = { structure: 'chiitoitsu', pairs: [[m(1),m(1)],[m(3),m(3)],[m(5),m(5)],[m(7),m(7)],[m(9),m(9)],[E,E],[S,S]], seatWind: 'E', roundWind: 'E' }
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Honitsu')
    expect(yaku.find(y => y.name === 'Honitsu')!.han).toBe(3)
  })
  it('detects tsuuiisou on chiitoitsu (yakuman, no chiitoitsu stacking)', () => {
    const hand: Hand = { structure: 'chiitoitsu', pairs: [[E,E],[S,S],[W,W],[N,N],[Haku,Haku],[Hatsu,Hatsu],[Chun,Chun]], seatWind: 'E', roundWind: 'E' }
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Tsuuiisou')
    expect(yaku.find(y => y.name === 'Tsuuiisou')!.han).toBe(13)
    expect(yaku.map(y => y.name)).not.toContain('Chiitoitsu')
  })
})

describe('Kokushi', () => {
  it('detects kokushi (yakuman)', () => {
    const hand: Hand = { structure: 'kokushi', tiles: [m(1),m(9),p(1),p(9),s(1),s(9),E,S,W,N,Haku,Hatsu,Chun,m(1)], seatWind: 'E', roundWind: 'E' }
    const yaku = detectYaku(hand)
    expect(yaku.map(y => y.name)).toContain('Kokushi')
    expect(yaku.find(y => y.name === 'Kokushi')!.han).toBe(13)
  })
})

describe('Daisangen', () => {
  it('detects daisangen (all 3 dragon triplets, yakuman)', () => {
    const hand = std([tri([Haku,Haku,Haku]), tri([Hatsu,Hatsu,Hatsu]), tri([Chun,Chun,Chun]), seq([m(1),m(2),m(3)]), pair([p(5),p(5)])])
    expect(detectYaku(hand).find(y => y.name === 'Daisangen')!.han).toBe(13)
  })
})

describe('Tsuuiisou', () => {
  it('detects tsuuiisou (all honors, yakuman)', () => {
    const hand = std([tri([E,E,E]), tri([S,S,S]), tri([W,W,W]), tri([Haku,Haku,Haku]), pair([Chun,Chun])])
    expect(detectYaku(hand).find(y => y.name === 'Tsuuiisou')!.han).toBe(13)
  })
})
