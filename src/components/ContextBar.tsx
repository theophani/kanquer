import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import TileView from './TileView'

function windLabel(w: string): string {
  return { E: 'East', S: 'South', W: 'West', N: 'North' }[w] ?? w
}

export default function ContextBar() {
  const { puzzle, phase, elapsed, pauseTimer, resumeTimer } = useGameStore()
  const [display, setDisplay] = useState(() => {
    const { timerStartedAt, accumulatedMs } = useGameStore.getState()
    return Math.floor(
      (accumulatedMs + (timerStartedAt ? Date.now() - timerStartedAt : 0)) / 1000
    )
  })

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
      <div className="context-bar-section">
        <span className="wind-chip">Round <strong>{windLabel(puzzle.roundWind)}</strong></span>
        <span className="wind-chip">Seat <strong>{windLabel(puzzle.seatWind)}</strong></span>
      </div>
      <div className="context-bar-section">
        <span className="dora-label">Dora Indicator{puzzle.doraIndicators.length > 1 ? 's' : ''}</span>
        {puzzle.doraIndicators.map((tile, i) => (
          <TileView key={i} tile={tile} />
        ))}
      </div>
      <div className="context-bar-section context-bar-timer">
        {/* TODO: The timer should save between sessions */}
        <span className="timer">{mm}:{ss}</span>
      </div>
    </div>
  )
}
