import ContextBar from './ContextBar'
import TileGrid from './TileGrid'
import HandSlots from './HandSlots'
import ScoreReveal from './ScoreReveal'
import { useGameStore } from '../store/gameStore'

export default function GamePage() {
  const { phase } = useGameStore()
  return (
    <div className="game-page">
      {/* TO DO: Add link back to home page, daily, random */}
      <ContextBar />
      <TileGrid />
      <HandSlots />
      {phase === 'committed' && <ScoreReveal />}
    </div>
  )
}
