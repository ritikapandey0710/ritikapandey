# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ticket-management.spec.ts >> Ticket Management >> authenticated user can open the New Ticket modal and submit a ticket
- Location: e2e\tests\ticket-management.spec.ts:4:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="Email"]')

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - heading "Help Desk" [level=1] [ref=e12]
    - paragraph [ref=e13]: Sign in to your account
  - generic [ref=e14]:
    - heading "Welcome back" [level=2] [ref=e15]
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]: Email
        - textbox "Enter your email address" [ref=e19]
      - generic [ref=e20]:
        - generic [ref=e21]: Password
        - textbox "Enter your password" [ref=e22]
      - button "Sign In" [ref=e23]
    - paragraph [ref=e24]:
      - text: Don't have an account?
      - button "Sign up" [ref=e25]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Ticket Management', () => {
  4  |   test('authenticated user can open the New Ticket modal and submit a ticket', async ({ page }) => {
  5  |     await page.goto('/login', { waitUntil: 'networkidle' });
  6  | 
> 7  |     await page.fill('input[placeholder="Email"]', 'admin@example.com');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  8  |     await page.fill('input[placeholder="Password"]', 'password123');
  9  |     await page.click('button[type="submit"]');
  10 | 
  11 |     await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
  12 | 
  13 |     await page.goto('/tickets', { waitUntil: 'networkidle' });
  14 | 
  15 |     await page.click('button:has-text("New Ticket")');
  16 |     await expect(page.locator('h2:has-text("New Ticket")')).toBeVisible();
  17 | 
  18 |     await page.fill('input[placeholder="Describe the issue briefly"]', 'E2E test ticket');
  19 |     await page.fill('input[placeholder="John Doe"]', 'E2E User');
  20 |     await page.fill('input[placeholder="john@example.com"]', 'e2e@example.com');
  21 | 
  22 |     await page.click('button:has-text("Create Ticket")');
  23 | 
  24 |     await expect(page.locator('h2:has-text("New Ticket")')).not.toBeVisible({ timeout: 5000 });
  25 |     await expect(page.locator('text=E2E test ticket')).toBeVisible({ timeout: 5000 });
  26 |   });
  27 | });
  28 | 
```