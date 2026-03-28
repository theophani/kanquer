# CSS Refactor Design

**Goal:** Remove redundant rulesets by consolidating shared styles under semantically named classes.

**Non-goals:** Design tokens, file splitting, declaration reformatting.

---

## Four consolidations

### 1. `.mode-button`

Shared base for `.daily-button` and `.practice-button` on the home page.

**New shared class:**
```css
.mode-button { padding: 12px 32px; font-size: 1.1rem; border: none; border-radius: 8px; cursor: pointer; color: #fff; text-decoration: none; }
```

**Retained per-class (background only):**
```css
.daily-button { background: #e67e22; }
.daily-button:disabled { background: #555; cursor: default; }
.practice-button { background: #2980b9; }
```

**TSX:** `HomePage.tsx` — add `mode-button` to both `<a>` elements alongside existing class.

---

### 2. `.action-button`

Shared base for `.reset-button` and `.commit-button` in the hand area.

**New shared class:**
```css
.action-button { padding: 12px; font-size: 1rem; border: none; border-radius: 6px; cursor: pointer; color: #fff; }
.action-button:disabled { background: #555; color: #999; }
```

**Retained per-class (background only):**
```css
.reset-button { background: #2980b9; }
.commit-button { background: #27ae60; }
```

**TSX:** `HandSlots.tsx` — add `action-button` to both buttons alongside existing class.

---

### 3. `.score-row`

`.yaku-row` and `.dora-row` are identical. Collapse into one class.

**New class (replaces both):**
```css
.score-row { display: flex; justify-content: space-between; padding: 4px 0; }
```

**Remove:** `.yaku-row` and `.dora-row` rules from CSS.

**TSX:** `ScoreReveal.tsx` — replace `yaku-row` with `score-row`, replace `dora-row` with `score-row`.

---

### 4. `.panel`

`background: #0d0d1a; border-radius: 6px; padding: 12px` appears in `.tile-grid`, `.hand-area`, and `.score-reveal`. Extract to a shared class.

**New class:**
```css
.panel { background: #0d0d1a; border-radius: 6px; padding: 12px; }
```

**Remove** those three declarations from `.tile-grid`, `.hand-area`, `.score-reveal`.

**TSX:**
- `TileGrid.tsx` — add `panel` to `.tile-grid` element
- `HandSlots.tsx` — add `panel` to `.hand-area` element
- `ScoreReveal.tsx` — add `panel` to `.score-reveal` element

---

## File summary

| File | Change |
|------|--------|
| `src/index.css` | Add `.mode-button`, `.action-button`, `.action-button:disabled`, `.score-row`, `.panel`; trim redundant declarations from existing classes; remove `.yaku-row` and `.dora-row` |
| `src/components/HomePage.tsx` | Add `mode-button` class to both `<a>` buttons |
| `src/components/HandSlots.tsx` | Add `action-button` class to both buttons; add `panel` to hand area div |
| `src/components/ScoreReveal.tsx` | Replace `yaku-row`/`dora-row` with `score-row`; add `panel` to score-reveal div |
| `src/components/TileGrid.tsx` | Add `panel` to tile-grid div |
