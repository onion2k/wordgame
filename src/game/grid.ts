import { ALPHABET, DIRECTIONS } from './constants'
import { getRandomInt } from './random'
import { sanitizeWord } from './words'
import type { Cell, Tile } from './types'

export const buildWordSearchGrid = (size: number, alphabet: string, words: string[]) => {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ''))
  const cleanedWords = words
    .map(sanitizeWord)
    .filter((word) => word.length > 0 && word.length <= size)
    .sort((a, b) => b.length - a.length)

  const canPlace = (word: string, row: number, col: number, dir: { row: number; col: number }) =>
    word.split('').every((letter, index) => {
      const nextRow = row + dir.row * index
      const nextCol = col + dir.col * index
      if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) return false
      const existing = grid[nextRow][nextCol]
      return existing === '' || existing === letter
    })

  const placeWord = (word: string) => {
    const attempts = size * size * DIRECTIONS.length
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const dir = DIRECTIONS[getRandomInt(DIRECTIONS.length)]
      const startRow = getRandomInt(size)
      const startCol = getRandomInt(size)
      if (!canPlace(word, startRow, startCol, dir)) continue
      word.split('').forEach((letter, index) => {
        const nextRow = startRow + dir.row * index
        const nextCol = startCol + dir.col * index
        grid[nextRow][nextCol] = letter
      })
      return true
    }
    return false
  }

  cleanedWords.forEach((word) => {
    placeWord(word)
  })

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (grid[row][col] === '') {
        grid[row][col] = alphabet[getRandomInt(alphabet.length)]
      }
    }
  }

  return grid
}

export const buildWordPathGrid = (size: number, alphabet: string, words: string[]) => {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ''))
  const cleanedWords = words
    .map(sanitizeWord)
    .filter((word) => word.length > 0 && word.length <= size * size)
    .sort((a, b) => b.length - a.length)

  const shuffle = <T,>(items: T[]) => {
    const result = items.slice()
    for (let i = result.length - 1; i > 0; i -= 1) {
      const swapIndex = getRandomInt(i + 1)
      ;[result[i], result[swapIndex]] = [result[swapIndex], result[i]]
    }
    return result
  }

  const isStraightPath = (path: Cell[]) => {
    if (path.length < 2) return true
    const first = path[0]
    const second = path[1]
    const deltaRow = second.row - first.row
    const deltaCol = second.col - first.col
    return path.every((cell, index) => {
      if (index === 0) return true
      const prev = path[index - 1]
      return cell.row - prev.row === deltaRow && cell.col - prev.col === deltaCol
    })
  }

  const tryPlaceWord = (word: string) => {
    const attempts = size * size * 6
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const startRow = getRandomInt(size)
      const startCol = getRandomInt(size)
      if (grid[startRow][startCol] && grid[startRow][startCol] !== word[0]) continue

      const visited = new Set<string>()
      const path: Cell[] = []
      const walk = (row: number, col: number, index: number): boolean => {
        const key = `${row}-${col}`
        if (visited.has(key)) return false
        const existing = grid[row][col]
        if (existing && existing !== word[index]) return false
        visited.add(key)
        path.push({ row, col })
        if (index === word.length - 1) return true
        const neighbors = shuffle(
          DIRECTIONS.map((dir) => ({ row: row + dir.row, col: col + dir.col }))
        ).filter(
          (cell) =>
            cell.row >= 0 &&
            cell.row < size &&
            cell.col >= 0 &&
            cell.col < size &&
            !visited.has(`${cell.row}-${cell.col}`)
        )
        for (const cell of neighbors) {
          if (walk(cell.row, cell.col, index + 1)) return true
        }
        visited.delete(key)
        path.pop()
        return false
      }

      if (!walk(startRow, startCol, 0)) continue
      if (word.length > size && isStraightPath(path)) {
        continue
      }
      path.forEach(({ row, col }, index) => {
        grid[row][col] = word[index]
      })
      return true
    }
    return false
  }

  cleanedWords.forEach((word) => {
    tryPlaceWord(word)
  })

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (grid[row][col] === '') {
        grid[row][col] = alphabet[getRandomInt(alphabet.length)]
      }
    }
  }

  return grid
}

export const removePathFromGrid = (grid: Array<Array<Tile | null>>, path: Cell[]) => {
  const nextGrid = grid.map((row) => row.slice())
  path.forEach(({ row, col }) => {
    if (nextGrid[row] && nextGrid[row][col]) {
      nextGrid[row][col] = null
    }
  })
  return nextGrid
}

export const applyGravity = (grid: Array<Array<Tile | null>>) => {
  const size = grid.length
  const nextGrid: Array<Array<Tile | null>> = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  )
  for (let col = 0; col < size; col += 1) {
    let writeRow = size - 1
    for (let row = size - 1; row >= 0; row -= 1) {
      const tile = grid[row][col]
      if (tile) {
        nextGrid[writeRow][col] = tile
        writeRow -= 1
      }
    }
  }
  return nextGrid
}

export const refillGrid = (
  grid: Array<Array<Tile | null>>,
  alphabet: string,
  createTile: (letter: string) => Tile
) => {
  const newTileIds = new Set<string>()
  const createdCells: Cell[] = []
  const nextGrid = grid.map((row, rowIndex) =>
    row.map((tile, colIndex) => {
      if (tile) return tile
      const nextTile = createTile(alphabet[getRandomInt(alphabet.length)])
      newTileIds.add(nextTile.id)
      createdCells.push({ row: rowIndex, col: colIndex })
      return nextTile
    })
  )
  return { nextGrid, newTileIds, createdCells }
}

export const buildDefaultGrid = (
  size: number,
  words: string[],
  createTile: (letter: string) => Tile,
  placement: 'line' | 'path' = 'line'
) => {
  const letters =
    placement === 'path'
      ? buildWordPathGrid(size, ALPHABET, words)
      : buildWordSearchGrid(size, ALPHABET, words)
  return letters.map((row) => row.map((letter) => createTile(letter)))
}
