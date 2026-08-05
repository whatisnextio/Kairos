import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { AiNudge, DomainType, KairosPhase, NudgeCta, NudgeStatus, NudgeType } from '@/types';
import { getLevelForXp } from '@/utils/gamification';
import { LOCAL_FALLBACK_NUDGE_ID_PREFIX, buildLocalFallbackNudge } from '@/utils/nudgeFallback';
import { toLocalIsoDate } from '@/utils/v1Framework';
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

async function fetchOrGenerateNudge(accessToken: string, fallbackNudge: AiNudge): Promise<AiNudge> {
  try {
    const res = await fetch(NUDGE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return fallbackNudge;
    }

    const { nudge } = await res.json().catch(() => ({ nudge: null }));
    if (!nudge) return fallbackNudge;
    return mapNudge(nudge as Record<string, unknown>);
  } catch {
    return fallbackNudge;
  }
}

export function useNudge() {
  const profile = useAppStore((s) => s.profile);
  const authUser = useAppStore((s) => s.authUser);
  const currentCycle = useAppStore((s) => s.currentCycle);
  const domainFocuses = useAppStore((s) => s.domainFocuses);
  const customRoutes = useAppStore((s) => s.customRoutes);
  const todayCheckIns = useAppStore((s) => s.todayCheckIns);

  const today = toLocalIsoDate(new Date());
  const enabled = !!authUser && !!profile;

  return useQuery({
    queryKey: ['nudge', profile?.id, today],
    queryFn: async () => {
      if (!profile) throw new Error('No profile');
      const fallbackNudge = buildLocalFallbackNudge({
        profile,
        currentCycle,
        domainFocuses,
        customRoutes,
        todayCheckIns,
        email: authUser?.email,
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return fallbackNudge;
      return fetchOrGenerateNudge(session.access_token, fallbackNudge);
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
  const today = toLocalIsoDate(new Date());

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
      const previous = queryClient.getQueryData<AiNudge>(['nudge', profile?.id, today]);
      if (!nudgeId.startsWith(LOCAL_FALLBACK_NUDGE_ID_PREFIX)) {
        const { error } = await supabase.from('ai_nudges').update({ status }).eq('id', nudgeId);
        if (error) throw new Error(error.message);
      }
      return { nudgeId, status, xpReward, previousStatus: previous?.status };
    },
    onSuccess: async ({ status, xpReward, previousStatus }) => {
      queryClient.setQueryData(['nudge', profile?.id, today], (old: AiNudge | undefined) =>
        old ? { ...old, status } : old,
      );

      // Award XP when the nudge is marked complete and carries a reward.
      // Applies to all users: optimistic update plus Supabase sync.
      if (status === 'completed' && previousStatus !== 'completed' && xpReward && xpReward > 0) {
        const currentProfile = useAppStore.getState().profile;
        if (currentProfile) {
          const oldXp = currentProfile.xp;
          const newXp = oldXp + xpReward;
          setProfile({ ...currentProfile, xp: newXp });

          const oldLevel = getLevelForXp(oldXp);
          const newLevel = getLevelForXp(newXp);
          if (newLevel.level > oldLevel.level) {
            useAppStore
              .getState()
              .setLevelUpPending({ level: newLevel.level, label: newLevel.label });
          }

          await supabase.rpc('increment_profile_xp', {
            p_user_id: currentProfile.id,
            p_delta: xpReward,
          });
        }
      }
    },
  });
}
