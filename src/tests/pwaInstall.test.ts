import { readFileSync } from 'node:fs';
import { PWA_INSTALL_DISMISSED_UNTIL_KEY, isMobileUserAgent } from '@/utils/pwaInstall';
import { describe, expect, it } from 'vitest';

describe('PWA install prompt', () => {
  it('detects mobile browsers for manual install instructions', () => {
    expect(
      isMobileUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
      ),
    ).toBe(true);
    expect(isMobileUserAgent('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36')).toBe(
      true,
    );
    expect(
      isMobileUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15'),
    ).toBe(false);
  });

  it('captures native install without auto-opening manual guidance over task flows', () => {
    const component = readFileSync('src/components/pwa/PwaInstallPrompt.tsx', 'utf8');
    const app = readFileSync('src/App.tsx', 'utf8');
    const utility = readFileSync('src/utils/pwaInstall.ts', 'utf8');

    expect(component).toContain('beforeinstallprompt');
    expect(component).toContain('appinstalled');
    expect(component).toContain('if (!installEvent');
    expect(component).toContain('Install app');
    expect(component).toContain('hasOpenDialog');
    expect(component).not.toContain('Manual install');
    expect(component).not.toContain('Add to Home Screen');
    expect(component).not.toContain('getInstallMode');
    expect(utility).toContain(PWA_INSTALL_DISMISSED_UNTIL_KEY);
    expect(app).toContain('<PwaInstallPrompt />');
    expect(app).toContain('return withInstallPrompt(');
    expect(app).toContain('if (!onboardingComplete || !profile)');
  });
});
