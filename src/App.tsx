import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { generatePuzzle } from './engine/generator'
import { seedFromPuzzleNumber, seedFromHex, puzzleNumberFromDate, dateFromPuzzleNumber } from './engine/seed'
import HomePage from './components/HomePage'
import GamePage from './components/GamePage'

export default function App() {
  const { puzzle, loadPuzzle } = useGameStore()

  useEffect(() => {
    const hash = window.location.hash.slice(1) // strip leading '#'

    function loadDaily(n: number) {
      const seed = seedFromPuzzleNumber(n)
      const puzz = generatePuzzle(seed)
      const puzzleDate = dateFromPuzzleNumber(n).toISOString().slice(0, 10)
      const key = `kanquer-daily-${puzzleDate}`
      const cached = localStorage.getItem(key)
      if (cached) {
        const saved = JSON.parse(cached)
        if (Array.isArray(saved.selectedIndices)) {
          loadPuzzle(puzz, 'daily', { elapsed: saved.elapsed, selectedIndices: saved.selectedIndices })
        } else {
          loadPuzzle(puzz, 'daily')
        }
      } else {
        loadPuzzle(puzz, 'daily')
      }
    }

    if (hash === 'daily') {
      const n = puzzleNumberFromDate(new Date())
      window.history.replaceState({}, '', `#p=${n}`)
      loadDaily(n)

    } else if (hash === 'random') {
      const seed = Math.floor(Math.random() * 0xFFFFFFFF)
      const seedHex = seed.toString(16).padStart(8, '0')
      window.history.replaceState({}, '', `#seed=${seedHex}`)
      loadPuzzle(generatePuzzle(seedFromHex(seedHex)), 'practice')

    } else {
      const params = new URLSearchParams(hash)
      const pParam = params.get('p')
      const seedParam = params.get('seed')

      if (pParam) {
        const n = parseInt(pParam, 10)
        if (isNaN(n)) {
          window.history.replaceState({}, '', '#')
          return
        }
        loadDaily(n)

      } else if (seedParam) {
        loadPuzzle(generatePuzzle(seedFromHex(seedParam)), 'practice')
      }
    }
    // No hash → show home screen
  }, [])

  // TO DO: Why is there a flash of the home page on load? Can we prevent that?

  if (!puzzle) return <HomePage />
  return <GamePage />
}
