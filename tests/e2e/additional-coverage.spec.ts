import { expect, test } from '@playwright/test'

import { dragPath, findWordPath, readGrid, sanitizeWord } from './helpers/word-grid'

const CLASSIC_WORDS = ['STONE', 'FLARE', 'CLOUD', 'BRISK', 'TWIST']

const selectMode = async (page: import('@playwright/test').Page, modeName: string) => {
  await page.getByLabel('Game mode').selectOption({ label: modeName })
}

const accelerateTimers = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    let now = 0
    const step = 1000
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      now += step
      return window.setTimeout(() => callback(now), 0)
    }
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle)
    Object.defineProperty(performance, 'now', { value: () => now })
  })
}

const findClassicWordPath = async (page: import('@playwright/test').Page) => {
  const grid = await readGrid(page)
  const match = CLASSIC_WORDS.map((word) => ({ word, path: findWordPath(grid, word) })).find(
    (entry) => entry.path
  )
  expect(match, 'Expected a classic word to be present in the grid').toBeTruthy()
  return match as { word: string; path: Array<[number, number]> }
}

test.describe('Additional coverage', () => {
  test('mode selection persists after reload', async ({ page }) => {
    await page.goto('/')
    await selectMode(page, 'Relaxed')

    await page.reload()
    await expect(page.getByLabel('Game mode')).toHaveValue('relax')
  })

  test('switching modes resets found words and score', async ({ page }) => {
    await page.goto('/')

    const match = await findClassicWordPath(page)
    await dragPath(page, match.path)

    await expect(page.locator('.found-words__list')).toContainText(match.word)
    await expect(page.locator('.found-words__score-total')).toContainText(`Score ${match.word.length}`)

    await selectMode(page, 'Relaxed')

    await expect(page.getByText('No matches yet. Start dragging tiles!')).toBeVisible()
    await expect(page.locator('.found-words__score-total')).toContainText('Score 0')
  })

  test('dragging a non-word path does not add matches', async ({ page }) => {
    await page.goto('/')

    await dragPath(page, [
      [0, 0],
      [0, 1],
    ])

    await expect(page.getByText('No matches yet. Start dragging tiles!')).toBeVisible()
    await expect(page.locator('.found-words__score-total')).toContainText('Score 0')
  })

  test('selection line appears while dragging and clears after release', async ({ page }) => {
    await page.goto('/')

    const rowLocators = page.locator('.board .row')
    const startTile = rowLocators.nth(0).locator('.tile').nth(0)
    const nextTile = rowLocators.nth(0).locator('.tile').nth(1)

    const startBox = await startTile.boundingBox()
    const nextBox = await nextTile.boundingBox()
    if (!startBox || !nextBox) throw new Error('Tile not visible for drag')

    await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2)

    const polyline = page.locator('.selection-line polyline')
    await expect.poll(async () => (await polyline.getAttribute('points')) || '').not.toBe('')
    await expect(page.locator('.selected-word__value')).not.toHaveText('...')

    await page.mouse.up()
    await expect(polyline).toHaveAttribute('points', '')
    await expect(page.locator('.selected-word__value')).toHaveText('...')
  })

  test('time up disables dragging matches', async ({ page }) => {
    await accelerateTimers(page)
    await page.goto('/')

    await expect(page.getByText('Out of time')).toBeVisible()

    const match = await findClassicWordPath(page)
    await dragPath(page, match.path)

    await expect(page.getByText('No matches yet. Start dragging tiles!')).toBeVisible()
    await expect(page.locator('.found-words__score-total')).toContainText('Score 0')
  })

  test('book hunt can complete the round and start a new one', async ({ page }) => {
    const attempts = 3
    let titleWord = ''
    let authorWord = ''
    let titlePath: Array<[number, number]> | null = null
    let authorPath: Array<[number, number]> | null = null

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await page.goto('/')
      await selectMode(page, 'Book Hunt')

      await page.getByRole('button', { name: 'Reveal title' }).click()
      await page.getByRole('button', { name: 'Reveal author' }).click()

      const titleText = await page.getByText(/^Title:/).textContent()
      const authorText = await page.getByText(/^Author:/).textContent()
      titleWord = sanitizeWord(titleText?.replace(/^Title:\s*/, '') ?? '')
      authorWord = sanitizeWord(authorText?.replace(/^Author:\s*/, '') ?? '')

      const grid = await readGrid(page)
      titlePath = titleWord ? findWordPath(grid, titleWord) : null
      authorPath = authorWord ? findWordPath(grid, authorWord) : null

      if (titlePath && authorPath) break
    }

    expect(titlePath, 'Expected title word path to be present in the grid').toBeTruthy()
    expect(authorPath, 'Expected author word path to be present in the grid').toBeTruthy()

    await dragPath(page, titlePath as Array<[number, number]>)
    await dragPath(page, authorPath as Array<[number, number]>)

    await expect(page.getByText(/Round complete in/)).toBeVisible()
    const newRound = page.getByRole('button', { name: 'New round' })
    await expect(newRound).toBeVisible()

    await newRound.click()
    await expect(page.getByText(/Round complete in/)).toHaveCount(0)
    await expect(page.getByText('No matches yet. Start dragging tiles!')).toBeVisible()
  })

  test('book hunt hint highlights tiles briefly', async ({ page }) => {
    await page.goto('/')
    await selectMode(page, 'Book Hunt')

    const hintButton = page.getByRole('button', { name: 'Highlight title + author' })
    await hintButton.click()

    await expect.poll(async () => page.locator('.tile.highlight').count()).toBeGreaterThan(0)
    await expect(page.locator('.tile.highlight')).toHaveCount(0, { timeout: 3000 })
  })
})
