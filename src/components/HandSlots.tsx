import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'

export default function HandSlots() {
  const { puzzle, selectedIndices, lockedIndices, phase, commitHand, resetHand, errorMessage, toggleTile } = useGameStore()
  if (!puzzle) return null

  const lockedTiles = [...lockedIndices].sort((a, b) => a - b).map(i => puzzle.tiles[i])
  const freeTileEntries = [...selectedIndices]
    .filter(i => !lockedIndices.has(i))
    .map(i => ({ index: i, tile: puzzle.tiles[i] }))
  const emptySlots = 14 - selectedIndices.length

  const isReady = selectedIndices.length === 14
  const canReset = selectedIndices.length > lockedIndices.size

  return (
    <div className="hand-area">
      <div className="hand-slots">
        {lockedTiles.map((tile, i) => (
          <span key={`locked-${i}`} className="tile locked">
            {tileDisplay(tile)}
          </span>
        ))}
        {freeTileEntries.map(({ index, tile }) => (
          <button
            key={`free-${index}`}
            className={`tile ${tile.suit} selected`}
            onClick={() => toggleTile(index)}
            disabled={phase === 'committed'}
          >
            {tileDisplay(tile)}
          </button>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <span key={`empty-${i}`} className="tile empty">·</span>
        ))}
      </div>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {phase !== 'committed' && (
        <div className="hand-actions">
          <button
            className="reset-button"
            disabled={!canReset}
            onClick={resetHand}
          >
            Reset
          </button>
          <button
            className="commit-button"
            disabled={!isReady}
            onClick={commitHand}
          >
            Commit Hand
          </button>
        </div>
      )}
    </div>
  )
}
