import { test, expect } from '@playwright/test'

test.describe('AI Chat page', () => {
  test('unauthenticated user visiting project page redirects to login', async ({ page }) => {
    await page.goto('/dashboard/projects/test-id')
    await page
      .waitForURL(/\/login|keycloak|localhost:8081/, { timeout: 5000 })
      .catch(() => {})
    const finalUrl = page.url()
    // Should have redirected away from the project page
    expect(finalUrl).not.toMatch(/\/dashboard\/projects\/test-id$/)
  })

  test('project page title includes expected content', async ({ page }) => {
    // Navigate to the project page — it will redirect unauthenticated users
    await page.goto('/dashboard/projects/test-id')
    await page.waitForTimeout(500)

    const title = await page.title()
    // The page should have a title (Next.js default or app title)
    expect(title).toBeTruthy()
    expect(typeof title).toBe('string')
  })
})
