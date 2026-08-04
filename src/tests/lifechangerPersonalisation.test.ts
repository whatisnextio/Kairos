import {
  buildLifechangerPatternSignals,
  buildLifechangerPromptSection,
} from '@/utils/lifechangerPersonalisation';
import { describe, expect, it } from 'vitest';

describe('Lifechanger AI personalisation contract', () => {
  it('Given a Brotherhood user has history, When pattern signals are built, Then advanced signals stay disabled', () => {
    const signals = buildLifechangerPatternSignals({
      tier: 'brotherhood',
      recentCheckIns: [
        { date: '2026-08-01', domain: 'BODY', status: 'Done' },
        { date: '2026-08-02', domain: 'BODY', status: 'Done' },
        { date: '2026-08-03', domain: 'BODY', status: 'Done' },
      ],
      streaks: [{ domain: 'BODY', current: 3, longest: 3 }],
    });

    expect(signals).toEqual([]);
  });

  it('Given a Lifechanger user has enough history, When AI support is generated, Then grounded pattern signals are available', () => {
    const signals = buildLifechangerPatternSignals({
      tier: 'lifechanger',
      recentCheckIns: [
        { date: '2026-08-01', domain: 'BODY', status: 'Done', notes: null },
        { date: '2026-08-02', domain: 'BODY', status: 'Done', notes: null },
        { date: '2026-08-03', domain: 'BODY', status: 'Partial', notes: 'Low sleep and tired.' },
        { date: '2026-08-03', domain: 'USTIME', status: 'Missed', notes: null },
      ],
      recentCustomRouteCheckIns: [
        { date: '2026-08-03', domain: 'Lens', status: 'Partial', notes: 'Energy dipped.' },
      ],
      streaks: [{ domain: 'BODY', current: 4, longest: 4 }],
      vibeChecks: [
        { date: '2026-08-01', rating: 2 },
        { date: '2026-08-04', rating: 4 },
      ],
    });

    expect(signals.map((signal) => signal.type)).toEqual(
      expect.arrayContaining(['trend', 'vibe', 'streak', 'note_keyword']),
    );
    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(buildLifechangerPromptSection(signals)).toContain('use one grounded signal');
  });

  it('Given Lifechanger data is thin, When the prompt section is built, Then it avoids unsupported pattern claims', () => {
    const signals = buildLifechangerPatternSignals({
      tier: 'lifechanger',
      recentCheckIns: [{ date: '2026-08-04', domain: 'FUEL', status: 'Pending' }],
      streaks: [],
      vibeChecks: [],
    });

    expect(signals).toEqual([]);
    expect(buildLifechangerPromptSection(signals)).toContain('insufficient history');
  });
});
