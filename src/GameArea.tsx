import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { ALPHABET, GRAVITY_DURATION, REFILL_POP_DURATION, REMOVE_DURATION } from './game/constants'
import { isAdjacent } from './game/cell'
import { applyGravity, buildDefaultGrid, removePathFromGrid } from './game/grid'
import { isPointerInCenter } from './game/pointer'
import { ensureSolvableGrid } from './game/solver'
import type { Cell, GameAreaProps, Tile } from './game/types'
import { buildTrie, sanitizeWord } from './game/words'

function GameArea({ gridSize = 8, words = [], dictionary }: GameAreaProps) {
  const clampedSize = Math.max(1, Math.floor(gridSize))
  const tileIdRef = useRef(0)
  const createTile = (letter: string) => ({ id: `tile-${tileIdRef.current++}`, letter })
  const [grid, setGrid] = useState<Array<Array<Tile | null>>>(() =>
    buildDefaultGrid(clampedSize, words, createTile)
  )
  const allWords = useMemo(() => {
    const source = dictionary && dictionary.length > 0 ? dictionary : words
    return source.map(sanitizeWord).filter((word) => word.length > 0)
  }, [dictionary, words])
  const validWords = useMemo(() => new Set(allWords), [allWords])
  const trie = useMemo(() => buildTrie(allWords), [allWords])

  const [path, setPath] = useState<Cell[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [linePoints, setLinePoints] = useState<{ x: number; y: number }[]>([])
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 })
  const [foundWords, setFoundWords] = useState<Array<{ word: string; score: number }>>([])
  const boardRef = useRef<HTMLDivElement | null>(null)
  const tileRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const prevPositionsRef = useRef<Map<string, { left: number; top: number }> | null>(null)
  const selectedWord = path.map((cell) => grid[cell.row][cell.col]?.letter ?? '').join('')
  const totalScore = useMemo(
    () => foundWords.reduce((sum, entry) => sum + entry.score, 0),
    [foundWords]
  )

  useEffect(() => {
    tileIdRef.current = 0
    setGrid(buildDefaultGrid(clampedSize, words, createTile))
    setPath([])
    setIsDragging(false)
    setLinePoints([])
    setRemovingIds(new Set())
    setNewIds(new Set())
    setIsResolving(false)
    setFoundWords([])
  }, [clampedSize, words])

  const startDrag = (cell: Cell) => {
    if (isResolving) return
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
    const resolvedWord = sanitizeWord(selectedWord)
    if (resolvedWord && validWords.has(resolvedWord) && path.length > 0) {
      setFoundWords((current) => {
        if (current.some((entry) => entry.word === resolvedWord)) return current
        return [...current, { word: resolvedWord, score: resolvedWord.length }]
      })
      const idsToRemove = new Set<string>()
      path.forEach(({ row, col }) => {
        const tile = grid[row]?.[col]
        if (tile) idsToRemove.add(tile.id)
      })
      if (idsToRemove.size > 0) {
        setIsResolving(true)
        setRemovingIds(idsToRemove)
        window.setTimeout(() => {
          setGrid((currentGrid) => {
            const cleared = removePathFromGrid(currentGrid, path)
            const settled = applyGravity(cleared)
            const { grid: nextGrid, newIds: newTileIds } = ensureSolvableGrid(
              settled,
              ALPHABET,
              createTile,
              trie,
              allWords
            )
            setNewIds(newTileIds)
            window.setTimeout(() => setNewIds(new Set()), REFILL_POP_DURATION)
            return nextGrid
          })
          setRemovingIds(new Set())
          setIsResolving(false)
        }, REMOVE_DURATION)
      }
    }
    setIsDragging(false)
    setPath([])
    setLinePoints([])
  }

  useEffect(() => {
    window.addEventListener('pointerup', stopDrag)
    return () => window.removeEventListener('pointerup', stopDrag)
  }, [stopDrag])

  const computeLine = () => {
    if (!boardRef.current) return { points: [], size: { width: 0, height: 0 } }
    const boardRect = boardRef.current.getBoundingClientRect()
    const points = path
      .map((cell) => {
        const tile = grid[cell.row]?.[cell.col]
        if (!tile) return null
        const el = tileRefs.current[tile.id]
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

  useLayoutEffect(() => {
    if (!boardRef.current) return
    const boardEl = boardRef.current
    const boardRect = boardEl.getBoundingClientRect()
    const getRelativePosition = (el: HTMLElement) => {
      let left = 0
      let top = 0
      let node: HTMLElement | null = el
      while (node && node !== boardEl) {
        left += node.offsetLeft
        top += node.offsetTop
        node = node.offsetParent as HTMLElement | null
      }
      if (node === boardEl) return { left, top }
      const rect = el.getBoundingClientRect()
      return {
        left: rect.left - boardRect.left,
        top: rect.top - boardRect.top,
      }
    }
    const currentPositions = new Map<string, { left: number; top: number }>()
    Object.entries(tileRefs.current).forEach(([id, el]) => {
      if (!el) return
      currentPositions.set(id, getRelativePosition(el))
    })

    const prevPositions = prevPositionsRef.current
    if (prevPositions) {
      currentPositions.forEach((rect, id) => {
        const prevRect = prevPositions.get(id)
        const el = tileRefs.current[id]
        if (!el || !prevRect || removingIds.has(id)) return
        const deltaX = prevRect.left - rect.left
        const deltaY = prevRect.top - rect.top
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return
        el.style.transition = 'transform 0ms'
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`
        requestAnimationFrame(() => {
          if (!el) return
          el.style.transition = `transform ${GRAVITY_DURATION}ms ease`
          el.style.transform = ''
        })
      })
    }
    prevPositionsRef.current = currentPositions
  }, [grid, removingIds])

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
