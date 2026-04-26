import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { DOMAINS, type DomainType } from '@/types';
import Card from '@/components/common/Card';

export default function DetailScreen() {
  const { domain } = useParams<{ domain: string }>();
  const { domainFocuses, streaks } = useAppStore();

  const domainType = domain?.toUpperCase() as DomainType;
  const domainConfig = DOMAINS.find((d) => d.type === domainType);
  const focus = domainFocuses.find((f) => f.domainType === domainType);
  const streak = streaks[domainType];

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
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">This cycle's focus</p>
          <p className="text-base-text">{focus.focusDescription}</p>
        </Card>
      )}

      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">Current streak</p>
        <p className="font-heading text-3xl font-bold text-base-text">
          {streak?.currentStreak ?? 0}
        </p>
        <p className="text-base-subtext text-xs mt-1">
          Longest: {streak?.longestStreak ?? 0} days
        </p>
      </Card>

      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-3">History</p>
        <p className="text-base-muted text-sm">Check-in history coming in the next update.</p>
      </Card>
    </div>
  );
}
