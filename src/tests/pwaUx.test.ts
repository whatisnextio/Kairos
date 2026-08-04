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
    expect(splash).toContain('aria-label="Loading 12K"');
    expect(splash).toContain('animate-pulse');
    expect(splash).not.toMatch(/>\s*12K\s*</);
  });

  it('uses clear check-in language on the daily action rows', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const recommendations = readFileSync('src/utils/frameworkRecommendations.ts', 'utf8');

    expect(home).toContain("Pending: 'Check in'");
    expect(home).toContain('aria-label={`Check in ${displayLabel}`}');
    expect(home).toContain('Check in now, or open details to set tomorrow.');
    expect(recommendations).toContain('getDailyDomainLabel(domain)');
    expect(recommendations).not.toContain('getDiscreetDomainLabel(domain, email)');
  });
});
