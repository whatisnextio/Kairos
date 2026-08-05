import {
  type DismissibleTipId,
  readDismissibleTip,
  writeDismissibleTip,
} from '@/utils/dismissibleTips';
import { type ReactNode, useEffect, useState } from 'react';

interface DismissibleTipProps {
  children: ReactNode;
  eyebrow?: string;
  profileId: string | null | undefined;
  tipId: DismissibleTipId;
  title: string;
  className?: string;
}

export default function DismissibleTip({
  children,
  eyebrow = 'Tip',
  profileId,
  tipId,
  title,
  className = '',
}: DismissibleTipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!readDismissibleTip(profileId, tipId));
  }, [profileId, tipId]);

  if (!visible || !profileId) return null;

  const dismiss = () => {
    writeDismissibleTip(profileId, tipId);
    setVisible(false);
  };

  return (
    <aside
      role="note"
      className={`rounded-lg border border-accent-green/30 bg-accent-green/5 p-3 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-[11px] uppercase tracking-widest text-accent-green">
            {eyebrow}
          </p>
          <p className="mt-1 font-heading text-sm font-semibold tracking-wide text-base-text">
            {title}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded border border-base-border px-2 py-1 text-base-muted text-[11px] transition-colors hover:border-base-muted hover:text-base-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
          aria-label={`Hide ${title} tip`}
        >
          Hide
        </button>
      </div>
      <div className="mt-2 text-sm leading-snug text-base-subtext">{children}</div>
    </aside>
  );
}
