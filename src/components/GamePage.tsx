import GameHeader from './GameHeader'
import ContextBar from './ContextBar'
import TileGrid from './TileGrid'
import HandSlots from './HandSlots'
import ScoreReveal from './ScoreReveal'
import { useGameStore } from '../store/gameStore'
import Settings from './Settings'

export default function GamePage() {
  const { phase } = useGameStore()
  return (
    <div className="game-page">
      <GameHeader />
      <ContextBar />
      <TileGrid />
      <HandSlots />
      {phase === 'committed' && <ScoreReveal />}

      <Settings />
    </div>
  )
}
