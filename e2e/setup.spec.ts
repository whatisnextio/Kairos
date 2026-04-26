// TODO: VERIFY — run once before home.spec.ts to create e2e/.auth/user.json
// Usage: SUPABASE_TEST_EMAIL=... SUPABASE_TEST_PASSWORD=... npx playwright test e2e/setup.spec.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(import.meta.dirname, '.auth/user.json');

setup('authenticate test user', async ({ page }) => {
  const email = process.env.SUPABASE_TEST_EMAIL;
  const password = process.env.SUPABASE_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Set SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD env vars before running setup'
    );
  }

  await page.goto('/#/login');

  // Fill email/password login form
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait until we land on the home screen (past auth + onboarding)
  await expect(page).toHaveURL(/#\/$/, { timeout: 15_000 });

  // Persist auth cookies/localStorage
  await page.context().storageState({ path: authFile });
});
