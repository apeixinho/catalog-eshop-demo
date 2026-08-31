import { test, expect } from '@playwright/test';

/** SPA defaults to Portugal (PT); pin US English so copy matches stable selectors. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('catalog.locale.country', 'US');
  });
});

test.describe('Shopper smoke', () => {
  test('user login → products → account orders', async ({ page }) => {
    await page.goto('/products', { waitUntil: 'networkidle' });
    await expect(page.locator('a.brand')).toBeVisible();

    await page.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', { name: 'Sign in' }).click();

    await page.waitForURL(/localhost:9000/);
    await page.locator('#username').fill('user');
    await page.locator('#password').fill('password');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/localhost:4200/);
    await expect(page.locator('a.brand')).toBeVisible();

    await page.goto('/account/orders', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
    await expect(
      page.getByText(/You have no orders yet|Loading orders/),
    ).toBeVisible();
  });
});
