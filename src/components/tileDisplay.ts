import type { Tile } from '../engine/types'

export function tileDisplay(tile: Tile): string {
  if (tile.suit === 'wind') return tile.value
  if (tile.suit === 'dragon') {
    return ({ W: '白', G: '發', R: '中' } as const)[tile.value as 'W' | 'G' | 'R']
  }
  return `${tile.value}${tile.suit[0].toUpperCase()}`
}
