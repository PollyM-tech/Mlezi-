import { test, expect } from '@playwright/test'
test('administrator tools fit and navigate across sections', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await page.goto('/tests/responsive/index.html?screen=admin')
  await expect(page.getByRole('heading', { name: 'Keep care running.' })).toBeVisible()
  for (const section of ['Identity checks', 'Support tickets', 'Manual payments', 'Safety reports & reviews', 'Accounts & privacy', 'Email delivery', 'Overview']) {
    await page.getByRole('navigation', { name: 'Administration sections' }).getByRole('button', { name: section, exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1)
    expect(errors).toEqual([])
  }
})
