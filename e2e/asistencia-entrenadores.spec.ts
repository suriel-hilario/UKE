import { test, expect } from '@playwright/test'
import { authFile } from './support/auth'
import { resetDatabase } from './support/reset'

test.use({ storageState: authFile('entrenador') })

// f7 is the only categoria that renders the "entrenadores" attendance tab.
test.describe('asistencia-entrenadores', () => {
  test.beforeAll(() => {
    resetDatabase()
  })

  test('entrenador marks attendance for a training session', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'f7' }).click()
    await page.getByText('E2E F7').click()
    await page.getByRole('button', { name: /entrenadores/i }).click()

    await page.getByRole('button', { name: /Editatu|Editar/ }).click()
    await page.locator('table td button, table td').first().click()
    await page.getByRole('button', { name: /Gorde|Guardar/ }).click()

    await expect(page.getByRole('button', { name: /Editatu|Editar/ })).toBeVisible()
  })

  test('removing a session day is available in edit mode', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'f7' }).click()
    await page.getByText('E2E F7').click()
    await page.getByRole('button', { name: /entrenadores/i }).click()

    await page.getByRole('button', { name: /Editatu|Editar/ }).click()
    await expect(page.getByLabel('quitar-dia').first()).toBeVisible()
  })
})
