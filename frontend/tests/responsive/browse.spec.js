import { test, expect } from '@playwright/test'
test('employer workspace and Find care show cards before filters and fit the screen', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  for (const screen of ['employer-home', 'discovery']) {
    await page.goto(`/tests/responsive/index.html?screen=${screen}`)
    await expect(page.locator('.result-card').first()).toBeVisible()
    const filter = page.getByRole('button', {name:'Filter caregivers', exact:true})
    await expect(filter).toHaveAttribute('aria-expanded','false')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1)
    await filter.click()
    await expect(page.getByRole('combobox',{name:'Caregiver category',exact:true})).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1)
    expect(errors).toEqual([])
  }
})
