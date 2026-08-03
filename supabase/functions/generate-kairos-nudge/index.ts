// generate-kairos-nudge
// Supabase Edge Function (Deno runtime)
// Called by: daily cron (06:00 user-local) or user-triggered refresh (max 3/day)
//
// Flow:
//   1. Auth: verify JWT, extract user_id
//   2. Load user state from Postgres (profile, cycle, recent check-ins, streaks, vibe check)
//   3. Tier check: free users only get Sunday nudges; brotherhood get daily
//   4. Cache check: if ai_nudges row exists for today, return it
//   5. Call Claude Haiku via Anthropic API
//   6. Write result to ai_nudges table
//   7. Return nudge JSON

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MINIMAX_API_KEY = Deno.env.get('MINIMAX_API_KEY') ?? '';
const MINIMAX_GROUP_ID = Deno.env.get('MINIMAX_GROUP_ID') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SYSTEM_PROMPT = `You are the KAIROS nudge engine. You write short, sharp, personal daily messages to men in a 365-day behavioural transformation campaign.

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

KAIROS phase contexts:
- GATE (Days 1-7): Foundations only. Nothing new starts until this closes.
- STABILISE (Days 8-56): Floor unbroken. Weight trending. First month banked.
- BUILD (Days 57-151): Strength proper. Running back. Habits compounding.
- PERFORM (Days 152-217): Cambridge Half peaks. Performance mode.
- ELITE (Days 218-365): The campaign ends or bigger targets get set.

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
  GATE: 'GATE — Days 1-7. Foundations only. Nothing new starts until this closes.',
  STABILISE: 'STABILISE — Days 8-56. Floor unbroken. Weight trending. First month banked.',
  BUILD: 'BUILD — Days 57-151. Strength proper. Running back. Habits compounding.',
  PERFORM: 'PERFORM — Days 152-217. Cambridge Half peaks. Performance mode.',
  ELITE: 'ELITE — Days 218-365. The campaign ends or bigger targets get set.',
};

interface UserState {
  identityAnchorName: string;
  customAnchorName?: string;
  phase: string;
  dayInCycle: number;
  domainFocuses: Array<{ domain: string; focus: string }>;
  recentCheckIns: Array<{ date: string; domain: string; status: string }>;
  streaks: Array<{ domain: string; current: number; longest: number }>;
  lastVibeCheck?: { rating: number; date: string };
}

function buildUserPrompt(state: UserState, type: 'daily_nudge' | 'weekly_challenge'): string {
  const anchor = state.customAnchorName ?? state.identityAnchorName;
  const phaseCtx = PHASE_CONTEXTS[state.phase] ?? state.phase;

  const focusLines = state.domainFocuses.map((f) => `  ${f.domain}: ${f.focus}`).join('\n');

  const checkInLines = state.recentCheckIns.length
    ? state.recentCheckIns
        .slice(-7)
        .map((c) => `  ${c.date} ${c.domain}: ${c.status}`)
        .join('\n')
    : '  No check-ins yet.';

  const streakLines = state.streaks.length
    ? state.streaks.map((s) => `  ${s.domain}: ${s.current} days (best: ${s.longest})`).join('\n')
    : '  No streaks yet.';

  const vibeLines = state.lastVibeCheck
    ? `Rating ${state.lastVibeCheck.rating}/5 on ${state.lastVibeCheck.date}`
    : 'No vibe check yet.';

  return `Identity anchor: ${anchor}
Current phase: ${phaseCtx} (Day ${state.dayInCycle} of 365)

Domain focuses:
${focusLines}

Last 7 days check-ins:
${checkInLines}

Current streaks:
${streakLines}

Last vibe check: ${vibeLines}

Generate one ${type} for today.`;
}

async function callMiniMax(userPrompt: string): Promise<{
  title: string;
  body: string;
  type: string;
  domain: string | null;
  xp_reward: number | null;
  cta: string | null;
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
        max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
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
  // Strip any <think>...</think> reasoning blocks the model may emit
  const content = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  const totalTokens = data.usage?.total_tokens ?? 0;
  // MiniMax M3 ~$0.40/Mtok blended estimate, in pence
  const costPence = Math.round((totalTokens * 0.4 / 1_000_000) * 100 * 100);

  try {
    // Extract JSON if wrapped in a markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, content];
    const parsed = JSON.parse(jsonMatch[1].trim());
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
    } as never;
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

  // Verify JWT and get user
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
    // Load profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*, identity_anchors(name)')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    // Tier check
    if (profile.tier === 'free' && !isSunday) {
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

    // Load cycle
    const { data: cycle } = await supabase
      .from('kairos_cycles')
      .select('*')
      .eq('id', profile.current_kairos_cycle_id)
      .maybeSingle();

    if (!cycle) {
      return new Response(JSON.stringify({ error: 'No active cycle' }), { status: 400 });
    }

    // Compute day in cycle
    const startDate = new Date(cycle.start_date);
    const todayDate = new Date(today);
    const dayInCycle = Math.max(
      1,
      Math.floor((todayDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
    );

    // Determine KAIROS phase
    const PHASE_DAYS = [
      { phase: 'GATE',      start: 1,   end: 7   },
      { phase: 'STABILISE', start: 8,   end: 56  },
      { phase: 'BUILD',     start: 57,  end: 151 },
      { phase: 'PERFORM',   start: 152, end: 217 },
      { phase: 'ELITE',     start: 218, end: 365 },
    ];
    const phaseConfig =
      PHASE_DAYS.find((p) => dayInCycle >= p.start && dayInCycle <= p.end) ??
      PHASE_DAYS[PHASE_DAYS.length - 1];

    // Load domain focuses
    const { data: focuses } = await supabase
      .from('user_domain_focuses')
      .select('domain_type, focus_description')
      .eq('user_id', userId)
      .eq('cycle_id', cycle.id);

    // Load recent check-ins (last 7 days)
    const sevenDaysAgo = new Date(todayDate.getTime() - 7 * 86_400_000).toISOString().split('T')[0];

    const { data: checkIns } = await supabase
      .from('daily_check_ins')
      .select('date, domain_type, status')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true });

    // Load streaks
    const { data: streaks } = await supabase
      .from('user_streaks')
      .select('domain_type, current_streak, longest_streak')
      .eq('user_id', userId);

    // Load last vibe check
    const { data: vibeCheck } = await supabase
      .from('vibe_checks')
      .select('rating, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build user state for prompt
    const state: UserState = {
      identityAnchorName:
        (profile.identity_anchors as { name: string })?.name ?? profile.identity_anchor_id,
      customAnchorName: profile.custom_anchor_name ?? undefined,
      phase: phaseConfig.phase,
      dayInCycle,
      domainFocuses: (focuses ?? []).map(
        (f: { domain_type: string; focus_description: string }) => ({
          domain: f.domain_type,
          focus: f.focus_description,
        }),
      ),
      recentCheckIns: (checkIns ?? []).map(
        (c: { date: string; domain_type: string; status: string }) => ({
          date: c.date,
          domain: c.domain_type,
          status: c.status,
        }),
      ),
      streaks: (streaks ?? []).map(
        (s: { domain_type: string; current_streak: number; longest_streak: number }) => ({
          domain: s.domain_type,
          current: s.current_streak,
          longest: s.longest_streak,
        }),
      ),
      lastVibeCheck: vibeCheck ? { rating: vibeCheck.rating, date: vibeCheck.date } : undefined,
    };

    // Call MiniMax
    const userPrompt = buildUserPrompt(state, 'daily_nudge');
    const result = (await callMiniMax(userPrompt)) as {
      title: string;
      body: string;
      type: string;
      domain: string | null;
      xp_reward: number | null;
      cta: string | null;
      _costPence?: number;
    };

    // Store nudge — upsert so concurrent cron + user-refresh can't both slip past
    // the cache check and then collide on the unique (user_id, date, type) constraint.
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
