import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'

import { ALPHABET, GRAVITY_DURATION, REFILL_POP_DURATION, REMOVE_DURATION } from './constants'
import { isAdjacent } from './cell'
import { applyGravity, buildDefaultGrid, removePathFromGrid } from './grid'
import { ensureSolvableGrid } from './solver'
import type { Cell, Tile } from './types'
import { buildTrie, sanitizeWord } from './words'

export type UseWordGridGameBaseOptions = {
  gridSize?: number
  words?: string[]
  dictionary?: string[]
  alphabet?: string
  scoringFn?: (word: string) => number
  interactionDisabled?: boolean
  removeOnMatch: boolean
  wordPlacement?: 'line' | 'path'
  roundSeed?: number
}

export type UseWordGridGameResult = {
  grid: Array<Array<Tile | null>>
  path: Cell[]
  isDragging: boolean
  isResolving: boolean
  removingIds: Set<string>
  newIds: Set<string>
  linePoints: Array<{ x: number; y: number }>
  boardSize: { width: number; height: number }
  foundWords: Array<{ word: string; score: number }>
  totalScore: number
  selectedWord: string
  size: number
  boardRef: MutableRefObject<HTMLDivElement | null>
  tileRefs: MutableRefObject<Record<string, HTMLSpanElement | null>>
  startDrag: (cell: Cell) => void
  extendPath: (cell: Cell) => void
  stopDrag: () => void
}

export const useWordGridGameBase = ({
  gridSize = 8,
  words = [],
  dictionary,
  alphabet = ALPHABET,
  scoringFn,
  interactionDisabled = false,
  removeOnMatch,
  wordPlacement = 'line',
  roundSeed,
}: UseWordGridGameBaseOptions): UseWordGridGameResult => {
  const clampedSize = Math.max(1, Math.floor(gridSize))
  const scoreWord = useCallback((word: string) => (scoringFn ? scoringFn(word) : word.length), [
    scoringFn,
  ])
  const tileIdRef = useRef(0)
  const createTile = useCallback((letter: string) => ({ id: `tile-${tileIdRef.current++}`, letter }), [])
  const [grid, setGrid] = useState<Array<Array<Tile | null>>>(() =>
    buildDefaultGrid(clampedSize, words, createTile, wordPlacement)
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
  const selectedWord = useMemo(
    () => path.map((cell) => grid[cell.row][cell.col]?.letter ?? '').join(''),
    [grid, path]
  )
  const totalScore = useMemo(
    () => foundWords.reduce((sum, entry) => sum + entry.score, 0),
    [foundWords]
  )

  useEffect(() => {
    tileIdRef.current = 0
    setGrid(buildDefaultGrid(clampedSize, words, createTile, wordPlacement))
    setPath([])
    setIsDragging(false)
    setLinePoints([])
    setRemovingIds(new Set())
    setNewIds(new Set())
    setIsResolving(false)
    setFoundWords([])
  }, [clampedSize, createTile, roundSeed, wordPlacement, words])

  const startDrag = useCallback(
    (cell: Cell) => {
      if (isResolving || interactionDisabled) return
      setIsDragging(true)
      setPath([cell])
    },
    [interactionDisabled, isResolving]
  )

  const extendPath = useCallback(
    (cell: Cell) => {
      if (!isDragging || interactionDisabled) return
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
    },
    [interactionDisabled, isDragging]
  )

  const stopDrag = useCallback(() => {
    if (interactionDisabled) {
      setIsDragging(false)
      setPath([])
      setLinePoints([])
      return
    }
    const resolvedWord = sanitizeWord(selectedWord)
    if (resolvedWord && validWords.has(resolvedWord) && path.length > 0) {
      setFoundWords((current) => {
        if (current.some((entry) => entry.word === resolvedWord)) return current
        return [{ word: resolvedWord, score: scoreWord(resolvedWord) }, ...current]
      })
      if (!removeOnMatch) {
        setIsDragging(false)
        setPath([])
        setLinePoints([])
        return
      }
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
              alphabet,
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
  }, [
    allWords,
    alphabet,
    createTile,
    grid,
    interactionDisabled,
    path,
    removeOnMatch,
    scoreWord,
    selectedWord,
    trie,
    validWords,
  ])

  useEffect(() => {
    window.addEventListener('pointerup', stopDrag)
    return () => window.removeEventListener('pointerup', stopDrag)
  }, [stopDrag])

  useEffect(() => {
    if (!interactionDisabled) return
    setIsDragging(false)
    setPath([])
    setLinePoints([])
  }, [interactionDisabled])

  const computeLine = useCallback(() => {
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
  }, [grid, path])

  useLayoutEffect(() => {
    const { points, size } = computeLine()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoardSize(size)
    setLinePoints(points)
  }, [computeLine])

  useLayoutEffect(() => {
    const handleResize = () => {
      const { points, size } = computeLine()
      setBoardSize(size)
      setLinePoints(points)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [computeLine])

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

  return {
    grid,
    path,
    isDragging,
    isResolving,
    removingIds,
    newIds,
    linePoints,
    boardSize,
    foundWords,
    totalScore,
    selectedWord,
    size: clampedSize,
    boardRef,
    tileRefs,
    startDrag,
    extendPath,
    stopDrag,
  }
}
