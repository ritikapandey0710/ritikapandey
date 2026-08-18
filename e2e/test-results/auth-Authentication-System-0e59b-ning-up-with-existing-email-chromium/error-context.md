# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication System >> should show error when signing up with existing email
- Location: e2e\tests\auth.spec.ts:117:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[placeholder="Full Name"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[placeholder="Full Name"]')

```

```yaml
- heading "Help Desk" [level=1]
- paragraph: Sign in to your account
- heading "Welcome back" [level=2]
- text: Email
- textbox "Enter your email address"
- text: Password
- textbox "Enter your password"
- button "Sign In"
- paragraph:
  - text: Don't have an account?
  - button "Sign up"
```

# Test source

```ts
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
  45  |     await page.goto('/', { waitUntil: 'networkidle' });
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
> 135 |     await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
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
  146 |     } catch (e) {
  147 |       await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
  148 |     }
  149 |     await page.waitForTimeout(2000);
  150 | 
  151 |     // Now log out to clear the session
  152 |     await page.click('button:has-text("Sign out")');
  153 |     await page.waitForTimeout(1000);
  154 |     await page.reload({ waitUntil: 'networkidle' });
  155 |     await page.waitForTimeout(2000);
  156 | 
  157 |     // Now attempt to sign up again with the same email
  158 |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  159 |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  160 | 
  161 |     const signupLink2 = page.locator("text=Don't have an account? Sign up");
  162 |     await expect(signupLink2).toBeVisible({ timeout: 5000 });
  163 |     await signupLink2.click();
  164 | 
  165 |     await page.waitForTimeout(1000);
  166 |     await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });
  167 | 
  168 |     await page.locator('input[placeholder="Full Name"]').fill(name + ' 2');
  169 |     await page.locator('input[placeholder="Email"]').nth(0).fill(email); // Same email
  170 |     await page.locator('input[placeholder="Password"]').nth(0).fill('AnotherPass123!');
  171 | 
  172 |     await page.click('button[type="submit"]:has-text("Sign up")');
  173 | 
  174 |     // Wait for error message
  175 |     await expect(page.locator('.bg-destructive/10')).toContainText(/already exists|taken/i);
  176 |   });
  177 | 
  178 |   test('should allow a user to sign in with valid credentials', async ({ page, request }) => {
  179 |     // First, create a user via sign up
  180 |     const email = `signinuser_${randomSeed()}@example.com`;
  181 |     const password = 'SignInPass123!';
  182 |     const name = 'Sign In User';
  183 | 
  184 |     await page.goto('/', { waitUntil: 'networkidle' });
  185 |     await page.waitForTimeout(2000);
  186 | 
  187 |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  188 |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  189 | 
  190 |     const signupLink = page.locator("text=Don't have an account? Sign up");
  191 |     await expect(signupLink).toBeVisible({ timeout: 5000 });
  192 |     await signupLink.click();
  193 | 
  194 |     await page.waitForTimeout(1000);
  195 |     await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });
  196 | 
  197 |     await page.locator('input[placeholder="Full Name"]').fill(name);
  198 |     await page.locator('input[placeholder="Email"]').nth(0).fill(email);
  199 |     await page.locator('input[placeholder="Password"]').nth(0).fill(password);
  200 | 
  201 |     await page.click('button[type="submit"]:has-text("Sign up")');
  202 | 
  203 |     // Wait for successful sign up and redirect to home
  204 |     try {
  205 |       await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
  206 |     } catch (e) {
  207 |       await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
  208 |     }
  209 |     await page.waitForTimeout(2000);
  210 | 
  211 |     // Log out to test sign in separately
  212 |     await page.click('button:has-text("Sign out")');
  213 |     await page.waitForTimeout(1000);
  214 |     await page.reload({ waitUntil: 'networkidle' });
  215 |     await page.waitForTimeout(2000);
  216 | 
  217 |     // Now test sign in
  218 |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  219 |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  220 | 
  221 |     // Fill in the sign in form (login view)
  222 |     await page.locator('input[placeholder="Email"]').nth(0).fill(email);
  223 |     await page.locator('input[placeholder="Password"]').nth(0).fill(password);
  224 | 
  225 |     await page.click('button[type="submit"]:has-text("Sign in")');
  226 | 
  227 |     // Wait for navigation to home page
  228 |     try {
  229 |       await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
  230 |     } catch (e) {
  231 |       await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
  232 |     }
  233 |     await page.waitForTimeout(2000);
  234 | 
  235 |     // Verify we're logged in
```