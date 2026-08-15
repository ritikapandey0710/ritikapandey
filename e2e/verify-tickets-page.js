const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('PAGE ERROR: ' + err.message));

  // Set the admin session cookies (from auth_cookies2.txt)
  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: 'sLzfJNYj05ujZ3ZNLoP50IEuXPK2gDvI.xLwvoRsBlhOTJsU1ub30qRf7oUoo4WCkyje0nGyY9dk%3D',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'better-auth.session_data',
      value: 'eyJzZXNzaW9uIjp7InNlc3Npb24iOnsiZXhwaXJlc0F0IjoiMjAyNi0wOS0xMlQxMzoyMzo1Ny42ODJaIiwidG9rZW4iOiJzTHpmSk5ZajA1dWpaM1pOTG9QNTBJRXVYUEsyZ0R2SSIsImNyZWF0ZWRBdCI6IjIwMjYtMDgtMTNUMTM6MjM6NTcuNjgyWiIsInVwZGF0ZWRBdCI6IjIwMjYtMDgtMTNUMTM6MjM6NTcuNjgyWiIsImlwQWRkcmVzcyI6IiIsInVzZXJBZ2VudCI6ImN1cmwvOC4yMS4wIiwidXNlcklkIjoidUkzek54eGpFdU1TRUk4NWdZSU5jcVZBcno1ZTJKQlAiLCJpZCI6IktmUUdoSWxSSHZQakg5cFBIZ0lxZFhHYTZzY0l6UzZGIn0sInVzZXIiOnsibmFtZSI6IkFkbWluIFVzZXIiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiZW1haWxWZXJpZmllZCI6dHJ1ZSwiaW1hZ2UiOm51bGwsImNyZWF0ZWRBdCI6IjIwMjYtMDgtMTNUMTI6NTE6MDcuNzU2WiIsInVwZGF0ZWRBdCI6IjIwMjYtMDgtMTNUMTI6NTE6MDcuODEwWiIsInJvbGUiOiJBRE1JTiIsImlkIjoidUkzek54eGpFdU1TRUk4NWdZSU5jcVZBcno1ZTJKQlAifSwidXBkYXRlZEF0IjoxNzg2NjI3NDM3Njg5LCJ2ZXJzaW9uIjoiMSJ9LCJleHBpcmVzQXQiOjE3ODY2Mjc3Mzc2ODksInNpZ25hdHVyZSI6InZWbXEzYzl3T1NHaHZ3ME9TYzZGNVZZcWtjczF6YVRYS012OTh4N2NOcG8ifQ',
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.goto('http://localhost:5173/tickets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const url = page.url();
  const bodyText = await page.textContent('body');
  const hasTicketsHeading = bodyText.includes('Tickets');
  const hasTable = await page.locator('table').count();
  const hasRows = await page.locator('tbody tr').count();

  console.log('URL:', url);
  console.log('Has "Tickets" text:', hasTicketsHeading);
  console.log('Table count:', hasTable);
  console.log('Table row count:', hasRows);
  console.log('Console errors:', JSON.stringify(consoleErrors, null, 2));

  await browser.close();
})();