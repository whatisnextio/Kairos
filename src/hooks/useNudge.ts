import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { AiNudge, DomainType, KairosPhase, NudgeCta, NudgeStatus, NudgeType } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const NUDGE_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-kairos-nudge`;

function mapNudge(raw: Record<string, unknown>): AiNudge {
  return {
    id: raw.id as string,
    userId: raw.user_id as string,
    date: raw.date as string,
    type: raw.type as NudgeType,
    title: raw.title as string,
    body: raw.body as string,
    domainType: (raw.domain_type as DomainType | null) ?? null,
    kairosPhase: (raw.kairos_phase as KairosPhase | null) ?? null,
    xpReward: (raw.xp_reward as number | null) ?? null,
    status: raw.status as NudgeStatus,
    cta: (raw.cta as NudgeCta) ?? null,
    generatedAt: raw.generated_at as string,
  };
}

async function fetchOrGenerateNudge(accessToken: string): Promise<AiNudge> {
  const res = await fetch(NUDGE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Nudge fetch failed: ${res.status}`);
  }

  const { nudge } = await res.json();
  return mapNudge(nudge as Record<string, unknown>);
}

export function useNudge() {
  const profile = useAppStore((s) => s.profile);
  const authUser = useAppStore((s) => s.authUser);

  const today = new Date().toISOString().split('T')[0];
  const isSunday = new Date().getDay() === 0;
  const enabled = !!authUser && !!profile && (profile.tier === 'brotherhood' || isSunday);

  return useQuery({
    queryKey: ['nudge', profile?.id, today],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      return fetchOrGenerateNudge(session.access_token);
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 4, // 4 hours; nudge is cached server-side by date
    retry: 1,
  });
}

export function useUpdateNudgeStatus() {
  const queryClient = useQueryClient();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const today = new Date().toISOString().split('T')[0];

  return useMutation({
    mutationFn: async ({
      nudgeId,
      status,
      xpReward,
    }: {
      nudgeId: string;
      status: NudgeStatus;
      xpReward?: number | null;
    }) => {
      const { error } = await supabase.from('ai_nudges').update({ status }).eq('id', nudgeId);
      if (error) throw new Error(error.message);
      return { nudgeId, status, xpReward };
    },
    onSuccess: async ({ status, xpReward }) => {
      queryClient.setQueryData(['nudge', profile?.id, today], (old: AiNudge | undefined) =>
        old ? { ...old, status } : old,
      );

      // Award XP when the nudge is marked complete and carries a reward.
      // Applies to all tiers: optimistic update + Supabase sync for brotherhood.
      if (status === 'completed' && xpReward && xpReward > 0 && profile) {
        setProfile({ ...profile, xp: profile.xp + xpReward });
        if (profile.tier === 'brotherhood') {
          await supabase.rpc('increment_profile_xp', { p_user_id: profile.id, p_delta: xpReward });
        }
      }
    },
  });
}
