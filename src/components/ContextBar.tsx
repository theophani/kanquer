import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import type { Tile } from '../engine/types'

function tileLabel(tile: Tile): string {
  if (tile.suit === 'wind') return `${tile.value} wind`
  if (tile.suit === 'dragon') {
    return ({ W: 'Haku', G: 'Hatsu', R: 'Chun' } as Record<string, string>)[tile.value] ?? tile.value
  }
  return `${tile.value} ${tile.suit}`
}

function windLabel(w: string): string {
  return { E: 'East', S: 'South', W: 'West', N: 'North' }[w] ?? w
}

export default function ContextBar() {
  const { puzzle, phase, elapsed, pauseTimer, resumeTimer } = useGameStore()
  const [display, setDisplay] = useState(0)

  // Tick the display every second while playing
  useEffect(() => {
    if (phase === 'committed') return
    const interval = setInterval(() => {
      const { timerStartedAt, accumulatedMs } = useGameStore.getState()
      const secs = Math.floor(
        (accumulatedMs + (timerStartedAt ? Date.now() - timerStartedAt : 0)) / 1000
      )
      setDisplay(secs)
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  // Pause/resume on tab visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pauseTimer()
      } else {
        resumeTimer()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [pauseTimer, resumeTimer])

  if (!puzzle) return null

  const seconds = phase === 'committed' ? elapsed : display
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="context-bar">
      <span>Round: {windLabel(puzzle.roundWind)}</span>
      <span>Seat: {windLabel(puzzle.seatWind)}</span>
      <span>
        Dora: {puzzle.doraIndicators.map((t, i) => (
          <span key={i} className="dora-tile">{tileLabel(t)}</span>
        ))}
      </span>
      <span className="timer">{mm}:{ss}</span>
    </div>
  )
}
