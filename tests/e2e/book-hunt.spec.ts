import { expect, test } from '@playwright/test'

const selectMode = async (page: import('@playwright/test').Page, modeName: string) => {
  await page.getByLabel('Game mode').selectOption({ label: modeName })
}

test.describe('Book Hunt', () => {
  test('shows the book timer and reveal controls', async ({ page }) => {
    await page.goto('/')
    await selectMode(page, 'Book Hunt')

    await expect(page.locator('.timer-countup')).toBeVisible()
    await expect(page.getByText(/^Time\s/)).toBeVisible()

    await expect(page.getByRole('button', { name: 'Reveal title' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reveal author' })).toBeVisible()
  })

  test('hint button toggles its state briefly', async ({ page }) => {
    await page.goto('/')
    await selectMode(page, 'Book Hunt')

    const hintButton = page.getByRole('button', { name: /Highlight/ })
    await hintButton.click()

    await expect(hintButton).toHaveText('Highlighting...')
    await expect(hintButton).toBeDisabled()

    await expect(hintButton).toBeEnabled({ timeout: 3000 })
    await expect(hintButton).toHaveText('Highlight title + author')
  })
})
