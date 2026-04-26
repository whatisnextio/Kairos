import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { DailyCheckIn, DomainType, CheckInStatus } from '@/types';

interface RawCheckIn {
  id: string;
  user_id: string;
  cycle_id: string;
  date: string;
  domain_type: DomainType;
  status: CheckInStatus;
  notes: string | null;
  xp_awarded: number;
  created_at: string;
  updated_at: string;
}

function toCheckIn(raw: RawCheckIn): DailyCheckIn {
  return {
    id: raw.id,
    userId: raw.user_id,
    cycleId: raw.cycle_id,
    date: raw.date,
    domainType: raw.domain_type,
    status: raw.status,
    notes: raw.notes,
    xpAwarded: raw.xp_awarded,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function useDomainCheckIns(domainType: DomainType, limit = 28) {
  const profile = useAppStore((s) => s.profile);
  const currentCycle = useAppStore((s) => s.currentCycle);
  const enabled = !!profile && !!currentCycle && profile.tier === 'brotherhood';

  return useQuery({
    queryKey: ['check-ins', profile?.id, domainType, limit],
    queryFn: async () => {
      if (!profile || !currentCycle) throw new Error('No profile or cycle');

      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', profile.id)
        .eq('cycle_id', currentCycle.id)
        .eq('domain_type', domainType)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return (data ?? []).map((row: RawCheckIn) => toCheckIn(row));
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
