# Tile Component Consolidation

## Problem

The tile visual (label + image) is duplicated in four places across three components:

1. `ContextBar.tsx` — dora indicator tiles (non-interactive `<span>`)
2. `TileGrid.tsx` — grid tiles (interactive `<button>`)
3. `HandSlots.tsx` locked tiles — (non-interactive `<span>`)
4. `HandSlots.tsx` free tiles — (interactive `<button>`)

Each site independently imports `tileImage` and `tileDisplay` and renders:
```tsx
<span className='tile-label'>{tile.value}</span>
<img src={tileImage(tile)} alt={tileDisplay(tile)} />
```

## Solution

Create `src/components/Tile.tsx` — a single component that owns both the wrapper element and its contents.

### API

```tsx
// Non-interactive (renders <span>)
<Tile tile={tile} />
<Tile tile={tile} className="locked" />

// Interactive (renders <button>)
<Tile tile={tile} onClick={fn} className="selected" disabled={false} aria-label="Deselect 1M" />
```

### Behaviour

- Renders as `<button>` when `onClick` is provided; `<span>` otherwise
- Base CSS class is always `tile`; `className` prop is merged in
- `disabled` and `aria-label` are forwarded to the element
- Internally uses `tileImage` and `tileDisplay` — callers no longer import these

### Call sites after refactor

| Location | Before | After |
|---|---|---|
| ContextBar dora | `<span className="tile"><label/><img/></span>` | `<Tile tile={tile} />` |
| TileGrid | `<button className="tile ..."><label/><img/></button>` | `<Tile tile={tile} className={...} onClick={...} disabled={...} aria-label={tileDisplay(tile)} />` |
| HandSlots locked | `<span className="tile locked"><label/><img/></span>` | `<Tile tile={tile} className="locked" />` |
| HandSlots free | `<button className="tile selected"><label/><img/></button>` | `<Tile tile={tile} className="selected" onClick={...} disabled={...} aria-label={...} />` |

### Out of scope

- `tileDisplay.ts` and `tileImage.ts` remain as separate utility files; `Tile.tsx` uses them internally
- The `aria-label` on interactive tiles is left to the caller for now (TileGrid still imports `tileDisplay` for this purpose); a follow-up refactor can clean this up
