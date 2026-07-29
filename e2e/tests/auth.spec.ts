import { test, expect } from '@playwright/test';

test.describe('Authentication System', () => {
  // Helper function to generate random strings for unique test data
  const randomSeed = () => Math.random().toString(36).substring(2, 10);

  // Helper to log out if currently logged in
  async function ensureLoggedOut({ page, request }) {
    // Check if we're logged in by looking for user-specific elements
    const isLoggedIn = await page.locator('text=Sign out').isVisible()
      || await page.locator('nav >> text=/@/').isVisible()
      || await page.locator('text=Welcome back,').isVisible();

    if (isLoggedIn) {
      // Try to log out via UI first
      try {
        await page.click('button:has-text("Sign out")');
        await page.waitForTimeout(1000);
      } catch (e) {
        // Fallback to API logout
        try {
          await request.post('/api/auth/signout');
          await page.waitForTimeout(1000);
        } catch (apiErr) {
          console.log('API logout also failed:', apiErr.message);
        }
      }
      // Reload to clear state
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }
  }

  test.beforeEach(async ({ page, request }) => {
    // Ensure we start from a logged-out state for each test
    await ensureLoggedOut({ page, request });
  });

  test('should allow a user to sign up with valid credentials', async ({ page, request }) => {
    const email = `testuser_${randomSeed()}@example.com`;
    const password = 'SecurePass123!';
    const name = `Test User ${randomSeed()}`;

    // Start at home page (will redirect to login if not authenticated)
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Ensure we're on the login page
    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    // Click on the "Sign up" link
    const signupLink = page.locator("text=Don't have an account? Sign up");
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    await signupLink.click();

    // Wait for the form to switch to signup mode
    await page.waitForTimeout(1000);
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });

    // Fill in the sign up form
    await page.locator('input[placeholder="Full Name"]').fill(name);
    await page.locator('input[placeholder="Email"]').nth(0).fill(email);
    await page.locator('input[placeholder="Password"]').nth(0).fill(password);

    // Submit the form
    await page.click('button[type="submit"]:has-text("Sign up")');

    // Wait for navigation to home page
    try {
      await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      // Fallback: wait for welcome message to appear
      await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
    }
    await page.waitForTimeout(2000);

    // Verify we're logged in by looking for welcome message
    await expect(page.locator('text=Welcome back, ' + name + '!')).toBeVisible({ timeout: 5000 });

    // Optional: Verify via API that the user exists
    const usersResponse = await request.get(`/api/users?email=${encodeURIComponent(email)}`);
    // Note: This endpoint might not exist or might be protected; adjust based on actual API
    // For now, we'll just check that the UI reflects logged-in state
  });

  test('should show error when signing up with invalid email', async ({ page }) => {
    const email = 'invalid-email';
    const password = 'ValidPass123!';
    const name = 'Test User';

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    const signupLink = page.locator("text=Don't have an account? Sign up");
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    await signupLink.click();

    await page.waitForTimeout(1000);
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder="Full Name"]').fill(name);
    await page.locator('input[placeholder="Email"]').nth(0).fill(email);
    await page.locator('input[placeholder="Password"]').nth(0).fill(password);

    await page.click('button[type="submit"]:has-text("Sign up")');

    // Wait for error message to appear
    await expect(page.locator('text=Sign up failed')).toBeVisible({ timeout: 5000 });
    // Alternatively, look for the error div
    await expect(page.locator('.bg-destructive/10')).toContainText(/invalid|email/i);
  });

  test('should show error when signing up with existing email', async ({ page, request }) => {
    // First, create a user via API (if available) or via UI
    const email = `existing_${randomSeed()}@example.com`;
    const password = 'ExistingPass123!';
    const name = 'Existing User';

    // We'll sign up via UI first to create the user
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    const signupLink = page.locator("text=Don't have an account? Sign up");
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    await signupLink.click();

    await page.waitForTimeout(1000);
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder="Full Name"]').fill(name);
    await page.locator('input[placeholder="Email"]').nth(0).fill(email);
    await page.locator('input[placeholder="Password"]').nth(0).fill(password);

    await page.click('button[type="submit"]:has-text("Sign up")');

    // Wait for successful sign up and redirect to home
    try {
      await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
    }
    await page.waitForTimeout(2000);

    // Now log out to clear the session
    await page.click('button:has-text("Sign out")');
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Now attempt to sign up again with the same email
    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    const signupLink2 = page.locator("text=Don't have an account? Sign up");
    await expect(signupLink2).toBeVisible({ timeout: 5000 });
    await signupLink2.click();

    await page.waitForTimeout(1000);
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder="Full Name"]').fill(name + ' 2');
    await page.locator('input[placeholder="Email"]').nth(0).fill(email); // Same email
    await page.locator('input[placeholder="Password"]').nth(0).fill('AnotherPass123!');

    await page.click('button[type="submit"]:has-text("Sign up")');

    // Wait for error message
    await expect(page.locator('.bg-destructive/10')).toContainText(/already exists|taken/i);
  });

  test('should allow a user to sign in with valid credentials', async ({ page, request }) => {
    // First, create a user via sign up
    const email = `signinuser_${randomSeed()}@example.com`;
    const password = 'SignInPass123!';
    const name = 'Sign In User';

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    const signupLink = page.locator("text=Don't have an account? Sign up");
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    await signupLink.click();

    await page.waitForTimeout(1000);
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder="Full Name"]').fill(name);
    await page.locator('input[placeholder="Email"]').nth(0).fill(email);
    await page.locator('input[placeholder="Password"]').nth(0).fill(password);

    await page.click('button[type="submit"]:has-text("Sign up")');

    // Wait for successful sign up and redirect to home
    try {
      await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
    }
    await page.waitForTimeout(2000);

    // Log out to test sign in separately
    await page.click('button:has-text("Sign out")');
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Now test sign in
    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    // Fill in the sign in form (login view)
    await page.locator('input[placeholder="Email"]').nth(0).fill(email);
    await page.locator('input[placeholder="Password"]').nth(0).fill(password);

    await page.click('button[type="submit"]:has-text("Sign in")');

    // Wait for navigation to home page
    try {
      await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
    }
    await page.waitForTimeout(2000);

    // Verify we're logged in
    await expect(page.locator('text=Welcome back, ' + name + '!')).toBeVisible({ timeout: 5000 });
  });

  test('should show error when signing in with invalid credentials', async ({ page }) => {
    const email = `wronguser_${randomSeed()}@example.com`;
    const password = 'WrongPass123!';

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    // Fill in the sign in form with wrong credentials
    await page.locator('input[placeholder="Email"]').nth(0).fill(email);
    await page.locator('input[placeholder="Password"]').nth(0).fill(password);

    await page.click('button[type="submit"]:has-text("Sign in")');

    // Wait for error message
    await expect(page.locator('.bg-destructive/10')).toContainText(/invalid|incorrect|failed/i);
  });

  test('should allow a user to sign out', async ({ page, request }) => {
    // First, sign up and log in
    const email = `logoutuser_${randomSeed()}@example.com`;
    const password = 'LogoutPass123!';
    const name = 'Logout User';

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    const signupLink = page.locator("text=Don't have an account? Sign up");
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    await signupLink.click();

    await page.waitForTimeout(1000);
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder="Full Name"]').fill(name);
    await page.locator('input[placeholder="Email"]').nth(0).fill(email);
    await page.locator('input[placeholder="Password"]').nth(0).fill(password);

    await page.click('button[type="submit"]:has-text("Sign up")');

    // Wait for successful sign up and redirect to home
    try {
      await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
    }
    await page.waitForTimeout(2000);

    // Verify we're logged in
    await expect(page.locator('text=Welcome back, ' + name + '!')).toBeVisible({ timeout: 5000 });

    // Now sign out
    await expect(page.locator('button:has-text("Sign out")')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Sign out")');

    // Wait for navigation to login page or for sign out to complete
    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    // Alternatively, check for login form
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to login when accessing protected routes while not authenticated', async ({ page }) => {
    // Try to access the home page (which might be protected) while logged out
    // We ensure we are logged out in beforeEach, so we can directly go to home
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  });

  test('should allow access to protected routes when authenticated', async ({ page, request }) => {
    // First, sign up and log in
    const email = `protecteduser_${randomSeed()}@example.com`;
    const password = 'ProtectedPass123!';
    const name = 'Protected User';

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    const signupLink = page.locator("text=Don't have an account? Sign up");
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    await signupLink.click();

    await page.waitForTimeout(1000);
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder="Full Name"]').fill(name);
    await page.locator('input[placeholder="Email"]').nth(0).fill(email);
    await page.locator('input[placeholder="Password"]').nth(0).fill(password);

    await page.click('button[type="submit"]:has-text("Sign up")');

    // Wait for successful sign up and redirect to home
    try {
      await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
    }
    await page.waitForTimeout(2000);

    // Verify we're logged in
    await expect(page.locator('text=Welcome back, ' + name + '!')).toBeVisible({ timeout: 5000 });

    // Now try to access a protected route, e.g., the home page (which should be accessible)
    // We are already on home, so let's try to go to another page if exists, or refresh home
    // For simplicity, we'll just verify that we are on home and the content is visible
    await expect(page.locator('text=Welcome back, ' + name + '!')).toBeVisible({ timeout: 5000 });
    // Additionally, we can check for an element that is only visible when logged in, like the sign out button
    await expect(page.locator('button:has-text("Sign out")')).toBeVisible({ timeout: 5000 });
  });
});