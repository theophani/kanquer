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

  const dealer = ctx.seatWind === 'E'
  let best: Solution | null = null
  for (const hand of decompositions) {
    const yaku = detectYaku(hand)
    if (yaku.length === 0) continue
    const doraCount = countDora(tiles, doraIndicators)
    const isYakuman = yaku.some(y => y.han === 13)
    const han = isYakuman ? 13 : yaku.reduce((sum, y) => sum + y.han, 0) + doraCount
    const fu = calculateFu(hand)
    const points = hanFuToPoints(han, fu, dealer)
    if (best === null || points > best.points) {
      best = { tiles, hand, yaku, han, fu, points }
    }
  }
  return best
}

export function hanFuToPoints(han: number, fu: number, dealer: boolean): number {
  if (dealer) {
    if (han >= 13) return 48000
    if (han >= 11) return 36000
    if (han >= 8)  return 24000
    if (han >= 6)  return 18000
    if (han >= 5)  return 12000
    const raw = fu * Math.pow(2, han + 2)
    if (raw >= 8000) return 12000
    const ndPts = Math.ceil(raw / 100) * 100
    return Math.ceil(ndPts * 1.5 / 100) * 100
  } else {
    if (han >= 13) return 32000
    if (han >= 11) return 24000
    if (han >= 8)  return 16000
    if (han >= 6)  return 12000
    if (han >= 5)  return 8000
    const raw = fu * Math.pow(2, han + 2)
    if (raw >= 8000) return 8000
    return Math.ceil(raw / 100) * 100
  }
}
