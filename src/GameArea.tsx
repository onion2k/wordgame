import { useEffect, useRef, useState } from 'react'

import { isPointerInCenter } from './game/pointer'
import type { GameAreaProps } from './game/types'
import { useWordGridGame } from './game/useWordGridGame'

function GameArea({ gridSize = 8, words = [], dictionary, timerSeconds = 60 }: GameAreaProps) {
  const timeLimitMs = Math.max(
    0,
    Math.floor((Number.isFinite(timerSeconds) ? timerSeconds : 0) * 1000)
  )
  const [timeLeftMs, setTimeLeftMs] = useState(timeLimitMs)
  const [timerSeed, setTimerSeed] = useState(0)
  const prevFoundWordsRef = useRef(0)
  const timerEnabled = timeLimitMs > 0
  const isTimeUp = timerEnabled && timeLeftMs <= 0

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
    interactionDisabled: isTimeUp,
  })

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
              const key = `${rowIndex}-${columnIndex}`
              const tileKey = tile ? tile.id : `empty-${key}`
              const isRemoving = tile ? removingIds.has(tile.id) : false
              const isNew = tile ? newIds.has(tile.id) : false
              return (
                <span
                  className={`tile${tile ? ' filled' : ''}${active ? ' active' : ''}${
                    isRemoving ? ' removing' : ''
                  }${isNew ? ' new' : ''}`}
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
        <span className="selected-word__value">{selectedWord || '...'}</span>
      </div>

      <div className="found-words">
        <div className="found-words__header">
          <span>Found words</span>
          <span className="found-words__score-total">Score {totalScore}</span>
          <span className="found-words__count">{foundWords.length}</span>
        </div>
        {foundWords.length === 0 ? (
          <p className="found-words__empty">No matches yet. Start dragging tiles!</p>
        ) : (
          <ul className="found-words__list">
            {foundWords.map(({ word, score }) => (
              <li key={word} className="found-words__item">
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
