// save-push-subscription
// Supabase Edge Function (Deno runtime)
// Called after the browser subscribes to push notifications.
// Saves the PushSubscription JSON to a push_subscriptions table so the
// server can send web push notifications via the Web Push protocol.
//
// Body: { subscription: PushSubscription JSON }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: { subscription: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  if (!body.subscription) {
    return new Response(JSON.stringify({ error: 'Missing subscription' }), { status: 400 });
  }

  const { error: upsertErr } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        subscription: body.subscription,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (upsertErr) {
    console.error('save-push-subscription error:', upsertErr.message);
    return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ saved: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
