export default function HomePage() {
  const cacheKey = `kanquer-daily-${new Date().toISOString().slice(0, 10)}`
  const dailyCache = localStorage.getItem(cacheKey)
  const dailyResult: { points: number; elapsed: number } | null = dailyCache
    ? JSON.parse(dailyCache)
    : null

  return (
    <div className="home-page">
      <h1>Kanquer</h1>
      <p>Find the highest-scoring winning hand from 24 tiles.</p>
      <a href="#daily" className="daily-button">
        {dailyResult
          ? `Today's Puzzle — ${dailyResult.points.toLocaleString()} pts`
          : "Today's Puzzle"}
      </a>
      <a href="#random" className="practice-button">
        Practice
      </a>
    </div>
  )
}
