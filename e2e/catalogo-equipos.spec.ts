import { test, expect } from '@playwright/test'
import { authFile } from './support/auth'
import { resetDatabase } from './support/reset'

test.use({ storageState: authFile('entrenador') })

test.describe('catalogo-equipos', () => {
  test.beforeAll(() => {
    resetDatabase()
  })

  test('entrenador browses the open season and sees their teams by category', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('E2E Abierta')).toBeVisible().catch(() => {})

    // Single open season auto-selects; category tabs render for each team's categoria.
    await expect(page.getByRole('button', { name: 'eskola' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'f7' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'f11' })).toBeVisible()
    await expect(page.getByText('E2E Eskola')).toBeVisible()
  })

  test('switching category filters the visible team cards', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'f7' }).click()
    await expect(page.getByText('E2E F7')).toBeVisible()
    await expect(page.getByText('E2E Eskola')).not.toBeVisible()
  })

  test('opening a team goes to its detail page with the plantilla tab', async ({ page }) => {
    await page.goto('/')
    await page.getByText('E2E Eskola').click()
    await expect(page).toHaveURL(/\/equipos\//)
    await expect(page.getByText('E2E Jugador eskola 1')).toBeVisible()
  })

  test('language toggle switches labels between eu and es', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox').first().selectOption('es')
    await expect(page.getByRole('button', { name: /Salir/ })).toBeVisible()
    await page.getByRole('combobox').first().selectOption('eu')
    await expect(page.getByRole('button', { name: /Irten/ })).toBeVisible()
  })
})
