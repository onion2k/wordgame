import './App.css'
import GameArea from './GameArea'

function App() {
  return (
    <div className="app-shell">
      <header className="game-header">
        <p className="eyebrow">Daily puzzle</p>
        <h1>Wordgame</h1>
        <p className="tagline">Guess the hidden word in as few turns as you can.</p>
      </header>

      <GameArea gridSize={8} />

      <section className="notification" aria-live="polite">
        <p>Tap tiles to build a guess. You have 5 attempts left.</p>
      </section>
    </div>
  )
}

export default App
