import { create } from 'zustand'
import type { Puzzle, Tile, Solution } from '../engine/types'
import { tileEquals } from '../engine/tiles'
import { scoreSelection } from '../engine/scorer'

type Phase = 'idle' | 'playing' | 'committed'
type Mode = 'daily' | 'practice'

interface GameState {
  puzzle: Puzzle | null
  selectedTiles: Tile[]
  phase: Phase
  mode: Mode
  startTime: number | null   // Date.now() when first tile selected
  elapsed: number            // seconds elapsed (updated on commit)
  submittedSolution: Solution | null
  errorMessage: string | null

  loadPuzzle: (puzzle: Puzzle, mode?: Mode) => void
  toggleTile: (tile: Tile) => void
  commitHand: () => void
  getInitialState: () => Omit<GameState, 'loadPuzzle' | 'toggleTile' | 'commitHand' | 'getInitialState'>
}

const INITIAL: Omit<GameState, 'loadPuzzle' | 'toggleTile' | 'commitHand' | 'getInitialState'> = {
  puzzle: null,
  selectedTiles: [],
  phase: 'idle',
  mode: 'daily',
  startTime: null,
  elapsed: 0,
  submittedSolution: null,
  errorMessage: null,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL,

  getInitialState: () => INITIAL,

  loadPuzzle: (puzzle, mode = 'daily') => {
    // Pre-populate locked meld tiles
    const lockedTiles = puzzle.lockedMelds.flatMap(m => m.tiles)
    set({ ...INITIAL, puzzle, mode, selectedTiles: lockedTiles, phase: 'idle' })
  },

  toggleTile: (tile) => {
    const { puzzle, selectedTiles, phase, startTime } = get()
    if (!puzzle || phase === 'committed') return

    // Check if tile is locked
    const isLocked = puzzle.lockedMelds.some(m => m.tiles.some(t => tileEquals(t, tile)))
    if (isLocked) return

    const idx = selectedTiles.findIndex(t => tileEquals(t, tile))
    const newSelected = idx === -1
      ? [...selectedTiles, tile]
      : [...selectedTiles.slice(0, idx), ...selectedTiles.slice(idx + 1)]

    const newPhase = phase === 'idle' ? 'playing' : phase
    const newStartTime = startTime ?? Date.now()

    set({ selectedTiles: newSelected, phase: newPhase, startTime: newStartTime, errorMessage: null })
  },

  commitHand: () => {
    const { puzzle, selectedTiles, startTime } = get()
    if (!puzzle) return

    const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
    const sol = scoreSelection(
      selectedTiles,
      puzzle.lockedMelds,
      puzzle.doraIndicators,
      { seatWind: puzzle.seatWind, roundWind: puzzle.roundWind }
    )

    if (!sol) {
      set({ errorMessage: 'Not a valid winning hand — check for a complete structure and at least one yaku.' })
      return
    }

    set({ phase: 'committed', elapsed, submittedSolution: sol, errorMessage: null })

    // Save daily result to localStorage
    if (get().mode === 'daily') {
      const key = `kanquer-daily-${new Date().toISOString().slice(0, 10)}`
      localStorage.setItem(key, JSON.stringify({ points: sol.points, elapsed }))
    }
  },
}))
