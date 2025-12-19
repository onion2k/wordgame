import type { Cell } from './types'

export const keyForCell = (cell: Cell) => `${cell.row}-${cell.col}`

export const isAdjacent = (a: Cell, b: Cell) => {
  const rowDiff = Math.abs(a.row - b.row)
  const colDiff = Math.abs(a.col - b.col)
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0)
}
