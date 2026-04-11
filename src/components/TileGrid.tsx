import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'
import { tileImage } from './tileImage'

export default function TileGrid() {
  const { puzzle, selectedIndices, lockedIndices, phase, toggleTile } = useGameStore()
  if (!puzzle) return null

  return (
    <div className="panel tile-grid">
      {puzzle.tiles.map((tile, i) => (
        <button
          key={i}
          className={[
            'tile',
            selectedIndices.includes(i) ? 'selected' : '',
            lockedIndices.has(i) ? 'locked' : '',
          ].join(' ')}
          onClick={() => phase !== 'committed' && toggleTile(i)}
          disabled={phase === 'committed'}
          aria-label={tileDisplay(tile)}
        >
          <span className='tile-label'>{tile.value}</span>
          <img src={tileImage(tile)} alt={tileDisplay(tile)} />
        </button>
      ))}
    </div>
  )
}
