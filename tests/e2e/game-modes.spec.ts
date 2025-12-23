import { expect, test } from '@playwright/test'

const selectMode = async (page: import('@playwright/test').Page, modeName: string) => {
  await page.getByLabel('Game mode').selectOption({ label: modeName })
}

test.describe('Game modes', () => {
  test('loads the classic mode with the default grid', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Book Worm' })).toBeVisible()
    await expect(page.locator('.board .row')).toHaveCount(8)
    await expect(page.locator('.timer')).toHaveCount(1)
    await expect(page.getByText('No matches yet. Start dragging tiles!')).toBeVisible()
  })

  test('switching modes updates the grid size and timer visibility', async ({ page }) => {
    await page.goto('/')

    await selectMode(page, 'Speed Run')
    await expect(page.locator('.board .row')).toHaveCount(7)
    await expect(page.locator('.timer')).toHaveCount(1)

    await selectMode(page, 'Relaxed')
    await expect(page.locator('.board .row')).toHaveCount(9)
    await expect(page.locator('.timer')).toHaveCount(0)
  })

  test('switching modes persists selection in the cookie', async ({ page }) => {
    await page.goto('/')

    await selectMode(page, 'Speed Run')

    const cookieValue = await page.evaluate(() => document.cookie)
    expect(cookieValue).toContain('bookworm_game_mode=speed')
  })

  test('book hunt reveals title and author on demand', async ({ page }) => {
    await page.goto('/')
    await selectMode(page, 'Book Hunt')

    const revealTitle = page.getByRole('button', { name: 'Reveal title' })
    const revealAuthor = page.getByRole('button', { name: 'Reveal author' })

    await expect(revealTitle).toBeVisible()
    await expect(revealAuthor).toBeVisible()

    const titleRow = page.getByText(/^Title:/)
    const authorRow = page.getByText(/^Author:/)

    await expect(titleRow).toContainText('???')
    await expect(authorRow).toContainText('???')

    await revealTitle.click()
    await revealAuthor.click()

    await expect(titleRow).not.toContainText('???')
    await expect(authorRow).not.toContainText('???')
  })
})
