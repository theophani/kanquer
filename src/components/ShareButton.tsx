import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { puzzleNumberFromDate } from '../engine/seed'

export default function ShareButton() {
  const { submittedSolution, puzzle, elapsed, mode } = useGameStore()
  const [copied, setCopied] = useState(false)
  if (!submittedSolution || !puzzle) return null

  const optimal = puzzle.solutions[0]
  const isOptimal = submittedSolution.points >= optimal.points
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  function buildShareText(): string {
    const lines: string[] = []
    const params = new URLSearchParams(window.location.search)
    const base = window.location.origin + window.location.pathname
    if (mode === 'daily') {
      // Use the puzzle number from the URL param (not today's date) so past daily links work correctly
      const n = params.get('p') ?? String(puzzleNumberFromDate(new Date()))
      lines.push(`Kanquer #${n}${isOptimal ? ' ⭐' : ''}`)
      lines.push(`${submittedSolution!.points.toLocaleString()} pts · ${mm}:${ss}`)
      lines.push(`${base}?p=${n}`)
    } else {
      const seedHex = params.get('seed') ?? 'practice'
      lines.push(`Kanquer Practice${isOptimal ? ' ⭐' : ''}`)
      lines.push(`${submittedSolution!.points.toLocaleString()} pts · ${mm}:${ss}`)
      lines.push(`${base}?seed=${seedHex}`)
    }
    return lines.join('\n')
  }

  function handleShare() {
    navigator.clipboard.writeText(buildShareText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button className="share-button" onClick={handleShare}>
      {copied ? 'Copied!' : '📋 Share'}
    </button>
  )
}
