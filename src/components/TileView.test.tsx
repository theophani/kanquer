import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TileView from './TileView'

const manTile = { suit: 'man' as const, value: 3 as const }
const windTile = { suit: 'wind' as const, value: 'E' as const }
const dragonTile = { suit: 'dragon' as const, value: 'W' as const }

describe('TileView', () => {
  it('renders a span when no onClick is provided', () => {
    const { container } = render(<TileView tile={manTile} />)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })

  it('renders a button when onClick is provided', () => {
    const { container } = render(<TileView tile={manTile} onClick={vi.fn()} />)
    expect(container.firstChild?.nodeName).toBe('BUTTON')
  })

  it('always applies the tile base class', () => {
    const { container } = render(<TileView tile={manTile} />)
    expect(container.firstChild).toHaveClass('tile')
  })

  it('merges extra className onto the tile base class', () => {
    const { container } = render(<TileView tile={manTile} className="selected" />)
    expect(container.firstChild).toHaveClass('tile', 'selected')
  })

  it('renders the tile-label with tile value', () => {
    const { container } = render(<TileView tile={manTile} />)
    const label = container.querySelector('.tile-label')
    expect(label?.textContent).toBe('3')
  })

  it('renders an img with alt text from tileDisplay', () => {
    render(<TileView tile={manTile} />)
    expect(screen.getByRole('img', { name: '3M' })).toBeInTheDocument()
  })

  it('forwards aria-label to the wrapper element', () => {
    render(<TileView tile={manTile} onClick={vi.fn()} aria-label="Select 3M" />)
    expect(screen.getByRole('button', { name: 'Select 3M' })).toBeInTheDocument()
  })

  it('forwards disabled to the button', () => {
    render(<TileView tile={manTile} onClick={vi.fn()} disabled={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders dragon tile label and alt text correctly', () => {
    const { container } = render(<TileView tile={dragonTile} />)
    expect(container.querySelector('.tile-label')?.textContent).toBe('W')
    expect(screen.getByRole('img', { name: '白' })).toBeInTheDocument()
  })

  it('renders wind tile alt text correctly', () => {
    render(<TileView tile={windTile} />)
    expect(screen.getByRole('img', { name: 'E' })).toBeInTheDocument()
  })
})
