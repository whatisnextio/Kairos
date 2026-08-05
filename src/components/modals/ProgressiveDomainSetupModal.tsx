import Button from '@/components/common/Button';
import SetupOptionSections from '@/components/common/SetupOptionSections';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { getAvailableDomains } from '@/types';
import type { DomainType } from '@/types';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import {
  CONNECTION_RECIPIENT_OPTIONS,
  type ConnectionContextId,
  type ConnectionRecipientId,
  buildConnectionFocusDescription,
  buildDomainSetupOptionModel,
  getConnectionContextOptions,
} from '@/utils/v1Framework';
import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export default function ProgressiveDomainSetupModal({ onClose }: Props) {
  const { authUser, profile, currentCycle, domainFocuses, setDomainFocuses } = useAppStore();
  const [focus, setFocus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionRecipient, setConnectionRecipient] = useState<ConnectionRecipientId>('partner');
  const [connectionContext, setConnectionContext] = useState<ConnectionContextId>('practical_help');

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
  const connectionContextOptions = getConnectionContextOptions(connectionRecipient);
  const setupOptions = buildDomainSetupOptionModel(nextDomain);

  function selectConnectionRecipient(nextRecipient: ConnectionRecipientId) {
    const nextContextOptions = getConnectionContextOptions(nextRecipient);
    const nextContext = nextContextOptions.some((option) => option.id === connectionContext)
      ? connectionContext
      : nextContextOptions[0].id;

    setConnectionRecipient(nextRecipient);
    setConnectionContext(nextContext);
    setFocus(buildConnectionFocusDescription(nextRecipient, nextContext));
  }

  function selectConnectionContext(nextContext: ConnectionContextId) {
    setConnectionContext(nextContext);
    setFocus(buildConnectionFocusDescription(connectionRecipient, nextContext));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
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
        className="w-full max-w-md bg-base-surface rounded-t-2xl px-6 pt-6 pb-10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-base-border rounded-full mx-auto mb-6" />

        <p className="font-heading text-xs text-base-muted tracking-widest uppercase mb-1">
          {remaining} domain{remaining !== 1 ? 's' : ''} remaining
        </p>
        <h2
          id="domain-setup-title"
          className="font-heading text-2xl font-bold text-base-text mb-1 tracking-wide"
        >
          Set up <span className={nextDomain.colour}>{nextDomain.label}</span>
        </h2>
        <p className="text-base-subtext text-sm mb-6">{nextDomain.question}</p>

        {nextDomain.type === 'USTIME' && (
          <div className="mb-4 flex flex-col gap-3">
            <div>
              <p className="mb-2 font-heading text-[11px] uppercase tracking-widest text-base-muted">
                Who is this for?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CONNECTION_RECIPIENT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    aria-pressed={connectionRecipient === option.id}
                    onClick={() => selectConnectionRecipient(option.id)}
                    className={`min-h-11 rounded border px-3 py-2 text-left text-sm transition-colors ${
                      connectionRecipient === option.id
                        ? 'border-accent-green bg-accent-green/10 text-base-text'
                        : 'border-base-border bg-base-black/20 text-base-subtext hover:border-base-muted'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-heading text-[11px] uppercase tracking-widest text-base-muted">
                What helps today?
              </p>
              <div className="grid grid-cols-1 gap-2">
                {connectionContextOptions.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    aria-pressed={connectionContext === option.id}
                    onClick={() => selectConnectionContext(option.id)}
                    className={`min-h-11 rounded border px-3 py-2 text-left text-sm transition-colors ${
                      connectionContext === option.id
                        ? 'border-accent-green bg-accent-green/10 text-base-text'
                        : 'border-base-border bg-base-black/20 text-base-subtext hover:border-base-muted'
                    }`}
                  >
                    <span className="block text-base-text">{option.label}</span>
                    <span className="mt-1 block text-xs text-base-muted">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <SetupOptionSections model={setupOptions} value={focus} onSelect={setFocus} />
        </div>

        <textarea
          className="input-field h-24 resize-none w-full mb-4"
          placeholder={`Custom. ${setupOptions.customPlaceholder}. ${nextDomain.focusPrompt}`}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        />

        {error && (
          <div role="alert" className="mb-3 text-xs text-status-missed">
            <p>{error}</p>
            <p className="mt-1 text-base-muted">Try again or skip for now.</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={!focus.trim() || saving} className="flex-1">
            {saving ? 'Saving...' : error ? 'Retry save' : 'Lock it in'}
          </Button>
        </div>
      </div>
    </div>
  );
}
