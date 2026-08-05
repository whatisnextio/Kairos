import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PWA metadata', () => {
  it('keeps standalone install metadata current across app shells', () => {
    const appShell = readFileSync('index.html', 'utf8');
    const legacyShell = readFileSync('kairos/index.html', 'utf8');
    const manifest = readFileSync('public/manifest.webmanifest', 'utf8');

    for (const html of [appShell, legacyShell]) {
      expect(html).toContain('<meta name="mobile-web-app-capable" content="yes" />');
      expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
      expect(html).toContain('<link rel="manifest"');
    }

    expect(manifest).toContain('"display": "standalone"');
  });
});
