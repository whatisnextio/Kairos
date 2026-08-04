// match-to-squad
// Supabase Edge Function (Deno runtime)
// Called after onboarding completes (or manually triggered by cron weekly).
//
// Algorithm:
//   1. Auth: verify JWT, extract user_id
//   2. Load user's active cycle + phase
//   3. Find existing squads in same phase with < 8 members, cycle start within 7 days
//   4. If found: join it (update profiles.squad_id, increment squads.member_count)
//   5. If not found: create new squad, assign user
//   6. Return squad_id

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, preflightResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const PAID_TIERS = new Set(["brotherhood", "lifechanger"]);

const PHASE_DAYS: Array<{ phase: string; start: number; end: number }> = [
  { phase: "KICKOFF", start: 1, end: 14 },
  { phase: "ANCHOR", start: 15, end: 28 },
  { phase: "INCREASE", start: 29, end: 42 },
  { phase: "RHYTHM", start: 43, end: 56 },
  { phase: "OWN", start: 57, end: 70 },
  { phase: "SUSTAIN", start: 71, end: 84 },
];

function getPhase(dayInCycle: number): string {
  const config =
    PHASE_DAYS.find((p) => dayInCycle >= p.start && dayInCycle <= p.end) ??
      PHASE_DAYS[PHASE_DAYS.length - 1];
  return config.phase;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return preflightResponse(req);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(req, { error: "Missing authorization" }, {
      status: 401,
    });
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

  try {
    // Load profile + current cycle
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("tier, current_kairos_cycle_id, squad_id")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return jsonResponse(req, { error: "Profile not found" }, { status: 404 });
    }

    // Paid V1 tiers get squads.
    if (!PAID_TIERS.has(profile.tier)) {
      return jsonResponse(req, {
        error: "Squads require paid access",
        tier_gate: true,
      }, { status: 403 });
    }

    // Already in a squad
    if (profile.squad_id) {
      return jsonResponse(req, {
        squad_id: profile.squad_id,
        already_matched: true,
      });
    }

    if (!profile.current_kairos_cycle_id) {
      return jsonResponse(req, { error: "No active cycle" }, { status: 400 });
    }

    // Load cycle to compute phase
    const { data: cycle, error: cycleErr } = await supabase
      .from("kairos_cycles")
      .select("start_date")
      .eq("id", profile.current_kairos_cycle_id)
      .single();

    if (cycleErr || !cycle) {
      return jsonResponse(req, { error: "Cycle not found" }, { status: 404 });
    }

    const today = new Date().toISOString().split("T")[0];
    const startDate = new Date(cycle.start_date);
    const todayDate = new Date(today);
    const dayInCycle = Math.max(
      1,
      Math.floor((todayDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
    );
    const phase = getPhase(dayInCycle);

    // Look for compatible squads: same phase, member_count < 8, cycle start within 7 days
    const sevenDaysAgo =
      new Date(todayDate.getTime() - 7 * 86_400_000).toISOString().split(
        "T",
      )[0];

    const { data: candidates } = await supabase
      .from("squads")
      .select("id")
      .eq("kairos_phase", phase)
      .gte("cycle_start_window", sevenDaysAgo)
      .lte("cycle_start_window", today)
      .lt("member_count", 8)
      .order("member_count", { ascending: false }) // fill existing squads first
      .limit(1);

    let squadId: string;

    if (candidates && candidates.length > 0) {
      // Join existing squad — conditional update guards against race condition.
      // If another user filled the squad between our SELECT and UPDATE, the
      // lt('member_count', 8) filter will match 0 rows and we create a new squad.
      squadId = candidates[0].id;

      const { data: incremented, error: incrementErr } = await supabase.rpc(
        "increment_squad_member_count",
        { p_squad_id: squadId },
      );

      if (incrementErr) {
        throw new Error(`Squad increment failed: ${incrementErr.message}`);
      }

      if (!incremented) {
        // Squad was filled by a concurrent request; fall through to create a new one
        const { data: newSquad, error: createErr } = await supabase
          .from("squads")
          .insert({
            kairos_phase: phase,
            cycle_start_window: today,
            member_count: 1,
          })
          .select("id")
          .single();
        if (createErr || !newSquad) {
          throw new Error(`Squad create failed: ${createErr?.message}`);
        }
        squadId = newSquad.id;
      }
    } else {
      // Create new squad
      const { data: newSquad, error: createErr } = await supabase
        .from("squads")
        .insert({
          kairos_phase: phase,
          cycle_start_window: today,
          member_count: 1,
        })
        .select("id")
        .single();

      if (createErr || !newSquad) {
        throw new Error(`Squad create failed: ${createErr?.message}`);
      }

      squadId = newSquad.id;
    }

    // Assign user to squad
    const { error: assignErr } = await supabase
      .from("profiles")
      .update({ squad_id: squadId })
      .eq("id", userId);

    if (assignErr) {
      throw new Error(`Squad assignment failed: ${assignErr.message}`);
    }

    return jsonResponse(req, { squad_id: squadId, already_matched: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("match-to-squad error:", message);
    return jsonResponse(req, { error: message }, { status: 500 });
  }
});
