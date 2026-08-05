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
    await expect(page.getByText('1 of 5')).toBeVisible();
    await expect(page.getByText(/kairos is greek/i)).toBeVisible();
    await expect(page.getByText(/six phases/i)).toBeVisible();
    await page.getByRole('button', { name: /start setup/i }).click();
    await expect(page.getByRole('heading', { name: /choose who you are becoming/i })).toBeVisible();
    await page.getByLabel(/name/i).fill('Alex');
    await page.getByRole('button', { name: /the builder/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /body/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(
      page.getByRole('heading', { name: /set accountability intensity/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /high accountability/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoA11yViolations(page);
  });

  test('mobile onboarding final step scrolls the document to the start action', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Chrome', 'Scroll regression runs once.');

    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('kairos_dev_session', '1');
    });

    await page.goto('/#/onboarding');
    await page.getByRole('button', { name: /start setup/i }).click();
    await page.getByLabel(/name/i).fill('Liam');
    await page.getByRole('button', { name: /the builder/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /^body/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /make day 0 count/i })).toBeVisible();
    const before = await page.evaluate(() => {
      const scrollElement = document.scrollingElement ?? document.documentElement;
      const main = document.querySelector('main');

      return {
        scrollTop: scrollElement.scrollTop,
        scrollHeight: scrollElement.scrollHeight,
        clientHeight: scrollElement.clientHeight,
        mainOverflowY: main ? getComputedStyle(main).overflowY : null,
        route: document.documentElement.dataset.kairosRoute,
      };
    });
    expect(before.route).toBe('onboarding');
    expect(before.mainOverflowY).not.toBe('auto');
    expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);

    await page.mouse.wheel(0, 900);
    await page.mouse.wheel(0, 900);

    const after = await page.evaluate(() => {
      const scrollElement = document.scrollingElement ?? document.documentElement;

      return {
        scrollTop: scrollElement.scrollTop,
        scrollHeight: scrollElement.scrollHeight,
        clientHeight: scrollElement.clientHeight,
      };
    });
    expect(after.scrollTop).toBeGreaterThan(before.scrollTop);
    await expect(page.getByRole('button', { name: /done, start 12k/i })).toBeInViewport();
  });

  test('daily dashboard stays within a 3-tap check-in path', async ({ page }) => {
    await loginAsLocalLiam(page);

    await expect(page.getByTestId('day-state-protocol')).toBeVisible();
    await expect(page.getByTestId('day-state-protocol')).toContainText(/protocol/i);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: /check in body/i }).click();
    await page.getByRole('button', { name: /done full action completed/i }).click();

    await expect(page.getByTestId('daily-domain-row-BODY')).toContainText('Done');
    await expect(page.getByRole('button', { name: /check in body/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('daily check-ins persist through reload and still work while offline', async ({
    context,
    page,
  }) => {
    await loginAsLocalLiam(page);

    await page.getByRole('button', { name: /check in body/i }).click();
    await page.getByRole('button', { name: /done full action completed/i }).click();
    await page.reload();
    await expect(page.getByTestId('daily-domain-row-BODY')).toContainText('Done');
    await expect(page.getByRole('button', { name: /check in body/i })).toBeVisible();

    await context.setOffline(true);
    await page.getByRole('button', { name: /check in fuel/i }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /partial smaller version/i })
      .click();
    await expect(page.getByTestId('daily-domain-row-FUEL')).toContainText('Partial');
    await expect(page.getByRole('button', { name: /check in fuel/i })).toBeVisible();
    await context.setOffline(false);

    await expectNoHorizontalOverflow(page);
  });

  test('core app screens are accessible on mobile', async ({ page }) => {
    await loginAsLocalLiam(page);

    for (const route of ['/', '/#/progress', '/#/improve', '/#/you']) {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
      await expectNoA11yViolations(page);
    }

    await page.goto('/#/progress');
    await expect(page.getByText(/weekly bonuses/i)).toBeVisible();
    await expect(page.getByText(/badges/i)).toBeVisible();
    await page.getByRole('button', { name: /preview share/i }).click();
    await expect(page.getByText('12K progress', { exact: true })).toBeVisible();
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
