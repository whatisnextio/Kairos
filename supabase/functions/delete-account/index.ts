// delete-account
// Supabase Edge Function (Deno runtime)
// GDPR Article 17 — Right to Erasure.
// Called by authenticated user to permanently delete their account.
//
// Flow:
//   1. Auth: verify JWT, extract user_id
//   2. Delete all user data (cascade deletes handle most via FK)
//   3. Delete from auth.users via admin API
//   4. Return 200

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  jsonResponse,
  preflightResponse,
  textResponse,
} from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return preflightResponse(req);
  }

  if (req.method !== "POST") {
    return textResponse(req, "Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(req, { error: "Missing authorization" }, {
      status: 401,
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify the token and get user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

  if (authError || !user) {
    return jsonResponse(req, { error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    // Decrement squad member_count before profile delete so the squad isn't left over-counted.
    const { data: profileSnap } = await supabase
      .from("profiles")
      .select("squad_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileSnap?.squad_id) {
      await supabase.rpc("decrement_squad_member_count", {
        p_squad_id: profileSnap.squad_id,
      });
    }

    // Delete profile — cascades to:
    // kairos_cycles, user_domain_focuses, daily_check_ins, user_streaks,
    // vibe_checks, squad_pulses (via squads), ai_nudges, outcomes, push_subscriptions
    const { error: profileErr } = await supabase.from("profiles").delete().eq(
      "id",
      userId,
    );

    if (profileErr) {
      throw new Error(`Profile delete failed: ${profileErr.message}`);
    }

    // Delete from auth.users (service role required)
    const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(
      userId,
    );

    if (authDeleteErr) {
      throw new Error(`Auth delete failed: ${authDeleteErr.message}`);
    }

    return jsonResponse(req, { deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("delete-account error:", message);
    return jsonResponse(req, { error: message }, { status: 500 });
  }
});
