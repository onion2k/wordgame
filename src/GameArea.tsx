import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { DIRECTIONS, MAX_GRID_SIZE } from './game/constants'
import { isPointerInCenter } from './game/pointer'
import type { GameAreaProps } from './game/types'
import type { UseWordGridGameResult } from './game/useWordGridGameBase'
import { useWordGridHuntGame } from './game/useWordGridHuntGame'
import { useWordGridMatchGame } from './game/useWordGridMatchGame'
import { sanitizeWord } from './game/words'

const HINT_DURATION_MS = 1400

type WordGridHookOptions = {
  gridSize?: number
  words?: string[]
  dictionary?: string[]
  interactionDisabled?: boolean
  wordPlacement?: 'line' | 'path'
  roundSeed?: number
}

type UseGridHook = (options: WordGridHookOptions) => UseWordGridGameResult

type GameAreaState = {
  gridState: UseWordGridGameResult
  bookTimerEnabled: boolean
  elapsedMs: number
  highlightCells: Set<string>
  isHintActive: boolean
  isRoundComplete: boolean
  isTimeUp: boolean
  newRound: () => void
  revealedAuthor: boolean
  revealedTitle: boolean
  sanitizedTargets: string[]
  targetWords: string[]
  timerEnabled: boolean
  timerProgress: number
  revealAuthor: () => void
  revealTitle: () => void
  triggerHint: () => void
}

type CSSVars = CSSProperties & Record<`--${string}`, string | number>

const formatElapsed = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const useGameAreaState = (useGridHook: UseGridHook, props: GameAreaProps): GameAreaState => {
  const {
    gridSize = MAX_GRID_SIZE,
    words = [],
    dictionary,
    timerSeconds = 60,
    targetWords = [],
    wordPlacement = 'line',
    onNewRound,
  } = props
  const timeLimitMs = Math.max(
    0,
    Math.floor((Number.isFinite(timerSeconds) ? timerSeconds : 0) * 1000)
  )
  const [timeLeftMs, setTimeLeftMs] = useState(timeLimitMs)
  const [timerSeed, setTimerSeed] = useState(0)
  const [roundSeed, setRoundSeed] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const prevFoundWordsRef = useRef(0)
  const hintTimeoutRef = useRef<number | null>(null)
  const timerEnabled = timeLimitMs > 0
  const bookTimerEnabled = !props.removeOnMatch && targetWords.length > 0
  const isTimeUp = timerEnabled && timeLeftMs <= 0
  const sanitizedTargets = useMemo(
    () => targetWords.map((word) => sanitizeWord(word)).filter((word) => word.length > 0),
    [targetWords]
  )
  const targetSet = useMemo(() => new Set(sanitizedTargets), [sanitizedTargets])
  const [isRoundComplete, setIsRoundComplete] = useState(false)
  const [isHintActive, setIsHintActive] = useState(false)
  const [revealedTitle, setRevealedTitle] = useState(false)
  const [revealedAuthor, setRevealedAuthor] = useState(false)
  const clampedGridSize = Math.max(1, Math.min(MAX_GRID_SIZE, Math.floor(gridSize)))

  const gridState = useGridHook({
    gridSize: clampedGridSize,
    words,
    dictionary,
    interactionDisabled: isTimeUp || isRoundComplete,
    wordPlacement,
    roundSeed,
  })

  useEffect(() => {
    setIsRoundComplete(false)
    setRevealedTitle(false)
    setRevealedAuthor(false)
    setIsHintActive(false)
  }, [clampedGridSize, roundSeed, targetSet, wordPlacement, words])

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        window.clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (targetSet.size === 0) return
    const foundSet = new Set(gridState.foundWords.map((entry) => entry.word))
    const completed = Array.from(targetSet).every((word) => foundSet.has(word))
    if (completed) {
      setIsRoundComplete(true)
    }
  }, [gridState.foundWords, targetSet])

  const highlightCells = useMemo(() => {
    if (sanitizedTargets.length === 0) {
      return new Set<string>()
    }
    const size = gridState.grid.length
    const matches = new Set<string>()
    const foundTargets = gridState.foundWords
      .map((entry) => entry.word)
      .filter((word) => targetSet.has(word))
    const wordsToHighlight = isHintActive ? sanitizedTargets : foundTargets
    if (wordsToHighlight.length === 0) {
      return matches
    }
    const findWordPath = (word: string) => {
      if (word.length === 0) return null
      const inBounds = (row: number, col: number) =>
        row >= 0 && row < size && col >= 0 && col < size
      const walk = (
        row: number,
        col: number,
        index: number,
        visited: Set<string>
      ): Array<{ row: number; col: number }> | null => {
        const tile = gridState.grid[row]?.[col]
        if (!tile || tile.letter !== word[index]) return null
        const key = `${row}-${col}`
        if (visited.has(key)) return null
        const nextVisited = new Set(visited)
        nextVisited.add(key)
        if (index === word.length - 1) {
          return [{ row, col }]
        }
        for (const dir of DIRECTIONS) {
          const nextRow = row + dir.row
          const nextCol = col + dir.col
          if (!inBounds(nextRow, nextCol)) continue
          const nextPath = walk(nextRow, nextCol, index + 1, nextVisited)
          if (nextPath) {
            return [{ row, col }, ...nextPath]
          }
        }
        return null
      }
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          const tile = gridState.grid[row]?.[col]
          if (!tile || tile.letter !== word[0]) continue
          const path = walk(row, col, 0, new Set())
          if (path) return path
        }
      }
      return null
    }
    wordsToHighlight.forEach((word) => {
      const path = findWordPath(word)
      if (!path) return
      path.forEach(({ row, col }) => {
        matches.add(`${row}-${col}`)
      })
    })
    return matches
  }, [gridState.foundWords, gridState.grid, isHintActive, sanitizedTargets, targetSet])

  const triggerHint = () => {
    if (sanitizedTargets.length === 0) return
    if (hintTimeoutRef.current) {
      window.clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
    setIsHintActive(true)
    hintTimeoutRef.current = window.setTimeout(() => {
      setIsHintActive(false)
      hintTimeoutRef.current = null
    }, HINT_DURATION_MS)
  }

  useEffect(() => {
    if (!timerEnabled) {
      setTimeLeftMs(0)
      return
    }
    setTimeLeftMs(timeLimitMs)
    let frameId = 0
    const start = performance.now()
    const tick = (now: number) => {
      const remaining = Math.max(timeLimitMs - (now - start), 0)
      setTimeLeftMs(remaining)
      if (remaining <= 0) return
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [timeLimitMs, timerEnabled, timerSeed])

  useEffect(() => {
    if (timerEnabled && gridState.foundWords.length > prevFoundWordsRef.current) {
      setTimerSeed((current) => current + 1)
    }
    prevFoundWordsRef.current = gridState.foundWords.length
  }, [gridState.foundWords.length, timerEnabled])

  useEffect(() => {
    if (!bookTimerEnabled) {
      setElapsedMs(0)
      return
    }
    setElapsedMs(0)
  }, [bookTimerEnabled, roundSeed, targetSet])

  useEffect(() => {
    if (!bookTimerEnabled || isRoundComplete) return
    let frameId = 0
    const start = performance.now()
    const tick = (now: number) => {
      setElapsedMs(now - start)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [bookTimerEnabled, isRoundComplete, roundSeed, targetSet])

  const timerProgress = timerEnabled ? Math.min(timeLeftMs / timeLimitMs, 1) : 0
  const newRound = () => {
    setRoundSeed((current) => current + 1)
    setTimerSeed((current) => current + 1)
    setTimeLeftMs(timeLimitMs)
    setIsRoundComplete(false)
    setIsHintActive(false)
    setElapsedMs(0)
    onNewRound?.()
  }

  return {
    gridState,
    bookTimerEnabled,
    elapsedMs,
    highlightCells,
    isHintActive,
    isRoundComplete,
    isTimeUp,
    newRound,
    revealedAuthor,
    revealedTitle,
    sanitizedTargets,
    targetWords,
    timerEnabled,
    timerProgress,
    revealAuthor: () => setRevealedAuthor(true),
    revealTitle: () => setRevealedTitle(true),
    triggerHint,
  }
}

type GameAreaViewProps = GameAreaState

const GameAreaView = ({
  gridState,
  bookTimerEnabled,
  elapsedMs,
  highlightCells,
  isHintActive,
  isRoundComplete,
  isTimeUp,
  newRound,
  revealedAuthor,
  revealedTitle,
  sanitizedTargets,
  targetWords,
  timerEnabled,
  timerProgress,
  revealAuthor,
  revealTitle,
  triggerHint,
}: GameAreaViewProps) => {
  const {
    grid,
    path,
    isDragging,
    removingIds,
    newIds,
    linePoints,
    boardSize,
    foundWords,
    totalScore,
    selectedWord,
    size,
    boardRef,
    tileRefs,
    startDrag,
    extendPath,
    stopDrag,
  } = gridState
  const isActive = (rowIndex: number, columnIndex: number) =>
    path.some((cell) => cell.row === rowIndex && cell.col === columnIndex)
  const boardStyle: CSSVars = { '--grid-size': size }
  const timerStyle: CSSVars = { '--timer-progress': timerProgress }
  const getCellFromPoint = (x: number, y: number) => {
    const target = document.elementFromPoint(x, y) as HTMLElement | null
    const tileEl = target?.closest<HTMLSpanElement>('.tile')
    if (!tileEl) return null
    const row = Number(tileEl.dataset.row)
    const col = Number(tileEl.dataset.col)
    if (!Number.isFinite(row) || !Number.isFinite(col)) return null
    return { row, col }
  }

  return (
    <section className="game-area" aria-label="Game board">
      <div
        className="board"
        ref={boardRef}
        style={boardStyle}
        onPointerMove={(event) => {
          if (isTimeUp || !isDragging) return
          const cell = getCellFromPoint(event.clientX, event.clientY)
          if (!cell) return
          if (!grid[cell.row]?.[cell.col]) return
          extendPath(cell)
        }}
      >
        <svg
          className="selection-line"
          viewBox={`0 0 ${Math.max(boardSize.width, 1)} ${Math.max(boardSize.height, 1)}`}
          preserveAspectRatio="none"
        >
          <polyline
            points={linePoints.map((point) => `${point.x},${point.y}`).join(' ')}
            pathLength="1"
          />
        </svg>
        {grid.map((row, rowIndex) => (
          <div className="row" key={`row-${rowIndex}`}>
            {row.map((tile, columnIndex) => {
              const active = isActive(rowIndex, columnIndex)
              const cellKey = `${rowIndex}-${columnIndex}`
              const key = `${rowIndex}-${columnIndex}`
              const tileKey = tile ? tile.id : `empty-${key}`
              const isRemoving = tile ? removingIds.has(tile.id) : false
              const isNew = tile ? newIds.has(tile.id) : false
              const isHighlighted = tile ? highlightCells.has(cellKey) : false
              return (
                <span
                  className={`tile${tile ? ' filled' : ''}${active ? ' active' : ''}${
                    isRemoving ? ' removing' : ''
                  }${isNew ? ' new' : ''}${isHighlighted ? ' highlight' : ''}`}
                  key={tileKey}
                  data-row={rowIndex}
                  data-col={columnIndex}
                  ref={(el) => {
                    if (tile) {
                      if (el) {
                        tileRefs.current[tile.id] = el
                      } else {
                        delete tileRefs.current[tile.id]
                      }
                    }
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    if (isTimeUp) return
                    if (!isPointerInCenter(event)) return
                    if (!tile) return
                    startDrag({ row: rowIndex, col: columnIndex })
                  }}
                  onPointerMove={(event) => {
                    if (isTimeUp) return
                    if (!isDragging || !isPointerInCenter(event)) return
                    if (!tile) return
                    extendPath({ row: rowIndex, col: columnIndex })
                  }}
                  onPointerUp={stopDrag}
                >
                  {tile?.letter ?? ''}
                </span>
              )
            })}
          </div>
        ))}
        {isTimeUp ? (
          <div className="board-overlay" role="status" aria-live="polite">
            <span>Out of time</span>
          </div>
        ) : null}
        {!isTimeUp && isRoundComplete ? (
          <div className="board-overlay" role="status" aria-live="polite">
            <span>
              {bookTimerEnabled ? `Round complete in ${formatElapsed(elapsedMs)}` : 'Round complete'}
            </span>
          </div>
        ) : null}
      </div>

      {timerEnabled ? (
        <div className="timer" aria-hidden="true">
          <span className="timer__fill" style={timerStyle} />
        </div>
      ) : null}
      {bookTimerEnabled ? (
        <div className="timer-countup" aria-live="polite">
          <span>{`Time ${formatElapsed(elapsedMs)}`}</span>
        </div>
      ) : null}

      <div className="selected-word" aria-live="polite">
        <span
          key={selectedWord || 'placeholder'}
          className={`selected-word__value${selectedWord ? '' : ' is-placeholder'}`}
        >
          {selectedWord || '...'}
        </span>
      </div>

      <div className="found-words">
        <div className="found-words__header">
          <span>Found words</span>
          <span key={`score-${totalScore}`} className="found-words__score-total">
            Score {totalScore}
          </span>
          <span key={`count-${foundWords.length}`} className="found-words__count">
            {foundWords.length}
          </span>
        </div>
        {sanitizedTargets.length > 0 ? (
          <div className="controls">
            <button type="button" onClick={triggerHint} disabled={isHintActive}>
              {isHintActive ? 'Highlighting...' : 'Highlight title + author'}
            </button>
            <button type="button" onClick={revealTitle} disabled={revealedTitle}>
              {revealedTitle ? 'Title revealed' : 'Reveal title'}
            </button>
            <button type="button" onClick={revealAuthor} disabled={revealedAuthor}>
              {revealedAuthor ? 'Author revealed' : 'Reveal author'}
            </button>
            {isRoundComplete ? (
              <button type="button" onClick={newRound}>
                New round
              </button>
            ) : null}
          </div>
        ) : null}
        {sanitizedTargets.length > 0 ? (
          <div className="found-words__reveal" aria-live="polite">
            <span>{`Title: ${revealedTitle ? targetWords[0] ?? '' : '???'}`}</span>
            <span>{`Author: ${revealedAuthor ? targetWords[1] ?? '' : '???'}`}</span>
          </div>
        ) : null}
        {foundWords.length === 0 ? (
          <p className="found-words__empty">No matches yet. Start dragging tiles!</p>
        ) : (
          <ul className="found-words__list">
            {foundWords.map(({ word, score }, index) => (
              <li
                key={word}
                className="found-words__item"
                style={{ '--list-delay': `${index * 40}ms` } as CSSVars}
              >
                <span className="found-words__word">{word}</span>
                <span className="found-words__score">{score}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function GameAreaMatch(props: GameAreaProps) {
  const state = useGameAreaState(useWordGridMatchGame, props)
  return <GameAreaView {...state} />
}

function GameAreaHunt(props: GameAreaProps) {
  const state = useGameAreaState(useWordGridHuntGame, props)
  return <GameAreaView {...state} />
}

function GameArea(props: GameAreaProps) {
  const { removeOnMatch = true } = props

  return removeOnMatch ? <GameAreaMatch {...props} /> : <GameAreaHunt {...props} />
}

export default GameArea
