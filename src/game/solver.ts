import { DIRECTIONS } from './constants'
import { getRandomInt } from './random'
import { keyForCell } from './cell'
import type { Cell, InjectionResult, Tile, TrieNode } from './types'
import { refillGrid } from './grid'

export const findAnyWordPath = (grid: Array<Array<Tile | null>>, trie: TrieNode) => {
  const size = grid.length
  if (size === 0) return null
  const visited = Array.from({ length: size }, () => Array.from({ length: size }, () => false))

  const dfs = (row: number, col: number, node: TrieNode, path: Cell[]): Cell[] | null => {
    const tile = grid[row]?.[col]
    if (!tile) return null
    const nextNode = node.children.get(tile.letter)
    if (!nextNode) return null

    const nextPath = [...path, { row, col }]
    if (nextNode.isWord && nextPath.length >= 2) return nextPath

    visited[row][col] = true
    for (const dir of DIRECTIONS) {
      const nextRow = row + dir.row
      const nextCol = col + dir.col
      if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) continue
      if (visited[nextRow][nextCol]) continue
      const found = dfs(nextRow, nextCol, nextNode, nextPath)
      if (found) {
        visited[row][col] = false
        return found
      }
    }
    visited[row][col] = false
    return null
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const found = dfs(row, col, trie, [])
      if (found) return found
    }
  }

  return null
}

export const findPathInCells = (cells: Cell[], length: number, size: number) => {
  if (length === 0) return null
  const cellSet = new Set(cells.map(keyForCell))
  const used = new Set<string>()

  const neighbors = (cell: Cell) =>
    DIRECTIONS.map((dir) => ({ row: cell.row + dir.row, col: cell.col + dir.col })).filter(
      (next) =>
        next.row >= 0 &&
        next.row < size &&
        next.col >= 0 &&
        next.col < size &&
        cellSet.has(keyForCell(next))
    )

  const dfs = (cell: Cell, path: Cell[]): Cell[] | null => {
    const key = keyForCell(cell)
    if (used.has(key)) return null
    const nextPath = [...path, cell]
    if (nextPath.length === length) return nextPath

    used.add(key)
    for (const neighbor of neighbors(cell)) {
      const found = dfs(neighbor, nextPath)
      if (found) {
        used.delete(key)
        return found
      }
    }
    used.delete(key)
    return null
  }

  for (const cell of cells) {
    const found = dfs(cell, [])
    if (found) return found
  }
  return null
}

export const injectWordIntoEmptySpaces = (
  settled: Array<Array<Tile | null>>,
  alphabet: string,
  createTile: (letter: string) => Tile,
  dictionary: string[]
): InjectionResult | null => {
  const size = settled.length
  const emptyCells: Cell[] = []
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!settled[row][col]) emptyCells.push({ row, col })
    }
  }
  if (emptyCells.length === 0) return null

  const maxLen = emptyCells.length
  const candidates = dictionary.filter(
    (word) => word.length >= 2 && word.length <= maxLen && word.length <= size * size
  )
  if (candidates.length === 0) return null

  const shuffled = [...candidates].sort(() => Math.random() - 0.5)
  const attempts = shuffled.slice(0, Math.min(shuffled.length, 120))

  for (const word of attempts) {
    const path = findPathInCells(emptyCells, word.length, size)
    if (!path) continue

    const nextGrid = settled.map((row) => row.slice())
    const newIds = new Set<string>()

    path.forEach((cell, index) => {
      const tile = createTile(word[index])
      nextGrid[cell.row][cell.col] = tile
      newIds.add(tile.id)
    })

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (nextGrid[row][col]) continue
        const tile = createTile(alphabet[getRandomInt(alphabet.length)])
        nextGrid[row][col] = tile
        newIds.add(tile.id)
      }
    }
    return { grid: nextGrid, newIds }
  }
  return null
}

export const embedWordWithNewTiles = (
  grid: Array<Array<Tile | null>>,
  newCells: Cell[],
  trie: TrieNode
): Array<Array<Tile | null>> | null => {
  const size = grid.length
  const newSet = new Set(newCells.map(keyForCell))
  if (newSet.size === 0) return null
  const visited = Array.from({ length: size }, () => Array.from({ length: size }, () => false))

  type SearchResult = { path: Cell[]; assignments: Map<string, string> }

  const dfs = (
    row: number,
    col: number,
    node: TrieNode,
    path: Cell[],
    assignments: Map<string, string>
  ): SearchResult | null => {
    if (visited[row][col]) return null
    const tile = grid[row]?.[col]
    if (!tile) return null
    const key = keyForCell({ row, col })

    visited[row][col] = true
    for (const [letter, nextNode] of node.children.entries()) {
      if (!newSet.has(key) && tile.letter !== letter) continue
      const nextAssignments =
        newSet.has(key) && tile.letter !== letter
          ? new Map(assignments).set(key, letter)
          : assignments
      const nextPath = [...path, { row, col }]
      if (nextNode.isWord && nextPath.length >= 2) {
        visited[row][col] = false
        return { path: nextPath, assignments: nextAssignments }
      }
      for (const dir of DIRECTIONS) {
        const nextRow = row + dir.row
        const nextCol = col + dir.col
        if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) continue
        const found = dfs(nextRow, nextCol, nextNode, nextPath, nextAssignments)
        if (found) {
          visited[row][col] = false
          return found
        }
      }
    }
    visited[row][col] = false
    return null
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const found = dfs(row, col, trie, [], new Map())
      if (found) {
        const { assignments } = found
        return grid.map((gridRow, rowIndex) =>
          gridRow.map((tile, colIndex) => {
            if (!tile) return tile
            const key = keyForCell({ row: rowIndex, col: colIndex })
            const replacement = assignments.get(key)
            if (!replacement || replacement === tile.letter) return tile
            return { ...tile, letter: replacement }
          })
        )
      }
    }
  }

  return null
}

export const ensureSolvableGrid = (
  settled: Array<Array<Tile | null>>,
  alphabet: string,
  createTile: (letter: string) => Tile,
  trie: TrieNode,
  dictionary: string[]
) => {
  const injected = injectWordIntoEmptySpaces(settled, alphabet, createTile, dictionary)
  if (injected) return { grid: injected.grid, newIds: injected.newIds }

  const { nextGrid, newTileIds, createdCells } = refillGrid(settled, alphabet, createTile)
  if (findAnyWordPath(nextGrid, trie)) return { grid: nextGrid, newIds: newTileIds }

  const embedded = embedWordWithNewTiles(nextGrid, createdCells, trie)
  if (embedded) return { grid: embedded, newIds: newTileIds }

  return { grid: nextGrid, newIds: newTileIds }
}
