import { useGameStore } from '../store/gameStore'
import type { Tile } from '../engine/types'
import { tileEquals } from '../engine/tiles'
import { tileDisplay } from './tileDisplay'

export default function TileGrid() {
  const { puzzle, selectedTiles, phase, toggleTile } = useGameStore()
  if (!puzzle) return null

  const isSelected = (tile: Tile) => selectedTiles.some(t => tileEquals(t, tile))
  const isLocked = (tile: Tile) =>
    puzzle.lockedMelds.some(m => m.tiles.some(t => tileEquals(t, tile)))

  return (
    <div className="tile-grid">
      {puzzle.tiles.map((tile, i) => (
        <button
          key={i}
          className={[
            'tile',
            tile.suit,
            isSelected(tile) ? 'selected' : '',
            isLocked(tile) ? 'locked' : '',
          ].join(' ')}
          onClick={() => phase !== 'committed' && toggleTile(tile)}
          disabled={phase === 'committed'}
        >
          {tileDisplay(tile)}
        </button>
      ))}
    </div>
  )
}
