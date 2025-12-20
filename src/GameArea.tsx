import { isPointerInCenter } from './game/pointer'
import type { GameAreaProps } from './game/types'
import { useWordGridGame } from './game/useWordGridGame'

function GameArea({ gridSize = 8, words = [], dictionary }: GameAreaProps) {
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
  } = useWordGridGame({ gridSize, words, dictionary })

  const isActive = (rowIndex: number, columnIndex: number) =>
    path.some((cell) => cell.row === rowIndex && cell.col === columnIndex)

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
                    if (!isPointerInCenter(event)) return
                    if (!tile) return
                    startDrag({ row: rowIndex, col: columnIndex })
                  }}
                  onPointerMove={(event) => {
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
      </div>

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
