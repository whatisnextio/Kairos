import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { DomainType, UserStreak } from '@/types';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { useQuery } from '@tanstack/react-query';

interface RawStreak {
  domain_type: DomainType;
  current_streak: number;
  longest_streak: number;
  last_check_in_date: string | null;
}

function toUserStreak(userId: string, raw: RawStreak): UserStreak {
  return {
    userId,
    domainType: raw.domain_type,
    currentStreak: raw.current_streak,
    longestStreak: raw.longest_streak,
    lastCheckInDate: raw.last_check_in_date,
  };
}

export function useStreaks() {
  const profile = useAppStore((s) => s.profile);
  const enabled = !!profile && hasBrotherhoodAccess(profile.tier);

  return useQuery({
    queryKey: ['streaks', profile?.id],
    queryFn: async () => {
      if (!profile) throw new Error('No profile');
      const { data, error } = await supabase
        .from('user_streaks')
        .select('domain_type, current_streak, longest_streak, last_check_in_date')
        .eq('user_id', profile.id);

      if (error) throw new Error(error.message);
      return (data ?? []).map((row: RawStreak) => toUserStreak(profile.id, row));
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
