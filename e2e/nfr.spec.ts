import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function loginAsLocalLiam(page: Page) {
  await page.goto('/#/login');
  await page.getByRole('button', { name: /use local liam test account/i }).click();
  await expect(page.getByRole('heading', { name: /day \d+ of 84/i })).toBeVisible();
}

test.describe('NFR smoke gates', () => {
  test('login is accessible and fits mobile', async ({ page }) => {
    await page.goto('/#/login');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoA11yViolations(page);
  });

  test('onboarding is accessible before profile creation', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('kairos_dev_session', '1'));
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /start your 12-week reset/i })).toBeVisible();
    await expect(page.getByText('1 of 3')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoA11yViolations(page);
  });

  test('daily dashboard stays within a 3-tap check-in path', async ({ page }) => {
    await loginAsLocalLiam(page);

    await page.getByRole('button', { name: /set body status/i }).click();
    await page.getByRole('button', { name: /done full action completed/i }).click();

    await expect(page.getByRole('button', { name: /set body status/i })).toContainText('Done');
    await expectNoHorizontalOverflow(page);
  });

  test('paid core screens are accessible on mobile', async ({ page }) => {
    await loginAsLocalLiam(page);

    for (const route of ['/', '/#/progress', '/#/improve', '/#/you']) {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
      await expectNoA11yViolations(page);
    }

    await page.goto('/#/progress');
    await expect(page.getByText(/weekly bonuses/i)).toBeVisible();
    await expect(page.getByText(/badges/i)).toBeVisible();
  });

  test('PWA manifest and icons are installable assets', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();

    expect(manifest.name).toContain('12K');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/logo192.png', sizes: '192x192' }),
        expect.objectContaining({ src: '/logo512.png', sizes: '512x512' }),
      ]),
    );

    for (const icon of ['/favicon.ico', '/apple-touch-icon.png', '/logo192.png', '/logo512.png']) {
      const iconResponse = await request.get(icon);
      expect(iconResponse.ok()).toBe(true);
    }
  });
});
