import type { Tile } from '../engine/types'

const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export function tileImage(tile: Tile): string {
  if (tile.suit === 'man') return `${base}/tiles/Man${tile.value}.svg`
  if (tile.suit === 'pin') return `${base}/tiles/Pin${tile.value}.svg`
  if (tile.suit === 'sou') return `${base}/tiles/Sou${tile.value}.svg`
  if (tile.suit === 'wind') {
    const map: Record<string, string> = { E: 'Ton', S: 'Nan', W: 'Shaa', N: 'Pei' }
    return `${base}/tiles/${map[tile.value]}.svg`
  }
  // dragon
  const map: Record<string, string> = { W: 'Haku', G: 'Hatsu', R: 'Chun' }
  return `${base}/tiles/${map[tile.value as 'W' | 'G' | 'R']}.svg`
}
