import type { DomainSetupOptionModel } from '@/utils/v1Framework';

interface SetupOptionSectionsProps {
  model: DomainSetupOptionModel;
  value: string;
  onSelect: (option: string) => void;
}

export default function SetupOptionSections({ model, value, onSelect }: SetupOptionSectionsProps) {
  return (
    <div>
      <p className="mb-2 font-heading text-[11px] uppercase tracking-widest text-base-muted">
        Choose one action
      </p>
      <div className="grid grid-cols-1 gap-2">
        {model.focusOptions.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => onSelect(option)}
            aria-pressed={value === option}
            className={`min-h-11 rounded border px-3 py-2 text-left text-sm transition-colors ${
              value === option
                ? 'border-accent-green bg-accent-green/10 text-base-text'
                : 'border-base-border bg-base-black/20 text-base-subtext hover:border-base-muted'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
