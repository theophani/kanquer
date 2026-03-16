import type { Tile, Meld, Solution, WindValue } from './types'
import { getAllDecompositions } from './hand'
import { detectYaku } from './yaku'
import { calculateFu } from './fu'
import { countDora } from './tiles'

type Ctx = { seatWind: WindValue; roundWind: WindValue }

export function scoreSelection(
  tiles: Tile[],
  lockedMelds: Meld[],
  doraIndicators: Tile[],
  ctx: Ctx
): Solution | null {
  const decompositions = getAllDecompositions(tiles, lockedMelds, ctx)
  if (decompositions.length === 0) return null

  let best: Solution | null = null
  for (const hand of decompositions) {
    const yaku = detectYaku(hand)
    if (yaku.length === 0) continue
    const doraCount = countDora(tiles, doraIndicators)
    const isYakuman = yaku.some(y => y.han === 13)
    const han = isYakuman ? 13 : yaku.reduce((sum, y) => sum + y.han, 0) + doraCount
    const fu = calculateFu(hand)
    const points = hanFuToPoints(han, fu)
    if (best === null || points > best.points) {
      best = { tiles, hand, yaku, han, fu, points }
    }
  }
  return best
}

// Non-dealer point table (standard values)
export function hanFuToPoints(han: number, fu: number): number {
  if (han >= 13) return 32000 // yakuman
  if (han >= 11) return 24000 // sanbaiman
  if (han >= 8)  return 16000 // baiman
  if (han >= 6)  return 12000 // haneman
  if (han >= 5)  return 8000  // mangan
  const raw = fu * Math.pow(2, han + 2)
  if (raw >= 8000) return 8000 // mangan cap
  // Round up to nearest 100
  return Math.ceil(raw / 100) * 100
}
