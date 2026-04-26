// generate-squad-pulse
// Supabase Edge Function (Deno runtime)
// Called by: Sunday cron (08:00 UTC) to generate weekly squad pulse messages.
//
// Flow:
//   1. Auth: service role only (cron-triggered, no user JWT)
//   2. Find all active squads with >= 4 members
//   3. For each squad, collect anonymised member stats (phase, avg streak, completion %)
//   4. Call Claude Sonnet 4.6 to generate a squad pulse message
//   5. Write to squad_pulses table (upsert by squad_id + week_number)
//
// Manual trigger: POST with body { squad_id: string } to regenerate one squad.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SYSTEM_PROMPT = `You are the KAIROS squad pulse engine. You write short, sharp weekly messages to anonymous groups of men in the same phase of a 12-week transformation programme.

Voice rules:
- South UK British English. No em dashes, use commas or full stops.
- No corporate language. No wellness jargon.
- No emojis.
- Direct, collective, action-oriented.
- Sound like a coach addressing the team, not a chatbot.

Length:
- Under 200 characters total.
- No title. Body only.

You will be given: the KAIROS phase, number of squad members, average current streak, average completion rate, and week number. Use these to make the message feel real and timely.

Output format: JSON only, no markdown.
{ "message": "string" }`;

interface SquadStats {
  squadId: string;
  phase: string;
  memberCount: number;
  weekNumber: number;
  avgStreak: number;
  avgCompletionRate: number;
}

async function generatePulse(stats: SquadStats): Promise<string> {
  const userPrompt = `Squad phase: ${stats.phase}
Members: ${stats.memberCount}
Week of programme: ${stats.weekNumber}
Average current streak: ${stats.avgStreak} days
Average completion rate: ${Math.round(stats.avgCompletionRate)}%

Write one squad pulse for this week.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 128,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';

  try {
    const parsed = JSON.parse(content);
    return parsed.message ?? 'Squad, keep moving. Every rep counts this week.';
  } catch {
    return 'Squad, keep moving. Every rep counts this week.';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-service-role',
      },
    });
  }

  // Cron-triggered function: only service role key is accepted.
  // A bare Authorization JWT is not validated here, so we enforce service role only.
  const serviceRole = req.headers.get('x-service-role');

  if (serviceRole !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let targetSquadId: string | null = null;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      targetSquadId = body.squad_id ?? null;
    } catch {
      // no body, run all squads
    }
  }

  try {
    // Load active squads (members >= 4)
    let squadQuery = supabase
      .from('squads')
      .select('id, kairos_phase, member_count, cycle_start_window')
      .gte('member_count', 4);

    if (targetSquadId) {
      squadQuery = squadQuery.eq('id', targetSquadId);
    }

    const { data: squads, error: squadsErr } = await squadQuery;

    if (squadsErr) throw new Error(`Squads load failed: ${squadsErr.message}`);
    if (!squads || squads.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No eligible squads' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const results: Array<{ squad_id: string; week: number; ok: boolean }> = [];

    for (const squad of squads) {
      try {
        // Compute week number from cycle_start_window
        const startDate = new Date(squad.cycle_start_window);
        const todayDate = new Date(today);
        const daysSinceStart = Math.floor(
          (todayDate.getTime() - startDate.getTime()) / 86_400_000,
        );
        const weekNumber = Math.max(1, Math.min(12, Math.ceil(daysSinceStart / 7)));

        // Load member streaks for this squad's phase
        const { data: members } = await supabase
          .from('profiles')
          .select('id')
          .eq('squad_id', squad.id);

        let avgStreak = 0;
        let avgCompletionRate = 0;

        if (members && members.length > 0) {
          const memberIds = members.map((m: { id: string }) => m.id);

          // Average current streak across all domains for squad members
          const { data: streaks } = await supabase
            .from('user_streaks')
            .select('current_streak')
            .in('user_id', memberIds);

          if (streaks && streaks.length > 0) {
            const total = streaks.reduce(
              (sum: number, s: { current_streak: number }) => sum + s.current_streak, 0,
            );
            avgStreak = Math.round(total / streaks.length);
          }

          // Completion rate: Done check-ins in last 7 days
          const sevenDaysAgo = new Date(todayDate.getTime() - 7 * 86_400_000)
            .toISOString()
            .split('T')[0];

          const { data: checkIns } = await supabase
            .from('daily_check_ins')
            .select('status')
            .in('user_id', memberIds)
            .gte('date', sevenDaysAgo);

          if (checkIns && checkIns.length > 0) {
            const done = checkIns.filter(
              (c: { status: string }) => c.status === 'Done' || c.status === 'Partial',
            ).length;
            avgCompletionRate = (done / checkIns.length) * 100;
          }
        }

        const stats: SquadStats = {
          squadId: squad.id,
          phase: squad.kairos_phase,
          memberCount: squad.member_count,
          weekNumber,
          avgStreak,
          avgCompletionRate,
        };

        const message = await generatePulse(stats);

        // Upsert squad pulse
        const { error: upsertErr } = await supabase
          .from('squad_pulses')
          .upsert(
            {
              squad_id: squad.id,
              week_number: weekNumber,
              message,
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'squad_id,week_number' },
          );

        if (upsertErr) throw new Error(upsertErr.message);

        results.push({ squad_id: squad.id, week: weekNumber, ok: true });
      } catch (squadErr) {
        const msg = squadErr instanceof Error ? squadErr.message : 'Unknown';
        console.error(`Squad ${squad.id} pulse failed: ${msg}`);
        results.push({ squad_id: squad.id, week: 0, ok: false });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('generate-squad-pulse error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
