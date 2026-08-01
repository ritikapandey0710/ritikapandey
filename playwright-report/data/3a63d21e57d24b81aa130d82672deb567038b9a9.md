# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-management.spec.ts >> User Management (Admin Only) >> should prevent deleting own account
- Location: e2e\tests\user-management.spec.ts:248:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Welcome back, Admin User!')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Welcome back, Admin User!')

```

```yaml
- navigation:
  - link "Help Desk":
    - /url: /
    - img
    - text: Help Desk
  - link "Dashboard":
    - /url: /
  - link "Users":
    - /url: /user
  - text: A
  - paragraph: Admin User
  - paragraph: admin@example.com
  - button "Sign out":
    - img
    - text: Sign out
- text: Admin
- heading "Welcome back, Admin! 👋" [level=1]
- paragraph: admin@example.com
- img
- text: 0 Open Tickets
- img
- text: 0 In Progress
- img
- text: 0 Resolved
- img
- text: 0 Total Tickets
- heading "Quick Actions" [level=2]
- button "New Ticket Create a support request":
  - img
  - paragraph: New Ticket
  - paragraph: Create a support request
- button "View All Tickets Browse your tickets":
  - img
  - paragraph: View All Tickets
  - paragraph: Browse your tickets
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('User Management (Admin Only)', () => {
  4   |   const adminEmail = 'admin@example.com';
  5   |   const adminPassword = 'password123';
  6   | 
  7   |   // Helper to log in as admin
  8   |   async function loginAsAdmin({ page }) {
  9   |     await page.goto('/', { waitUntil: 'networkidle' });
  10  |     await page.waitForTimeout(2000);
  11  | 
  12  |     // Ensure we're on the login page
  13  |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  14  |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  15  | 
  16  |     // Check if we need to switch to sign in form (if we see sign up form elements)
  17  |     const signUpFormIndicator = page.locator('input[placeholder="Full Name"]');
  18  |     if (await signUpFormIndicator.isVisible()) {
  19  |       // We're on sign up form, click to switch to sign in
  20  |       const signInLink = page.locator('text=Sign in');
  21  |       await expect(signInLink).toBeVisible({ timeout: 5000 });
  22  |       await signInLink.click();
  23  |       await page.waitForTimeout(1000);
  24  |     }
  25  | 
  26  |     // Fill in the sign in form
  27  |     await page.locator('input[placeholder="Email"]').fill(adminEmail);
  28  |     await page.locator('input[placeholder="Password"]').fill(adminPassword);
  29  | 
  30  |     // Submit the form
  31  |     await page.click('button[type="submit"]:has-text("Sign in")');
  32  | 
  33  |     // Wait for navigation to home page
  34  |     await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
  35  |     await page.waitForTimeout(2000);
  36  | 
  37  |     // Verify we're logged in as admin
> 38  |     await expect(page.locator(`text=Welcome back, Admin User!`)).toBeVisible({ timeout: 5000 });
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  39  |     // Also check for sign out button
  40  |     await expect(page.locator('button:has-text("Sign out")')).toBeVisible({ timeout: 5000 });
  41  |   }
  42  | 
  43  |   // Helper to navigate to user management page
  44  |   async function goToUserManagement({ page }) {
  45  |     // Assuming there's a link in the navbar or sidebar for user management
  46  |     // Adjust the selector based on your actual UI
  47  |     const userManagementLink = page.locator('nav >> text=User Management').first();
  48  |     await expect(userManagementLink).toBeVisible({ timeout: 5000 });
  49  |     await userManagementLink.click();
  50  |     await page.waitForURL(/.*\/users/, { waitUntil: 'networkidle', timeout: 5000 });
  51  |     await page.waitForTimeout(2000);
  52  |   }
  53  | 
  54  |   test.beforeEach(async ({ page }) => {
  55  |     // Login as admin before each test
  56  |     await loginAsAdmin({ page });
  57  |     // Navigate to user management page
  58  |     await goToUserManagement({ page });
  59  |   });
  60  | 
  61  |   test('should display the user list with admin and agent users', async ({ page }) => {
  62  |     // Wait for the user table to load
  63  |     const userTable = page.locator('table');
  64  |     await expect(userTable).toBeVisible({ timeout: 5000 });
  65  | 
  66  |     // Check for at least the admin user (admin@example.com)
  67  |     await expect(page.locator(`text=${adminEmail}`)).toBeVisible({ timeout: 5000 });
  68  | 
  69  |     // Optionally check for the agent user from seed (agent@example.com)
  70  |     await expect(page.locator('text=agent@example.com')).toBeVisible({ timeout: 5000 });
  71  |   });
  72  | 
  73  |   test('should allow creating a new user via the modal form', async ({ page }) => {
  74  |     // Generate unique email for the test user to avoid conflicts
  75  |     const randomSuffix = Math.random().toString(36).substring(2, 10);
  76  |     const testEmail = `testuser_${randomSuffix}@example.com`;
  77  |     const testName = `Test User ${randomSuffix}`;
  78  |     const testPassword = 'TestPass123!';
  79  | 
  80  |     // Click the "Add User" button (adjust selector based on your UI)
  81  |     const addUserButton = page.locator('button:has-text("Add User")');
  82  |     await expect(addUserButton).toBeVisible({ timeout: 5000 });
  83  |     await addUserButton.click();
  84  | 
  85  |     // Wait for the modal to appear
  86  |     const modal = page.locator('dialog, [role="dialog"]');
  87  |     await expect(modal).toBeVisible({ timeout: 5000 });
  88  | 
  89  |     // Fill in the form
  90  |     await modal.locator('input[placeholder="Full Name"]').fill(testName);
  91  |     await modal.locator('input[placeholder="Email"]').fill(testEmail);
  92  |     await modal.locator('input[placeholder="Password"]').fill(testPassword);
  93  |     // Role dropdown - assuming it's a select or radio buttons
  94  |     // We'll set it to AGENT (default) or leave as default
  95  |     const roleSelect = modal.locator('select, [role="combobox"]');
  96  |     if (await roleSelect.count() > 0) {
  97  |       await roleSelect.selectOption('AGENT');
  98  |     }
  99  | 
  100 |     // Submit the form
  101 |     const submitButton = modal.locator('button[type="submit"]:has-text("Create User"), button:has-text("Add User")');
  102 |     await expect(submitButton).toBeVisible({ timeout: 5000 });
  103 |     await submitButton.click();
  104 | 
  105 |     // Wait for the modal to close
  106 |     await expect(modal).toBeHidden({ timeout: 5000 });
  107 |     await page.waitForTimeout(2000);
  108 | 
  109 |     // Verify the new user appears in the table
  110 |     await expect(page.locator(`text=${testEmail}`)).toBeVisible({ timeout: 5000 });
  111 |     await expect(page.locator(`text=${testName}`)).toBeVisible({ timeout: 5000 });
  112 |     // Verify role is AGENT (if displayed)
  113 |     await expect(page.locator(`text=${testEmail}`)).toBeVisible({ timeout: 5000 });
  114 |     // Assuming role is displayed in a cell, we can check for "AGENT" near the email
  115 |     const userRow = page.locator(`tr:has-text("${testEmail}")`);
  116 |     await expect(userRow).toContainText('AGENT');
  117 |   });
  118 | 
  119 |   test('should allow editing an existing user', async ({ page }) => {
  120 |     // First, create a user to edit (we'll create it via API to avoid UI duplication, but let's do via UI for consistency)
  121 |     // However, to keep the test focused on edit, we'll create a user via UI first, then edit it.
  122 |     // But note: the create test already covers creation. We can rely on that and then edit the same user.
  123 |     // However, to keep tests independent, we'll create a user to edit within this test.
  124 | 
  125 |     const randomSuffix = Math.random().toString(36).substring(2, 10);
  126 |     const originalEmail = `edituser_${randomSuffix}@example.com`;
  127 |     const originalName = `Edit User ${randomSuffix}`;
  128 |     const originalPassword = 'OldPass123!';
  129 | 
  130 |     // Step 1: Create a user via UI (reuse the create logic)
  131 |     const addUserButton = page.locator('button:has-text("Add User")');
  132 |     await addUserButton.click();
  133 |     const modal = page.locator('dialog, [role="dialog"]');
  134 |     await modal.waitFor({ state: 'visible', timeout: 5000 });
  135 |     await modal.locator('input[placeholder="Full Name"]').fill(originalName);
  136 |     await modal.locator('input[placeholder="Email"]').fill(originalEmail);
  137 |     await modal.locator('input[placeholder="Password"]').fill(originalPassword);
  138 |     // Set role to AGENT
```