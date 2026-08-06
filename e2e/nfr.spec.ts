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

    await expect(page.getByRole('heading', { name: /sign in to 12k/i, level: 1 })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /email me a sign-in link/i })).toBeVisible();
    await expect(page.getByText(/magic link/i)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await expectNoA11yViolations(page);
  });

  test('register is accessible and fits mobile', async ({ page }) => {
    await page.goto('/#/register');

    await expect(
      page.getByRole('heading', { name: /create your 12k account/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/date of birth/i)).toBeVisible();
    await expect(page.getByText(/we only use this to check you are 18 or over/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoA11yViolations(page);
  });

  test('direct register URL opens the sign-up screen', async ({ page }) => {
    await page.goto('/register');

    await expect(page).toHaveURL(/#\/register/);
    await expect(
      page.getByRole('heading', { name: /create your 12k account/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoA11yViolations(page);
  });

  test('onboarding is accessible before profile creation', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('kairos_dev_session', '1'));
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /start your 12k plan/i })).toBeVisible();
    await expect(page.getByText('1 of 5')).toBeVisible();
    await expect(page.getByText(/set up your four starter actions now/i)).toBeVisible();
    await expect(page.getByText(/nothing is marked done/i)).toBeVisible();
    await page.getByRole('button', { name: /start setup/i }).click();
    await expect(page.getByRole('heading', { name: /tell us your name/i })).toBeVisible();
    await page.getByLabel(/name/i).fill('Alex');
    await expect(page.getByRole('button', { name: /gentle/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /practical/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /direct/i })).toBeVisible();
    await expect(page.getByText(/the builder|the provider|the guardian/i)).toHaveCount(0);
    await page.getByRole('button', { name: /practical/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('heading', { name: /choose your four actions/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /walk for 20 minutes/i })).toBeVisible();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('heading', { name: /choose reminder level/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /extra support/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoA11yViolations(page);
  });

  test('mobile onboarding scrolls to the top after tapping Continue', async ({
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
    await page.getByRole('button', { name: /practical/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('heading', { name: /choose your four actions/i })).toBeVisible();
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
    const scrolled = await page.evaluate(
      () => (document.scrollingElement ?? document.documentElement).scrollTop,
    );
    expect(scrolled).toBeGreaterThan(0);

    await page.getByRole('button', { name: /continue/i }).click();
    const after = await page.evaluate(() => {
      const scrollElement = document.scrollingElement ?? document.documentElement;

      return {
        scrollTop: scrollElement.scrollTop,
        scrollHeight: scrollElement.scrollHeight,
        clientHeight: scrollElement.clientHeight,
      };
    });
    expect(after.scrollTop).toBeLessThanOrEqual(1);
    await expect(page.getByRole('heading', { name: /choose reminder level/i })).toBeInViewport();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /start 12k/i })).toBeInViewport();
  });

  test('daily dashboard stays within a 3-tap check-in path', async ({ page }) => {
    await loginAsLocalLiam(page);

    await expect(page.getByTestId('day-state-protocol')).toBeVisible();
    await expect(page.getByTestId('day-state-protocol')).toContainText(/today|check|rescue/i);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: /check in body/i }).click();
    await page.getByRole('button', { name: /done action completed/i }).click();

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
    await page.getByRole('button', { name: /done action completed/i }).click();
    await page.reload();
    await expect(page.getByTestId('daily-domain-row-BODY')).toContainText('Done');
    await expect(page.getByRole('button', { name: /check in body/i })).toBeVisible();

    await context.setOffline(true);
    await page.getByRole('button', { name: /check in fuel/i }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /part done.*smaller useful version/i })
      .click();
    await expect(page.getByTestId('daily-domain-row-FUEL')).toContainText('Part done');
    await expect(page.getByRole('button', { name: /check in fuel/i })).toBeVisible();
    await context.setOffline(false);

    await expectNoHorizontalOverflow(page);
  });

  test('detail streak day count uses normal spacing', async ({ page }) => {
    await loginAsLocalLiam(page);
    await page.goto('/#/detail/BODY');

    await expect(page.getByText('0 days', { exact: true })).toBeVisible();
    await expect(page.getByText(/0days/i)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('weekly review uses plain action language', async ({ page }) => {
    await loginAsLocalLiam(page);
    await page.goto('/#/progress');
    await page.getByRole('button', { name: /^review$/i }).click();

    await expect(page.getByRole('button', { name: /save next week's action/i })).toBeVisible();
    await expect(page.getByText(/next-week focus/i)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('progress streak labels are readable', async ({ page }) => {
    await loginAsLocalLiam(page);
    await page.goto('/#/progress');

    await expect(page.getByText('Current: 0').first()).toBeVisible();
    await expect(page.getByText('Best: 0').first()).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/0current|0best/i);
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
    await expect(page.getByText('12K stages', { exact: true })).toBeVisible();
    await expect(page.getByText(/kairos phases/i)).toHaveCount(0);
    await expect(page.getByText(/KP total|KP earned|\bKP\b/i)).toHaveCount(0);
    await page.getByRole('button', { name: /preview share/i }).click();
    await expect(page.getByText('12K progress', { exact: true })).toBeVisible();

    await page.goto('/#/improve');
    await expect(page.getByText(/\+\d+ points/i).first()).toBeVisible();
    await expect(page.getByText(/\+\d+ KP/i)).toHaveCount(0);
    await expect(
      page.getByText(/extra suggestion not ready|try again later|next options/i),
    ).toHaveCount(0);
    await expect(page.getByText(/ideas for today/i)).toBeVisible();
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
