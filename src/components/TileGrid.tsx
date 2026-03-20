import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'

export default function TileGrid() {
  const { puzzle, selectedIndices, lockedIndices, phase, toggleTile } = useGameStore()
  if (!puzzle) return null

  return (
    <div className="tile-grid">
      {puzzle.tiles.map((tile, i) => (
        <button
          key={i}
          className={[
            'tile',
            tile.suit,
            selectedIndices.includes(i) ? 'selected' : '',
            lockedIndices.has(i) ? 'locked' : '',
          ].join(' ')}
          onClick={() => phase !== 'committed' && toggleTile(i)}
          disabled={phase === 'committed'}
        >
          {tileDisplay(tile)}
        </button>
      ))}
    </div>
  )
}
