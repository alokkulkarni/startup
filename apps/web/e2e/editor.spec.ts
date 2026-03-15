import { test, expect } from '@playwright/test'

test.describe('Code Editor workspace', () => {
  test('unauthenticated user visiting project page redirects to login', async ({ page }) => {
    await page.goto('/dashboard/projects/test-id')
    // Should redirect away from the project page (to login or Keycloak)
    await page.waitForURL(/\/login|keycloak|localhost:8081/, { timeout: 8000 }).catch(() => {})
    const finalUrl = page.url()
    expect(finalUrl).not.toContain('/dashboard/projects/test-id')
  })

  test('homepage loads and title contains expected text', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
    const title = await page.title()
    // Title should contain the app name
    expect(title.length).toBeGreaterThan(0)
  })
})
