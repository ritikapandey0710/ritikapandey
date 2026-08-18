# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication System >> should show error when signing in with invalid credentials
- Location: e2e\tests\auth.spec.ts:239:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="Email"]').first()

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - heading "Help Desk" [level=1] [ref=e9]
    - paragraph [ref=e10]: Sign in to your account
  - generic [ref=e11]:
    - heading "Welcome back" [level=2] [ref=e12]
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: Email
        - textbox "Enter your email address" [ref=e16]
      - generic [ref=e17]:
        - generic [ref=e18]: Password
        - textbox "Enter your password" [ref=e19]
      - button "Sign In" [ref=e20]
    - paragraph [ref=e21]:
      - text: Don't have an account?
      - button "Sign up" [ref=e22]
```

# Test source

```ts
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
  236 |     await expect(page.locator('text=Welcome back, ' + name + '!')).toBeVisible({ timeout: 5000 });
  237 |   });
  238 | 
  239 |   test('should show error when signing in with invalid credentials', async ({ page }) => {
  240 |     const email = `wronguser_${randomSeed()}@example.com`;
  241 |     const password = 'WrongPass123!';
  242 | 
  243 |     await page.goto('/', { waitUntil: 'networkidle' });
  244 |     await page.waitForTimeout(2000);
  245 | 
  246 |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  247 |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  248 | 
  249 |     // Fill in the sign in form with wrong credentials
> 250 |     await page.locator('input[placeholder="Email"]').nth(0).fill(email);
      |                                                             ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  251 |     await page.locator('input[placeholder="Password"]').nth(0).fill(password);
  252 | 
  253 |     await page.click('button[type="submit"]:has-text("Sign in")');
  254 | 
  255 |     // Wait for error message
  256 |     await expect(page.locator('.bg-destructive/10')).toContainText(/invalid|incorrect|failed/i);
  257 |   });
  258 | 
  259 |   test('should allow a user to sign out', async ({ page, request }) => {
  260 |     // First, sign up and log in
  261 |     const email = `logoutuser_${randomSeed()}@example.com`;
  262 |     const password = 'LogoutPass123!';
  263 |     const name = 'Logout User';
  264 | 
  265 |     await page.goto('/', { waitUntil: 'networkidle' });
  266 |     await page.waitForTimeout(2000);
  267 | 
  268 |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  269 |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  270 | 
  271 |     const signupLink = page.locator("text=Don't have an account? Sign up");
  272 |     await expect(signupLink).toBeVisible({ timeout: 5000 });
  273 |     await signupLink.click();
  274 | 
  275 |     await page.waitForTimeout(1000);
  276 |     await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });
  277 | 
  278 |     await page.locator('input[placeholder="Full Name"]').fill(name);
  279 |     await page.locator('input[placeholder="Email"]').nth(0).fill(email);
  280 |     await page.locator('input[placeholder="Password"]').nth(0).fill(password);
  281 | 
  282 |     await page.click('button[type="submit"]:has-text("Sign up")');
  283 | 
  284 |     // Wait for successful sign up and redirect to home
  285 |     try {
  286 |       await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
  287 |     } catch (e) {
  288 |       await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
  289 |     }
  290 |     await page.waitForTimeout(2000);
  291 | 
  292 |     // Verify we're logged in
  293 |     await expect(page.locator('text=Welcome back, ' + name + '!')).toBeVisible({ timeout: 5000 });
  294 | 
  295 |     // Now sign out
  296 |     await expect(page.locator('button:has-text("Sign out")')).toBeVisible({ timeout: 5000 });
  297 |     await page.click('button:has-text("Sign out")');
  298 | 
  299 |     // Wait for navigation to login page or for sign out to complete
  300 |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  301 |     // Alternatively, check for login form
  302 |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  303 |   });
  304 | 
  305 |   test('should redirect to login when accessing protected routes while not authenticated', async ({ page }) => {
  306 |     // Try to access the home page (which might be protected) while logged out
  307 |     // We ensure we are logged out in beforeEach, so we can directly go to home
  308 |     await page.goto('/', { waitUntil: 'networkidle' });
  309 |     await page.waitForTimeout(2000);
  310 | 
  311 |     // Should redirect to login page
  312 |     await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
  313 |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  314 |   });
  315 | 
  316 |   test('should allow access to protected routes when authenticated', async ({ page, request }) => {
  317 |     // First, sign up and log in
  318 |     const email = `protecteduser_${randomSeed()}@example.com`;
  319 |     const password = 'ProtectedPass123!';
  320 |     const name = 'Protected User';
  321 | 
  322 |     await page.goto('/', { waitUntil: 'networkidle' });
  323 |     await page.waitForTimeout(2000);
  324 | 
  325 |     await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
  326 |     await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
  327 | 
  328 |     const signupLink = page.locator("text=Don't have an account? Sign up");
  329 |     await expect(signupLink).toBeVisible({ timeout: 5000 });
  330 |     await signupLink.click();
  331 | 
  332 |     await page.waitForTimeout(1000);
  333 |     await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible({ timeout: 5000 });
  334 | 
  335 |     await page.locator('input[placeholder="Full Name"]').fill(name);
  336 |     await page.locator('input[placeholder="Email"]').nth(0).fill(email);
  337 |     await page.locator('input[placeholder="Password"]').nth(0).fill(password);
  338 | 
  339 |     await page.click('button[type="submit"]:has-text("Sign up")');
  340 | 
  341 |     // Wait for successful sign up and redirect to home
  342 |     try {
  343 |       await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
  344 |     } catch (e) {
  345 |       await page.waitForSelector(`text=Welcome back, ${name}!`, { timeout: 10000 });
  346 |     }
  347 |     await page.waitForTimeout(2000);
  348 | 
  349 |     // Verify we're logged in
  350 |     await expect(page.locator('text=Welcome back, ' + name + '!')).toBeVisible({ timeout: 5000 });
```