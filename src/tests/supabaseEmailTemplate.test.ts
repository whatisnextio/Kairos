import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const html = readFileSync(join(root, 'supabase/templates/magic-link.html'), 'utf8');
const text = readFileSync(join(root, 'supabase/templates/magic-link.txt'), 'utf8');
const config = readFileSync(join(root, 'supabase/config.toml'), 'utf8');

describe('Supabase magic-link email template', () => {
  it('is wired into local Supabase config', () => {
    expect(config).toContain('[auth.email.template.magic_link]');
    expect(config).toContain('subject = "Welcome to Kairos"');
    expect(config).toContain('content_path = "./supabase/templates/magic-link.html"');
  });

  it('keeps the hosted magic link compatible with Supabase redirects', () => {
    expect(html).toContain('{{ .ConfirmationURL }}');
    expect(html).toContain('{{ .Email }}');
    expect(text).toContain('{{ .ConfirmationURL }}');
    expect(text).toContain('{{ .Email }}');
  });

  it('explains Kairos and 12K without overclaiming', () => {
    const copy = `${html} ${text}`;

    expect(copy).toContain('Kairos means the right moment');
    expect(copy).toContain('12 weeks powered by Kairos');
    expect(copy).toContain('84 days');
    expect(copy).toContain('Body, Fuel, Self, and Connection');
    expect(copy).toContain('Done, Part done, or Missed');
    expect(copy).not.toMatch(/guarantee|cure|fix your life/i);
  });

  it('uses the live logo asset and branded CTA', () => {
    expect(html).toContain(
      'https://raw.githubusercontent.com/whatisnextio/Kairos/main/public/kairos-12k-logo.png',
    );
    expect(html).toContain('Open Kairos');
    expect(html).toContain('#22c55e');
  });
});
