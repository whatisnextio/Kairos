import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useStreaks } from '@/hooks/useStreaks';
import { DOMAINS, type DomainType } from '@/types';
import Card from '@/components/common/Card';

const STATUS_DOT: Record<string, string> = {
  Done:    'bg-status-done',
  Partial: 'bg-status-partial',
  Missed:  'bg-status-missed',
  Pending: 'bg-base-border',
};

export default function DetailScreen() {
  const { domain } = useParams<{ domain: string }>();
  const { profile, domainFocuses, streaks: localStreaks, todayCheckIns } = useAppStore();
  const { data: remoteStreaks } = useStreaks();

  const domainType = domain?.toUpperCase() as DomainType;
  const domainConfig = DOMAINS.find((d) => d.type === domainType);
  const focus = domainFocuses.find((f) => f.domainType === domainType);

  // Brotherhood uses Supabase streaks; free tier uses local store
  const streak =
    profile?.tier === 'brotherhood'
      ? remoteStreaks?.find((s) => s.domainType === domainType)
      : localStreaks[domainType];

  if (!domainConfig) {
    return (
      <div className="px-4 pt-6">
        <p className="text-base-subtext">Domain not found.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      <h1 className={`font-heading text-2xl font-bold tracking-wide ${domainConfig.colour}`}>
        {domainConfig.label}
      </h1>

      {focus && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">
            This cycle's focus
          </p>
          <p className="text-base-text">{focus.focusDescription}</p>
        </Card>
      )}

      {/* Streak */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">
          Current streak
        </p>
        <p className="font-heading text-3xl font-bold text-base-text">
          {streak?.currentStreak ?? 0}
          <span className="text-base-subtext text-base font-normal ml-1">days</span>
        </p>
        <p className="text-base-subtext text-xs mt-1">
          Longest: {streak?.longestStreak ?? 0} days
        </p>
        {streak?.lastCheckInDate && (
          <p className="text-base-muted text-xs mt-0.5">
            Last check-in: {streak.lastCheckInDate}
          </p>
        )}
      </Card>

      {/* Today's check-in status for this domain */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">Today</p>
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[todayCheckIns[domainType]?.status ?? 'Pending'] ?? 'bg-base-border'}`}
          />
          <span className="text-base-text text-sm">
            {todayCheckIns[domainType]?.status ?? 'Not checked in'}
          </span>
        </div>
      </Card>
    </div>
  );
}
