import { useGameStore } from '../store/gameStore'
import { tileDisplay } from './tileDisplay'
import TileView from './TileView'

export default function TileGrid() {
  const { puzzle, selectedIndices, lockedIndices, phase, toggleTile } = useGameStore()
  if (!puzzle) return null

  return (
    <div className="panel tile-grid">
      {puzzle.tiles.map((tile, i) => (
        <TileView
          key={i}
          tile={tile}
          className={[
            selectedIndices.includes(i) ? 'selected' : '',
            lockedIndices.has(i) ? 'locked' : '',
          ].filter(Boolean).join(' ') || undefined}
          onClick={() => phase !== 'committed' && toggleTile(i)}
          disabled={phase === 'committed'}
          aria-label={tileDisplay(tile)}
        />
      ))}
    </div>
  )
}
