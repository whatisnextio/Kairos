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
});
