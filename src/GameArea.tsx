import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type Cell = { row: number; col: number }
type GameAreaProps = { gridSize?: number }

const isAdjacent = (a: Cell, b: Cell) => {
  const rowDiff = Math.abs(a.row - b.row)
  const colDiff = Math.abs(a.col - b.col)
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0)
}

const isPointerInCenter = (event: ReactPointerEvent<HTMLSpanElement>) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const insetX = rect.width * 0.2
  const insetY = rect.height * 0.2
  const minX = rect.left + insetX
  const maxX = rect.right - insetX
  const minY = rect.top + insetY
  const maxY = rect.bottom - insetY

  return event.clientX >= minX && event.clientX <= maxX && event.clientY >= minY && event.clientY <= maxY
}

function GameArea({ gridSize = 8 }: GameAreaProps) {
  const clampedSize = Math.max(1, Math.floor(gridSize))
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const grid = Array.from({ length: clampedSize }, (_, rowIndex) =>
    Array.from(
      { length: clampedSize },
      (_, columnIndex) => alphabet[(rowIndex * clampedSize + columnIndex) % alphabet.length]
    )
  )

  const [path, setPath] = useState<Cell[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [linePoints, setLinePoints] = useState<{ x: number; y: number }[]>([])
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 })
  const boardRef = useRef<HTMLDivElement | null>(null)
  const tileRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const selectedWord = path.map((cell) => grid[cell.row][cell.col]).join('')

  const startDrag = (cell: Cell) => {
    setIsDragging(true)
    setPath([cell])
  }

  const extendPath = (cell: Cell) => {
    if (!isDragging) return
    setPath((currentPath) => {
      const last = currentPath[currentPath.length - 1]
      if (!last) return [cell]
      if (!isAdjacent(last, cell)) return currentPath
      const previous = currentPath[currentPath.length - 2]
      if (previous && previous.row === cell.row && previous.col === cell.col) {
        return currentPath.slice(0, -1)
      }
      const alreadySelected = currentPath.some(
        (selectedCell) => selectedCell.row === cell.row && selectedCell.col === cell.col
      )
      if (alreadySelected) return currentPath

      return [...currentPath, cell]
    })
  }

  const stopDrag = () => {
    setIsDragging(false)
    setPath([])
    setLinePoints([])
  }

  useEffect(() => {
    window.addEventListener('pointerup', stopDrag)
    return () => window.removeEventListener('pointerup', stopDrag)
  }, [])

  const computeLine = () => {
    if (!boardRef.current) return { points: [], size: { width: 0, height: 0 } }
    const boardRect = boardRef.current.getBoundingClientRect()
    const points = path
      .map((cell) => {
        const key = `${cell.row}-${cell.col}`
        const el = tileRefs.current[key]
        if (!el) return null
        const rect = el.getBoundingClientRect()
        return {
          x: rect.left - boardRect.left + rect.width / 2,
          y: rect.top - boardRect.top + rect.height / 2,
        }
      })
      .filter((point): point is { x: number; y: number } => Boolean(point))

    return { points, size: { width: boardRect.width, height: boardRect.height } }
  }

  useLayoutEffect(() => {
    const { points, size } = computeLine()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoardSize(size)
    setLinePoints(points)
  }, [path])

  useLayoutEffect(() => {
    const handleResize = () => {
      const { points, size } = computeLine()
      setBoardSize(size)
      setLinePoints(points)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [path])

  const isActive = (rowIndex: number, columnIndex: number) =>
    path.some((cell) => cell.row === rowIndex && cell.col === columnIndex)

  return (
    <section className="game-area" aria-label="Game board">
      <div className="board" ref={boardRef} style={{ ['--grid-size' as const]: clampedSize }}>
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
            {row.map((letter, columnIndex) => {
              const active = isActive(rowIndex, columnIndex)
              const key = `${rowIndex}-${columnIndex}`
              return (
                <span
                  className={`tile${active ? ' active' : ''}`}
                  key={`tile-${rowIndex}-${columnIndex}`}
                  ref={(el) => {
                    tileRefs.current[key] = el
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    if (!isPointerInCenter(event)) return
                    startDrag({ row: rowIndex, col: columnIndex })
                  }}
                  onPointerMove={(event) => {
                    if (!isDragging || !isPointerInCenter(event)) return
                    extendPath({ row: rowIndex, col: columnIndex })
                  }}
                  onPointerUp={stopDrag}
                >
                  {letter}
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <div className="selected-word" aria-live="polite">
        <span className="selected-word__value">{selectedWord || '...'}</span>
      </div>

      <div className="controls">
        <button type="button">Shuffle</button>
        <button type="button" className="primary">Submit guess</button>
      </div>
    </section>
  )
}

export default GameArea
