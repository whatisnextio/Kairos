import { readFileSync } from 'node:fs';
import { NOTIFICATION_SLOTS } from '@/services/localNotifications';
import { describe, expect, it } from 'vitest';

describe('contextual accountability prompt', () => {
  it('is suppressed per-cycle after dismissing or opening the target check-in', () => {
    const source = readFileSync('src/pages/HomeScreen.tsx', 'utf8');

    expect(source).toContain('accountabilitySuppressedCycleId');
    expect(source).toContain('Dismiss accountability prompt');
    expect(source).toContain('setShowAccountabilityPrompt(false)');
    expect(source).toContain('setSelectedDomainType(accountabilityTarget.type)');
  });

  it('keeps scheduled accountability reminder copy discreet and action-linked', () => {
    const copies = NOTIFICATION_SLOTS.map((slot) => `${slot.title} ${slot.body}`).join(' ');
    const notificationSource = readFileSync('src/services/localNotifications.ts', 'utf8');

    expect(copies).toContain('Partial');
    expect(copies).not.toMatch(/sex|masturb|wife|husband/i);
    expect(notificationSource).toContain("url: slot.id === 6 ? '/#/improve' : '/#/'");
  });
});
