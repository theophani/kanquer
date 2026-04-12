// Launch date — set this to the actual launch date when deploying
export const LAUNCH_DATE = new Date('2026-01-01T00:00:00Z')

const PUZZLE_SALT = 'miniichi-v1'

export function puzzleNumberFromDate(date: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const launchMs = Date.UTC(
    LAUNCH_DATE.getUTCFullYear(),
    LAUNCH_DATE.getUTCMonth(),
    LAUNCH_DATE.getUTCDate()
  )
  const targetMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((targetMs - launchMs) / msPerDay) + 1
}

export function dateFromPuzzleNumber(n: number): Date {
  const d = new Date(LAUNCH_DATE)
  d.setUTCDate(d.getUTCDate() + n - 1)
  return d
}

// Deterministic hash: date string + salt → 32-bit integer seed
export function seedFromPuzzleNumber(n: number): number {
  const date = dateFromPuzzleNumber(n)
  const dateStr = date.toISOString().slice(0, 10)
  return hashString(`${dateStr}:${PUZZLE_SALT}`)
}

export function seedFromHex(hex: string): number {
  return parseInt(hex.slice(0, 8), 16)
}

// Simple djb2-style hash
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0 // keep as unsigned 32-bit
  }
  return hash
}
