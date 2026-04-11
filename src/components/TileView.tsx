import type { Tile } from '../engine/types'
import { tileDisplay } from './tileDisplay'
import { tileImage } from './tileImage'

interface Props {
  tile: Tile
  className?: string
  onClick?: () => void
  disabled?: boolean
  'aria-label'?: string
}

export default function TileView({ tile, className, onClick, disabled, 'aria-label': ariaLabel }: Props) {
  const cls = ['tile', className].filter(Boolean).join(' ')
  const inner = (
    <>
      <span className="tile-label">{tile.value}</span>
      <img src={tileImage(tile)} alt={tileDisplay(tile)} />
    </>
  )
  if (onClick !== undefined) {
    return <button className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{inner}</button>
  }
  return <span className={cls} aria-label={ariaLabel}>{inner}</span>
}
