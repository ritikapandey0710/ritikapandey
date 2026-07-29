# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication System >> should allow a user to sign up with valid credentials
- Location: tests\auth.spec.ts:39:7

# Error details

```
Error: page.goto: NS_ERROR_CONNECTION_REFUSED
Call log:
  - navigating to "http://localhost:5173/", waiting until "networkidle"

```

# Page snapshot

```yaml
- article [ref=e3]:
  - generic [ref=e6]:
    - heading "Unable to connect" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - text: Nightly can’t connect to the server at
      - strong [ref=e9]: localhost:5173
    - generic [ref=e10]:
      - heading "What can you do about it?" [level=3] [ref=e11]
      - list [ref=e12]:
        - listitem [ref=e13]: The site could be temporarily unavailable or too busy. Try again in a few moments.
        - listitem [ref=e14]: If you are unable to load any pages, check your computer’s network connection.
        - listitem [ref=e15]: If your computer or network is protected by a firewall or proxy, make sure that Nightly is permitted to access the web.
    - button [ref=e18]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Authentication System', () => {
  4   |   // Helper function to generate random strings for unique test data
  5   |   const randomSeed = () => Math.random().toString(36).substring(2, 10);
  6   | 
  7   |   // Helper to log out if currently logged in
  8   |   async function ensureLoggedOut({ page, request }) {
  9   |     // Check if we're logged in by looking for user-specific elements
  10  |     const isLoggedIn = await page.locator('text=Sign out').isVisible()
  11  |       || await page.locator('nav >> text=/@/').isVisible()
  12  |       || await page.locator('text=Welcome back,').isVisible();
  13  | 
  14  |     if (isLoggedIn) {
  15  |       // Try to log out via UI first
  16  |       try {
  17  |         await page.click('button:has-text("Sign out")');
  18  |         await page.waitForTimeout(1000);
  19  |       } catch (e) {
  20  |         // Fallback to API logout
  21  |         try {
  22  |           await request.post('/api/auth/signout');
  23  |           await page.waitForTimeout(1000);
  24  |         } catch (apiErr) {
  25  |           console.log('API logout also failed:', apiErr.message);
  26  |         }
  27  |       }
  28  |       // Reload to clear state
  29  |       await page.reload({ waitUntil: 'networkidle' });
  30  |       await page.waitForTimeout(2000);
  31  |     }
  32  |   }
  33  | 
  34  |   test.beforeEach(async ({ page, request }) => {
  35  |     // Ensure we start from a logged-out state for each test
  36  |     await ensureLoggedOut({ page, request });
  37  |   });
  38  | 
  39  |   test('should allow a user to sign up with valid credentials', async ({ page, request }) => {
  40  |     const email = `testuser_${randomSeed()}@example.com`;
  41  |     const password = 'SecurePass123!';
  42  |     const name = `Test User ${randomSeed()}`;
  43  | 
  44  |     // Start at home page (will redirect to login if not authenticated)
> 45  |     await page.goto('/', { waitUntil: 'networkidle' });
      |                ^ Error: page.goto: NS_ERROR_CONNECTION_REFUSED
  46  |     await page.waitForTimeout(2000);
  47  | 
  48  |     // Ensure we're on the login page
  49  |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  50  |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  51  | 
  52  |     // Click on the "Sign up" link
  53  |     const signupLink = page.locator("text=Don't have an account? Sign up");
  54  |     await expect(signupLink).toBeVisible({ timeout: 5000 });
  55  |     await signupLink.click();
  56  | 
  57  |     // Wait for the form to switch to signup mode
  58  |     await page.waitForTimeout(1000);
  59  |     await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });
  60  | 
  61  |     // Fill in the sign up form
  62  |     await page.locator('input[placeholder="Full Name"]').fill(name);
  63  |     await page.locator('input[placeholder="Email"]').nth(0).fill(email);
  64  |     await page.locator('input[placeholder="Password"]').nth(0).fill(password);
  65  | 
  66  |     // Submit the form
  67  |     await page.click('button[type="submit"]:has-text("Sign up")');
  68  | 
  69  |     // Wait for navigation to home page
  70  |     try {
  71  |       await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
  72  |     } catch (e) {
  73  |       // Fallback: wait for welcome message to appear
  74  |       await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
  75  |     }
  76  |     await page.waitForTimeout(2000);
  77  | 
  78  |     // Verify we're logged in by looking for welcome message
  79  |     await expect(page.locator('text=Welcome back, ' + name + '!')).toBeVisible({ timeout: 5000 });
  80  | 
  81  |     // Optional: Verify via API that the user exists
  82  |     const usersResponse = await request.get(`/api/users?email=${encodeURIComponent(email)}`);
  83  |     // Note: This endpoint might not exist or might be protected; adjust based on actual API
  84  |     // For now, we'll just check that the UI reflects logged-in state
  85  |   });
  86  | 
  87  |   test('should show error when signing up with invalid email', async ({ page }) => {
  88  |     const email = 'invalid-email';
  89  |     const password = 'ValidPass123!';
  90  |     const name = 'Test User';
  91  | 
  92  |     await page.goto('/', { waitUntil: 'networkidle' });
  93  |     await page.waitForTimeout(2000);
  94  | 
  95  |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  96  |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  97  | 
  98  |     const signupLink = page.locator("text=Don't have an account? Sign up");
  99  |     await expect(signupLink).toBeVisible({ timeout: 5000 });
  100 |     await signupLink.click();
  101 | 
  102 |     await page.waitForTimeout(1000);
  103 |     await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });
  104 | 
  105 |     await page.locator('input[placeholder="Full Name"]').fill(name);
  106 |     await page.locator('input[placeholder="Email"]').nth(0).fill(email);
  107 |     await page.locator('input[placeholder="Password"]').nth(0).fill(password);
  108 | 
  109 |     await page.click('button[type="submit"]:has-text("Sign up")');
  110 | 
  111 |     // Wait for error message to appear
  112 |     await expect(page.locator('text=Sign up failed')).toBeVisible({ timeout: 5000 });
  113 |     // Alternatively, look for the error div
  114 |     await expect(page.locator('.bg-destructive/10')).toContainText(/invalid|email/i);
  115 |   });
  116 | 
  117 |   test('should show error when signing up with existing email', async ({ page, request }) => {
  118 |     // First, create a user via API (if available) or via UI
  119 |     const email = `existing_${randomSeed()}@example.com`;
  120 |     const password = 'ExistingPass123!';
  121 |     const name = 'Existing User';
  122 | 
  123 |     // We'll sign up via UI first to create the user
  124 |     await page.goto('/', { waitUntil: 'networkidle' });
  125 |     await page.waitForTimeout(2000);
  126 | 
  127 |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  128 |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  129 | 
  130 |     const signupLink = page.locator("text=Don't have an account? Sign up");
  131 |     await expect(signupLink).toBeVisible({ timeout: 5000 });
  132 |     await signupLink.click();
  133 | 
  134 |     await page.waitForTimeout(1000);
  135 |     await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });
  136 | 
  137 |     await page.locator('input[placeholder="Full Name"]').fill(name);
  138 |     await page.locator('input[placeholder="Email"]').nth(0).fill(email);
  139 |     await page.locator('input[placeholder="Password"]').nth(0).fill(password);
  140 | 
  141 |     await page.click('button[type="submit"]:has-text("Sign up")');
  142 | 
  143 |     // Wait for successful sign up and redirect to home
  144 |     try {
  145 |       await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
```