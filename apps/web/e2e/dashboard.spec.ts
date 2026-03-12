import { test, expect } from '@playwright/test'

test.describe('Dashboard page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login|keycloak|localhost:8081/, { timeout: 5000 }).catch(() => {})
    expect(page.url()).not.toContain('/dashboard')
  })

  test('landing page has link to dashboard/login', async ({ page }) => {
    await page.goto('/')
    const links = page.getByRole('link', { name: /get started|sign in/i })
    await expect(links.first()).toBeVisible()
  })
})

test.describe('Project workspace', () => {
  test('project page redirects without auth', async ({ page }) => {
    await page.goto('/dashboard/projects/some-fake-id')
    await page.waitForURL(/\/login|keycloak|localhost:8081/, { timeout: 5000 }).catch(() => {})
    expect(page.url()).not.toContain('/dashboard/projects')
  })
})
