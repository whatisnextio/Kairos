import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { SquadPulse } from '@/types';
import { useMutation, useQuery } from '@tanstack/react-query';

const SQUAD_MATCH_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match-to-squad`;

interface RawSquadPulse {
  id: string;
  squad_id: string;
  week_number: number;
  message: string;
  generated_at: string;
}

function toSquadPulse(raw: RawSquadPulse): SquadPulse {
  return {
    id: raw.id,
    squadId: raw.squad_id,
    weekNumber: raw.week_number,
    message: raw.message,
    generatedAt: raw.generated_at,
  };
}

export function useSquadPulse() {
  const profile = useAppStore((s) => s.profile);
  const enabled = !!profile && profile.tier === 'brotherhood' && !!profile.squadId;

  return useQuery({
    queryKey: ['squad-pulse', profile?.squadId],
    queryFn: async () => {
      if (!profile?.squadId) throw new Error('No squad');

      // Get latest pulse for this squad
      const { data, error } = await supabase
        .from('squad_pulses')
        .select('*')
        .eq('squad_id', profile.squadId)
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;
      return toSquadPulse(data as RawSquadPulse);
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export interface SquadMemberStatus {
  memberIndex: number;
  anchorInitial: string;
  bodyStatus: string | null;
  loveStatus: string | null;
  missionStatus: string | null;
  spiritStatus: string | null;
}

export function useSquadMembers() {
  const profile = useAppStore((s) => s.profile);
  const enabled = !!profile && profile.tier === 'brotherhood' && !!profile.squadId;

  return useQuery({
    queryKey: ['squad-members', profile?.squadId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_squad_members_status');
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: Record<string, unknown>) => ({
        memberIndex: row.member_index as number,
        anchorInitial: row.anchor_initial as string,
        bodyStatus: row.body_status as string | null,
        loveStatus: row.love_status as string | null,
        missionStatus: row.mission_status as string | null,
        spiritStatus: row.spirit_status as string | null,
      })) as SquadMemberStatus[];
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMatchToSquad() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);

  return useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(SQUAD_MATCH_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `Squad match failed: ${res.status}`);
      }

      return res.json() as Promise<{ squad_id: string; already_matched: boolean }>;
    },
    onSuccess: ({ squad_id }) => {
      if (profile) {
        setProfile({ ...profile, squadId: squad_id });
      }
    },
  });
}
