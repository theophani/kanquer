# CSS Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant CSS rulesets by consolidating shared styles under four semantically named classes.

**Architecture:** Four targeted consolidations in `src/index.css`, each paired with class-name additions in the relevant TSX components. No file splits, no reformatting, no design tokens.

**Tech Stack:** React 18, TypeScript, Vite, plain CSS (single file)

---

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Add `.mode-button`, `.action-button`, `.action-button:disabled`, `.score-row`, `.panel`; trim shared declarations from per-component rules; remove `.yaku-row`, `.dora-row`, `.hand-area` |
| `src/components/HomePage.tsx` | Add `mode-button` to both `<a>` buttons |
| `src/components/HandSlots.tsx` | Add `action-button` to both buttons; replace `hand-area` with `panel` |
| `src/components/ScoreReveal.tsx` | Replace `yaku-row`/`dora-row` with `score-row`; add `panel` to score-reveal div |
| `src/components/TileGrid.tsx` | Add `panel` to tile-grid div |

---

## Task 1: Add `.mode-button` shared base class

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/HomePage.tsx`

- [ ] **Step 1: Update `src/index.css`**

Replace these three rules:
```css
.daily-button, .practice-button { padding: 12px 32px; font-size: 1.1rem; border: none; border-radius: 8px; cursor: pointer; }
.daily-button { background: #e67e22; color: #fff; text-decoration: none; }
.practice-button { background: #2980b9; color: #fff; text-decoration: none; }
```
With:
```css
.mode-button { padding: 12px 32px; font-size: 1.1rem; border: none; border-radius: 8px; cursor: pointer; color: #fff; text-decoration: none; }
.daily-button { background: #e67e22; }
.practice-button { background: #2980b9; }
```

- [ ] **Step 2: Update `src/components/HomePage.tsx`**

Change line 15 from:
```tsx
<a href="?mode=daily" className="daily-button">
```
To:
```tsx
<a href="?mode=daily" className="mode-button daily-button">
```

Change line 20 from:
```tsx
<a href="?mode=random" className="practice-button">
```
To:
```tsx
<a href="?mode=random" className="mode-button practice-button">
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`

Open the home page. Both buttons should look identical to before — orange "Today's Puzzle", blue "Practice".

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/HomePage.tsx
git commit -m "refactor: consolidate mode button base styles into .mode-button"
```

---

## Task 2: Add `.action-button` shared base class

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/HandSlots.tsx`

- [ ] **Step 1: Update `src/index.css`**

Replace these four rules:
```css
.reset-button { padding: 12px; font-size: 1rem; background: #2980b9; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
.reset-button:disabled { background: #555; color: #999; }
.commit-button { padding: 12px; font-size: 1rem; background: #27ae60; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
.commit-button:disabled { background: #555; color: #999; }
```
With:
```css
.action-button { padding: 12px; font-size: 1rem; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
.action-button:disabled { background: #555; color: #999; }
.reset-button { background: #2980b9; }
.commit-button { background: #27ae60; }
```

- [ ] **Step 2: Update `src/components/HandSlots.tsx`**

Change line 46 from:
```tsx
className="reset-button"
```
To:
```tsx
className="action-button reset-button"
```

Change line 53 from:
```tsx
className="commit-button"
```
To:
```tsx
className="action-button commit-button"
```

- [ ] **Step 3: Verify visually**

Open a game. The Reset (blue) and Commit Hand (green) buttons should look identical to before. Disabled states (greyed out) should still work.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/HandSlots.tsx
git commit -m "refactor: consolidate game action button base styles into .action-button"
```

---

## Task 3: Consolidate `.yaku-row` and `.dora-row` into `.score-row`

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ScoreReveal.tsx`

- [ ] **Step 1: Update `src/index.css`**

Replace these two rules:
```css
.yaku-row { display: flex; justify-content: space-between; padding: 4px 0; }
.dora-row { display: flex; justify-content: space-between; padding: 4px 0; }
```
With:
```css
.score-row { display: flex; justify-content: space-between; padding: 4px 0; }
```

- [ ] **Step 2: Update `src/components/ScoreReveal.tsx`**

Change line 36 from:
```tsx
<div key={y.name} className="yaku-row">
```
To:
```tsx
<div key={y.name} className="score-row">
```

Change line 42 from:
```tsx
<div className="dora-row">
```
To:
```tsx
<div className="score-row">
```

- [ ] **Step 3: Verify visually**

Play through a hand and commit it. Open the score details panel. Yaku rows and the Dora row should be laid out identically to before.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/ScoreReveal.tsx
git commit -m "refactor: replace yaku-row and dora-row with unified .score-row"
```

---

## Task 4: Extract `.panel` shared class

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/TileGrid.tsx`
- Modify: `src/components/HandSlots.tsx`
- Modify: `src/components/ScoreReveal.tsx`

- [ ] **Step 1: Update `src/index.css`**

Add `.panel` near the top of the component rules (before `.tile-grid`):
```css
.panel { background: #0d0d1a; border-radius: 6px; padding: 12px; }
```

Replace the `.tile-grid` rule (currently `display: flex; flex-wrap: wrap; gap: 10px; padding: 12px; background: #0d0d1a; border-radius: 6px; margin-bottom: 12px;`):
```css
.tile-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
```

Replace the `.hand-area` rule (currently `background: #0d0d1a; border-radius: 6px; padding: 12px;`):

Delete the `.hand-area` rule entirely — nothing remains after extracting to `.panel`.

Replace the `.score-reveal` rule (currently `background: #0d0d1a; border-radius: 6px; padding: 16px;`):
```css
.score-reveal { padding: 16px; }
```
(Keeps its 16px padding override; background and border-radius now come from `.panel`.)

- [ ] **Step 2: Update `src/components/TileGrid.tsx`**

Change line 10 from:
```tsx
<div className="tile-grid">
```
To:
```tsx
<div className="panel tile-grid">
```

- [ ] **Step 3: Update `src/components/HandSlots.tsx`**

Change line 20 from:
```tsx
<div className="hand-area">
```
To:
```tsx
<div className="panel">
```

(`hand-area` has no remaining CSS rules, so replace it entirely with `panel`.)

- [ ] **Step 4: Update `src/components/ScoreReveal.tsx`**

Change line 19 from:
```tsx
<div className="score-reveal">
```
To:
```tsx
<div className="panel score-reveal">
```

- [ ] **Step 5: Verify visually**

Check all three panels in-game:
- Tile grid: dark background, rounded corners, tiles laid out correctly
- Hand area: dark background, rounded corners, slots and buttons look correct
- Score reveal: dark background, rounded corners, slightly more padding (16px) than the others

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/components/TileGrid.tsx src/components/HandSlots.tsx src/components/ScoreReveal.tsx
git commit -m "refactor: extract shared .panel class from tile-grid, hand-area, and score-reveal"
```
