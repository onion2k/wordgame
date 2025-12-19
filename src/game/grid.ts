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

export const buildDefaultGrid = (size: number, words: string[], createTile: (letter: string) => Tile) => {
  const letters = buildWordSearchGrid(size, ALPHABET, words)
  return letters.map((row) => row.map((letter) => createTile(letter)))
}
