const { chromium } = require('@playwright/test');

const TICKET_ID = '6e873670-9c33-4ce5-ae10-95c850bf03c8';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('\n=== LOGIN ===');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="Enter your email address"]', ADMIN_EMAIL);
    await page.fill('input[placeholder="Enter your password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('Logged in');

    console.log('\n=== NAVIGATE TO TICKET ===');
    await page.goto(`http://localhost:5173/tickets/${TICKET_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    console.log('\n=== DUMP PAGE TEXT CONTENT ===');
    const bodyText = await page.locator('body').innerText();
    console.log(bodyText);

    console.log('\n=== ALL BUTTONS ===');
    const buttons = await page.locator('button').allTextContents();
    buttons.forEach((b, i) => console.log(`  ${i}: ${b.trim()}`));

    console.log('\n=== ALL h3 HEADINGS ===');
    const h3s = await page.locator('h3').allTextContents();
    h3s.forEach((h, i) => console.log(`  ${i}: ${h.trim()}`));

    console.log('\n=== REPLIES SECTION ===');
    const replySection = page.locator('.space-y-6');
    const replyCount = await replySection.locator('> div').count();
    console.log(`  Reply bubbles: ${replyCount}`);
    for (let i = 0; i < replyCount; i++) {
      const bubble = replySection.locator('> div').nth(i);
      const text = await bubble.innerText();
      console.log(`  Reply ${i}: ${text.substring(0, 200)}...`);
    }
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'debug-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();