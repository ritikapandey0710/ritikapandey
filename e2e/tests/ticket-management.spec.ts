import { test, expect } from '@playwright/test';

test.describe('Ticket Management', () => {
  test('authenticated user can open the New Ticket modal and submit a ticket', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    await page.fill('input[placeholder="Email"]', 'admin@example.com');
    await page.fill('input[placeholder="Password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });

    await page.goto('/tickets', { waitUntil: 'networkidle' });

    await page.click('button:has-text("New Ticket")');
    await expect(page.locator('h2:has-text("New Ticket")')).toBeVisible();

    await page.fill('input[placeholder="Describe the issue briefly"]', 'E2E test ticket');
    await page.fill('input[placeholder="John Doe"]', 'E2E User');
    await page.fill('input[placeholder="john@example.com"]', 'e2e@example.com');

    await page.click('button:has-text("Create Ticket")');

    await expect(page.locator('h2:has-text("New Ticket")')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=E2E test ticket')).toBeVisible({ timeout: 5000 });
  });
});
