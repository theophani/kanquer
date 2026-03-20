import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import ShareButton from './ShareButton'
import { getFuBreakdown } from '../engine/fu'

export default function ScoreReveal() {
  const { submittedSolution, puzzle, elapsed } = useGameStore()
  const [expanded, setExpanded] = useState(false)
  if (!submittedSolution || !puzzle) return null

  const optimal = puzzle.solutions[0]
  const isOptimal = submittedSolution.points >= optimal.points
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const fuComponents = getFuBreakdown(submittedSolution.hand)
  const rawFu = fuComponents.reduce((sum, c) => sum + c.fu, 0)

  return (
    <div className="score-reveal">
      <div className="score-main">
        <span className="han">{submittedSolution.han} han</span>
        <span className="points">{submittedSolution.points.toLocaleString()} pts</span>
        {isOptimal && <span className="star">⭐</span>}
      </div>
      <div className="score-compact">
        {submittedSolution.fu} fu ·{' '}
        {submittedSolution.yaku.map(y => y.name).join(' · ')}
        <button className="details-toggle" onClick={() => setExpanded(e => !e)}>
          {expanded ? '▲' : 'Details ▼'}
        </button>
      </div>

      {expanded && (
        <div className="yaku-breakdown">
          {submittedSolution.yaku.map(y => (
            <div key={y.name} className="yaku-row">
              <span>{y.name}</span>
              <span>{y.han} han</span>
            </div>
          ))}
          {fuComponents.length > 0 && (
            <div className="fu-breakdown">
              {fuComponents.map((c, i) => (
                <div key={i} className="fu-row">
                  <span>{c.label}</span>
                  <span>{c.fu} fu</span>
                </div>
              ))}
              <div className="fu-total">
                {rawFu !== submittedSolution.fu
                  ? `${rawFu} → ${submittedSolution.fu} fu`
                  : `${submittedSolution.fu} fu`}
              </div>
            </div>
          )}
          <div className="yaku-total">
            Total: {submittedSolution.han} han {submittedSolution.fu} fu → {submittedSolution.points.toLocaleString()} pts
          </div>
        </div>
      )}

      {!isOptimal && (
        <div className="optimal-hint">
          Best possible: {optimal.points.toLocaleString()} pts ({optimal.yaku.map(y => y.name).join(' + ')})
        </div>
      )}

      <div className="result-footer">
        <span className="elapsed">⏱ {mm}:{ss}</span>
        <ShareButton />
      </div>
    </div>
  )
}
