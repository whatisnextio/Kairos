import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Hidden Improve cards', () => {
  it('lets dismissed cards be shown and restored today', () => {
    const improve = readFileSync('src/pages/ImproveScreen.tsx', 'utf8');
    const store = readFileSync('src/store/useAppStore.ts', 'utf8');

    expect(improve).toContain('const [showHiddenCards, setShowHiddenCards]');
    expect(improve).toContain('dismissedCards.map');
    expect(improve).toContain('function restoreCard(card: ImproveCard)');
    expect(improve).toContain("setCardStatus(card, 'new')");
    expect(improve).toContain('Restore');
    expect(improve).toContain('Hidden today');
    expect(store).toContain('improveCardStatuses: Record<string, NudgeStatus>');
    expect(store).toContain('status: NudgeStatus');
  });
});
