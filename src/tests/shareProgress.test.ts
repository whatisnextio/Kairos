import {
  DEFAULT_SHARE_PRIVACY,
  buildProgressSharePreview,
  shareOrCopyProgress,
} from '@/utils/shareProgress';
import type { FlywheelSummary } from '@/utils/v1Framework';
import { describe, expect, it, vi } from 'vitest';

const flywheel: FlywheelSummary = {
  title: 'Core flywheel',
  entries: [
    {
      domainType: 'BODY',
      label: 'Body',
      done: 4,
      partial: 1,
      missed: 0,
      total: 7,
      score: 64,
      state: 'thin',
    },
    {
      domainType: 'FUEL',
      label: 'Fuel',
      done: 5,
      partial: 1,
      missed: 0,
      total: 7,
      score: 79,
      state: 'steady',
    },
    {
      domainType: 'METIME',
      label: 'Self',
      done: 3,
      partial: 2,
      missed: 1,
      total: 7,
      score: 57,
      state: 'thin',
    },
    {
      domainType: 'USTIME',
      label: 'Connection',
      done: 2,
      partial: 2,
      missed: 1,
      total: 7,
      score: 43,
      state: 'thin',
    },
  ],
};

describe('progress sharing privacy', () => {
  it('redacts name, photo, and domain detail by default', () => {
    const preview = buildProgressSharePreview({
      displayName: 'Liam',
      dayInCycle: 12,
      xp: 250,
      levelLabel: 'Level 2: Anchor',
      earnedBadgeLabel: 'First proof',
      flywheel,
      preferences: DEFAULT_SHARE_PRIVACY,
      profileImageDataUrl: 'data:image/png;base64,abc',
    });

    expect(preview.text).not.toContain('Liam');
    expect(preview.text).not.toContain('Body 64%');
    expect(preview.text).toContain('Core flywheel tracked privately.');
    expect(preview.showPhoto).toBe(false);
  });

  it('only exposes name, photo, domain detail, and stats when opted in', () => {
    const preview = buildProgressSharePreview({
      displayName: 'Liam',
      dayInCycle: 84,
      xp: 18000,
      levelLabel: 'Level 10: Kairos',
      flywheel,
      preferences: {
        includeName: true,
        includePhoto: true,
        includeDomainDetail: true,
        includeStats: true,
      },
      profileImageDataUrl: 'data:image/png;base64,abc',
    });

    expect(preview.text).toContain('Liam: 12K progress');
    expect(preview.text).toContain('Body 64%');
    expect(preview.text).toContain('Connection 43%');
    expect(preview.text).toContain('Level: Level 10: Kairos. XP: 18000.');
    expect(preview.showPhoto).toBe(true);
  });

  it('copies when native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    const result = await shareOrCopyProgress(
      { title: '12K progress', text: 'Controlled text', showPhoto: false },
      { clipboard: { writeText } },
    );

    expect(result).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Controlled text');
  });

  it('treats cancelled native share as no-op', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));

    const result = await shareOrCopyProgress(
      { title: '12K progress', text: 'Controlled text', showPhoto: false },
      { share },
    );

    expect(result).toBe('cancelled');
  });
});
