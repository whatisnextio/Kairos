import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('next journey labels', () => {
  it('derives the next round number instead of hardcoding Cycle 2', () => {
    const progress = readFileSync('src/pages/ProgressScreen.tsx', 'utf8');
    const day84 = readFileSync('src/components/modals/Day84CompletionModal.tsx', 'utf8');

    expect(progress).not.toContain('Start Cycle 2');
    expect(day84).not.toContain('Start Cycle 2');
    expect(progress).toContain('const nextCycleNumber = journeyArchive.length + 2;');
    expect(day84).toContain('const nextCycleNumber = (journeyArchive?.length ?? 0) + 2;');
    expect(day84).toContain('formatKairosPoints(XP_PER_CYCLE_COMPLETE)');
  });

  it('keeps cycle wording out of visible round and reset copy', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const progress = readFileSync('src/pages/ProgressScreen.tsx', 'utf8');
    const day84 = readFileSync('src/components/modals/Day84CompletionModal.tsx', 'utf8');
    const newRound = readFileSync('src/pages/NewCycleScreen.tsx', 'utf8');
    const abandon = readFileSync('src/components/modals/AbandonCycleModal.tsx', 'utf8');
    const gamification = readFileSync('src/utils/gamification.ts', 'utf8');

    expect(home).toContain('12-week reset for {firstName}');
    expect(progress).toContain('Start round {nextCycleNumber}');
    expect(day84).toContain('Start round {nextCycleNumber}');
    expect(newRound).toContain('Round {cycleNumber}');
    expect(newRound).toContain('Begin round ${cycleNumber}');
    expect(abandon).toContain('Reset 12K journey?');
    expect(gamification).toContain("label: 'Round Finisher'");

    expect(home).not.toContain('<span>Cycle</span>');
    expect(progress).not.toContain('Start Cycle');
    expect(day84).not.toContain('Start Cycle');
    expect(newRound).not.toContain('Begin Cycle');
    expect(newRound).not.toContain('Start Cycle');
    expect(abandon).not.toContain('Abandon cycle');
    expect(abandon).not.toContain('Reset cycle');
    expect(gamification).not.toContain("label: 'Cycle Finisher'");
  });
});
