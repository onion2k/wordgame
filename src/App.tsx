import './App.css'
import GameArea from './GameArea'
import wordsTxt from './words.filtered.txt?raw'

function App() {
  const words = ['STONE', 'FLARE', 'CLOUD', 'BRISK', 'TWIST']
  const dictionary = wordsTxt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return (
    <div className="app-shell">
      <header className="game-header">
        <p className="eyebrow">Chris Neale's</p>
        <h1>Book Worm</h1>
      </header>

      <GameArea gridSize={8} words={words} dictionary={dictionary} />
    </div>
  )
}

export default App
