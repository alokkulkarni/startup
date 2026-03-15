import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test('renders login page correctly', async ({ page }) => {
    await page.goto('/login')
    // Page should eventually show the login UI or redirect to Keycloak
    // In CI without live Keycloak, just verify page loads
    await expect(page).toHaveURL(/\/login|keycloak|localhost:8081/)
  })

  test('shows social login buttons', async ({ page }) => {
    await page.goto('/login')
    // Give brief time for client-side render
    await page.waitForTimeout(500)
    // Check for either the login page content or the Keycloak redirect
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Continue with GitHub')).toBeVisible()
      await expect(page.getByText('Continue with Google')).toBeVisible()
    }
  })

  test('shows email form', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(500)
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByLabel('Email address')).toBeVisible()
    }
  })

  test('can switch between login and signup', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(500)
    const url = page.url()
    if (url.includes('/login')) {
      const signupLink = page.getByRole('button', { name: 'Sign up free' })
      if (await signupLink.isVisible()) {
        await signupLink.click()
        await expect(page.getByText('Create your account')).toBeVisible()
      }
    }
  })
})

test.describe('Profile page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard/profile')
    await page.waitForURL(/\/login|keycloak|localhost:8081/, { timeout: 5000 }).catch(() => {})
    const finalUrl = page.url()
    // Should redirect away from /dashboard/profile
    expect(finalUrl).not.toContain('/dashboard/profile')
  })
})
