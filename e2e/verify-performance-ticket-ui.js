const { chromium } = require('@playwright/test');

const TICKET_ID = '6e873670-9c33-4ce5-ae10-95c850bf03c8';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const report = {};

  try {
    console.log('\n=== STEP 1: Login as admin ===');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="Enter your email address"]', ADMIN_EMAIL);
    await page.fill('input[placeholder="Enter your password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('  Logged in');

    console.log('\n=== STEP 2: Navigate to TicketDetailsPage ===');
    await page.goto(`http://localhost:5173/tickets/${TICKET_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log('  Navigated to ticket details');

    console.log('\n=== STEP 3: Verify ticket information ===');
    const titleHeading = page.locator('h2').first();
    const titleText = await titleHeading.textContent();
    console.log(`  Title in h2: "${titleText?.trim()}"`);
    report['Title'] = titleText?.trim() || '';

    const statusText = await page.locator('text=Resolved').first().isVisible().catch(() => false);
    console.log(`  Resolved status visible: ${statusText}`);
    report['Status Resolved'] = statusText ? 'YES' : 'NO';

    const categoryText = await page.locator('text=Technical Question').first().isVisible().catch(() => false);
    console.log(`  Category "Technical Question" visible: ${categoryText}`);
    report['Category'] = categoryText ? 'Technical Question' : 'NOT FOUND';

    const senderText = await page.locator('text=Test Customer').first().isVisible().catch(() => false);
    console.log(`  Sender "Test Customer" visible: ${senderText}`);
    report['Sender'] = senderText ? 'Test Customer' : 'NOT FOUND';

    const descVisible = await page.locator('text=/loading very slowly/i').first().isVisible().catch(() => false);
    console.log(`  Description text visible: ${descVisible}`);
    report['Description'] = descVisible ? 'Visible' : 'NOT FOUND';

    console.log('\n=== STEP 4: Verify conversation ===');
    const repliesHeader = await page.locator('h3:has-text("Replies")').first().isVisible().catch(() => false);
    console.log(`  Replies section visible: ${repliesHeader}`);
    report['Replies Section'] = repliesHeader ? 'Visible' : 'NOT FOUND';

    const agentText = await page.locator('text=Agent').first().isVisible().catch(() => false);
    console.log(`  Agent label visible: ${agentText}`);
    report['Agent Reply'] = agentText ? 'Visible' : 'NOT FOUND';

    const botText = await page.locator('text=Support Bot').first().isVisible().catch(() => false);
    console.log(`  Support Bot visible: ${botText}`);
    report['Agent Author'] = botText ? 'Support Bot' : 'NOT FOUND';

    const customerText = await page.locator('text=Customer').first().isVisible().catch(() => false);
    console.log(`  Customer label visible: ${customerText}`);
    report['Customer Reply'] = customerText ? 'Visible' : 'NOT FOUND';

    console.log('\n=== STEP 5: Verify AI Summary button ===');
    try {
      const summarizeButton = page.getByRole('button', { name: /summarize/i });
      const isVisible = await summarizeButton.isVisible({ timeout: 10000 });
      console.log(`  Summarize button visible: ${isVisible}`);
      report['Summarize Button'] = isVisible ? 'Visible' : 'NOT FOUND';
    } catch (e) {
      console.log(`  Summarize button NOT found: ${e.message}`);
      report['Summarize Button'] = 'NOT FOUND';
    }

    console.log('\n=== UI VERIFICATION COMPLETE ===');
    console.log('\n=== UI VERIFICATION REPORT ===');
    for (const [key, value] of Object.entries(report)) {
      console.log(`  ${key}: ${value}`);
    }
  } catch (err) {
    console.error('Verification script error:', err);
    await page.screenshot({ path: 'ui-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();