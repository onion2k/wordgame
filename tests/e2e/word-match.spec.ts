import { expect, test } from '@playwright/test'

import { dragPath, findWordPath, readGrid } from './helpers/word-grid'

const WORDS = ['STONE', 'FLARE', 'CLOUD', 'BRISK', 'TWIST']

test.describe('Word matching', () => {
  test('dragging a valid word adds it to found words and updates score', async ({ page }) => {
    await page.goto('/')

    const grid = await readGrid(page)
    const match = WORDS.map((word) => ({ word, path: findWordPath(grid, word) })).find(
      (entry) => entry.path
    )
    expect(match, 'Expected at least one configured word to be present in the grid').toBeTruthy()

    const { word, path } = match as { word: string; path: Array<[number, number]> }
    await dragPath(page, path)

    await expect(page.locator('.found-words__list')).toContainText(word)
    await expect(page.locator('.found-words__score-total')).toContainText(`Score ${word.length}`)
    await expect(page.locator('.selected-word__value')).toHaveText('...')
  })
})
