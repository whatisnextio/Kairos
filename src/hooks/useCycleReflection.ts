import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const REFLECTION_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cycle-reflection`;

export interface CycleReflection {
  id: string;
  title: string;
  body: string;
  status: string;
  domain_callouts: Record<string, string>;
  next_cycle_intention: string;
  stats: {
    totalXp: number;
    totalCheckIns: number;
    overallCompletionRate: number;
    strongestDomain: string;
    weakestDomain: string;
  };
}

async function fetchReflection(accessToken: string): Promise<CycleReflection> {
  const res = await fetch(REFLECTION_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Reflection fetch failed: ${res.status}`);
  }

  const { reflection } = await res.json();
  return reflection as CycleReflection;
}

export function useCycleReflection(enabled: boolean) {
  const profile = useAppStore((s) => s.profile);
  const currentCycle = useAppStore((s) => s.currentCycle);

  return useQuery({
    queryKey: ['cycle-reflection', profile?.id, currentCycle?.id],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      return fetchReflection(session.access_token);
    },
    enabled: enabled && !!profile && !!currentCycle && hasBrotherhoodAccess(profile.tier),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });
}

export function useMarkReflectionViewed() {
  const queryClient = useQueryClient();
  const profile = useAppStore((s) => s.profile);
  const currentCycle = useAppStore((s) => s.currentCycle);

  return useMutation({
    mutationFn: async (reflectionId: string) => {
      const { error } = await supabase
        .from('ai_nudges')
        .update({ status: 'accepted' })
        .eq('id', reflectionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['cycle-reflection', profile?.id, currentCycle?.id],
      });
    },
  });
}
