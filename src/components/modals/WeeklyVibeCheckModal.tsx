import Button from '@/components/common/Button';
import { useAppStore } from '@/store/useAppStore';
import type { VibeCheck } from '@/types';
import { useState } from 'react';

interface Props {
  onClose: () => void;
}

const RATINGS: Array<{ value: VibeCheck['rating']; label: string }> = [
  { value: 1, label: 'Rough' },
  { value: 2, label: 'Tough' },
  { value: 3, label: 'Solid' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Elite' },
];

export default function WeeklyVibeCheckModal({ onClose }: Props) {
  const { submitVibeCheck } = useAppStore();
  const [selected, setSelected] = useState<VibeCheck['rating'] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    await submitVibeCheck(selected);
    setLoading(false);
    onClose();
  };

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
        aria-labelledby="vibe-modal-title"
        className="w-full max-w-md bg-base-surface rounded-t-2xl px-6 pt-6 pb-8 flex flex-col gap-5"
      >
        <div>
          <h2
            id="vibe-modal-title"
            className="font-heading text-lg font-bold text-base-text tracking-wide"
          >
            Weekly check-in
          </h2>
          <p className="text-base-subtext text-sm mt-1">
            How have you felt overall this week? Be honest.
          </p>
        </div>

        <div className="flex gap-2 justify-between">
          {RATINGS.map((r) => (
            <button
              type="button"
              key={r.value}
              onClick={() => setSelected(r.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded border transition-colors ${
                selected === r.value
                  ? 'border-accent-green bg-accent-green/10 text-accent-green'
                  : 'border-base-border text-base-subtext hover:border-base-muted'
              }`}
            >
              <span className="font-heading font-bold text-lg">{r.value}</span>
              <span className="text-xs tracking-wide">{r.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="md" onClick={onClose} className="flex-1">
            Skip
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!selected || loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
