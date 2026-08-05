// compute-weekly-metrics
// Supabase Edge Function (Deno runtime)
// Called by: weekly cron (Sunday 22:00 UTC)
// Aggregates platform metrics and writes one row to metrics_snapshots.
// Legacy metric column names are kept for compatibility while the app has one tier.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, preflightResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const CORS_ALLOWED_HEADERS = "authorization, content-type, x-service-role";
// Comma-separated list of admin emails allowed to trigger manual computation.
const ADMIN_EMAILS = new Set(
  (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map((e) =>
    e.trim().toLowerCase()
  ).filter(Boolean),
);

function isAdminUser(user: { email?: string; app_metadata?: { role?: unknown } }) {
  const role = typeof user.app_metadata?.role === "string"
    ? user.app_metadata.role
    : "";
  const email = user.email?.trim().toLowerCase() ?? "";
  return role === "admin" || (email !== "" && ADMIN_EMAILS.has(email));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return preflightResponse(req, CORS_ALLOWED_HEADERS);
  }

  const serviceRole = req.headers.get("x-service-role");
  const authHeader = req.headers.get("Authorization");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Cron path: service role key in header.
  // Admin UI path: valid JWT with an admin role claim or explicitly configured admin email.
  if (serviceRole !== SUPABASE_SERVICE_ROLE_KEY) {
    if (!authHeader) {
      return jsonResponse(
        req,
        { error: "Unauthorized" },
        { status: 401 },
        CORS_ALLOWED_HEADERS,
      );
    }
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user || !isAdminUser(user)) {
      return jsonResponse(
        req,
        { error: "Forbidden" },
        { status: 403 },
        CORS_ALLOWED_HEADERS,
      );
    }
  }
  const today = new Date().toISOString().split("T")[0];

  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // App access users. Stored in the legacy paid_users column for compatibility.
    const { count: appAccessUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .in("tier", ["free", "brotherhood", "lifechanger"]);

    const total = totalUsers ?? 0;
    const access = appAccessUsers ?? 0;
    const conversionRate = total > 0
      ? Math.round((access / total) * 10000) / 100
      : 0;

    // Day 7 retention: users whose cycle started 5-7 days ago and have a check-in in that window
    const day5Ago =
      new Date(Date.now() - 5 * 86_400_000).toISOString().split("T")[0];
    const day7Ago =
      new Date(Date.now() - 7 * 86_400_000).toISOString().split("T")[0];

    const { data: day7Users } = await supabase
      .from("kairos_cycles")
      .select("user_id")
      .gte("start_date", day7Ago)
      .lte("start_date", day5Ago)
      .eq("status", "active");

    let day7Retention = 0;
    if (day7Users && day7Users.length > 0) {
      const userIds = day7Users.map((u: { user_id: string }) => u.user_id);
      const { data: activeDay7 } = await supabase
        .from("daily_check_ins")
        .select("user_id")
        .in("user_id", userIds)
        .gte("date", day7Ago)
        .lte("date", today)
        .in("status", ["Done", "Partial"]);

      const retained =
        new Set((activeDay7 ?? []).map((c: { user_id: string }) => c.user_id))
          .size;
      day7Retention = Math.round((retained / userIds.length) * 10000) / 100;
    }

    // Day 84 completion: users whose cycle started 84+ days ago, status completed
    const day84Ago =
      new Date(Date.now() - 84 * 86_400_000).toISOString().split("T")[0];

    const { count: completedCycles } = await supabase
      .from("kairos_cycles")
      .select("*", { count: "exact", head: true })
      .lte("start_date", day84Ago)
      .eq("status", "completed");

    const { count: totalOldCycles } = await supabase
      .from("kairos_cycles")
      .select("*", { count: "exact", head: true })
      .lte("start_date", day84Ago);

    const day84Completion = (totalOldCycles ?? 0) > 0
      ? Math.round(((completedCycles ?? 0) / (totalOldCycles ?? 1)) * 10000) /
        100
      : 0;

    const mrrPence = 0;

    // Upsert snapshot
    const { error: upsertErr } = await supabase.from("metrics_snapshots")
      .upsert(
        {
          snapshot_date: today,
          total_users: total,
          paid_users: access,
          conversion_rate: conversionRate,
          day7_retention: day7Retention,
          day84_completion: day84Completion,
          mrr_pence: mrrPence,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "snapshot_date" },
      );

    if (upsertErr) throw new Error(upsertErr.message);

    return jsonResponse(
      req,
      {
        snapshot_date: today,
        total_users: total,
        paid_users: access,
        conversion_rate: conversionRate,
        day7_retention: day7Retention,
        day84_completion: day84Completion,
        mrr_pence: mrrPence,
      },
      {},
      CORS_ALLOWED_HEADERS,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("compute-weekly-metrics error:", message);
    return jsonResponse(
      req,
      { error: message },
      { status: 500 },
      CORS_ALLOWED_HEADERS,
    );
  }
});
