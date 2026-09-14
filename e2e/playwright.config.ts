import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://localhost'

// Roles are selected per-spec via `test.use({ storageState: authFile('<role>') })`
// (see support/auth.ts) rather than via Playwright `projects`, since most spec
// files only need one or two roles and a projects-based split would multiply
// every spec file across every role.
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never', outputFolder: './playwright-report' }]],
  outputDir: './test-results',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    // Caddy issues a self-signed cert for IP-only/localhost access (see ../Caddyfile).
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
