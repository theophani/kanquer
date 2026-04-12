import { create } from 'zustand'
import type { Puzzle, Solution } from '../engine/types'
import { tileEquals } from '../engine/tiles'
import { scoreSelection } from '../engine/scorer'

type Phase = 'playing' | 'committed'
type Mode = 'daily' | 'practice'

type SavedResult = { elapsed: number; selectedIndices: number[] }

interface GameState {
  puzzle: Puzzle | null
  selectedIndices: number[]
  lockedIndices: Set<number>
  phase: Phase
  mode: Mode
  timerStartedAt: number | null
  accumulatedMs: number
  elapsed: number
  submittedSolution: Solution | null
  errorMessage: string | null

  loadPuzzle: (puzzle: Puzzle, mode?: Mode, savedResult?: SavedResult) => void
  toggleTile: (index: number) => void
  commitHand: () => void
  resetHand: () => void
  pauseTimer: () => void
  resumeTimer: () => void
  getInitialState: () => Omit<GameState,
    'loadPuzzle' | 'toggleTile' | 'commitHand' | 'resetHand' |
    'pauseTimer' | 'resumeTimer' | 'getInitialState'>
}

function computeLockedIndices(puzzle: Puzzle): Set<number> {
  const lockedTiles = puzzle.lockedMelds.flatMap(m => m.tiles)
  const assigned = new Set<number>()
  for (const lockedTile of lockedTiles) {
    for (let i = 0; i < puzzle.tiles.length; i++) {
      if (!assigned.has(i) && tileEquals(puzzle.tiles[i], lockedTile)) {
        assigned.add(i)
        break
      }
    }
  }
  return assigned
}

const INITIAL = {
  puzzle: null,
  selectedIndices: [] as number[],
  lockedIndices: new Set<number>(),
  phase: 'playing' as Phase,
  mode: 'daily' as Mode,
  timerStartedAt: null as number | null,
  accumulatedMs: 0,
  elapsed: 0,
  submittedSolution: null,
  errorMessage: null,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL,

  getInitialState: () => ({
    ...INITIAL,
    selectedIndices: [] as number[],
    lockedIndices: new Set<number>(),
  }),

  loadPuzzle: (puzzle, mode = 'daily', savedResult) => {
    const lockedIndices = computeLockedIndices(puzzle)

    if (savedResult) {
      const selectedIndices = [...savedResult.selectedIndices]
      const tiles = [...selectedIndices].sort((a, b) => a - b).map(i => puzzle.tiles[i])
      const sol = scoreSelection(
        tiles, puzzle.lockedMelds, puzzle.doraIndicators,
        { seatWind: puzzle.seatWind, roundWind: puzzle.roundWind }
      )
      set({
        ...INITIAL,
        puzzle, mode, lockedIndices, selectedIndices,
        phase: 'committed',
        elapsed: savedResult.elapsed,
        submittedSolution: sol,
        timerStartedAt: null,
        accumulatedMs: 0,
      })
      return
    }

    set({
      ...INITIAL,
      puzzle, mode, lockedIndices,
      selectedIndices: [...lockedIndices],
      phase: 'playing',
      timerStartedAt: Date.now(),
      accumulatedMs: 0,
    })
  },

  toggleTile: (index) => {
    const { puzzle, selectedIndices, lockedIndices, phase } = get()
    if (!puzzle || phase === 'committed') return
    if (lockedIndices.has(index)) return
    if (!selectedIndices.includes(index) && selectedIndices.length >= 14) return

    const next = selectedIndices.includes(index)
      ? selectedIndices.filter(i => i !== index)
      : [...selectedIndices, index]
    set({ selectedIndices: next, errorMessage: null })
  },

  commitHand: () => {
    const { puzzle, selectedIndices, timerStartedAt, accumulatedMs } = get()
    if (!puzzle) return

    const elapsed = Math.floor(
      (accumulatedMs + (timerStartedAt ? Date.now() - timerStartedAt : 0)) / 1000
    )
    get().pauseTimer()

    const tiles = [...selectedIndices].sort((a, b) => a - b).map(i => puzzle.tiles[i])
    const sol = scoreSelection(
      tiles, puzzle.lockedMelds, puzzle.doraIndicators,
      { seatWind: puzzle.seatWind, roundWind: puzzle.roundWind }
    )

    if (!sol) {
      set({ errorMessage: 'Not a valid winning hand. Check for a complete structure and at least one yaku.' })
      return
    }

    set({ phase: 'committed', elapsed, submittedSolution: sol, errorMessage: null })

    if (get().mode === 'daily') {
      const key = `miniichi-daily-${new Date().toISOString().slice(0, 10)}`
      localStorage.setItem(key, JSON.stringify({
        points: sol.points,
        elapsed,
        selectedIndices: [...selectedIndices].sort((a, b) => a - b),
      }))
    }
  },

  resetHand: () => {
    const { lockedIndices } = get()
    set({ selectedIndices: [...lockedIndices], errorMessage: null })
  },

  pauseTimer: () => {
    const { timerStartedAt, accumulatedMs } = get()
    if (timerStartedAt === null) return
    set({ accumulatedMs: accumulatedMs + (Date.now() - timerStartedAt), timerStartedAt: null })
  },

  resumeTimer: () => {
    const { timerStartedAt, phase } = get()
    if (timerStartedAt !== null || phase === 'committed') return
    set({ timerStartedAt: Date.now() })
  },
}))
