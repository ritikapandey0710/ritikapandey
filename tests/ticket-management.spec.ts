import { test, expect } from '@playwright/test';

test.describe('Ticket Management', () => {
  test('should allow a user to sign up, create a ticket, and retrieve it', async ({ page, request }) => {
    // Generate random strings for email and name to avoid conflicts
    const randomSeed = Math.random().toString(36).substring(2, 10);
    const email = `testuser_${randomSeed}@example.com`;
    const password = 'SecurePass123!';
    const name = `Test User ${randomSeed}`;

    // Start at home page
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if we're already logged in
    const isLoggedIn = await page.locator('text=Welcome back,').isVisible() ||
                      await page.locator('text=Sign out').isVisible() ||
                      await page.locator('nav >> text=/@/').isVisible();

    if (isLoggedIn) {
      // Try to log out
      try {
        await page.click('button:has-text("Sign out")');
        await page.waitForTimeout(1000);
      } catch (e) {
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

    // Ensure we're on the login page
    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });

    // Verify we're on the login page (showing sign in form)
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    // Click on the "Sign up" text in the "Don't have an account? Sign up" line
    // We can target this by looking for the text that comes after "Don't have an account? "
    const signupLink = page.locator("text=Don't have an account? Sign up");
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    console.log('Clicking the signup link...');
    await signupLink.click();

    // Wait for the form to switch to signup mode
    // Based on our earlier debugging, after clicking we should see:
    // - H2 text change from "Welcome back" to "Get started"
    // - Input placeholders change to: "Full Name", "Email", "Password"
    await page.waitForTimeout(1000);

    // Verify we're now in signup mode by checking for the "Full Name" input
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });

    // Fill in the sign up form
    // Based on our debugging, the placeholders in signup mode are:
    await page.locator('input[placeholder="Full Name"]').fill(name);
    await page.locator('input[placeholder="Email"]').nth(0).fill(email); // First "Email" input
    await page.locator('input[placeholder="Password"]').nth(0).fill(password); // First "Password" input

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

    // Now we are logged in. Let's create a ticket via the API.
    const newTicket = {
      title: 'Test Ticket ' + randomSeed,
      description: 'This is a test ticket created via E2E test',
      status: 'OPEN',
      priority: 'HIGH'
    };

    // Create the ticket
    const createResponse = await request.post('/api/tickets', {
      data: newTicket
    });
    expect(createResponse.ok()).toBeTruthy();
    const createdTicket = await createResponse.json();
    expect(createdTicket).toHaveProperty('id');
    expect(createdTicket.title).toBe(newTicket.title);

    // Fetch the list of tickets to verify the ticket appears
    const getResponse = await request.get('/api/tickets');
    expect(getResponse.ok()).toBeTruthy();
    const tickets = await getResponse.json();
    expect(Array.isArray(tickets)).toBeTruthy();
    const foundTicket = tickets.find((t: any) => t.id === createdTicket.id);
    expect(foundTicket).toBeTruthy();
    expect(foundTicket?.title).toBe(newTicket.title);

    console.log('Test completed successfully');
  });
});