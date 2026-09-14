import { test, expect } from '@playwright/test'
import { authFile, loginAsRole } from './support/auth'
import { resetDatabase } from './support/reset'

test.describe('auth', () => {
  test.beforeAll(() => {
    resetDatabase()
  })

  test('unauthenticated visitor is redirected to Auth0 hosted login', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL(/\.auth0\.com/, { timeout: 15_000 })
    expect(page.url()).toContain('auth0.com')
  })

  test('admin logs in and lands on /admin', async ({ browser }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await context.newPage()
    await loginAsRole(page, 'admin')
    await page.waitForURL(/\/admin/)
    await expect(page.getByRole('heading', { name: /Erabiltzaileak|Usuarios/ })).toBeVisible()
    await context.close()
  })

  test('entrenador logs in and lands on the catalogo shell (not /admin)', async ({ browser }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await context.newPage()
    await loginAsRole(page, 'entrenador')
    await expect(page).not.toHaveURL(/\/admin/)
    await expect(page.getByText('UKE')).toBeVisible()
    await context.close()
  })

  test('entrenador cannot reach /admin (role-gated route)', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile('entrenador'),
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin\/usuarios/)
    await context.close()
  })

  test('logout returns the user to the Auth0 hosted login', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile('entrenador'),
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.getByRole('button', { name: /Irten|Salir/ }).first().click()
    await page.waitForURL(/\.auth0\.com|\/$/, { timeout: 15_000 })
    await context.close()
  })
})
