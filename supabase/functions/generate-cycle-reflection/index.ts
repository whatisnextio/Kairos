// generate-cycle-reflection
// Supabase Edge Function (Deno runtime)
// Called once per cycle when the user reaches Day 365.
//
// Flow:
//   1. Auth: verify JWT, extract user_id
//   2. Load cycle stats: check-ins per domain, streaks, vibe checks, XP
//   3. Cache check: if cycle_reflection already exists for this cycle, return it
//   4. Call Claude Sonnet with rich stats context
//   5. Store in ai_nudges (type=cycle_reflection, date=cycle.start_date)
//   6. Return reflection JSON

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MINIMAX_API_KEY = Deno.env.get('MINIMAX_API_KEY') ?? '';
const MINIMAX_GROUP_ID = Deno.env.get('MINIMAX_GROUP_ID') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SYSTEM_PROMPT = `You are the KAIROS cycle reflection engine. You write one deeply personal summary for a man who has just completed a 365-day behavioural transformation campaign.

Voice rules:
- South UK British English. No em dashes, use commas or full stops.
- No corporate language. No wellness jargon. No "embrace your authentic journey."
- No emojis.
- Direct, honest, data-driven. Reference the actual numbers you are given.
- Sound like a trusted mentor who has been watching all 365 days. Not a chatbot. Not a coach running a script.
- Acknowledge the hard parts. Don't just celebrate. Real growth has friction.

This is a once-per-cycle moment. It should feel earned.

Output format: JSON only, no markdown, no explanation.
{
  "headline": "string (under 70 chars, punchy, specific to this man's data)",
  "body": "string (2-3 sentences, 300 chars max, must reference at least 2 specific stats: XP, streak, completion rate, or vibe trend)",
  "domain_callouts": {
    "BODY": "string (one sharp line about their body domain performance, 80 chars max)",
    "FUEL": "string (one sharp line, 80 chars max)",
    "METIME": "string (one sharp line, 80 chars max)",
    "USTIME": "string (one sharp line, 80 chars max)",
    "SHOT": "string (one sharp line, 80 chars max)",
    "LENS": "string (one sharp line, 80 chars max)",
    "NEST": "string (one sharp line, 80 chars max)",
    "ROOTS": "string (one sharp line, 80 chars max)"
  },
  "next_cycle_intention": "string (one sharp line to seed Cycle 2, under 80 chars)"
}`;

interface DomainStats {
  domain: string;
  doneCount: number;
  partialCount: number;
  missedCount: number;
  completionRate: number;
  bestStreak: number;
  currentStreak: number;
}

interface CycleStats {
  identityAnchor: string;
  cycleNumber: number;
  totalDays: number;
  totalXp: number;
  overallCompletionRate: number;
  totalCheckIns: number;
  vibeStart: number | null;
  vibeEnd: number | null;
  vibeTrend: 'improved' | 'declined' | 'stable' | 'unknown';
  domains: DomainStats[];
  strongestDomain: string;
  weakestDomain: string;
}

function buildPrompt(stats: CycleStats): string {
  const vibeLine =
    stats.vibeTrend === 'unknown'
      ? 'No vibe check data.'
      : `Vibe checks: started at ${stats.vibeStart}/5, ended at ${stats.vibeEnd}/5 (${stats.vibeTrend}).`;

  const domainLines = stats.domains
    .map(
      (d) =>
        `  ${d.domain}: ${d.doneCount} Done, ${d.partialCount} Partial, ${d.missedCount} Missed` +
        ` (${Math.round(d.completionRate * 100)}% completion, ${d.bestStreak} day best streak)`,
    )
    .join('\n');

  return `Identity anchor: ${stats.identityAnchor}
Cycle: ${stats.cycleNumber} of their journey
Total days tracked: ${stats.totalDays}
Total XP earned: ${stats.totalXp}
Overall check-in completion: ${Math.round(stats.overallCompletionRate * 100)}% (${stats.totalCheckIns} check-ins from a possible ${stats.totalDays * 8})
Strongest domain: ${stats.strongestDomain}
Weakest domain: ${stats.weakestDomain}
${vibeLine}

Domain breakdown:
${domainLines}

Write their cycle reflection.`;
}

async function callMiniMax(prompt: string): Promise<{
  headline: string;
  body: string;
  domain_callouts: Record<string, string>;
  next_cycle_intention: string;
  _costPence: number;
}> {
  const response = await fetch(
    `https://api.minimaxi.chat/v1/text/chatcompletion_v2?GroupId=${MINIMAX_GROUP_ID}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-M3',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MiniMax API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax error ${data.base_resp?.status_code}: ${data.base_resp?.status_msg}`);
  }

  const rawContent = data.choices?.[0]?.message?.content ?? '';
  const content = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  const totalTokens = data.usage?.total_tokens ?? 0;
  const costPence = Math.round((totalTokens * 0.4 / 1_000_000) * 100 * 100);

  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, content];
    const parsed = JSON.parse(jsonMatch[1].trim());
    return { ...parsed, _costPence: costPence };
  } catch {
    return {
      headline: '365 days. Done.',
      body: 'You showed up. That counts for more than you know right now.',
      domain_callouts: {
        BODY: 'The physical work is banked.',
        FUEL: 'What you put in shaped what you got out.',
        METIME: 'The private work mattered.',
        USTIME: 'Presence is a practice.',
        SHOT: 'The professional push continues.',
        LENS: 'The eye keeps sharpening.',
        NEST: 'The family work is never wasted.',
        ROOTS: 'The foundation gets stronger.',
      },
      next_cycle_intention: 'Cycle 2 starts with everything you learned here.',
      _costPence: costPence,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = user.id;

  try {
    // Load profile + identity anchor
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*, identity_anchors(name), current_kairos_cycle_id, xp, tier')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    if (!profile.current_kairos_cycle_id) {
      return new Response(JSON.stringify({ error: 'No active cycle' }), { status: 400 });
    }

    // Load cycle
    const { data: cycle, error: cycleErr } = await supabase
      .from('kairos_cycles')
      .select('*')
      .eq('id', profile.current_kairos_cycle_id)
      .single();

    if (cycleErr || !cycle) {
      return new Response(JSON.stringify({ error: 'Cycle not found' }), { status: 404 });
    }

    // Cache check: use cycle.start_date as the date anchor so it's stable per cycle
    const { data: cached } = await supabase
      .from('ai_nudges')
      .select('*')
      .eq('user_id', userId)
      .eq('date', cycle.start_date)
      .eq('type', 'cycle_reflection')
      .maybeSingle();

    if (cached) {
      // body is stored as JSON for cycle_reflection: { text, domain_callouts, next_cycle_intention, stats }
      let parsed: {
        text: string;
        domain_callouts: Record<string, string>;
        next_cycle_intention: string;
        stats: Record<string, unknown>;
      } | null = null;
      try {
        parsed = JSON.parse(cached.body);
      } catch {
        // Older row with plain-text body — return as-is without extra fields
      }
      return new Response(
        JSON.stringify({
          reflection: {
            ...cached,
            body: parsed?.text ?? cached.body,
            domain_callouts: parsed?.domain_callouts ?? {},
            next_cycle_intention: parsed?.next_cycle_intention ?? '',
            stats: parsed?.stats ?? {},
          },
          cached: true,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Only Brotherhood gets the AI reflection
    if (profile.tier !== 'brotherhood') {
      return new Response(
        JSON.stringify({ error: 'Cycle reflection requires Brotherhood tier', tier_gate: true }),
        { status: 403 },
      );
    }

    // Load all check-ins for this cycle
    const { data: allCheckIns } = await supabase
      .from('daily_check_ins')
      .select('domain_type, status, date')
      .eq('user_id', userId)
      .eq('cycle_id', cycle.id);

    // Load streaks
    const { data: streaks } = await supabase
      .from('user_streaks')
      .select('domain_type, current_streak, longest_streak')
      .eq('user_id', userId);

    // Load vibe checks for this cycle (ordered oldest first)
    const { data: vibeChecks } = await supabase
      .from('vibe_checks')
      .select('rating, date')
      .eq('user_id', userId)
      .eq('cycle_id', cycle.id)
      .order('date', { ascending: true });

    // Compute domain stats across all 8 domains
    const DOMAIN_TYPES = ['BODY', 'FUEL', 'METIME', 'USTIME', 'SHOT', 'LENS', 'NEST', 'ROOTS'];
    const cycleStart = new Date(cycle.start_date);
    const today = new Date();
    const dayCount = Math.min(
      365,
      Math.max(1, Math.floor((today.getTime() - cycleStart.getTime()) / 86_400_000) + 1),
    );

    const domainStats: DomainStats[] = DOMAIN_TYPES.map((domain) => {
      const domainCheckIns = (allCheckIns ?? []).filter(
        (c: { domain_type: string; status: string }) => c.domain_type === domain,
      );
      const doneCount = domainCheckIns.filter(
        (c: { status: string }) => c.status === 'Done',
      ).length;
      const partialCount = domainCheckIns.filter(
        (c: { status: string }) => c.status === 'Partial',
      ).length;
      const missedCount = domainCheckIns.filter(
        (c: { status: string }) => c.status === 'Missed',
      ).length;
      const completionRate = dayCount > 0 ? (doneCount + partialCount * 0.5) / dayCount : 0;
      const streak = (streaks ?? []).find((s: { domain_type: string }) => s.domain_type === domain);
      return {
        domain,
        doneCount,
        partialCount,
        missedCount,
        completionRate,
        bestStreak: streak?.longest_streak ?? 0,
        currentStreak: streak?.current_streak ?? 0,
      };
    });

    const totalCheckIns = domainStats.reduce((s, d) => s + d.doneCount + d.partialCount, 0);
    const overallCompletionRate = dayCount > 0 ? totalCheckIns / (dayCount * 8) : 0;

    const strongestDomain =
      [...domainStats].sort((a, b) => b.completionRate - a.completionRate)[0]?.domain ?? 'BODY';
    const weakestDomain =
      [...domainStats].sort((a, b) => a.completionRate - b.completionRate)[0]?.domain ?? 'ROOTS';

    // Vibe trend
    let vibeStart: number | null = null;
    let vibeEnd: number | null = null;
    let vibeTrend: 'improved' | 'declined' | 'stable' | 'unknown' = 'unknown';
    if (vibeChecks && vibeChecks.length >= 2) {
      vibeStart = vibeChecks[0].rating;
      vibeEnd = vibeChecks[vibeChecks.length - 1].rating;
      if (vibeEnd > vibeStart) vibeTrend = 'improved';
      else if (vibeEnd < vibeStart) vibeTrend = 'declined';
      else vibeTrend = 'stable';
    } else if (vibeChecks && vibeChecks.length === 1) {
      vibeStart = vibeChecks[0].rating;
      vibeEnd = vibeChecks[0].rating;
    }

    // Count completed cycles (excluding this one)
    const { count: previousCycles } = await supabase
      .from('kairos_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    const anchorName =
      (profile.identity_anchors as { name: string })?.name ?? profile.identity_anchor_id;

    const stats: CycleStats = {
      identityAnchor: profile.custom_anchor_name ?? anchorName,
      cycleNumber: (previousCycles ?? 0) + 1,
      totalDays: dayCount,
      totalXp: cycle.total_xp_earned ?? 0,
      overallCompletionRate,
      totalCheckIns,
      vibeStart,
      vibeEnd,
      vibeTrend,
      domains: domainStats,
      strongestDomain,
      weakestDomain,
    };

    const prompt = buildPrompt(stats);
    const result = await callMiniMax(prompt);

    const reflectionStats = {
      totalXp: stats.totalXp,
      totalCheckIns: stats.totalCheckIns,
      overallCompletionRate: Math.round(stats.overallCompletionRate * 100),
      strongestDomain: stats.strongestDomain,
      weakestDomain: stats.weakestDomain,
    };

    // Store in ai_nudges — body is JSON so cache hits return the full payload.
    // date = cycle.start_date so the record is stable across session reloads.
    const bodyJson = JSON.stringify({
      text: result.body,
      domain_callouts: result.domain_callouts,
      next_cycle_intention: result.next_cycle_intention,
      stats: reflectionStats,
    });

    const { data: reflection, error: insertErr } = await supabase
      .from('ai_nudges')
      .upsert(
        {
          user_id: userId,
          date: cycle.start_date,
          type: 'cycle_reflection',
          title: result.headline,
          body: bodyJson,
          domain_type: null,
          kairos_phase: null,
          xp_reward: null,
          status: 'new',
          cta: null,
          cost_pence: result._costPence ?? 0,
        },
        { onConflict: 'user_id,date,type', ignoreDuplicates: false },
      )
      .select()
      .single();

    if (insertErr) {
      console.error('Upsert cycle reflection failed:', insertErr.message);
      return new Response(JSON.stringify({ error: 'Failed to store reflection' }), {
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({
        reflection: {
          ...reflection,
          body: result.body,
          domain_callouts: result.domain_callouts,
          next_cycle_intention: result.next_cycle_intention,
          stats: reflectionStats,
        },
        cached: false,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('generate-cycle-reflection error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
