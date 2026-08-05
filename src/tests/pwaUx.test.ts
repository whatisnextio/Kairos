import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PWA UX shell', () => {
  it('prevents double-tap zoom without disabling user zoom', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('src/index.css', 'utf8');

    expect(html).toContain('width=device-width, initial-scale=1.0, viewport-fit=cover');
    expect(html).not.toMatch(/user-scalable\s*=\s*no/i);
    expect(html).not.toMatch(/maximum-scale\s*=\s*1/i);
    expect(css).toContain('touch-action: manipulation');
  });

  it('uses the 12-week product description in install metadata', () => {
    const html = readFileSync('index.html', 'utf8');
    const viteConfig = readFileSync('vite.config.ts', 'utf8');

    expect(html).toContain('12K: Your 12-week transformation. Powered by Kairos.');
    expect(viteConfig).toContain('12K - Your 12-Week Transformation');
    expect(viteConfig).toContain('12K: Your 12-week transformation. Powered by Kairos.');
    expect(html).not.toContain('365-day transformation');
    expect(viteConfig).not.toMatch(/365[- ]day/i);
  });

  it('uses the Kairos mark on the reload splash screen', () => {
    const splash = readFileSync('src/pages/SplashScreen.tsx', 'utf8');

    expect(splash).toContain('/kairos-12k-mark.svg');
    expect(splash).toContain("'Loading 12K'");
    expect(splash).toContain('animate-pulse');
    expect(splash).not.toMatch(/>\s*12K\s*</);
  });

  it('makes the reload splash recoverable when loading stalls', () => {
    const splash = readFileSync('src/pages/SplashScreen.tsx', 'utf8');

    expect(splash).not.toContain('<output');
    expect(splash).toContain('window.setTimeout(() => setShowSlowMessage(true), 8_000)');
    expect(splash).toContain('taking longer than expected');
    expect(splash).toContain('Retry');
    expect(splash).toContain('window.location.reload()');
  });

  it('uses clear check-in language on the daily action rows', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const recommendations = readFileSync('src/utils/frameworkRecommendations.ts', 'utf8');

    expect(home).toContain("Pending: 'Check in'");
    expect(home).toContain('aria-label={`Check in ${displayLabel}`}');
    expect(home).toContain('Check in now, or open details to set tomorrow.');
    expect(recommendations).toContain('getDailyDomainLabel(domain)');
  });

  it('nests personal sub-routes under the core daily categories', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');

    expect(home).toContain('routesForDomain');
    expect(home).toContain('route.parentDomainType === domain.type');
    expect(home).toContain('Sub-route');
    expect(home).not.toContain('domainLabels.get(route.parentDomainType)');
  });

  it('keeps Improve AI fallback copy clear and intentional', () => {
    const improve = readFileSync('src/pages/ImproveScreen.tsx', 'utf8');
    const lifecycle = readFileSync('src/utils/improveLifecycle.ts', 'utf8');
    const oldFallbackPhrase = ['framework', 'options', 'below'].join(' ');
    const oldAwkwardPhrase = ['carrying', 'today'].join(' ');

    expect(improve).toContain('choose a Kairos option below');
    expect(lifecycle).toContain('Your Kairos options are ready below');
    expect(`${improve}\n${lifecycle}`).not.toContain(oldFallbackPhrase);
    expect(`${improve}\n${lifecycle}`).not.toContain(oldAwkwardPhrase);
  });

  it('keeps native select options readable in the dark app shell', () => {
    const css = readFileSync('src/index.css', 'utf8');

    expect(css).toContain('.input-field option');
    expect(css).toContain('color: rgb(var(--color-option-text))');
    expect(css).toContain('background-color: rgb(var(--color-option-bg))');
    expect(css).toContain('.input-field option:checked');
  });

  it('pins the bottom tab bar inside the app shell scroll frame', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const shell = readFileSync('src/components/layout/AppShell.tsx', 'utf8');

    expect(css).toContain('overflow: hidden');
    expect(css).toContain('@apply relative min-h-0 flex-1 overflow-y-auto');
    expect(css).toContain('@apply sticky bottom-0 z-40');
    expect(css).not.toContain('@apply fixed bottom-0 left-0 right-0');
    expect(shell).toContain('<main className="app-main">');
    expect(shell).not.toContain('5.5rem');
  });

  it('defines dark and light theme variables for the PWA shell', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const tailwind = readFileSync('tailwind.config.ts', 'utf8');
    const app = readFileSync('src/App.tsx', 'utf8');

    expect(css).toContain('html[data-theme="light"]');
    expect(css).toContain('--color-base-surface: 255 255 255');
    expect(tailwind).toContain("'base-surface': 'rgb(var(--color-base-surface)");
    expect(app).toContain('applyThemePreference(themePreference)');
  });

  it('shows notification consent preview and unsupported-browser fallback', () => {
    const you = readFileSync('src/pages/YouScreen.tsx', 'utf8');
    const push = readFileSync('src/services/pushNotifications.ts', 'utf8');

    expect(you).toContain('Accountability preview');
    expect(you).toContain('failing silently');
    expect(you).toContain('Pause ladder');
    expect(you).toContain('Show route names in notifications');
    expect(push).toContain("'Notification' in window");
    expect(push).toContain("'PushManager' in window");
  });

  it('registers the PWA service worker and activates updates promptly', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    const sw = readFileSync('src/sw.ts', 'utf8');
    const viteEnv = readFileSync('src/vite-env.d.ts', 'utf8');

    expect(viteEnv).toContain('vite-plugin-pwa/client');
    expect(main).toContain("import { registerSW } from 'virtual:pwa-register'");
    expect(main).toContain('immediate: true');
    expect(main).toContain('onNeedRefresh()');
    expect(main).toContain('void updateSW(true)');
    expect(sw).toContain('self.skipWaiting()');
    expect(sw).toContain('clientsClaim()');
  });
});
