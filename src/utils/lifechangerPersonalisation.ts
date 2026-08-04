import type { CheckInStatus, DomainType, SubscriptionTier } from '@/types';

export type LifechangerSignalType = 'trend' | 'vibe' | 'streak' | 'note_keyword' | 'cross_domain';

export interface LifechangerSourceCheckIn {
  date: string;
  domain: DomainType | string;
  status: CheckInStatus | string;
  notes?: string | null;
}

export interface LifechangerSourceStreak {
  domain: DomainType | string;
  current: number;
  longest: number;
}

export interface LifechangerSourceVibe {
  rating: number;
  date: string;
}

export interface LifechangerPatternInput {
  tier: SubscriptionTier | string | null | undefined;
  recentCheckIns: LifechangerSourceCheckIn[];
  recentCustomRouteCheckIns?: LifechangerSourceCheckIn[];
  streaks: LifechangerSourceStreak[];
  vibeChecks?: LifechangerSourceVibe[];
}

export interface LifechangerPatternSignal {
  type: LifechangerSignalType;
  label: string;
  promptLine: string;
}

const NOTE_KEYWORDS = [
  'tired',
  'sleep',
  'pain',
  'stress',
  'anxious',
  'overwhelmed',
  'alcohol',
  'bread',
  'bloated',
  'energy',
  'argued',
  'avoid',
  'missed',
];

function completionWeight(status: string): number {
  if (status === 'Done' || status === 'Protected') return 1;
  if (status === 'Partial') return 0.5;
  return 0;
}

function formatDomain(domain: string): string {
  if (domain === 'METIME') return 'Self';
  if (domain === 'USTIME') return 'Connection';
  return domain.charAt(0) + domain.slice(1).toLowerCase();
}

function groupByDomain(checkIns: LifechangerSourceCheckIn[]) {
  return checkIns.reduce<Record<string, LifechangerSourceCheckIn[]>>((groups, checkIn) => {
    const domain = String(checkIn.domain);
    groups[domain] = groups[domain] ?? [];
    groups[domain].push(checkIn);
    return groups;
  }, {});
}

export function buildLifechangerPatternSignals({
  tier,
  recentCheckIns,
  recentCustomRouteCheckIns = [],
  streaks,
  vibeChecks = [],
}: LifechangerPatternInput): LifechangerPatternSignal[] {
  if (tier !== 'lifechanger') return [];

  const signals: LifechangerPatternSignal[] = [];
  const grouped = groupByDomain(recentCheckIns);

  for (const [domain, items] of Object.entries(grouped)) {
    if (items.length < 3) continue;

    const score =
      items.reduce((sum, item) => sum + completionWeight(item.status), 0) / items.length;
    const label = formatDomain(domain);

    if (score >= 0.75) {
      signals.push({
        type: 'trend',
        label: `${label} is holding`,
        promptLine: `${label} is the strongest recent trend at ${Math.round(score * 100)}% completion.`,
      });
      break;
    }

    const missCount = items.filter((item) => item.status === 'Missed').length;
    if (missCount >= 2) {
      signals.push({
        type: 'trend',
        label: `${label} is slipping`,
        promptLine: `${label} has ${missCount} recent misses, so the nudge should offer a recovery path.`,
      });
      break;
    }
  }

  const sortedVibes = [...vibeChecks].sort((a, b) => a.date.localeCompare(b.date));
  if (sortedVibes.length >= 2) {
    const first = sortedVibes[0];
    const last = sortedVibes[sortedVibes.length - 1];
    if (Math.abs(last.rating - first.rating) >= 1) {
      signals.push({
        type: 'vibe',
        label: last.rating > first.rating ? 'Vibe improving' : 'Vibe dropping',
        promptLine: `Vibe moved from ${first.rating}/5 to ${last.rating}/5 across recent checks.`,
      });
    }
  }

  const meaningfulStreak = streaks
    .filter((streak) => streak.current >= 3 || (streak.longest >= 7 && streak.current === 0))
    .sort((a, b) => b.current - a.current || b.longest - a.longest)[0];
  if (meaningfulStreak) {
    const label = formatDomain(String(meaningfulStreak.domain));
    signals.push({
      type: 'streak',
      label: `${label} streak signal`,
      promptLine:
        meaningfulStreak.current >= 3
          ? `${label} has a ${meaningfulStreak.current}-day current streak to protect.`
          : `${label} had a ${meaningfulStreak.longest}-day best streak and needs a restart.`,
    });
  }

  const noteSource = [...recentCheckIns, ...recentCustomRouteCheckIns].find((item) => {
    const note = item.notes?.toLowerCase() ?? '';
    return NOTE_KEYWORDS.some((keyword) => note.includes(keyword));
  });
  if (noteSource?.notes) {
    const keyword = NOTE_KEYWORDS.find((item) => noteSource.notes?.toLowerCase().includes(item));
    signals.push({
      type: 'note_keyword',
      label: 'Note keyword',
      promptLine: `Recent notes mention "${keyword}", so keep the nudge practical and non-diagnostic.`,
    });
  }

  const bodyFuelGood = ['BODY', 'FUEL'].some((domain) =>
    grouped[domain]?.some((item) => completionWeight(item.status) >= 1),
  );
  const selfConnectionOpen = ['METIME', 'USTIME'].some((domain) =>
    grouped[domain]?.some((item) => item.status === 'Missed' || item.status === 'Partial'),
  );
  if (bodyFuelGood && selfConnectionOpen) {
    signals.push({
      type: 'cross_domain',
      label: 'Body/Fuel can support Self/Connection',
      promptLine:
        'Body or Fuel has recent proof while Self or Connection is open, so connect the next action across domains.',
    });
  }

  return signals.slice(0, 4);
}

export function buildLifechangerPromptSection(signals: LifechangerPatternSignal[]): string {
  if (signals.length === 0) {
    return 'Lifechanger pattern support: insufficient history for advanced pattern claims. Use standard phase and domain support only.';
  }

  return [
    'Lifechanger pattern support: use one grounded signal, not all of them.',
    ...signals.map((signal) => `- ${signal.promptLine}`),
  ].join('\n');
}
