# Tile Component Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace four duplicated inline tile renderings with a single `TileView` component.

**Architecture:** Create `src/components/TileView.tsx` that owns both the wrapper element (`<span>` or `<button>`) and the inner label + image. Callers pass `tile`, optional `className` modifier(s), and optionally `onClick`/`disabled`/`aria-label`. Update three components to use it.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react

---

## File Map

| Action | File | Change |
|---|---|---|
| Create | `src/components/TileView.tsx` | New component |
| Create | `src/components/TileView.test.tsx` | Component tests |
| Modify | `src/components/ContextBar.tsx` | Use `TileView`, remove `tileDisplay`/`tileImage` imports |
| Modify | `src/components/TileGrid.tsx` | Use `TileView`, remove `tileImage` import |
| Modify | `src/components/HandSlots.tsx` | Use `TileView`, remove `tileImage` import |

---

## Task 1: Create `TileView` component with tests

**Files:**
- Create: `src/components/TileView.tsx`
- Create: `src/components/TileView.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/TileView.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- TileView
```

Expected: fails with "Cannot find module './TileView'"

- [ ] **Step 3: Create `TileView.tsx`**

Create `src/components/TileView.tsx`:

```tsx
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- TileView
```

Expected: all 10 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/TileView.tsx src/components/TileView.test.tsx
git commit -m "feat: add TileView component"
```

---

## Task 2: Update `ContextBar` to use `TileView`

**Files:**
- Modify: `src/components/ContextBar.tsx`

- [ ] **Step 1: Replace the dora indicator rendering**

In `src/components/ContextBar.tsx`:

Remove the two imports:
```tsx
import { tileDisplay } from './tileDisplay'
import { tileImage } from './tileImage'
```

Add:
```tsx
import TileView from './TileView'
```

Replace the dora indicators block (currently lines 59–63):
```tsx
{puzzle.doraIndicators.map((tile, i) => (
  <span key={i} className="tile">
    <span className='tile-label'>{tile.value}</span>
    <img src={tileImage(tile)} alt={tileDisplay(tile)} />
  </span>
))}
```

With:
```tsx
{puzzle.doraIndicators.map((tile, i) => (
  <TileView key={i} tile={tile} />
))}
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ContextBar.tsx
git commit -m "refactor: use TileView in ContextBar"
```

---

## Task 3: Update `TileGrid` to use `TileView`

**Files:**
- Modify: `src/components/TileGrid.tsx`

- [ ] **Step 1: Replace the tile button rendering**

In `src/components/TileGrid.tsx`:

Remove the `tileImage` import (keep `tileDisplay` — it's still used for `aria-label`):
```tsx
import { tileImage } from './tileImage'
```

Add:
```tsx
import TileView from './TileView'
```

Replace the tile button (currently lines 11–27):
```tsx
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
```

With:
```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/TileGrid.tsx
git commit -m "refactor: use TileView in TileGrid"
```

---

## Task 4: Update `HandSlots` to use `TileView`

**Files:**
- Modify: `src/components/HandSlots.tsx`

- [ ] **Step 1: Replace locked and free tile rendering**

In `src/components/HandSlots.tsx`:

Remove the `tileImage` import (keep `tileDisplay` — still used for `aria-label`):
```tsx
import { tileImage } from './tileImage'
```

Add:
```tsx
import TileView from './TileView'
```

Replace the locked tiles block (currently lines 22–27):
```tsx
{lockedTiles.map((tile, i) => (
  <span key={`locked-${i}`} className="tile locked">
    <span className='tile-label'>{tile.value}</span>
    <img src={tileImage(tile)} alt={tileDisplay(tile)} />
  </span>
))}
```

With:
```tsx
{lockedTiles.map((tile, i) => (
  <TileView key={`locked-${i}`} tile={tile} className="locked" />
))}
```

Replace the free tiles block (currently lines 28–39):
```tsx
{freeTileEntries.map(({ index, tile }) => (
  <button
    key={`free-${index}`}
    className="tile selected"
    aria-label={`Deselect ${tileDisplay(tile)}`}
    onClick={() => toggleTile(index)}
    disabled={phase === 'committed'}
  >
    <span className='tile-label'>{tile.value}</span>
    <img src={tileImage(tile)} alt={tileDisplay(tile)} />
  </button>
))}
```

With:
```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/HandSlots.tsx
git commit -m "refactor: use TileView in HandSlots"
```
