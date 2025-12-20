import './App.css'
import { useMemo, useState } from 'react'

import GameArea from './GameArea'
import wordsTxt from './words.filtered.txt?raw'

type GameConfig = {
  id: string
  name: string
  gridSize: number
  words: string[]
  timerSeconds: number
}

function App() {
  const dictionary = wordsTxt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  const gameConfigs: GameConfig[] = useMemo(
    () => [
      {
        id: 'classic',
        name: 'Classic',
        gridSize: 8,
        words: ['STONE', 'FLARE', 'CLOUD', 'BRISK', 'TWIST'],
        timerSeconds: 30,
      },
      {
        id: 'speed',
        name: 'Speed Run',
        gridSize: 7,
        words: ['FLASH', 'QUICK', 'BLAZE', 'RAPID', 'SHIFT'],
        timerSeconds: 15,
      },
      {
        id: 'relax',
        name: 'Relaxed',
        gridSize: 9,
        words: ['BREEZE', 'CALM', 'FLOAT', 'DRIFT', 'GLOW'],
        timerSeconds: 0,
      },
    ],
    []
  )
  const [activeGameId, setActiveGameId] = useState(gameConfigs[0]?.id ?? 'classic')
  const activeGame = gameConfigs.find((game) => game.id === activeGameId) ?? gameConfigs[0]

  return (
    <div className="app-shell">
      <header className="game-header">
        <p className="eyebrow">Chris Neale's</p>
        <h1>Book Worm</h1>
      </header>

      <div className="game-controls">
        <label className="game-controls__label" htmlFor="game-select">
          Game mode
        </label>
        <select
          id="game-select"
          className="game-controls__select"
          value={activeGameId}
          onChange={(event) => setActiveGameId(event.target.value)}
        >
          {gameConfigs.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </div>

      {activeGame ? (
        <GameArea
          gridSize={activeGame.gridSize}
          words={activeGame.words}
          dictionary={dictionary}
          timerSeconds={activeGame.timerSeconds}
        />
      ) : null}
    </div>
  )
}

export default App
