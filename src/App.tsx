import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { generatePuzzle } from './engine/generator'
import { seedFromPuzzleNumber, seedFromHex, puzzleNumberFromDate } from './engine/seed'
import HomePage from './components/HomePage'
import GamePage from './components/GamePage'

export default function App() {
  const { puzzle, loadPuzzle } = useGameStore()

  useEffect(() => {
    const pathname = window.location.pathname
    const params = new URLSearchParams(window.location.search)
    const pParam = params.get('p')
    const seedParam = params.get('seed')

    if (pathname === '/daily') {
      const n = puzzleNumberFromDate(new Date())
      const seed = seedFromPuzzleNumber(n)
      const puzz = generatePuzzle(seed)
      const key = `kanquer-daily-${new Date().toISOString().slice(0, 10)}`
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
      window.history.replaceState({}, '', `/?p=${n}`)

    } else if (pathname === '/random') {
      const seed = Math.floor(Math.random() * 0xFFFFFFFF)
      const seedHex = seed.toString(16).padStart(8, '0')
      loadPuzzle(generatePuzzle(seed), 'practice')
      window.history.replaceState({}, '', `/?seed=${seedHex}`)

    } else if (pParam) {
      const n = parseInt(pParam, 10)
      if (!isNaN(n)) {
        loadPuzzle(generatePuzzle(seedFromPuzzleNumber(n)), 'daily')
      }

    } else if (seedParam) {
      loadPuzzle(generatePuzzle(seedFromHex(seedParam)), 'practice')
    }
    // No params → show home screen
  }, [])

  if (!puzzle) return <HomePage />
  return <GamePage />
}
