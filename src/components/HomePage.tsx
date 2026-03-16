import { useGameStore } from '../store/gameStore'
import { generatePuzzle } from '../engine/generator'
import { seedFromPuzzleNumber, puzzleNumberFromDate } from '../engine/seed'

function getDailyCacheKey(): string {
  return `kanquer-daily-${new Date().toISOString().slice(0, 10)}`
}

export default function HomePage() {
  const { loadPuzzle } = useGameStore()
  const cacheKey = getDailyCacheKey()
  const dailyCache = localStorage.getItem(cacheKey)
  const dailyResult: { points: number; elapsed: number } | null = dailyCache
    ? JSON.parse(dailyCache)
    : null

  function startDaily() {
    const n = puzzleNumberFromDate(new Date())
    const seed = seedFromPuzzleNumber(n)
    const puzzle = generatePuzzle(seed)
    loadPuzzle(puzzle, 'daily')
    window.history.pushState({}, '', `/?p=${n}`)
  }

  function startPractice() {
    const seed = Math.floor(Math.random() * 0xFFFFFFFF)
    const seedHex = seed.toString(16).padStart(8, '0')
    const puzzle = generatePuzzle(seed)
    loadPuzzle(puzzle, 'practice')
    window.history.pushState({}, '', `/?seed=${seedHex}`)
  }

  return (
    <div className="home-page">
      <h1>Kanquer</h1>
      <p>Find the highest-scoring winning hand from 24 tiles.</p>
      <button className="daily-button" onClick={startDaily} disabled={!!dailyResult}>
        {dailyResult
          ? `Today's Puzzle — ${dailyResult.points.toLocaleString()} pts`
          : "Today's Puzzle"}
      </button>
      <button className="practice-button" onClick={startPractice}>
        Practice
      </button>
    </div>
  )
}
