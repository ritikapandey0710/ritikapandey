const { defineConfig, devices } = require('@playwright/test');
const { config: dotenvConfig } = require('dotenv');
const { resolve } = require('path');

// Load environment variables from .env.test in the server directory
dotenvConfig({ path: __dirname + '/server/.env.test' });

module.exports = defineConfig({
  testDir: './e2e/tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  // Set the output directory for test results (like HTML report, etc.) to be under e2e
  outputDir: './e2e/test-results',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});