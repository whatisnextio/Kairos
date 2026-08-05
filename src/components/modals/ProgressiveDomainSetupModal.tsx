import Button from '@/components/common/Button';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { getAvailableDomains } from '@/types';
import type { DomainType } from '@/types';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export default function ProgressiveDomainSetupModal({ onClose }: Props) {
  const { authUser, profile, currentCycle, domainFocuses, setDomainFocuses } = useAppStore();
  const [focus, setFocus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableDomains = getAvailableDomains(authUser?.email);
  const setupDomains = new Set(domainFocuses.map((f) => f.domainType));
  const nextDomain = availableDomains.find((d) => !setupDomains.has(d.type));

  if (!nextDomain || !authUser || !profile || !currentCycle) return null;

  async function handleSave() {
    if (!focus.trim() || !authUser || !profile || !currentCycle || !nextDomain) return;
    setSaving(true);
    setError(null);
    const trimmedFocus = focus.trim();
    const userId = authUser.id;
    const cycleId = currentCycle.id;
    const domainType = nextDomain.type as DomainType;

    function addLocalFocus(id: string, setAt: string) {
      setDomainFocuses([
        ...domainFocuses,
        {
          id,
          userId,
          cycleId,
          domainType,
          focusDescription: trimmedFocus,
          setAt,
        },
      ]);
    }

    if (!hasBrotherhoodAccess(profile.tier)) {
      addLocalFocus(crypto.randomUUID(), new Date().toISOString());
      setSaving(false);
      onClose();
      return;
    }

    const { data, error: err } = await supabase
      .from('user_domain_focuses')
      .insert({
        user_id: userId,
        cycle_id: cycleId,
        domain_type: domainType,
        focus_description: trimmedFocus,
      })
      .select()
      .single();

    if (err || !data) {
      setError(err?.message ?? 'Failed to save');
      setSaving(false);
      return;
    }

    addLocalFocus(data.id, data.set_at);

    setSaving(false);
    onClose();
  }

  const remaining = availableDomains.filter((domain) => !setupDomains.has(domain.type)).length;
  const primaryOption = nextDomain.focusOptions[0] ?? '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: bottom-sheet modal, dialog element requires separate refactor */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-setup-title"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-base-surface"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-base-border bg-base-surface px-6 pb-4 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-base-border" />
          <p className="font-heading text-xs uppercase tracking-widest text-base-muted">
            {remaining} area{remaining !== 1 ? 's' : ''} left
          </p>
          <h2
            id="domain-setup-title"
            className="font-heading mt-1 text-2xl font-bold tracking-wide text-base-text"
          >
            Add <span className={nextDomain.colour}>{nextDomain.label}</span>
          </h2>
          <p className="mt-2 text-sm text-base-subtext">
            Choose one starter action for this area. You can change it later.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {primaryOption && (
            <button
              type="button"
              onClick={() => setFocus(primaryOption)}
              className={`w-full rounded border px-3 py-3 text-left text-sm transition-colors ${
                focus === primaryOption
                  ? 'border-accent-green bg-accent-green/10 text-base-text'
                  : 'border-base-border bg-base-black/20 text-base-subtext hover:border-base-muted'
              }`}
            >
              {primaryOption}
            </button>
          )}

          <label className="mt-4 block">
            <span className="font-heading text-xs uppercase tracking-widest text-base-muted">
              Or write your own
            </span>
            <textarea
              className="input-field mt-2 h-24 w-full resize-none text-sm"
              placeholder={nextDomain.focusPrompt}
              value={focus === primaryOption ? '' : focus}
              onChange={(e) => setFocus(e.target.value)}
            />
          </label>

          <p className="mt-3 text-xs text-base-muted">
            Small prep steps, like getting your gear ready, appear after this action is saved.
          </p>

          {error && (
            <div role="alert" className="mt-3 text-xs text-status-missed">
              <p>{error}</p>
              <p className="mt-1 text-base-muted">Try again or skip for now.</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-base-border bg-base-surface px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={!focus.trim() || saving} className="flex-1">
            {saving ? 'Saving...' : error ? 'Retry save' : 'Save action'}
          </Button>
        </div>
      </div>
    </div>
  );
}
