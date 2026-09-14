import { test, expect } from '@playwright/test'
import { authFile } from './support/auth'
import { resetDatabase } from './support/reset'

test.describe('panel-estado', () => {
  test.beforeAll(() => {
    resetDatabase()
  })

  test.describe('director', () => {
    test.use({ storageState: authFile('director') })

    test('director sees every team with a semaforo state', async ({ page }) => {
      await page.goto('/panel')
      await expect(page.getByText('E2E Eskola')).toBeVisible()
      await expect(page.getByText('E2E F7')).toBeVisible()
      await expect(page.getByText('E2E F11')).toBeVisible()
      await expect(page.getByLabel(/rojo|verde|sin_datos/).first()).toBeVisible()
    })

    test('opening a team card shows its pending sessions detail', async ({ page }) => {
      await page.goto('/panel')
      await page.getByText('E2E Eskola').click()
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  })

  test.describe('coordinador', () => {
    test.use({ storageState: authFile('coordinador') })

    test('coordinador only sees teams in their assigned category (f7)', async ({ page }) => {
      await page.goto('/panel')
      await expect(page.getByText('E2E F7')).toBeVisible()
      await expect(page.getByText('E2E Eskola')).not.toBeVisible()
      await expect(page.getByText('E2E F11')).not.toBeVisible()
    })
  })

  test.describe('entrenador', () => {
    test.use({ storageState: authFile('entrenador') })

    test('entrenador cannot reach /panel (role-gated)', async ({ page }) => {
      await page.goto('/panel')
      await expect(page).not.toHaveURL(/\/panel/)
    })
  })
})
