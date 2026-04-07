// Yaku compatibility map
// Source: docs/yaku_compatibility_table.md
//
// Name normalization from table → code:
//   Houtei raoyui    → Houtei

export type CompatStatus =
  | 'compatible'
  | 'incompatible'
  | { kind: 'conditional'; note: string }
  | { kind: 'upgrades_to'; result: string }

// Only non-compatible pairs are stored. The lookup function handles symmetry.
// Default for any unlisted pair is 'compatible'.
// Yaku that cannot be achieved in the mini-game are not included at all (e.g. Riichi, Chankan, Rinshan).
const EXCEPTIONS: Record<string, CompatStatus> = {
  // ── Tanyao ────────────────────────────────────────────────────────────────
  'Tanyao::Ittsuu':           'incompatible',
  'Tanyao::Yakuhai':          'incompatible',
  'Tanyao::Chanta':           'incompatible',
  'Tanyao::Junchan':          'incompatible',
  'Tanyao::Shousangen':       'incompatible',
  'Tanyao::Honroutou':        'incompatible',
  'Tanyao::Honitsu':          'incompatible',

  // ── Pinfu ─────────────────────────────────────────────────────────────────
  'Pinfu::Yakuhai':           'incompatible',
  'Pinfu::Sanshoku Doukou':   'incompatible',
  'Pinfu::Toitoi':            'incompatible',
  'Pinfu::Sanankou':          'incompatible',
  'Pinfu::Sankantsu':         'incompatible',
  'Pinfu::Shousangen':        'incompatible',
  'Pinfu::Honroutou':         'incompatible',
  'Pinfu::Chiitoitsu':        'incompatible',

  // ── Iipeikou ──────────────────────────────────────────────────────────────
  'Iipeikou::Sanshoku Doukou': 'incompatible',
  'Iipeikou::Toitoi':          'incompatible',
  'Iipeikou::Sanankou':        'incompatible',
  'Iipeikou::Sankantsu':       'incompatible',
  'Iipeikou::Ryanpeikou':      'incompatible', // mutually exclusive
  'Iipeikou::Honroutou':       'incompatible',
  'Iipeikou::Chiitoitsu':      'incompatible',

  // ── Ittsuu (Ikkitsuukan) ──────────────────────────────────────────────────
  'Ittsuu::Sanshoku Doujun':  'incompatible',
  'Ittsuu::Sanshoku Doukou':  'incompatible',
  'Ittsuu::Toitoi':           'incompatible',
  'Ittsuu::Sanankou':         'incompatible',
  'Ittsuu::Sankantsu':        'incompatible',
  'Ittsuu::Chanta':           'incompatible',
  'Ittsuu::Junchan':          'incompatible',
  'Ittsuu::Ryanpeikou':       'incompatible',
  'Ittsuu::Shousangen':       'incompatible',
  'Ittsuu::Honroutou':        'incompatible',
  'Ittsuu::Chiitoitsu':       'incompatible',

  // ── Yakuhai ───────────────────────────────────────────────────────────────
  'Yakuhai::Junchan':         'incompatible',
  'Yakuhai::Ryanpeikou':      'incompatible',
  'Yakuhai::Chinitsu':        'incompatible',
  'Yakuhai::Chiitoitsu':      'incompatible',

  // ── Sanshoku Doujun ───────────────────────────────────────────────────────
  'Sanshoku Doujun::Sanshoku Doukou': 'incompatible',
  'Sanshoku Doujun::Toitoi':          'incompatible',
  'Sanshoku Doujun::Sanankou':        'incompatible',
  'Sanshoku Doujun::Sankantsu':       'incompatible',
  'Sanshoku Doujun::Ryanpeikou':      'incompatible',
  'Sanshoku Doujun::Shousangen':      'incompatible',
  'Sanshoku Doujun::Honroutou':       'incompatible',
  'Sanshoku Doujun::Honitsu':         'incompatible',
  'Sanshoku Doujun::Chinitsu':        'incompatible',
  'Sanshoku Doujun::Chiitoitsu':      'incompatible',

  // ── Sanshoku Doukou ───────────────────────────────────────────────────────
  'Sanshoku Doukou::Ryanpeikou':  'incompatible',
  'Sanshoku Doukou::Shousangen':  'incompatible',
  'Sanshoku Doukou::Honitsu':     'incompatible',
  'Sanshoku Doukou::Chinitsu':    'incompatible',
  'Sanshoku Doukou::Chiitoitsu':  'incompatible',

  // ── Toitoi ────────────────────────────────────────────────────────────────
  'Toitoi::Chanta':     { kind: 'conditional', note: 'Only if all four triplets contain terminals or honors' },
  'Toitoi::Junchan':    { kind: 'upgrades_to', result: 'Chinroutou' },
  'Toitoi::Ryanpeikou': 'incompatible',

  // ── Sanankou ──────────────────────────────────────────────────────────────
  'Sanankou::Ryanpeikou': 'incompatible',
  'Sanankou::Chiitoitsu': 'incompatible',

  // ── Sankantsu ─────────────────────────────────────────────────────────────
  'Sankantsu::Ryanpeikou': 'incompatible',
  'Sankantsu::Chiitoitsu': 'incompatible',

  // ── Chanta ────────────────────────────────────────────────────────────────
  'Chanta::Junchan':    'incompatible', // mutually exclusive
  'Chanta::Honroutou':  { kind: 'conditional', note: 'Possible when all sets are terminal/honor triplets; the hand may qualify as Honroutou instead' },
  'Chanta::Chinitsu':   'incompatible',
  'Chanta::Chiitoitsu': { kind: 'conditional', note: 'Requires every pair to contain a terminal or honor; valid only in rulesets that permit Chanta with Chiitoitsu' },

  // ── Junchan ───────────────────────────────────────────────────────────────
  'Junchan::Shousangen': 'incompatible',
  'Junchan::Honroutou':  'incompatible',
  'Junchan::Honitsu':    'incompatible',
  'Junchan::Chiitoitsu': 'incompatible',

  // ── Ryanpeikou ────────────────────────────────────────────────────────────
  'Ryanpeikou::Shousangen': 'incompatible',
  'Ryanpeikou::Honroutou':  'incompatible',
  'Ryanpeikou::Chiitoitsu': 'incompatible',

  // ── Shousangen ────────────────────────────────────────────────────────────
  'Shousangen::Chinitsu':   'incompatible',
  'Shousangen::Chiitoitsu': 'incompatible',

  // ── Honroutou ─────────────────────────────────────────────────────────────
  'Honroutou::Chinitsu': 'incompatible',

  // ── Honitsu / Chinitsu ────────────────────────────────────────────────────
  'Honitsu::Chinitsu': 'incompatible', // mutually exclusive
}

function canonicalKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`
}

export function yakuCompatibility(a: string, b: string): CompatStatus {
  if (a === b) return 'incompatible' // same yaku can't stack
  return EXCEPTIONS[canonicalKey(a, b)] ?? 'compatible'
}

export function areCompatible(a: string, b: string): boolean {
  const status = yakuCompatibility(a, b)
  return status === 'compatible' || (typeof status === 'object' && status.kind === 'upgrades_to')
}
