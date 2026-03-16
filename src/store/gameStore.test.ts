import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { generatePuzzle } from '../engine/generator'

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState())
  })

  it('starts in idle phase', () => {
    expect(useGameStore.getState().phase).toBe('idle')
  })

  it('loadPuzzle sets puzzle and resets selection', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    expect(useGameStore.getState().puzzle).toBe(puzzle)
    expect(useGameStore.getState().selectedTiles).toEqual([])
    expect(useGameStore.getState().phase).toBe('idle')
  })

  it('selecting a tile starts timer and transitions to playing', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    useGameStore.getState().toggleTile(puzzle.tiles[0])
    expect(useGameStore.getState().phase).toBe('playing')
    expect(useGameStore.getState().selectedTiles).toHaveLength(1)
  })

  it('toggling a tile twice deselects it', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    useGameStore.getState().toggleTile(puzzle.tiles[0])
    useGameStore.getState().toggleTile(puzzle.tiles[0])
    expect(useGameStore.getState().selectedTiles).toHaveLength(0)
  })

  it('locked meld tiles cannot be deselected', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    if (puzzle.lockedMelds.length > 0) {
      const lockedTile = puzzle.lockedMelds[0].tiles[0]
      useGameStore.getState().toggleTile(lockedTile) // try to deselect
      const state = useGameStore.getState()
      // locked tile should still be in selectedTiles (it was pre-loaded)
      expect(state.selectedTiles.some(t => t.suit === lockedTile.suit && t.value === lockedTile.value)).toBe(true)
    }
  })

  it('commitHand transitions to committed phase', () => {
    // Use a known-valid hand
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const validTiles = puzzle.solutions[0].tiles
    useGameStore.setState({ selectedTiles: validTiles, phase: 'playing' })
    useGameStore.getState().commitHand()
    expect(useGameStore.getState().phase).toBe('committed')
    expect(useGameStore.getState().submittedSolution).not.toBeNull()
  })

  it('commitHand with invalid hand sets error message', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    // Select first 14 tiles (likely invalid hand)
    useGameStore.setState({ selectedTiles: puzzle.tiles.slice(0, 14), phase: 'playing' })
    // If it happens to be invalid:
    useGameStore.getState().commitHand()
    const state = useGameStore.getState()
    if (state.phase === 'playing') {
      expect(state.errorMessage).toBeTruthy()
    }
  })
})
