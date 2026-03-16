import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'

export default function HandSlots() {
  const { puzzle, selectedTiles, phase, commitHand, errorMessage } = useGameStore()
  if (!puzzle) return null

  const lockedCount = puzzle.lockedMelds.reduce((sum, m) => sum + m.tiles.length, 0)
  const totalSlots = 14
  const freeSlots = totalSlots - lockedCount
  const freeTiles = selectedTiles.slice(lockedCount)
  const emptySlots = freeSlots - freeTiles.length

  const isReady = selectedTiles.length === 14

  return (
    <div className="hand-area">
      <div className="hand-slots">
        {puzzle.lockedMelds.flatMap((m, mi) =>
          m.tiles.map((tile, ti) => (
            <span key={`locked-${mi}-${ti}`} className="tile locked">
              {tileDisplay(tile)}
            </span>
          ))
        )}
        {freeTiles.map((tile, i) => (
          <span key={`free-${i}`} className={`tile ${tile.suit} selected`}>
            {tileDisplay(tile)}
          </span>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <span key={`empty-${i}`} className="tile empty">·</span>
        ))}
      </div>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <button
        className="commit-button"
        disabled={!isReady || phase === 'committed'}
        onClick={commitHand}
      >
        Commit Hand
      </button>
    </div>
  )
}
