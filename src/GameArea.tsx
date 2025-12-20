import { useEffect, useMemo, useRef, useState } from 'react'

import { DIRECTIONS } from './game/constants'
import { isPointerInCenter } from './game/pointer'
import type { GameAreaProps } from './game/types'
import { useWordGridGame } from './game/useWordGridGame'
import { sanitizeWord } from './game/words'

const HINT_DURATION_MS = 1400

function GameArea({
  gridSize = 8,
  words = [],
  dictionary,
  timerSeconds = 60,
  removeOnMatch = true,
  targetWords = [],
  wordPlacement = 'line',
}: GameAreaProps) {
  const timeLimitMs = Math.max(
    0,
    Math.floor((Number.isFinite(timerSeconds) ? timerSeconds : 0) * 1000)
  )
  const [timeLeftMs, setTimeLeftMs] = useState(timeLimitMs)
  const [timerSeed, setTimerSeed] = useState(0)
  const prevFoundWordsRef = useRef(0)
  const hintTimeoutRef = useRef<number | null>(null)
  const timerEnabled = timeLimitMs > 0
  const isTimeUp = timerEnabled && timeLeftMs <= 0
  const sanitizedTargets = useMemo(
    () => targetWords.map((word) => sanitizeWord(word)).filter((word) => word.length > 0),
    [targetWords]
  )
  const targetSet = useMemo(() => new Set(sanitizedTargets), [sanitizedTargets])
  const [isRoundComplete, setIsRoundComplete] = useState(false)
  const [isHintActive, setIsHintActive] = useState(false)

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
  } = useWordGridGame({
    gridSize,
    words,
    dictionary,
    interactionDisabled: isTimeUp || isRoundComplete,
    removeOnMatch,
    wordPlacement,
  })

  useEffect(() => {
    setIsRoundComplete(false)
  }, [gridSize, targetSet, wordPlacement, words])

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
    const foundSet = new Set(foundWords.map((entry) => entry.word))
    const completed = Array.from(targetSet).every((word) => foundSet.has(word))
    if (completed) {
      setIsRoundComplete(true)
    }
  }, [foundWords, targetSet])

  const highlightCells = useMemo(() => {
    if (!isHintActive || sanitizedTargets.length === 0) {
      return new Set<string>()
    }
    const size = grid.length
    const matches = new Set<string>()
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
        const tile = grid[row]?.[col]
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
          const tile = grid[row]?.[col]
          if (!tile || tile.letter !== word[0]) continue
          const path = walk(row, col, 0, new Set())
          if (path) return path
        }
      }
      return null
    }
    sanitizedTargets.forEach((word) => {
      const path = findWordPath(word)
      if (!path) return
      path.forEach(({ row, col }) => {
        matches.add(`${row}-${col}`)
      })
    })
    return matches
  }, [grid, isHintActive, sanitizedTargets])

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
    if (timerEnabled && foundWords.length > prevFoundWordsRef.current) {
      setTimerSeed((current) => current + 1)
    }
    prevFoundWordsRef.current = foundWords.length
  }, [foundWords.length, timerEnabled])

  const isActive = (rowIndex: number, columnIndex: number) =>
    path.some((cell) => cell.row === rowIndex && cell.col === columnIndex)
  const timerProgress = timerEnabled ? Math.min(timeLeftMs / timeLimitMs, 1) : 0

  return (
    <section className="game-area" aria-label="Game board">
      <div className="board" ref={boardRef} style={{ ['--grid-size' as const]: size }}>
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
            <span>Round complete</span>
          </div>
        ) : null}
      </div>

      {timerEnabled ? (
        <div className="timer" aria-hidden="true">
          <span
            className="timer__fill"
            style={{ ['--timer-progress' as const]: timerProgress }}
          />
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
                style={{ ['--list-delay' as const]: `${index * 40}ms` }}
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

export default GameArea
