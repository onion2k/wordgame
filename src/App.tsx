import './App.css'
import { useEffect, useMemo, useState } from 'react'

import GameArea from './GameArea'
import { sanitizeWord } from './game/words'
import wordsTxt from './words.filtered.txt?raw'

type GameConfig = {
  id: string
  name: string
  gridSize: number
  words: string[]
  timerSeconds: number
  dictionary?: string[]
  removeOnMatch?: boolean
  targetWords?: string[]
  wordPlacement?: 'line' | 'path'
}

type AppProps = {
  bookTitle?: string
  bookAuthor?: string
}

const GAME_MODE_COOKIE = 'bookworm_game_mode'

const readCookie = (name: string) => {
  if (typeof document === 'undefined') return null
  const parts = document.cookie.split(';').map((part) => part.trim())
  const match = parts.find((part) => part.startsWith(`${name}=`))
  if (!match) return null
  return decodeURIComponent(match.slice(name.length + 1))
}

function App({ bookTitle = 'Pride and Prejudice', bookAuthor = 'Jane Austen' }: AppProps) {
  const dictionary = wordsTxt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  const bookTargets = useMemo(
    () =>
      [bookTitle, bookAuthor].map((word) => word.trim()).filter((word) => word.length > 0),
    [bookAuthor, bookTitle]
  )
  const bookGridSize = useMemo(() => {
    const lengths = bookTargets.map((word) => sanitizeWord(word).length).filter((len) => len > 0)
    return Math.max(10, ...lengths)
  }, [bookTargets])
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
      {
        id: 'book-hunt',
        name: 'Book Hunt',
        gridSize: 10,
        words: bookTargets,
        dictionary: bookTargets,
        timerSeconds: 0,
        removeOnMatch: false,
        targetWords: bookTargets,
        wordPlacement: 'path',
      },
    ],
    [bookGridSize, bookTargets]
  )
  const [activeGameId, setActiveGameId] = useState(() => {
    const savedId = readCookie(GAME_MODE_COOKIE)
    if (savedId && gameConfigs.some((game) => game.id === savedId)) {
      return savedId
    }
    return gameConfigs[0]?.id ?? 'classic'
  })
  const activeGame = gameConfigs.find((game) => game.id === activeGameId) ?? gameConfigs[0]

  useEffect(() => {
    if (gameConfigs.some((game) => game.id === activeGameId)) return
    setActiveGameId(gameConfigs[0]?.id ?? 'classic')
  }, [activeGameId, gameConfigs])

  useEffect(() => {
    if (!activeGameId) return
    document.cookie = `${GAME_MODE_COOKIE}=${encodeURIComponent(
      activeGameId
    )}; max-age=31536000; path=/; samesite=lax`
  }, [activeGameId])

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
          dictionary={activeGame.dictionary ?? dictionary}
          timerSeconds={activeGame.timerSeconds}
          removeOnMatch={activeGame.removeOnMatch}
          targetWords={activeGame.targetWords}
          wordPlacement={activeGame.wordPlacement}
        />
      ) : null}
    </div>
  )
}

export default App
