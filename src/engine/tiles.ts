import type { Tile, NumberValue, WindValue, DragonValue } from './types'

export const m = (v: NumberValue): Tile => ({ suit: 'man', value: v })
export const p = (v: NumberValue): Tile => ({ suit: 'pin', value: v })
export const s = (v: NumberValue): Tile => ({ suit: 'sou', value: v })
export const wind = (v: WindValue): Tile => ({ suit: 'wind', value: v })
export const dragon = (v: DragonValue): Tile => ({ suit: 'dragon', value: v })

export const E = wind('E')
export const S = wind('S')
export const W = wind('W')
export const N = wind('N')
export const Haku  = dragon('W')
export const Hatsu = dragon('G')
export const Chun  = dragon('R')

export const isTerminal = (t: Tile): boolean =>
  (t.suit === 'man' || t.suit === 'pin' || t.suit === 'sou') &&
  (t.value === 1 || t.value === 9)

export const isHonor = (t: Tile): boolean =>
  t.suit === 'wind' || t.suit === 'dragon'

export const isTerminalOrHonor = (t: Tile): boolean => isTerminal(t) || isHonor(t)

export const isSimple = (t: Tile): boolean => !isTerminalOrHonor(t)

// Always check suit before value (W is overloaded: West wind vs White dragon)
export const tileEquals = (a: Tile, b: Tile): boolean =>
  a.suit === b.suit && a.value === b.value

export const tileSortKey = (t: Tile): number => {
  if (t.suit === 'man')    return (t.value as number)
  if (t.suit === 'pin')    return 100 + (t.value as number)
  if (t.suit === 'sou')    return 200 + (t.value as number)
  if (t.suit === 'wind')   return 300 + ({ E: 0, S: 1, W: 2, N: 3 } as const)[t.value as WindValue]
  return 400 + ({ W: 0, G: 1, R: 2 } as const)[t.value as DragonValue]
}

export const sortTiles = (tiles: Tile[]): Tile[] =>
  [...tiles].sort((a, b) => tileSortKey(a) - tileSortKey(b))

export const doraOf = (indicator: Tile): Tile => {
  if (indicator.suit === 'man' || indicator.suit === 'pin' || indicator.suit === 'sou') {
    const next = (indicator.value as number) === 9 ? 1 : (indicator.value as number) + 1
    return { suit: indicator.suit, value: next as NumberValue }
  }
  if (indicator.suit === 'wind') {
    const seq: WindValue[] = ['E', 'S', 'W', 'N']
    return { suit: 'wind', value: seq[(seq.indexOf(indicator.value as WindValue) + 1) % 4] }
  }
  const seq: DragonValue[] = ['W', 'G', 'R']
  return { suit: 'dragon', value: seq[(seq.indexOf(indicator.value as DragonValue) + 1) % 3] }
}

export const countDora = (tiles: Tile[], doraIndicators: Tile[]): number => {
  const doraList = doraIndicators.map(doraOf)
  return tiles.reduce(
    (count, tile) => count + doraList.filter(d => tileEquals(d, tile)).length,
    0
  )
}
