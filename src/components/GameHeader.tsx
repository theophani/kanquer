export default function GameHeader() {
  const randomSeed = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0')

  return (
    <header className="game-header">
      <a href="./" className="game-header-home">Kanquer</a>
      <nav className="game-header-nav">
        <a href="?mode=daily" className="daily">Daily</a>
        <a href={`?seed=${randomSeed}`} className="practice">Practice</a>
      </nav>
    </header>
  )
}
