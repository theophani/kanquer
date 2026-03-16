import { describe, it, expect } from 'vitest'
import { LAUNCH_DATE, puzzleNumberFromDate, dateFromPuzzleNumber, seedFromPuzzleNumber, seedFromHex } from './seed'

describe('puzzleNumberFromDate', () => {
  it('launch date is puzzle #1', () => {
    expect(puzzleNumberFromDate(LAUNCH_DATE)).toBe(1)
  })
  it('day after launch is puzzle #2', () => {
    const d = new Date(LAUNCH_DATE)
    d.setUTCDate(d.getUTCDate() + 1)
    expect(puzzleNumberFromDate(d)).toBe(2)
  })
})

describe('dateFromPuzzleNumber', () => {
  it('puzzle #1 → launch date', () => {
    const d = dateFromPuzzleNumber(1)
    expect(d.toISOString().slice(0, 10)).toBe(LAUNCH_DATE.toISOString().slice(0, 10))
  })
  it('round-trips: date → number → date', () => {
    const original = new Date('2026-06-01T00:00:00Z')
    const n = puzzleNumberFromDate(original)
    const restored = dateFromPuzzleNumber(n)
    expect(restored.toISOString().slice(0, 10)).toBe('2026-06-01')
  })
})

describe('seedFromPuzzleNumber', () => {
  it('returns a number', () => {
    expect(typeof seedFromPuzzleNumber(1)).toBe('number')
  })
  it('same puzzle number → same seed', () => {
    expect(seedFromPuzzleNumber(42)).toBe(seedFromPuzzleNumber(42))
  })
  it('different puzzle numbers → different seeds', () => {
    expect(seedFromPuzzleNumber(1)).not.toBe(seedFromPuzzleNumber(2))
  })
})

describe('seedFromHex', () => {
  it('returns a number from hex string', () => {
    expect(typeof seedFromHex('abc123')).toBe('number')
  })
  it('same hex → same seed', () => {
    expect(seedFromHex('deadbeef')).toBe(seedFromHex('deadbeef'))
  })
})
