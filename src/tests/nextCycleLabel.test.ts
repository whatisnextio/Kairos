import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('next cycle labels', () => {
  it('derives the next cycle number instead of hardcoding Cycle 2', () => {
    const progress = readFileSync('src/pages/ProgressScreen.tsx', 'utf8');
    const day84 = readFileSync('src/components/modals/Day84CompletionModal.tsx', 'utf8');

    expect(progress).not.toContain('Start Cycle 2');
    expect(day84).not.toContain('Start Cycle 2');
    expect(progress).toContain('const nextCycleNumber = journeyArchive.length + 2;');
    expect(day84).toContain('const nextCycleNumber = (journeyArchive?.length ?? 0) + 2;');
    expect(day84).toContain('formatKairosPoints(XP_PER_CYCLE_COMPLETE)');
  });
});
