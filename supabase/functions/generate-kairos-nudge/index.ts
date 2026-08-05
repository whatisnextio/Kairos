// generate-kairos-nudge
// Supabase Edge Function (Deno runtime)
// Called by: daily cron (06:00 UTC) or user-triggered refresh (max 3/day)
//
// Flow:
//   1. Auth: verify JWT, extract user_id
//   2. Load user state from Postgres (profile, cycle, recent check-ins, streaks, vibe check)
//   3. Cache check: if ai_nudges row exists for today, return it
//   4. Call Claude Haiku via Anthropic API, or build a local fallback if unavailable
//   5. Write result to ai_nudges table
//   6. Return nudge JSON

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { estimateAnthropicCostPence } from "../_shared/anthropicCost.ts";
import { jsonResponse, preflightResponse } from "../_shared/cors.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const SYSTEM_PROMPT =
  `You are the KAIROS nudge engine. You write short, sharp, personal daily messages to people in a 12-week behavioural action framework.

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

Support rules:
- Use phase, domain focus, personal routes, recent check-ins, streaks, notes, and vibe only.
- Do not claim advanced pattern detection.
- Never diagnose, therapise, or make medical, financial, or legal claims.

Timing rules:
- Today is in progress until the user closes it. Never write "Day X done", "today done", "day complete", or similar.
- A Done check-in means one action was logged. It does not mean the whole day is finished.
- If there is already a Done check-in today, say "first action logged" or "keep the next one small", not that the day is done.

Sensitive-topic boundary:
- If context asks for therapy, diagnosis, medical advice, legal advice, financial advice, or crisis support, do not answer as an expert.
- Stay inside Kairos coaching: one safe next action, one recovery step, or one reflection.
- Signpost qualified professional, emergency, or crisis support where needed.
- Do not repeat sensitive note details in the output.

Age and content boundary:
- Do not write adult-adjacent, romantic, graphic, or explicit content.
- Keep Connection nudges family-safe and suitable for teens: presence, listening, practical help, and low-pressure support only.
- Keep private relationship details out of the output.

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
  KICKOFF: "KICKOFF - Days 1-14. Start small. Create the first visible win.",
  ANCHOR:
    "ANCHOR - Days 15-28. Make the habit easy to find, repeat, and protect.",
  INCREASE:
    "INCREASE - Days 29-42. Add controlled load without breaking the floor.",
  RHYTHM:
    "RHYTHM - Days 43-56. Turn good days into a repeatable weekly pattern.",
  OWN:
    "OWN - Days 57-70. Remove friction. Make the behaviour feel like theirs.",
  SUSTAIN:
    "SUSTAIN - Days 71-84. Hold the gain and choose the next cycle deliberately.",
};

interface UserState {
  today: string;
  identityAnchorName: string;
  customAnchorName?: string;
  phase: string;
  dayInCycle: number;
  domainFocuses: Array<{ domain: string; focus: string }>;
  customRoutes: Array<{ label: string; parentDomain: string; focus: string }>;
  recentCheckIns: Array<
    { date: string; domain: string; status: string; notes?: string | null }
  >;
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

interface GeneratedNudge {
  title: string;
  body: string;
  type: string;
  domain: string | null;
  xp_reward: number | null;
  cta: string | null;
  _costPence: number;
}

function formatDomain(domain: string): string {
  if (domain === "METIME") return "Self";
  if (domain === "USTIME") return "Connection";
  return domain.charAt(0) + domain.slice(1).toLowerCase();
}

function buildUserPrompt(
  state: UserState,
  type: "daily_nudge" | "weekly_challenge",
): string {
  const anchor = state.customAnchorName ?? state.identityAnchorName;
  const phaseCtx = PHASE_CONTEXTS[state.phase] ?? state.phase;

  const focusLines = state.domainFocuses.map((f) => `  ${f.domain}: ${f.focus}`)
    .join("\n");
  const customRouteLines = state.customRoutes.length
    ? state.customRoutes.map((r) =>
      `  ${r.label} under ${r.parentDomain}: ${r.focus}`
    ).join("\n")
    : "  No personal routes.";

  const checkInLines = state.recentCheckIns.length
    ? state.recentCheckIns
      .slice(-7)
      .map((c) => `  ${c.date} ${c.domain}: ${c.status}`)
      .join("\n")
    : "  No check-ins yet.";
  const customCheckInLines = state.recentCustomRouteCheckIns.length
    ? state.recentCustomRouteCheckIns
      .slice(-7)
      .map((c) => `  ${c.date} ${c.route}: ${c.status}`)
      .join("\n")
    : "  No personal route check-ins yet.";

  const streakLines = state.streaks.length
    ? state.streaks.map((s) =>
      `  ${s.domain}: ${s.current} days (best: ${s.longest})`
    ).join("\n")
    : "  No streaks yet.";

  const vibeLines = state.lastVibeCheck
    ? `Rating ${state.lastVibeCheck.rating}/5 on ${state.lastVibeCheck.date}`
    : "No vibe check yet.";
  const todayCheckIns = state.recentCheckIns.filter((c) =>
    c.date === state.today
  );
  const todayDone = todayCheckIns.filter((c) => c.status === "Done").length;
  const todayPartial = todayCheckIns.filter((c) => c.status === "Partial")
    .length;
  const todayMissed = todayCheckIns.filter((c) => c.status === "Missed")
    .length;
  const todayPending = Math.max(
    state.domainFocuses.length - todayDone - todayPartial - todayMissed,
    0,
  );

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

Today status:
  Date: ${state.today}
  Done check-ins: ${todayDone}
  Partial check-ins: ${todayPartial}
  Missed check-ins: ${todayMissed}
  Pending configured domains: ${todayPending}
  Important: today is still in progress. Do not say the day is done or complete.

Personalisation mode: standard app support. Use one grounded detail from the context above.

Generate one ${type} for today.`;
}

function clipText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function safeFallbackText(
  text: string | null | undefined,
  fallback: string,
): string {
  const trimmed = text?.trim();
  if (!trimmed) return fallback;
  return ADULT_CONTENT_PATTERN.test(trimmed) ? fallback : trimmed;
}

function buildFallbackNudge(state: UserState): GeneratedNudge {
  const recentOpen = [...state.recentCheckIns]
    .reverse()
    .find((checkIn) =>
      ["Missed", "Partial", "Pending"].includes(checkIn.status)
    );
  const focus =
    state.domainFocuses.find((item) => item.domain === recentOpen?.domain) ??
      state.domainFocuses[0];
  const domain = focus?.domain ?? recentOpen?.domain ?? null;
  const domainLabel = domain ? formatDomain(domain) : "Kairos";
  const phase = PHASE_CONTEXTS[state.phase]?.split(" - ")[0] ?? state.phase;
  const action = focus?.focus
    ? `${domainLabel}: ${
      safeFallbackText(focus.focus, "Pick one visible action and close it today")
    }`
    : "Pick one visible action and close it today";

  return {
    title: `Day ${Math.min(state.dayInCycle, 84)}. Close one loop.`,
    body: clipText(`${phase}. ${action}. Keep it small enough to do now.`, 200),
    type: "daily_nudge",
    domain,
    xp_reward: 5,
    cta: domain ? "check_in_now" : "reflect",
    _costPence: 0,
  };
}

const ADVICE_BOUNDARY_PATTERN =
  /\b(therapy|therapist|diagnosis|diagnose|medical advice|doctor|medication|legal advice|financial advice|investment|invest|debt advice|self-harm|suicide|crisis)\b/i;
const DAY_COMPLETION_PATTERN =
  /\b(?:day\s+\d+\s+(?:is\s+)?(?:done|complete(?:d)?)|today(?:'s|\s+is)?\s+(?:done|complete(?:d)?))\b/i;
const BLOCKED_CONTENT_WORD_CODES = [
  [115, 101, 120],
  [115, 101, 120, 117, 97, 108],
  [115, 101, 120, 121],
  [101, 114, 111, 116, 105, 99],
  [102, 108, 105, 114, 116],
  [102, 108, 105, 114, 116, 105, 110, 103],
  [105, 110, 116, 105, 109, 97, 99, 121],
  [105, 110, 116, 105, 109, 97, 116, 101],
  [112, 111, 114, 110],
  [110, 117, 100, 101],
  [110, 97, 107, 101, 100],
  [111, 114, 103, 97, 115, 109],
  [102, 101, 116, 105, 115, 104],
  [98, 101, 100, 114, 111, 111, 109],
].map((codes) => String.fromCharCode(...codes));
const BLOCKED_CONTENT_STEM_CODES = [[109, 97, 115, 116, 117, 114, 98, 97, 116]].map((codes) =>
  String.fromCharCode(...codes)
);
const BLOCKED_CONTENT_COMPACT_CODES = [[104, 111, 111, 107, 117, 112]].map((codes) =>
  String.fromCharCode(...codes)
);

function hasBlockedContent(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const compact = words.join("");

  return (
    BLOCKED_CONTENT_WORD_CODES.some((term) => words.includes(term)) ||
    BLOCKED_CONTENT_STEM_CODES.some((stem) =>
      words.some((word) => word.startsWith(stem))
    ) ||
    BLOCKED_CONTENT_COMPACT_CODES.some((term) => compact.includes(term))
  );
}

function buildBoundaryNudge(state: UserState): GeneratedNudge {
  const phase = PHASE_CONTEXTS[state.phase]?.split(" - ")[0] ?? state.phase;

  return {
    title: "Stay inside the next action.",
    body: clipText(
      `${phase}. Kairos is not therapy, diagnosis, medical, legal, or financial advice. Choose one safe proof step and use qualified support where needed.`,
      200,
    ),
    type: "daily_nudge",
    domain: null,
    xp_reward: 0,
    cta: "reflect",
    _costPence: 0,
  };
}

function buildFamilySafeNudge(state: UserState): GeneratedNudge {
  const phase = PHASE_CONTEXTS[state.phase]?.split(" - ")[0] ?? state.phase;

  return {
    title: "Choose the useful version.",
    body: clipText(
      `${phase}. Keep it practical and age-safe: one small action, one low-pressure check-in, or one quiet reset.`,
      200,
    ),
    type: "daily_nudge",
    domain: null,
    xp_reward: 0,
    cta: "reflect",
    _costPence: 0,
  };
}

function enforceNudgeBoundaries(
  result: GeneratedNudge,
  state: UserState,
): GeneratedNudge {
  const combined = `${result.title} ${result.body}`;
  if (ADVICE_BOUNDARY_PATTERN.test(combined)) return buildBoundaryNudge(state);
  if (hasBlockedContent(combined)) return buildFamilySafeNudge(state);
  if (DAY_COMPLETION_PATTERN.test(combined)) return buildFallbackNudge(state);
  return result;
}

function getLondonIsoDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const lookup = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

async function getRequestedDate(req: Request): Promise<string> {
  const fallback = getLondonIsoDate();
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return fallback;

  try {
    const body = await req.json();
    const requested = typeof body?.date === "string" ? body.date : "";
    return ISO_DATE_PATTERN.test(requested) ? requested : fallback;
  } catch {
    return fallback;
  }
}

async function callClaude(userPrompt: string): Promise<GeneratedNudge> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_HAIKU_MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content: string = data.content?.[0]?.text ?? "";
  const inputTokens: number = data.usage?.input_tokens ?? 0;
  const outputTokens: number = data.usage?.output_tokens ?? 0;
  const costPence = estimateAnthropicCostPence({
    model: CLAUDE_HAIKU_MODEL,
    inputTokens,
    outputTokens,
  });

  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      [null, content];
    const parsed = JSON.parse((jsonMatch[1] ?? content).trim());
    return { ...parsed, _costPence: costPence };
  } catch {
    return {
      title: `Day ${new Date().getDate()}. Show up.`,
      body: "One action. That's all. Pick it and do it now.",
      type: "daily_nudge",
      domain: null,
      xp_reward: null,
      cta: "check_in_now",
      _costPence: costPence,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return preflightResponse(req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        req,
        { error: "Missing authorization" },
        {
          status: 401,
        },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(req, {
        error: "Supabase function environment is not configured",
      }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return jsonResponse(req, { error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const today = await getRequestedDate(req);

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return jsonResponse(req, { error: "Profile not found" }, { status: 404 });
    }

    const { data: identityAnchor } = await supabase
      .from("identity_anchors")
      .select("name")
      .eq("id", profile.identity_anchor_id)
      .maybeSingle();

    let cycle: Record<string, unknown> | null = null;
    if (profile.current_kairos_cycle_id) {
      const { data } = await supabase
        .from("kairos_cycles")
        .select("*")
        .eq("id", profile.current_kairos_cycle_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      cycle = data;
    }

    if (!cycle) {
      const { data } = await supabase
        .from("kairos_cycles")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      cycle = data;
    }

    const cycleId = (cycle?.id as string | undefined) ?? null;
    if (!cycleId) {
      return jsonResponse(req, { error: "No active Kairos cycle" }, {
        status: 409,
      });
    }

    const startDate = new Date(
      (cycle?.start_date as string | undefined) ?? profile.created_at ?? today,
    );
    const todayDate = new Date(today);
    const dayInCycle = Math.max(
      1,
      Math.floor((todayDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
    );

    const PHASE_DAYS = [
      { phase: "KICKOFF", start: 1, end: 14 },
      { phase: "ANCHOR", start: 15, end: 28 },
      { phase: "INCREASE", start: 29, end: 42 },
      { phase: "RHYTHM", start: 43, end: 56 },
      { phase: "OWN", start: 57, end: 70 },
      { phase: "SUSTAIN", start: 71, end: 84 },
    ];
    const phaseConfig = PHASE_DAYS.find((p) =>
      dayInCycle >= p.start && dayInCycle <= p.end
    ) ??
      PHASE_DAYS[PHASE_DAYS.length - 1];

    // Cache check is cycle-scoped so a same-day reset does not reuse the old
    // journey's nudge.
    const { data: cached } = await supabase
      .from("ai_nudges")
      .select("*")
      .eq("user_id", userId)
      .eq("cycle_id", cycleId)
      .eq("date", today)
      .eq("type", "daily_nudge")
      .maybeSingle();

    if (cached) {
      return jsonResponse(req, { nudge: cached, cached: true });
    }

    const { data: focuses } = cycleId
      ? await supabase
        .from("user_domain_focuses")
        .select("domain_type, focus_description")
        .eq("user_id", userId)
        .eq("cycle_id", cycleId)
      : { data: [] };

    const { data: customRoutes } = cycleId
      ? await supabase
        .from("custom_routes")
        .select("id, label, parent_domain_type, focus_description")
        .eq("user_id", userId)
        .eq("cycle_id", cycleId)
        .is("archived_at", null)
        .order("created_at", { ascending: true })
      : { data: [] };

    const sevenDaysAgo =
      new Date(todayDate.getTime() - 7 * 86_400_000).toISOString().split(
        "T",
      )[0];

    const { data: checkIns } = await supabase
      .from("daily_check_ins")
      .select("date, domain_type, status, notes")
      .eq("user_id", userId)
      .eq("cycle_id", cycleId)
      .gte("date", sevenDaysAgo)
      .order("date", { ascending: true });

    const { data: customCheckIns } = cycleId
      ? await supabase
        .from("custom_route_check_ins")
        .select("date, status, notes, custom_routes(label)")
        .eq("user_id", userId)
        .eq("cycle_id", cycleId)
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: true })
      : { data: [] };

    const { data: streaks } = (checkIns ?? []).length
      ? await supabase
        .from("user_streaks")
        .select("domain_type, current_streak, longest_streak")
        .eq("user_id", userId)
      : { data: [] };

    const { data: vibeChecks } = await supabase
      .from("vibe_checks")
      .select("rating, date")
      .eq("user_id", userId)
      .eq("cycle_id", cycleId)
      .gte("date", sevenDaysAgo)
      .order("date", { ascending: true });

    const lastVibeCheck = vibeChecks?.[vibeChecks.length - 1];

    const state: UserState = {
      today,
      identityAnchorName: (identityAnchor as { name: string } | null)?.name ??
        profile.identity_anchor_id,
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
        (r: {
          label: string;
          parent_domain_type: string;
          focus_description: string;
        }) => ({
          label: r.label,
          parentDomain: r.parent_domain_type,
          focus: r.focus_description,
        }),
      ),
      recentCheckIns: (checkIns ?? []).map(
        (c: {
          date: string;
          domain_type: string;
          status: string;
          notes: string | null;
        }) => ({
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
          custom_routes: { label: string }[] | { label: string } | null;
        }) => ({
          date: c.date,
          route: Array.isArray(c.custom_routes)
            ? (c.custom_routes[0]?.label ?? "Personal route")
            : (c.custom_routes?.label ?? "Personal route"),
          status: c.status,
          notes: c.notes,
        }),
      ),
      streaks: (streaks ?? []).map(
        (s: {
          domain_type: string;
          current_streak: number;
          longest_streak: number;
        }) => ({
          domain: s.domain_type,
          current: s.current_streak,
          longest: s.longest_streak,
        }),
      ),
      lastVibeCheck: lastVibeCheck
        ? { rating: lastVibeCheck.rating, date: lastVibeCheck.date }
        : undefined,
      vibeChecks: (vibeChecks ?? []).map((
        v: { rating: number; date: string },
      ) => ({
        rating: v.rating,
        date: v.date,
      })),
    };

    const userPrompt = buildUserPrompt(state, "daily_nudge");
    let result: GeneratedNudge;
    try {
      result = await callClaude(userPrompt);
    } catch (providerErr) {
      const message = providerErr instanceof Error
        ? providerErr.message
        : "Unknown provider error";
      console.error("AI provider unavailable, using fallback nudge:", message);
      result = buildFallbackNudge(state);
    }
    result = enforceNudgeBoundaries(result, state);

    const { data: nudge, error: insertErr } = await supabase
      .from("ai_nudges")
      .upsert(
        {
          user_id: userId,
          cycle_id: cycleId,
          date: today,
          type: "daily_nudge",
          title: result.title,
          body: result.body,
          domain_type: result.domain,
          kairos_phase: phaseConfig.phase,
          xp_reward: result.xp_reward,
          status: "new",
          cta: result.cta,
          cost_pence: result._costPence ?? 0,
        },
        { onConflict: "user_id,cycle_id,date,type", ignoreDuplicates: false },
      )
      .select()
      .single();

    if (insertErr) {
      console.error("Upsert nudge failed:", insertErr.message);
      return jsonResponse(req, {
        nudge: {
          id: `local-fallback-nudge:${userId}:${cycleId}:${today}`,
          user_id: userId,
          cycle_id: cycleId,
          date: today,
          type: "daily_nudge",
          title: result.title,
          body: result.body,
          domain_type: result.domain,
          kairos_phase: phaseConfig.phase,
          xp_reward: result.xp_reward,
          status: "new",
          cta: result.cta,
          generated_at: new Date().toISOString(),
          cost_pence: result._costPence ?? 0,
        },
        cached: false,
        stored: false,
      });
    }

    return jsonResponse(req, { nudge, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-kairos-nudge error:", message);
    return jsonResponse(req, { error: message }, { status: 500 });
  }
});
