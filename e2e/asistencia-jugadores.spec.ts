import { test, expect } from '@playwright/test'
import { authFile } from './support/auth'
import { resetDatabase } from './support/reset'

test.use({ storageState: authFile('entrenador') })

// eskola/f7 (non-F11) attendance tab.
test.describe('asistencia-jugadores', () => {
  test.beforeAll(() => {
    resetDatabase()
  })

  test('entrenador marks a jugador present/absent for a session', async ({ page }) => {
    await page.goto('/')
    await page.getByText('E2E Eskola').click()
    await page.getByRole('button', { name: /asistencia/i }).click()

    await page.getByRole('button', { name: /Editatu|Editar/ }).click()
    await page.locator('table tbody tr').first().locator('td').nth(1).click()
    await page.getByRole('button', { name: /Gorde|Guardar/ }).click()

    await expect(page.getByRole('button', { name: /Editatu|Editar/ })).toBeVisible()
  })

  test('right-clicking a cell opens the note overlay', async ({ page }) => {
    await page.goto('/')
    await page.getByText('E2E Eskola').click()
    await page.getByRole('button', { name: /asistencia/i }).click()

    await page.getByRole('button', { name: /Editatu|Editar/ }).click()
    await page.locator('table tbody tr').first().locator('td').nth(1).click({ button: 'right' })
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('adding a jugador without a name fails validation', async ({ page }) => {
    await page.goto('/')
    await page.getByText('E2E Eskola').click()
    await page.getByRole('button', { name: /asistencia/i }).click()

    await page.getByRole('button', { name: /Jokalaria gehitu|Añadir jugador/ }).click()
    await page.getByRole('button', { name: /Gorde|Guardar/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
