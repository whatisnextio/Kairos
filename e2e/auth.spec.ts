// TODO: VERIFY — requires live Supabase credentials to run
import { test, expect } from '@playwright/test';

test.describe('Auth', () => {
  test('unauthenticated user sees login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole('heading', { name: '12K' })).toBeVisible();
  });

  test('register page loads with correct fields', async ({ page }) => {
    await page.goto('/#/register');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/date of birth/i)).toBeVisible();
  });

  test('login page has magic link button', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
  });

  test('underage user (under 18) cannot register', async ({ page }) => {
    await page.goto('/#/register');

    await page.getByLabel(/email/i).fill('test@example.com');

    // Enter a DOB that makes user 17
    const today = new Date();
    const dob = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
    const dobStr = dob.toISOString().split('T')[0];
    await page.getByLabel(/date of birth/i).fill(dobStr);

    await page.getByLabel(/i confirm/i).check();
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/must be 18/i)).toBeVisible();
  });
});
