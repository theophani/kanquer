import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { generatePuzzle } from './engine/generator'
import { seedFromPuzzleNumber, seedFromHex, puzzleNumberFromDate, dateFromPuzzleNumber } from './engine/seed'
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
      window.history.replaceState({}, '', `/?p=${n}`)

    } else if (pathname === '/random') {
      const seed = Math.floor(Math.random() * 0xFFFFFFFF)
      const seedHex = seed.toString(16).padStart(8, '0')
      window.history.replaceState({}, '', `/?seed=${seedHex}`)

    } else if (pParam) {
      const n = parseInt(pParam, 10)
      if (isNaN(n)) {
        window.history.replaceState({}, '', '/')
        return
      }

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

    } else if (seedParam) {
      loadPuzzle(generatePuzzle(seedFromHex(seedParam)), 'practice')
    }
    // No params → show home screen
  }, [])

  if (!puzzle) return <HomePage />
  return <GamePage />
}
