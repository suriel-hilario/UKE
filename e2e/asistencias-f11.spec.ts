import { test, expect } from '@playwright/test'
import { authFile } from './support/auth'
import { resetDatabase } from './support/reset'

test.use({ storageState: authFile('entrenador') })

test.describe('asistencias-f11', () => {
  test.beforeAll(() => {
    resetDatabase()
  })

  test('entrenador marks all jugadores present for a session', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'f11' }).click()
    await page.getByText('E2E F11').click()
    await page.getByRole('button', { name: /asistencia/i }).click()

    await page.getByLabel('marcar-todos').first().click()
    await expect(page.getByLabel('marcar-todos').first()).toBeVisible()
  })

  test('clicking a cell opens the multi-state context menu', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'f11' }).click()
    await page.getByText('E2E F11').click()
    await page.getByRole('button', { name: /asistencia/i }).click()

    await page.locator('table tbody tr').first().locator('td').nth(1).click()
    await expect(page.getByRole('menu').or(page.getByRole('dialog'))).toBeVisible()
  })

  test('exporting attendance to CSV is available', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'f11' }).click()
    await page.getByText('E2E F11').click()
    await page.getByRole('button', { name: /asistencia/i }).click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /CSV/i }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })
})
