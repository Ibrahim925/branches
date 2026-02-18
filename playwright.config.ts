import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const shouldStartLocalServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'webkit-iphone',
      use: {
        ...devices['iPhone 14'],
      },
    },
  ],
  webServer: shouldStartLocalServer
    ? {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
