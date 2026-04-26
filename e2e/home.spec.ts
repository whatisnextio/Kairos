// TODO: VERIFY — requires live Supabase + authenticated session
import { test, expect } from '@playwright/test';

// Helper: set up authenticated state via Supabase magic link or test account
// In CI, use SUPABASE_TEST_EMAIL + SUPABASE_TEST_PASSWORD env vars
test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('HomeScreen', () => {
  test.beforeAll(async ({ browser }) => {
    // Auth setup — skipped when storageState doesn't exist
    // Run: npx playwright test e2e/setup.spec.ts to create auth state
  });

  test('shows day counter and phase', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/day \d+ of 84/i)).toBeVisible();
    await expect(page.getByText(/phase/i)).toBeVisible();
  });

  test('shows all 4 domain tiles', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Body')).toBeVisible();
    await expect(page.getByText('Love')).toBeVisible();
    await expect(page.getByText('Mission')).toBeVisible();
    await expect(page.getByText('Spirit')).toBeVisible();
  });

  test('tapping a domain tile cycles check-in status', async ({ page }) => {
    await page.goto('/');
    const bodyTile = page.getByRole('button', { name: /check in body/i });
    await expect(bodyTile).toBeVisible();

    // First tap: Pending → Done
    await bodyTile.click();
    await expect(page.getByText('Done').first()).toBeVisible();

    // Second tap: Done → Partial
    await bodyTile.click();
    await expect(page.getByText('Partial').first()).toBeVisible();
  });

  test('arrow button navigates to domain detail', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /view body detail/i }).click();
    await expect(page).toHaveURL(/#\/detail\/body/);
  });

  test('shows cycle and phase progress bars', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Cycle')).toBeVisible();
  });
});
