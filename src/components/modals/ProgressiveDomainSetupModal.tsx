import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/services/supabaseClient';
import { DOMAINS } from '@/types';
import type { DomainType } from '@/types';
import Button from '@/components/common/Button';

interface Props {
  onClose: () => void;
}

export default function ProgressiveDomainSetupModal({ onClose }: Props) {
  const { authUser, profile, currentCycle, domainFocuses, setDomainFocuses } = useAppStore();
  const [focus, setFocus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setupDomains = new Set(domainFocuses.map((f) => f.domainType));
  const nextDomain = DOMAINS.find((d) => !setupDomains.has(d.type));

  if (!nextDomain || !authUser || !profile || !currentCycle) return null;

  async function handleSave() {
    if (!focus.trim() || !nextDomain) return;
    setSaving(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('user_domain_focuses')
      .insert({
        user_id: authUser!.id,
        cycle_id: currentCycle!.id,
        domain_type: nextDomain.type,
        focus_description: focus.trim(),
      })
      .select()
      .single();

    if (err || !data) {
      setError(err?.message ?? 'Failed to save');
      setSaving(false);
      return;
    }

    setDomainFocuses([
      ...domainFocuses,
      {
        id: data.id,
        userId: authUser!.id,
        cycleId: currentCycle!.id,
        domainType: nextDomain.type as DomainType,
        focusDescription: focus.trim(),
        setAt: data.set_at,
      },
    ]);

    setSaving(false);
    onClose();
  }

  const remaining = DOMAINS.length - setupDomains.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-setup-title"
        className="w-full max-w-md bg-base-surface rounded-t-2xl px-6 pt-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-base-border rounded-full mx-auto mb-6" />

        <p className="font-heading text-xs text-base-muted tracking-widest uppercase mb-1">
          {remaining} domain{remaining !== 1 ? 's' : ''} remaining
        </p>
        <h2 id="domain-setup-title" className="font-heading text-2xl font-bold text-base-text mb-1 tracking-wide">
          Set up{' '}
          <span className={nextDomain.colour}>{nextDomain.label}</span>
        </h2>
        <p className="text-base-subtext text-sm mb-6">
          What's your one focus for <span className="text-base-text font-medium">{nextDomain.label}</span> this cycle?
        </p>

        <textarea
          className="input-field h-24 resize-none w-full mb-4"
          placeholder={nextDomain.focusPrompt}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          autoFocus
        />

        {error && <p role="alert" className="text-status-missed text-xs mb-3">{error}</p>}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Later
          </Button>
          <Button onClick={handleSave} disabled={!focus.trim() || saving} className="flex-1">
            {saving ? 'Saving…' : 'Lock it in'}
          </Button>
        </div>
      </div>
    </div>
  );
}
