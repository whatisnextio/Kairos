// save-push-subscription
// Supabase Edge Function (Deno runtime)
// Called after the browser subscribes to push notifications.
// Saves the PushSubscription JSON to a push_subscriptions table so the
// server can send web push notifications via the Web Push protocol.
//
// Body: { subscription?: PushSubscription JSON, preferences?: notification preferences JSON }

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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

  if (authError || !user) {
    return jsonResponse(req, { error: "Unauthorized" }, { status: 401 });
  }

  let body: { subscription?: unknown; preferences?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, { error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.subscription && !body.preferences) {
    return jsonResponse(req, { error: "Missing subscription or preferences" }, {
      status: 400,
    });
  }

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = { updated_at: now };

  if (body.preferences) {
    const { error: settingsErr } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        notification_preferences: body.preferences,
        updated_at: now,
      }, { onConflict: "user_id" });

    if (settingsErr) {
      console.error("save-user-settings preferences error:", settingsErr.message);
      return jsonResponse(req, { error: settingsErr.message }, { status: 500 });
    }
  }

  if (body.subscription) {
    const upsertPayload: Record<string, unknown> = {
      user_id: user.id,
      subscription: body.subscription,
      updated_at: now,
    };
    if (body.preferences) upsertPayload.preferences = body.preferences;

    const { error: upsertErr } = await supabase
      .from("push_subscriptions")
      .upsert(upsertPayload, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("save-push-subscription error:", upsertErr.message);
      return jsonResponse(req, { error: upsertErr.message }, { status: 500 });
    }
  } else {
    payload.preferences = body.preferences;
    const { error: updateErr } = await supabase
      .from("push_subscriptions")
      .update(payload)
      .eq("user_id", user.id);

    if (updateErr) {
      console.error(
        "save-push-subscription preferences error:",
        updateErr.message,
      );
      return jsonResponse(req, { error: updateErr.message }, { status: 500 });
    }
  }

  return jsonResponse(req, { saved: true });
});
