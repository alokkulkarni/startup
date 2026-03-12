import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads and displays hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Forge AI/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('has working sign in link', async ({ page }) => {
    await page.goto('/')
    const signInLink = page.getByRole('link', { name: 'Sign in' })
    await expect(signInLink).toBeVisible()
    await expect(signInLink).toHaveAttribute('href', '/login')
  })

  test('has working get started link', async ({ page }) => {
    await page.goto('/')
    const ctaLink = page.getByRole('link', { name: 'Get started free' }).first()
    await expect(ctaLink).toBeVisible()
  })

  test('navigates to login page', async ({ page }) => {
    await page.goto('/login')
    // Should show spinner while redirecting to Keycloak
    // In CI without Keycloak, just verify the page loads
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Navigation', () => {
  test('displays Forge AI branding', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Forge AI').first()).toBeVisible()
  })
})
