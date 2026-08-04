import type { FlywheelSummary } from '@/utils/v1Framework';

export interface SharePrivacyPreferences {
  includeName: boolean;
  includePhoto: boolean;
  includeDomainDetail: boolean;
  includeStats: boolean;
}

export const DEFAULT_SHARE_PRIVACY: SharePrivacyPreferences = {
  includeName: false,
  includePhoto: false,
  includeDomainDetail: false,
  includeStats: true,
};

export interface ProgressShareInput {
  displayName: string;
  dayInCycle: number;
  xp: number;
  levelLabel: string;
  earnedBadgeLabel?: string;
  flywheel: FlywheelSummary;
  preferences: SharePrivacyPreferences;
  profileImageDataUrl?: string | null;
}

export interface SharePreview {
  title: string;
  text: string;
  showPhoto: boolean;
}

interface ShareNavigator {
  share?: (data: { title: string; text: string }) => Promise<void>;
  clipboard?: {
    writeText?: (text: string) => Promise<void>;
  };
}

export type ShareResult = 'shared' | 'copied' | 'unsupported' | 'cancelled';

export function normaliseSharePrivacyPreferences(
  preferences: Partial<SharePrivacyPreferences> | null | undefined,
): SharePrivacyPreferences {
  return { ...DEFAULT_SHARE_PRIVACY, ...(preferences ?? {}) };
}

export function buildProgressSharePreview(input: ProgressShareInput): SharePreview {
  const preferences = normaliseSharePrivacyPreferences(input.preferences);
  const owner = preferences.includeName ? `${input.displayName.trim() || 'I'}: ` : '';
  const lines = [
    `${owner}12K progress, Day ${input.dayInCycle} of 84.`,
    input.earnedBadgeLabel ? `Milestone: ${input.earnedBadgeLabel}.` : 'Still in the daily loop.',
  ];

  if (preferences.includeStats) {
    lines.push(`Level: ${input.levelLabel}. XP: ${input.xp}.`);
  }

  if (preferences.includeDomainDetail) {
    const core = input.flywheel.entries.map((entry) => `${entry.label} ${entry.score}%`).join(', ');
    lines.push(`Core flywheel: ${core}.`);
  } else {
    lines.push('Core flywheel tracked privately.');
  }

  lines.push('Powered by Kairos.');

  return {
    title: '12K progress',
    text: lines.join('\n'),
    showPhoto: preferences.includePhoto && !!input.profileImageDataUrl,
  };
}

export async function shareOrCopyProgress(
  preview: SharePreview,
  shareNavigator: ShareNavigator = navigator,
): Promise<ShareResult> {
  if (shareNavigator.share) {
    try {
      await shareNavigator.share({ title: preview.title, text: preview.text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }

  if (shareNavigator.clipboard?.writeText) {
    await shareNavigator.clipboard.writeText(preview.text);
    return 'copied';
  }

  return 'unsupported';
}
