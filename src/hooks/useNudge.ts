import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { AiNudge, NudgeStatus } from '@/types';

const NUDGE_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-kairos-nudge`;

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
  return nudge as AiNudge;
}

export function useNudge() {
  const profile = useAppStore((s) => s.profile);
  const authUser = useAppStore((s) => s.authUser);
  const setTodayNudge = useAppStore((s) => s.setTodayNudge);

  const today = new Date().toISOString().split('T')[0];
  const isSunday = new Date().getDay() === 0;
  const enabled = !!authUser && !!profile && (profile.tier === 'brotherhood' || isSunday);

  return useQuery({
    queryKey: ['nudge', profile?.id, today],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const nudge = await fetchOrGenerateNudge(session.access_token);
      setTodayNudge(nudge);
      return nudge;
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 4, // 4 hours; nudge is cached server-side by date
    retry: 1,
  });
}

export function useUpdateNudgeStatus() {
  const queryClient = useQueryClient();
  const profile = useAppStore((s) => s.profile);
  const today = new Date().toISOString().split('T')[0];

  return useMutation({
    mutationFn: async ({ nudgeId, status }: { nudgeId: string; status: NudgeStatus }) => {
      const { error } = await supabase
        .from('ai_nudges')
        .update({ status })
        .eq('id', nudgeId);
      if (error) throw new Error(error.message);
      return { nudgeId, status };
    },
    onSuccess: ({ status }) => {
      queryClient.setQueryData(
        ['nudge', profile?.id, today],
        (old: AiNudge | undefined) => old ? { ...old, status } : old,
      );
    },
  });
}
