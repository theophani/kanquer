import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'

export default function HandSlots() {
  const { puzzle, selectedIndices, lockedIndices, phase, commitHand, resetHand, errorMessage } = useGameStore()
  if (!puzzle) return null

  const lockedTiles = [...lockedIndices].sort((a, b) => a - b).map(i => puzzle.tiles[i])
  const freeTiles = [...selectedIndices]
    .filter(i => !lockedIndices.has(i))
    .sort((a, b) => a - b)
    .map(i => puzzle.tiles[i])
  const emptySlots = 14 - selectedIndices.size

  const isReady = selectedIndices.size === 14
  const canReset = selectedIndices.size > lockedIndices.size

  return (
    <div className="hand-area">
      <div className="hand-slots">
        {lockedTiles.map((tile, i) => (
          <span key={`locked-${i}`} className="tile locked">
            {tileDisplay(tile)}
          </span>
        ))}
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
      <div className="hand-actions">
        <button
          className="reset-button"
          disabled={!canReset || phase === 'committed'}
          onClick={resetHand}
        >
          Reset
        </button>
        <button
          className="commit-button"
          disabled={!isReady || phase === 'committed'}
          onClick={commitHand}
        >
          Commit Hand
        </button>
      </div>
    </div>
  )
}
