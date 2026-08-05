import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('bootstrap failure UX', () => {
  it('keeps critical Supabase bootstrap errors visible and reportable', () => {
    const source = readFileSync('src/hooks/useBootstrap.ts', 'utf8');

    expect(source).toContain('Sentry.captureException');
    expect(source).toContain('setBootstrapError');
    expect(source).toContain('failCriticalBootstrap');
    expect(source).toContain('profile query');
    expect(source).toContain('current cycle query');
    expect(source).toContain('active cycle recovery');
    expect(source).toContain('domain focuses query');
    expect(source).toContain('custom routes query');
    expect(source).toContain('daily check-ins query');
    expect(source).toContain('custom route check-ins query');
  });

  it('times out bootstrap and clears the timer when loading settles', () => {
    const source = readFileSync('src/hooks/useBootstrap.ts', 'utf8');

    expect(source).toContain('BOOTSTRAP_TIMEOUT_MS = 8_000');
    expect(source).toContain('window.setTimeout');
    expect(source).toContain('window.clearTimeout(timeoutId)');
    expect(source).toContain('BOOTSTRAP_TIMEOUT_MESSAGE');
  });

  it('routes bootstrap errors to the splash retry screen', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const store = readFileSync('src/store/useAppStore.ts', 'utf8');

    expect(store).toContain('bootstrapError: string | null');
    expect(store).toContain('setBootstrapError: (message: string | null) => void');
    expect(app).toContain('bootstrapError');
    expect(app).toContain('errorMessage={bootstrapError}');
    expect(app).toContain('window.location.reload()');
  });
});
