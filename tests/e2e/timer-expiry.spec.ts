import { expect, test } from '@playwright/test'

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

const selectMode = async (page: import('@playwright/test').Page, modeName: string) => {
  await page.getByLabel('Game mode').selectOption({ label: modeName })
}

test.describe('Timer expiry', () => {
  test('classic mode shows out of time overlay', async ({ page }) => {
    await accelerateTimers(page)
    await page.goto('/')

    await expect(page.getByText('Out of time')).toBeVisible()
  })

  test('speed run mode shows out of time overlay', async ({ page }) => {
    await accelerateTimers(page)
    await page.goto('/')
    await selectMode(page, 'Speed Run')

    await expect(page.getByText('Out of time')).toBeVisible()
  })
})
