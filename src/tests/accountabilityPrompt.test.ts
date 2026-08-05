import { readFileSync } from 'node:fs';
import { NOTIFICATION_SLOTS } from '@/services/localNotifications';
import { describe, expect, it } from 'vitest';

describe('contextual accountability prompt', () => {
  it('uses one per-cycle day protocol that can dismiss and escalate', () => {
    const source = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const framework = readFileSync('src/utils/v1Framework.ts', 'utf8');

    expect(source).toContain('dismissedDayProtocol');
    expect(source).toContain('DAY_PROTOCOL_DISMISSAL_KEY');
    expect(source).toContain('window.localStorage.setItem(DAY_PROTOCOL_DISMISSAL_KEY');
    expect(source).toContain('targetKey: getProtocolTargetKey(activeDayStateProtocol)');
    expect(source).toContain('"Not now" hides this for a while');
    expect(source).toContain('data-testid="day-state-protocol"');
    expect(source).toContain('setSelectedDomainType(target.domainType)');
    expect(source).toContain('setSelectedCustomRouteId(target.routeId)');
    expect(framework).toContain('dismissedProtocolId');
    expect(framework).toContain('catch-up-after-dismiss');
  });

  it('keeps scheduled accountability reminder copy discreet and action-linked', () => {
    const copies = NOTIFICATION_SLOTS.map((slot) => `${slot.title} ${slot.body}`).join(' ');
    const notificationSource = readFileSync('src/services/localNotifications.ts', 'utf8');

    expect(copies).toContain('Partial');
    expect(copies).not.toMatch(/sex|masturb|wife|husband/i);
    expect(notificationSource).toContain("url: slot.id === 6 ? '/#/improve' : '/#/'");
  });
});
