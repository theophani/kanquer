import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'
import TileView from './TileView'

export default function HandSlots() {
  const { puzzle, selectedIndices, lockedIndices, phase, commitHand, resetHand, errorMessage, toggleTile } = useGameStore()
  if (!puzzle) return null

  const lockedTiles = [...lockedIndices].sort((a, b) => a - b).map(i => puzzle.tiles[i])
  const freeTileEntries = [...selectedIndices]
    .filter(i => !lockedIndices.has(i))
    .map(i => ({ index: i, tile: puzzle.tiles[i] }))
  const emptySlots = 14 - selectedIndices.length

  const lockedCount = lockedIndices.size
  const isReady = selectedIndices.length === 14
  const canReset = selectedIndices.length > lockedCount

  return (
    <div className="panel">
      <div className="hand-slots">
        {lockedTiles.map((tile, i) => (
          <TileView key={`locked-${i}`} tile={tile} className="locked" />
        ))}
        {freeTileEntries.map(({ index, tile }) => (
          <TileView
            key={`free-${index}`}
            tile={tile}
            className="selected"
            aria-label={`Deselect ${tileDisplay(tile)}`}
            onClick={() => toggleTile(index)}
            disabled={phase === 'committed'}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <span key={`empty-${i}`} className="tile empty">·</span>
        ))}
      </div>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {phase !== 'committed' && (
        <div className="hand-actions">
          <button
            className="action-button reset-button"
            disabled={!canReset}
            onClick={resetHand}
          >
            Reset
          </button>
          <button
            className="action-button commit-button"
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
