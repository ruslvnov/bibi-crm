import { test, expect } from '@playwright/test'

test.describe('Admin workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('1. Admin can log in', async ({ page }) => {
    await page.fill('[id="email"]', 'admin@example.com')
    await page.fill('[id="password"]', 'ChangeMe123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=Главная панель')).toBeVisible()
  })

  test('2. Can view requests list', async ({ page }) => {
    // Login first
    await page.fill('[id="email"]', 'admin@example.com')
    await page.fill('[id="password"]', 'ChangeMe123!')
    await page.click('button[type="submit"]')
    await page.goto('/requests')
    await expect(page.locator('text=Все заявки')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('3. Can filter requests by status', async ({ page }) => {
    await page.fill('[id="email"]', 'admin@example.com')
    await page.fill('[id="password"]', 'ChangeMe123!')
    await page.click('button[type="submit"]')
    await page.goto('/requests')
    // Select PENDING filter
    await page.click('[role="combobox"]')
    await page.click('text=Ожидает')
    await expect(page.url()).toContain('status=PENDING')
  })

  test('4. Invalid login shows error', async ({ page }) => {
    await page.fill('[id="email"]', 'wrong@example.com')
    await page.fill('[id="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Неверный email или пароль')).toBeVisible()
  })
})
