import type { CustomRoute } from '@/types';
import {
  getDismissedCardsMessage,
  getImproveStatusHelper,
  normaliseNudgeErrorMessage,
  resolveImproveCompletionTarget,
} from '@/utils/improveLifecycle';
import { describe, expect, it } from 'vitest';

const lensRoute: CustomRoute = {
  id: 'route-lens',
  userId: 'user-1',
  cycleId: 'cycle-1',
  parentDomainType: 'METIME',
  label: 'Lens',
  description: 'Photography',
  focusDescription: 'Edit one keeper',
  createdAt: '2026-08-04T00:00:00Z',
  updatedAt: '2026-08-04T00:00:00Z',
  archivedAt: null,
};

describe('Improve lifecycle helpers', () => {
  it('explains what each card status means', () => {
    expect(getImproveStatusHelper('new')).toContain('keeps this card in Active');
    expect(getImproveStatusHelper('accepted')).toContain('until you mark complete or dismiss');
    expect(getImproveStatusHelper('completed')).toContain('awarded once');
    expect(getImproveStatusHelper('dismissed')).toContain('hidden today');
  });

  it('gives specific AI generation failure copy', () => {
    expect(normaliseNudgeErrorMessage(new Error('No session'))).toContain('Sign in again');
    expect(
      normaliseNudgeErrorMessage(new Error('Free tier gets nudges on Sundays only')),
    ).toContain('Sunday nudge');
    expect(normaliseNudgeErrorMessage(new Error('Failed to store nudge'))).toContain(
      'could not save',
    );
  });

  it('summarises dismissed cards without implying notifications stop', () => {
    expect(getDismissedCardsMessage(2)).toContain('hidden for today');
    expect(getDismissedCardsMessage(2)).toContain('Reminders may still ask for a check-in');
  });

  it('maps core completion to a daily check-in', () => {
    expect(
      resolveImproveCompletionTarget({
        domainType: 'BODY',
        customRoutes: [lensRoute],
      }),
    ).toEqual({ kind: 'core', domainType: 'BODY' });
  });

  it('maps private AI domains to matching custom routes when present', () => {
    expect(
      resolveImproveCompletionTarget({
        domainType: 'LENS',
        customRoutes: [lensRoute],
      }),
    ).toEqual({ kind: 'custom', routeId: 'route-lens' });
  });

  it('returns no proof target for an unmapped private AI domain', () => {
    expect(
      resolveImproveCompletionTarget({
        domainType: 'SHOT',
        customRoutes: [lensRoute],
      }),
    ).toEqual({ kind: 'none' });
  });
});
