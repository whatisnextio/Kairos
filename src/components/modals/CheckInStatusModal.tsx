import Button from '@/components/common/Button';
import type { CheckInStatus } from '@/types';

interface Props {
  label: string;
  currentStatus?: CheckInStatus;
  onSelect: (status: CheckInStatus) => void;
  onClose: () => void;
}

const OPTIONS: Array<{ status: CheckInStatus; title: string; body: string }> = [
  { status: 'Done', title: 'Done', body: 'Full action completed.' },
  { status: 'Partial', title: 'Part done', body: 'Did a smaller version.' },
  { status: 'Missed', title: 'Missed', body: 'Did not happen today.' },
  { status: 'Pending', title: 'Clear', body: "Remove today's mark." },
];

export default function CheckInStatusModal({ label, currentStatus, onSelect, onClose }: Props) {
  const hasMarkToClear = currentStatus !== undefined && currentStatus !== 'Pending';
  const options = OPTIONS.filter((option) => option.status !== 'Pending' || hasMarkToClear);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: bottom-sheet modal, dialog element requires separate refactor */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="check-in-status-title"
        className="w-full max-w-md bg-base-surface rounded-t-2xl px-6 pt-6 pb-8"
      >
        <div className="w-10 h-1 bg-base-border rounded-full mx-auto mb-6" />
        <p className="font-heading text-xs text-base-muted tracking-widest uppercase mb-1">Today</p>
        <h2
          id="check-in-status-title"
          className="font-heading text-xl font-bold text-base-text tracking-wide mb-4"
        >
          How did {label} go?
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {options.map((option) => {
            const active = option.status === currentStatus;
            return (
              <button
                type="button"
                key={option.status}
                onClick={() => onSelect(option.status)}
                className={`rounded border p-3 text-left transition-colors ${
                  active
                    ? 'border-accent-green bg-accent-green/10'
                    : 'border-base-border bg-base-black/20 hover:border-base-muted'
                }`}
              >
                <p className="font-heading text-sm font-medium text-base-text">{option.title}</p>
                <p className="text-base-subtext text-xs mt-1">{option.body}</p>
              </button>
            );
          })}
        </div>
        <Button variant="ghost" onClick={onClose} className="w-full mt-5">
          Cancel
        </Button>
      </div>
    </div>
  );
}
