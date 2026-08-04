// generate-kairos-nudge
// Supabase Edge Function (Deno runtime)
// Called by: daily cron (06:00 UTC) or user-triggered refresh (max 3/day)
//
// Flow:
//   1. Auth: verify JWT, extract user_id
//   2. Load user state from Postgres (profile, cycle, recent check-ins, streaks, vibe check)
//   3. Tier check: free users only get Sunday nudges; paid users get daily
//   4. Cache check: if ai_nudges row exists for today, return it
//   5. Call Claude Haiku via Anthropic API
//   6. Write result to ai_nudges table
//   7. Return nudge JSON

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PAID_TIERS = new Set(['brotherhood', 'lifechanger']);

const SYSTEM_PROMPT = `You are the KAIROS nudge engine. You write short, sharp, personal daily messages to people in a 12-week behavioural action framework.

Voice rules:
- South UK British English. No em dashes, use commas or full stops.
- No corporate language. No wellness jargon. No "embrace your authentic journey."
- No emojis.
- Direct, respectful, action-oriented.
- Sound like a sharp coach, not a chatbot.

Length:
- Title: under 60 characters.
- Body: under 200 characters.

Personalisation:
You will be given the user's identity anchor, current KAIROS phase, recent check-ins, current streaks, and last vibe check. Reference at least one of these in the nudge to make it feel personal.

Tier rules:
- Brotherhood: use phase, domain focus, recent check-ins, streaks, and vibe only. Do not claim advanced pattern detection.
- Lifechanger: if grounded pattern signals are supplied, reference exactly one trend, vibe, streak, note, or cross-domain signal. If signals are insufficient, fall back to standard support and say nothing about patterns.
- Never diagnose, therapise, or make medical, financial, or legal claims.

KAIROS phase contexts:
- KICKOFF (Days 1-14): Start small. Create the first visible win.
- ANCHOR (Days 15-28): Make the habit easy to find, repeat, and protect.
- INCREASE (Days 29-42): Add controlled load without breaking the floor.
- RHYTHM (Days 43-56): Turn good days into a repeatable weekly pattern.
- OWN (Days 57-70): Remove friction. Make the behaviour feel like theirs.
- SUSTAIN (Days 71-84): Hold the gain and choose the next cycle deliberately.

Output format: JSON only, no markdown, no explanation.
{
  "title": "string",
  "body": "string",
  "type": "daily_nudge",
  "domain": "BODY" | "FUEL" | "METIME" | "USTIME" | "SHOT" | "LENS" | "NEST" | "ROOTS" | null,
  "xp_reward": number | null,
  "cta": "check_in_now" | "reflect" | "plan_tomorrow" | null
}`;

const PHASE_CONTEXTS: Record<string, string> = {
  KICKOFF: 'KICKOFF - Days 1-14. Start small. Create the first visible win.',
  ANCHOR: 'ANCHOR - Days 15-28. Make the habit easy to find, repeat, and protect.',
  INCREASE: 'INCREASE - Days 29-42. Add controlled load without breaking the floor.',
  RHYTHM: 'RHYTHM - Days 43-56. Turn good days into a repeatable weekly pattern.',
  OWN: 'OWN - Days 57-70. Remove friction. Make the behaviour feel like theirs.',
  SUSTAIN: 'SUSTAIN - Days 71-84. Hold the gain and choose the next cycle deliberately.',
};

interface UserState {
  tier: string;
  identityAnchorName: string;
  customAnchorName?: string;
  phase: string;
  dayInCycle: number;
  domainFocuses: Array<{ domain: string; focus: string }>;
  customRoutes: Array<{ label: string; parentDomain: string; focus: string }>;
  recentCheckIns: Array<{ date: string; domain: string; status: string; notes?: string | null }>;
  recentCustomRouteCheckIns: Array<{
    date: string;
    route: string;
    status: string;
    notes?: string | null;
  }>;
  streaks: Array<{ domain: string; current: number; longest: number }>;
  lastVibeCheck?: { rating: number; date: string };
  vibeChecks: Array<{ rating: number; date: string }>;
}

const NOTE_KEYWORDS = [
  'tired',
  'sleep',
  'pain',
  'stress',
  'anxious',
  'overwhelmed',
  'alcohol',
  'bread',
  'bloated',
  'energy',
  'argued',
  'avoid',
  'missed',
];

function completionWeight(status: string): number {
  if (status === 'Done' || status === 'Protected') return 1;
  if (status === 'Partial') return 0.5;
  return 0;
}

function formatDomain(domain: string): string {
  if (domain === 'METIME') return 'Self';
  if (domain === 'USTIME') return 'Connection';
  return domain.charAt(0) + domain.slice(1).toLowerCase();
}

function buildLifechangerSignals(state: UserState): string[] {
  if (state.tier !== 'lifechanger') return [];

  const signals: string[] = [];
  const grouped = state.recentCheckIns.reduce<Record<string, typeof state.recentCheckIns>>(
    (groups, checkIn) => {
      groups[checkIn.domain] = groups[checkIn.domain] ?? [];
      groups[checkIn.domain].push(checkIn);
      return groups;
    },
    {},
  );

  for (const [domain, items] of Object.entries(grouped)) {
    if (items.length < 3) continue;
    const score =
      items.reduce((sum, item) => sum + completionWeight(item.status), 0) / items.length;
    const label = formatDomain(domain);
    const missed = items.filter((item) => item.status === 'Missed').length;

    if (score >= 0.75) {
      signals.push(
        `${label} is the strongest recent trend at ${Math.round(score * 100)}% completion.`,
      );
      break;
    }
    if (missed >= 2) {
      signals.push(`${label} has ${missed} recent misses, so offer a recovery path.`);
      break;
    }
  }

  const sortedVibes = [...state.vibeChecks].sort((a, b) => a.date.localeCompare(b.date));
  if (sortedVibes.length >= 2) {
    const first = sortedVibes[0];
    const last = sortedVibes[sortedVibes.length - 1];
    if (Math.abs(last.rating - first.rating) >= 1) {
      signals.push(`Vibe moved from ${first.rating}/5 to ${last.rating}/5 across recent checks.`);
    }
  }

  const streak = state.streaks
    .filter((item) => item.current >= 3 || (item.longest >= 7 && item.current === 0))
    .sort((a, b) => b.current - a.current || b.longest - a.longest)[0];
  if (streak) {
    const label = formatDomain(streak.domain);
    signals.push(
      streak.current >= 3
        ? `${label} has a ${streak.current}-day current streak to protect.`
        : `${label} had a ${streak.longest}-day best streak and needs a restart.`,
    );
  }

  const noteSource = [...state.recentCheckIns, ...state.recentCustomRouteCheckIns].find((item) => {
    const note = item.notes?.toLowerCase() ?? '';
    return NOTE_KEYWORDS.some((keyword) => note.includes(keyword));
  });
  if (noteSource?.notes) {
    const keyword = NOTE_KEYWORDS.find((item) => noteSource.notes?.toLowerCase().includes(item));
    signals.push(
      `Recent notes mention "${keyword}", so keep the nudge practical and non-diagnostic.`,
    );
  }

  const bodyFuelGood = ['BODY', 'FUEL'].some((domain) =>
    grouped[domain]?.some((item) => completionWeight(item.status) >= 1),
  );
  const selfConnectionOpen = ['METIME', 'USTIME'].some((domain) =>
    grouped[domain]?.some((item) => item.status === 'Missed' || item.status === 'Partial'),
  );
  if (bodyFuelGood && selfConnectionOpen) {
    signals.push(
      'Body or Fuel has recent proof while Self or Connection is open, so connect the next action across domains.',
    );
  }

  return signals.slice(0, 4);
}

function buildLifechangerSection(state: UserState): string {
  const signals = buildLifechangerSignals(state);
  if (state.tier !== 'lifechanger') {
    return 'Personalisation mode: Brotherhood standard support.';
  }
  if (signals.length === 0) {
    return 'Personalisation mode: Lifechanger, insufficient history for advanced pattern claims. Use standard phase and domain support only.';
  }
  return [
    'Personalisation mode: Lifechanger pattern support. Use one grounded signal, not all of them.',
    ...signals.map((signal) => `- ${signal}`),
  ].join('\n');
}

function buildUserPrompt(state: UserState, type: 'daily_nudge' | 'weekly_challenge'): string {
  const anchor = state.customAnchorName ?? state.identityAnchorName;
  const phaseCtx = PHASE_CONTEXTS[state.phase] ?? state.phase;

  const focusLines = state.domainFocuses.map((f) => `  ${f.domain}: ${f.focus}`).join('\n');
  const customRouteLines = state.customRoutes.length
    ? state.customRoutes.map((r) => `  ${r.label} under ${r.parentDomain}: ${r.focus}`).join('\n')
    : '  No personal routes.';

  const checkInLines = state.recentCheckIns.length
    ? state.recentCheckIns
        .slice(-7)
        .map((c) => `  ${c.date} ${c.domain}: ${c.status}`)
        .join('\n')
    : '  No check-ins yet.';
  const customCheckInLines = state.recentCustomRouteCheckIns.length
    ? state.recentCustomRouteCheckIns
        .slice(-7)
        .map((c) => `  ${c.date} ${c.route}: ${c.status}`)
        .join('\n')
    : '  No personal route check-ins yet.';

  const streakLines = state.streaks.length
    ? state.streaks.map((s) => `  ${s.domain}: ${s.current} days (best: ${s.longest})`).join('\n')
    : '  No streaks yet.';

  const vibeLines = state.lastVibeCheck
    ? `Rating ${state.lastVibeCheck.rating}/5 on ${state.lastVibeCheck.date}`
    : 'No vibe check yet.';

  return `Identity anchor: ${anchor}
Current phase: ${phaseCtx} (Day ${Math.min(state.dayInCycle, 84)} of 84)

Domain focuses:
${focusLines}

Personal routes:
${customRouteLines}

Last 7 days check-ins:
${checkInLines}

Last 7 days personal route check-ins:
${customCheckInLines}

Current streaks:
${streakLines}

Last vibe check: ${vibeLines}

${buildLifechangerSection(state)}

Generate one ${type} for today.`;
}

async function callClaude(userPrompt: string): Promise<{
  title: string;
  body: string;
  type: string;
  domain: string | null;
  xp_reward: number | null;
  cta: string | null;
  _costPence: number;
}> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content: string = data.content?.[0]?.text ?? '';
  const inputTokens: number = data.usage?.input_tokens ?? 0;
  const outputTokens: number = data.usage?.output_tokens ?? 0;
  // Claude Haiku 4.5: ~$0.80/Mtok input, ~$4/Mtok output, converted to pence
  const costPence = Math.round(((inputTokens * 0.8 + outputTokens * 4) / 1_000_000) * 100 * 100);

  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, content];
    const parsed = JSON.parse((jsonMatch[1] ?? content).trim());
    return { ...parsed, _costPence: costPence };
  } catch {
    return {
      title: `Day ${new Date().getDate()}. Show up.`,
      body: "One action. That's all. Pick it and do it now.",
      type: 'daily_nudge',
      domain: null,
      xp_reward: null,
      cta: 'check_in_now',
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
  const today = new Date().toISOString().split('T')[0];
  const isSunday = new Date().getDay() === 0;

  try {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*, identity_anchors(name)')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    // Free tier: nudges on Sundays only. Paid V1 tiers get daily nudges.
    if (!PAID_TIERS.has(profile.tier) && !isSunday) {
      return new Response(
        JSON.stringify({ error: 'Free tier gets nudges on Sundays only', tier_gate: true }),
        { status: 403 },
      );
    }

    // Cache check
    const { data: cached } = await supabase
      .from('ai_nudges')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('type', 'daily_nudge')
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ nudge: cached, cached: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: cycle } = await supabase
      .from('kairos_cycles')
      .select('*')
      .eq('id', profile.current_kairos_cycle_id)
      .maybeSingle();

    if (!cycle) {
      return new Response(JSON.stringify({ error: 'No active cycle' }), { status: 400 });
    }

    const startDate = new Date(cycle.start_date);
    const todayDate = new Date(today);
    const dayInCycle = Math.max(
      1,
      Math.floor((todayDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
    );

    const PHASE_DAYS = [
      { phase: 'KICKOFF', start: 1, end: 14 },
      { phase: 'ANCHOR', start: 15, end: 28 },
      { phase: 'INCREASE', start: 29, end: 42 },
      { phase: 'RHYTHM', start: 43, end: 56 },
      { phase: 'OWN', start: 57, end: 70 },
      { phase: 'SUSTAIN', start: 71, end: 84 },
    ];
    const phaseConfig =
      PHASE_DAYS.find((p) => dayInCycle >= p.start && dayInCycle <= p.end) ??
      PHASE_DAYS[PHASE_DAYS.length - 1];

    const { data: focuses } = await supabase
      .from('user_domain_focuses')
      .select('domain_type, focus_description')
      .eq('user_id', userId)
      .eq('cycle_id', cycle.id);

    const { data: customRoutes } = await supabase
      .from('custom_routes')
      .select('id, label, parent_domain_type, focus_description')
      .eq('user_id', userId)
      .eq('cycle_id', cycle.id)
      .is('archived_at', null)
      .order('created_at', { ascending: true });

    const sevenDaysAgo = new Date(todayDate.getTime() - 7 * 86_400_000).toISOString().split('T')[0];

    const { data: checkIns } = await supabase
      .from('daily_check_ins')
      .select('date, domain_type, status, notes')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true });

    const { data: customCheckIns } = await supabase
      .from('custom_route_check_ins')
      .select('date, status, notes, custom_routes(label)')
      .eq('user_id', userId)
      .eq('cycle_id', cycle.id)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true });

    const { data: streaks } = await supabase
      .from('user_streaks')
      .select('domain_type, current_streak, longest_streak')
      .eq('user_id', userId);

    const { data: vibeChecks } = await supabase
      .from('vibe_checks')
      .select('rating, date')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true });

    const lastVibeCheck = vibeChecks?.[vibeChecks.length - 1];

    const state: UserState = {
      tier: profile.tier,
      identityAnchorName:
        (profile.identity_anchors as { name: string } | null)?.name ?? profile.identity_anchor_id,
      customAnchorName: profile.custom_anchor_name ?? undefined,
      phase: phaseConfig.phase,
      dayInCycle,
      domainFocuses: (focuses ?? []).map(
        (f: { domain_type: string; focus_description: string }) => ({
          domain: f.domain_type,
          focus: f.focus_description,
        }),
      ),
      customRoutes: (customRoutes ?? []).map(
        (r: { label: string; parent_domain_type: string; focus_description: string }) => ({
          label: r.label,
          parentDomain: r.parent_domain_type,
          focus: r.focus_description,
        }),
      ),
      recentCheckIns: (checkIns ?? []).map(
        (c: { date: string; domain_type: string; status: string; notes: string | null }) => ({
          date: c.date,
          domain: c.domain_type,
          status: c.status,
          notes: c.notes,
        }),
      ),
      recentCustomRouteCheckIns: (customCheckIns ?? []).map(
        (c: {
          date: string;
          status: string;
          notes: string | null;
          custom_routes: { label: string } | null;
        }) => ({
          date: c.date,
          route: c.custom_routes?.label ?? 'Personal route',
          status: c.status,
          notes: c.notes,
        }),
      ),
      streaks: (streaks ?? []).map(
        (s: { domain_type: string; current_streak: number; longest_streak: number }) => ({
          domain: s.domain_type,
          current: s.current_streak,
          longest: s.longest_streak,
        }),
      ),
      lastVibeCheck: lastVibeCheck
        ? { rating: lastVibeCheck.rating, date: lastVibeCheck.date }
        : undefined,
      vibeChecks: (vibeChecks ?? []).map((v: { rating: number; date: string }) => ({
        rating: v.rating,
        date: v.date,
      })),
    };

    const userPrompt = buildUserPrompt(state, 'daily_nudge');
    const result = await callClaude(userPrompt);

    const { data: nudge, error: insertErr } = await supabase
      .from('ai_nudges')
      .upsert(
        {
          user_id: userId,
          date: today,
          type: 'daily_nudge',
          title: result.title,
          body: result.body,
          domain_type: result.domain,
          kairos_phase: phaseConfig.phase,
          xp_reward: result.xp_reward,
          status: 'new',
          cta: result.cta,
          cost_pence: result._costPence ?? 0,
        },
        { onConflict: 'user_id,date,type', ignoreDuplicates: false },
      )
      .select()
      .single();

    if (insertErr) {
      console.error('Upsert nudge failed:', insertErr.message);
      return new Response(JSON.stringify({ error: 'Failed to store nudge' }), { status: 500 });
    }

    return new Response(JSON.stringify({ nudge, cached: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('generate-kairos-nudge error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
