import ContextBar from './ContextBar'
import TileGrid from './TileGrid'
import HandSlots from './HandSlots'
import ScoreReveal from './ScoreReveal'
import { useGameStore } from '../store/gameStore'

export default function GamePage() {
  const { phase } = useGameStore()
  return (
    <div className="game-page">
      <ContextBar />
      <TileGrid />
      <HandSlots />
      {phase === 'committed' && <ScoreReveal />}
    </div>
  )
}
