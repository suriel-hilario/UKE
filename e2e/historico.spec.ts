import { test, expect } from '@playwright/test'
import { authFile } from './support/auth'
import { resetDatabase } from './support/reset'

test.describe('historico', () => {
  test.beforeAll(() => {
    resetDatabase()
  })

  test.describe('admin', () => {
    test.use({ storageState: authFile('admin') })

    test('admin sees the closed season in historico', async ({ page }) => {
      await page.goto('/admin/historico')
      await expect(page.getByText('E2E Cerrada')).toBeVisible()
    })

    test('opening a closed season from historico shows it read-only', async ({ page }) => {
      await page.goto('/admin/historico')
      await page.getByRole('button', { name: /E2E Cerrada/ }).click()
      await expect(page).toHaveURL(/temporada_id=/)
    })
  })

  test.describe('director', () => {
    test.use({ storageState: authFile('director') })

    test('director can access historico', async ({ page }) => {
      await page.goto('/admin/historico')
      await expect(page.getByText('E2E Cerrada')).toBeVisible()
    })
  })

  test.describe('entrenador', () => {
    test.use({ storageState: authFile('entrenador') })

    test('entrenador cannot reach the historico route', async ({ page }) => {
      await page.goto('/admin/historico')
      await expect(page).not.toHaveURL(/\/admin\/historico/)
    })
  })
})
