import { test, expect } from '@playwright/test'
import { authFile } from './support/auth'
import { resetDatabase } from './support/reset'

test.use({ storageState: authFile('admin') })

test.describe('backoffice', () => {
  test.beforeAll(() => {
    resetDatabase()
  })

  test('admin creates a new usuario', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await page.getByRole('button', { name: /Sortu|Crear/ }).click()
    await page.getByLabel(/Emaila|Email/).fill('e2e-nuevo@uke.local')
    await page.getByLabel(/Izena|Nombre/).fill('E2E Nuevo Usuario')
    await page.getByRole('button', { name: /Gorde|Guardar/ }).click()
    await expect(page.getByText('E2E Nuevo Usuario')).toBeVisible()
  })

  test('admin resets a usuario password and sees the confirmation banner', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await page
      .getByRole('row', { name: /E2E Entrenador/ })
      .getByRole('button', { name: /Pasahitza berrezarri|Restablecer contraseña/ })
      .click()
    await expect(page.getByRole('status')).toContainText(/bidali da|enviado/)
  })

  test('creating a usuario without an email fails validation', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await page.getByRole('button', { name: /Sortu|Crear/ }).click()
    await page.getByLabel(/Izena|Nombre/).fill('Sin Email')
    await page.getByRole('button', { name: /Gorde|Guardar/ }).click()
    // Server-side validation (email/nombre_visible/rol obligatorios) keeps the modal open.
    await expect(page.getByLabel(/Izena|Nombre/)).toBeVisible()
  })

  test('admin creates a temporada', async ({ page }) => {
    await page.goto('/admin/temporadas')
    await page.getByLabel(/Izena|Nombre/).fill('E2E Nueva Temporada')
    await page.locator('input[type="date"]').first().fill('2028-09-01')
    await page.locator('input[type="date"]').nth(1).fill('2029-06-30')
    await page.getByRole('button', { name: /Sortu|Crear/ }).click()
    await expect(page.getByText('E2E Nueva Temporada')).toBeVisible()
  })

  test('admin creates an equipo for the open season', async ({ page }) => {
    await page.goto('/admin/equipos')
    await page.getByLabel(/Izena|Nombre/).fill('E2E Equipo Nuevo')
    await page.getByLabel(/Kategoria|Categoría/).selectOption('f7')
    await page.getByLabel(/Ordena|Fila/).fill('1').catch(() => {})
    await page.getByRole('button', { name: /Sortu|Crear/ }).click()
    await expect(page.getByText('E2E Equipo Nuevo')).toBeVisible()
  })

  // Closes the season last: closing it forces read-only mode for the rest
  // of this spec file's data, so no other test in this file can run after it.
  test('admin closes an open temporada with confirmation', async ({ page }) => {
    await page.goto('/admin/temporadas')
    page.once('dialog', (dialog) => dialog.accept())
    await page
      .getByRole('row', { name: 'E2E Abierta' })
      .getByRole('button', { name: /Denboraldia itxi|Cerrar temporada/ })
      .click()
    await expect(page.getByRole('row', { name: 'E2E Abierta' }).getByText(/Itxita|Cerrada/)).toBeVisible()
  })
})
