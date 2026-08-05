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
    expect(getImproveStatusHelper('new')).toContain('keep this for today');
    expect(getImproveStatusHelper('accepted')).toContain('Complete it when done');
    expect(getImproveStatusHelper('completed')).toContain('Points are added once');
    expect(getImproveStatusHelper('dismissed')).toContain('out of the way today');
    expect(getImproveStatusHelper('dismissed')).toContain('restore');
  });

  it('gives specific AI generation failure copy', () => {
    expect(normaliseNudgeErrorMessage(new Error('No session'))).toContain('Sign in again');
    expect(normaliseNudgeErrorMessage(new Error('No session'))).toContain('Your options');
    expect(normaliseNudgeErrorMessage(new Error('Tier gate rejected'))).toContain(
      'included in the app',
    );
    expect(normaliseNudgeErrorMessage(new Error('Failed to store nudge'))).toContain(
      'could not be saved',
    );
    expect(normaliseNudgeErrorMessage(new Error('AI generation unavailable'))).toBe(
      'The suggestion is not ready. Try again, or choose an option below.',
    );
    expect(normaliseNudgeErrorMessage(new Error('Provider timeout'))).toBe(
      'The suggestion is not ready right now. Your options are ready below.',
    );
    const oldFallbackPhrase = ['framework', 'options', 'below'].join(' ');
    expect(normaliseNudgeErrorMessage(new Error('AI generation unavailable'))).not.toContain(
      oldFallbackPhrase,
    );
  });

  it('summarises dismissed cards without implying notifications stop', () => {
    expect(getDismissedCardsMessage(2)).toContain('out of the way for today');
    expect(getDismissedCardsMessage(2)).toContain('Show hidden suggestions to restore one');
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
