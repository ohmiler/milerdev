import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const APP_BASE_URL = 'http://127.0.0.1:3100';
const serverNetworkGuardUrl = pathToFileURL(
  path.resolve('e2e/required/server-network-guard.mjs'),
).href;
const serverNetworkGuard = `--import=${serverNetworkGuardUrl}`;
const serverNodeOptions = [process.env.NODE_OPTIONS, serverNetworkGuard]
  .filter(Boolean)
  .join(' ');

export default defineConfig({
  testDir: './e2e/required',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'line',
  outputDir: 'test-results/required-e2e',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: APP_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && node node_modules/next/dist/bin/next start -p 3100',
    url: APP_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      STRIPE_SECRET_KEY: 'sk_test_required_e2e_placeholder',
      NODE_OPTIONS: serverNodeOptions,
    },
  },
});
