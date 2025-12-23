import type { Locator, Page } from '@playwright/test'

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const

export const readGrid = async (page: Page) =>
  page.$$eval('.board .row', (rows) =>
    rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLSpanElement>('.tile')).map(
        (tile) => tile.textContent?.trim() ?? ''
      )
    )
  )

export const findWordPath = (grid: string[][], word: string) => {
  const size = grid.length
  const inBounds = (r: number, c: number) => r >= 0 && r < size && c >= 0 && c < size
  const visit = (
    row: number,
    col: number,
    index: number,
    visited: Set<string>
  ): Array<[number, number]> | null => {
    if (!inBounds(row, col)) return null
    if (grid[row]?.[col] !== word[index]) return null
    const key = `${row}-${col}`
    if (visited.has(key)) return null
    const nextVisited = new Set(visited)
    nextVisited.add(key)
    if (index === word.length - 1) return [[row, col]]
    for (const [dr, dc] of DIRECTIONS) {
      const next = visit(row + dr, col + dc, index + 1, nextVisited)
      if (next) return [[row, col], ...next]
    }
    return null
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (grid[row]?.[col] !== word[0]) continue
      const path = visit(row, col, 0, new Set())
      if (path) return path
    }
  }
  return null
}

const getTileCenter = async (tile: Locator) => {
  const box = await tile.boundingBox()
  if (!box) throw new Error('Tile not visible for drag')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export const dragPath = async (page: Page, path: Array<[number, number]>) => {
  const rowLocators = page.locator('.board .row')
  const startTile = rowLocators.nth(path[0][0]).locator('.tile').nth(path[0][1])
  const start = await getTileCenter(startTile)
  await startTile.dispatchEvent('pointerdown', {
    clientX: start.x,
    clientY: start.y,
    pointerId: 1,
    pointerType: 'mouse',
    buttons: 1,
    isPrimary: true,
  })

  for (const [row, col] of path.slice(1)) {
    const tile = rowLocators.nth(row).locator('.tile').nth(col)
    const pos = await getTileCenter(tile)
    await tile.dispatchEvent('pointermove', {
      clientX: pos.x,
      clientY: pos.y,
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
      isPrimary: true,
    })
  }
  const end = path[path.length - 1]
  const endTile = rowLocators.nth(end[0]).locator('.tile').nth(end[1])
  const endPos = await getTileCenter(endTile)
  await endTile.dispatchEvent('pointerup', {
    clientX: endPos.x,
    clientY: endPos.y,
    pointerId: 1,
    pointerType: 'mouse',
    buttons: 0,
    isPrimary: true,
  })
}

export const sanitizeWord = (word: string) => word.toUpperCase().replace(/[^A-Z]/g, '')
