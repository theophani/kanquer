import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { generatePuzzle } from '../engine/generator'

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState())
  })

  it('starts in playing phase after loadPuzzle', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    expect(useGameStore.getState().phase).toBe('playing')
  })

  it('loadPuzzle sets puzzle and pre-selects locked tiles by index', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const state = useGameStore.getState()
    expect(state.puzzle).toBe(puzzle)
    const lockedCount = puzzle.lockedMelds.reduce((sum, m) => sum + m.tiles.length, 0)
    expect(state.selectedIndices.size).toBe(lockedCount)
    state.lockedIndices.forEach(i => {
      expect(state.selectedIndices.has(i)).toBe(true)
    })
  })

  it('toggling a free tile adds it to selectedIndices', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const { lockedIndices } = useGameStore.getState()
    const freeIdx = puzzle.tiles.findIndex((_, i) => !lockedIndices.has(i))
    useGameStore.getState().toggleTile(freeIdx)
    expect(useGameStore.getState().selectedIndices.has(freeIdx)).toBe(true)
  })

  it('toggling a tile twice deselects it', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const { lockedIndices } = useGameStore.getState()
    const freeIdx = puzzle.tiles.findIndex((_, i) => !lockedIndices.has(i))
    useGameStore.getState().toggleTile(freeIdx)
    useGameStore.getState().toggleTile(freeIdx)
    expect(useGameStore.getState().selectedIndices.has(freeIdx)).toBe(false)
  })

  it('locked tile indices cannot be toggled off', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const { lockedIndices } = useGameStore.getState()
    if (lockedIndices.size > 0) {
      const lockedIdx = [...lockedIndices][0]
      useGameStore.getState().toggleTile(lockedIdx)
      expect(useGameStore.getState().selectedIndices.has(lockedIdx)).toBe(true)
    }
  })

  it('commitHand transitions to committed phase', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    // Build selectedIndices from the best known solution
    const bestTiles = puzzle.solutions[0].tiles
    const indices = new Set<number>()
    const used = new Set<number>()
    for (const tile of bestTiles) {
      const idx = puzzle.tiles.findIndex((t, i) => !used.has(i) && t.suit === tile.suit && t.value === tile.value)
      if (idx !== -1) { indices.add(idx); used.add(idx) }
    }
    useGameStore.setState({ selectedIndices: indices, phase: 'playing' })
    useGameStore.getState().commitHand()
    expect(useGameStore.getState().phase).toBe('committed')
    expect(useGameStore.getState().submittedSolution).not.toBeNull()
  })

  it('commitHand with invalid hand sets error message', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    useGameStore.setState({
      selectedIndices: new Set([0,1,2,3,4,5,6,7,8,9,10,11,12,13]),
      phase: 'playing'
    })
    useGameStore.getState().commitHand()
    const state = useGameStore.getState()
    if (state.phase === 'playing') {
      expect(state.errorMessage).toBeTruthy()
    }
  })

  it('resetHand restores selectedIndices to locked only and clears error', () => {
    const puzzle = generatePuzzle(1)
    useGameStore.getState().loadPuzzle(puzzle)
    const { lockedIndices } = useGameStore.getState()
    const freeIdx = puzzle.tiles.findIndex((_, i) => !lockedIndices.has(i))
    useGameStore.getState().toggleTile(freeIdx)
    useGameStore.setState({ errorMessage: 'some error' })
    useGameStore.getState().resetHand()
    const state = useGameStore.getState()
    expect(state.selectedIndices.size).toBe(lockedIndices.size)
    expect(state.errorMessage).toBeNull()
  })
})
