import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { generatePuzzle } from './engine/generator'
import { seedFromPuzzleNumber, seedFromHex } from './engine/seed'
import HomePage from './components/HomePage'
import GamePage from './components/GamePage'

export default function App() {
  const { puzzle, loadPuzzle, phase } = useGameStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pParam = params.get('p')
    const seedParam = params.get('seed')

    if (pParam) {
      const n = parseInt(pParam, 10)
      if (!isNaN(n)) {
        const seed = seedFromPuzzleNumber(n)
        loadPuzzle(generatePuzzle(seed), 'daily')
      }
    } else if (seedParam) {
      const seed = seedFromHex(seedParam)
      loadPuzzle(generatePuzzle(seed), 'practice')
    }
    // No params → show home screen
  }, [])

  if (!puzzle) return <HomePage />
  if (phase === 'committed') return <GamePage /> // GamePage handles result display inline
  return <GamePage />
}
