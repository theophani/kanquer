import { useGameStore } from "../store/gameStore"
import { dateFromPuzzleNumber } from "../engine/seed"

export default function GameHeader() {
  const randomSeed = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0')

  const { mode } = useGameStore.getState()
  const params = new URLSearchParams(window.location.search)
  let puzzleLabel: string
  if (mode === 'daily') {
    const n = parseInt(params.get('p') ?? '0', 10)
    const date = dateFromPuzzleNumber(n)
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    puzzleLabel = `Puzzle #${n} · ${dateStr}`
  } else {
    puzzleLabel = `Puzzle ${params.get('seed') ?? ''}`
  }

  return (
    <header className="game-header">
      <a href="./" className="game-header-home">Miniichi</a>
      <span className="puzzle-label">{puzzleLabel}</span>
      <nav className="game-header-nav">
        <a href="?mode=daily" className="daily">Daily</a>
        <a href={`?seed=${randomSeed}`} className="practice">Practice</a>
      </nav>
    </header>
  )
}
