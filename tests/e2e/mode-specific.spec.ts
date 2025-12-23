import { expect, test } from '@playwright/test'

import { findWordPath, readGrid } from './helpers/word-grid'

const selectMode = async (page: import('@playwright/test').Page, modeName: string) => {
  await page.getByLabel('Game mode').selectOption({ label: modeName })
}

const expectGridContainsWord = async (page: import('@playwright/test').Page, words: string[]) => {
  const grid = await readGrid(page)
  const match = words.map((word) => findWordPath(grid, word)).find((path) => path)
  expect(match, `Expected one of ${words.join(', ')} to appear in the grid`).toBeTruthy()
}

test.describe('Mode-specific coverage', () => {
  test('classic mode grid includes at least one classic word', async ({ page }) => {
    await page.goto('/')
    await expectGridContainsWord(page, ['STONE', 'FLARE', 'CLOUD', 'BRISK', 'TWIST'])
  })

  test('speed run grid includes at least one speed word', async ({ page }) => {
    await page.goto('/')
    await selectMode(page, 'Speed Run')
    await expectGridContainsWord(page, ['FLASH', 'QUICK', 'BLAZE', 'RAPID', 'SHIFT'])
  })

  test('relaxed mode has no timer or timeout overlay', async ({ page }) => {
    await page.goto('/')
    await selectMode(page, 'Relaxed')

    await expect(page.locator('.timer')).toHaveCount(0)
    await expect(page.getByText('Out of time')).toHaveCount(0)
  })
})
