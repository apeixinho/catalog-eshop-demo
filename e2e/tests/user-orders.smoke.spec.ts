import { test, expect } from '@playwright/test';

test.describe('Shopper smoke', () => {
  test('user login → products → account orders', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('link', { name: 'Catalog' })).toBeVisible();

    await page.locator('.account-menu').hover();
    await page.getByRole('menuitem', { name: 'Sign in' }).click();

    await page.waitForURL(/localhost:9000/);
    await page.locator('#username').fill('user');
    await page.locator('#password').fill('password');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/localhost:4200/);
    await expect(page.getByRole('link', { name: 'Catalog' })).toBeVisible();

    await page.goto('/account/orders');
    await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
    await expect(
      page.getByText(/You have no orders yet|Loading orders/),
    ).toBeVisible();
  });
});
