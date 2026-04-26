// TODO: VERIFY — run once before home.spec.ts to create e2e/.auth/user.json
// The app uses magic link (OTP) auth, not password auth.
// To create the auth state, this setup uses Supabase's signInWithOtp in
// combination with a pre-generated access token injected via localStorage.
//
// Prerequisites:
//   1. SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_TEST_ACCESS_TOKEN must be set.
//   2. Generate a test token: use the Supabase dashboard or admin API to create
//      a long-lived token for a test account.
//
// Usage: SUPABASE_TEST_ACCESS_TOKEN=... npx playwright test e2e/setup.spec.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(import.meta.dirname, '.auth/user.json');

setup('inject test user session', async ({ page }) => {
  const accessToken = process.env.SUPABASE_TEST_ACCESS_TOKEN;
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!accessToken || !supabaseUrl || !anonKey) {
    throw new Error(
      'Set SUPABASE_TEST_ACCESS_TOKEN, SUPABASE_URL (or VITE_SUPABASE_URL), and SUPABASE_ANON_KEY env vars before running setup',
    );
  }

  await page.goto('/#/login');

  // Inject the Supabase session directly into localStorage so the app
  // picks it up via supabase.auth.onAuthStateChange without a UI magic link flow.
  await page.evaluate(
    ({ url, key, token }) => {
      const sessionKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
      localStorage.setItem(
        sessionKey,
        JSON.stringify({
          access_token: token,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: '',
          user: { id: 'test-user', email: 'test@example.com' },
        }),
      );
    },
    { url: supabaseUrl, key: anonKey, token: accessToken },
  );

  // Reload so the app reads the injected session
  await page.reload();

  // Wait until the app bootstraps past auth (lands on home or onboarding)
  await expect(page).toHaveURL(/#\/(|onboarding.*)$/, { timeout: 15_000 });

  // Persist auth cookies/localStorage
  await page.context().storageState({ path: authFile });
});
