import { describe, it, expect } from 'vitest'
import { generatePuzzle } from './generator'
import { scoreSelection } from './scorer'

describe('generatePuzzle', () => {
  it('returns a puzzle with 24 tiles', () => {
    const puzzle = generatePuzzle(12345)
    expect(puzzle.tiles).toHaveLength(24)
  })

  it('has at least 2 solutions', () => {
    const puzzle = generatePuzzle(12345)
    expect(puzzle.solutions.length).toBeGreaterThanOrEqual(2)
  })

  it('solutions are sorted by points descending', () => {
    const puzzle = generatePuzzle(12345)
    for (let i = 0; i < puzzle.solutions.length - 1; i++) {
      expect(puzzle.solutions[i].points).toBeGreaterThanOrEqual(puzzle.solutions[i + 1].points)
    }
  })

  it('locked meld tiles are a subset of puzzle tiles', () => {
    // Run a few seeds to catch cases with locked melds
    for (const seed of [1, 2, 3, 100, 999, 5000]) {
      const puzzle = generatePuzzle(seed)
      for (const meld of puzzle.lockedMelds) {
        for (const tile of meld.tiles) {
          const found = puzzle.tiles.some(t => t.suit === tile.suit && t.value === tile.value)
          expect(found, `Locked meld tile ${JSON.stringify(tile)} not in puzzle tiles`).toBe(true)
        }
      }
    }
  })

  it('has 1 or 2 dora indicators', () => {
    const puzzle = generatePuzzle(12345)
    expect(puzzle.doraIndicators.length).toBeGreaterThanOrEqual(1)
    expect(puzzle.doraIndicators.length).toBeLessThanOrEqual(2)
  })

  it('solutions are sorted by score descending', () => {
    const puzzle = generatePuzzle(42)
    // Verify solutions are in descending point order
    for (let i = 0; i < puzzle.solutions.length - 1; i++) {
      expect(puzzle.solutions[i].points).toBeGreaterThanOrEqual(puzzle.solutions[i + 1].points)
    }
  })

  it('same seed produces same puzzle', () => {
    const a = generatePuzzle(99999)
    const b = generatePuzzle(99999)
    expect(a.tiles).toEqual(b.tiles)
    expect(a.solutions[0].points).toBe(b.solutions[0].points)
  })

  it('different seeds produce different puzzles', () => {
    const a = generatePuzzle(1)
    const b = generatePuzzle(2)
    expect(a.tiles).not.toEqual(b.tiles)
  })
})
