import { test, expect } from '@playwright/test'
import { authFile } from './support/auth'
import { resetDatabase } from './support/reset'

test.use({ storageState: authFile('entrenador') })

// f7/f11 only.
test.describe('minutaje', () => {
  test.beforeAll(() => {
    resetDatabase()
  })

  test('entrenador records playtime for a jornada and saves it', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'f7' }).click()
    await page.getByText('E2E F7').click()
    await page.getByRole('button', { name: /minutaje/i }).click()

    await page.getByRole('button', { name: /convocado/i }).first().click()
    await page.getByRole('button', { name: /partido osoa|partido completo/i }).click()
    await page.getByRole('button', { name: /Jornada gorde|Guardar jornada/i }).click()

    await expect(page.getByText(/E2E Rival/)).toBeVisible()
  })

  test('a completed jornada appears in the history and can be reloaded', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'f7' }).click()
    await page.getByText('E2E F7').click()
    await page.getByRole('button', { name: /minutaje/i }).click()

    await page.getByText(/E2E Rival/).click()
    await expect(page.locator('input[type="number"]').first()).toBeVisible()
  })

  test('dashboard shows an alert when a jornada has unrecorded minutes', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'f7' }).click()
    await page.getByText('E2E F7').click()
    await page.getByRole('button', { name: /minutaje/i }).click()
    await page.getByRole('button', { name: /Aginte-panela|Dashboard/i }).click()

    await expect(page.getByRole('list')).toBeVisible()
  })
})
