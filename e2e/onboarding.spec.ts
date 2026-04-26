// TODO: VERIFY — requires live Supabase + freshly registered account
import { test, expect } from '@playwright/test';

test.describe('Onboarding', () => {
  test('new user is redirected to onboarding after auth', async ({ page }) => {
    // This test assumes a freshly created account with no profile
    // Use a test account that has been reset before each run
    await page.goto('/#/onboarding');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('onboarding step 1: display name entry', async ({ page }) => {
    await page.goto('/#/onboarding');
    await expect(page.getByLabel(/your name/i)).toBeVisible();
    await page.getByLabel(/your name/i).fill('Test User');
    await page.getByRole('button', { name: /next|continue/i }).click();
    // Should advance to anchor selection
    await expect(page.getByText(/who are you/i).or(page.getByText(/identity/i))).toBeVisible();
  });

  test('onboarding step 2: identity anchor selection', async ({ page }) => {
    await page.goto('/#/onboarding');
    // Fill step 1
    await page.getByLabel(/your name/i).fill('Test User');
    await page.getByRole('button', { name: /next|continue/i }).click();
    // Select The Builder
    await page.getByText('The Builder').click();
    await page.getByRole('button', { name: /next|continue/i }).click();
    // Should advance
    await expect(page.getByText(/domain|body|mission/i)).toBeVisible();
  });

  test('onboarding completion awards XP', async ({ page }) => {
    // End-to-end onboarding flow — marks first check-in and awards 10 XP
    // This is a critical flow test; requires full run through all 5 steps
    // TODO: VERIFY with live credentials
  });
});
