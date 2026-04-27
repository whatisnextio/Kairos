// compute-weekly-metrics
// Supabase Edge Function (Deno runtime)
// Called by: weekly cron (Sunday 22:00 UTC)
// Aggregates platform metrics and writes one row to metrics_snapshots.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
// Comma-separated list of admin emails allowed to trigger manual computation.
const ADMIN_EMAILS = new Set(
  (Deno.env.get('ADMIN_EMAILS') ?? 'liam@whatisnext.io').split(',').map((e) => e.trim()),
);

async function fetchMrrPence(): Promise<number> {
  if (!STRIPE_SECRET_KEY) return 0;
  let mrr = 0;
  let startingAfter: string | null = null;
  // Paginate through all active subscriptions
  while (true) {
    const params = new URLSearchParams({ status: 'active', limit: '100' });
    if (startingAfter) params.set('starting_after', startingAfter);
    const res = await fetch(`https://api.stripe.com/v1/subscriptions?${params}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    if (!res.ok) return 0;
    const body = (await res.json()) as {
      data: Array<{
        id: string;
        items: {
          data: Array<{
            price: { unit_amount: number; currency: string; recurring: { interval: string } };
          }>;
        };
      }>;
      has_more: boolean;
    };
    for (const sub of body.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        // Normalise to monthly pence (GBP)
        if (price.currency !== 'gbp') continue;
        const amount = price.unit_amount ?? 0;
        if (price.recurring.interval === 'month') mrr += amount;
        else if (price.recurring.interval === 'year') mrr += Math.round(amount / 12);
      }
    }
    if (!body.has_more) break;
    const lastId = body.data[body.data.length - 1]?.id;
    if (!lastId) break;
    startingAfter = lastId;
  }
  return mrr;
}

Deno.serve(async (req: Request) => {
  const serviceRole = req.headers.get('x-service-role');
  const authHeader = req.headers.get('Authorization');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Cron path: service role key in header.
  // Admin UI path: valid JWT belonging to an admin email.
  if (serviceRole !== SUPABASE_SERVICE_ROLE_KEY) {
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user || !user.email || !ADMIN_EMAILS.has(user.email)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
  }
  const today = new Date().toISOString().split('T')[0];

  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Paid users
    const { count: paidUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'brotherhood')
      .eq('subscription_status', 'active');

    const total = totalUsers ?? 0;
    const paid = paidUsers ?? 0;
    const conversionRate = total > 0 ? Math.round((paid / total) * 10000) / 100 : 0;

    // Day 7 retention: users whose cycle started 5-7 days ago and have a check-in in that window
    const day5Ago = new Date(Date.now() - 5 * 86_400_000).toISOString().split('T')[0];
    const day7Ago = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0];

    const { data: day7Users } = await supabase
      .from('kairos_cycles')
      .select('user_id')
      .gte('start_date', day7Ago)
      .lte('start_date', day5Ago)
      .eq('status', 'active');

    let day7Retention = 0;
    if (day7Users && day7Users.length > 0) {
      const userIds = day7Users.map((u: { user_id: string }) => u.user_id);
      const { data: activeDay7 } = await supabase
        .from('daily_check_ins')
        .select('user_id')
        .in('user_id', userIds)
        .gte('date', day7Ago)
        .lte('date', today)
        .in('status', ['Done', 'Partial']);

      const retained = new Set((activeDay7 ?? []).map((c: { user_id: string }) => c.user_id)).size;
      day7Retention = Math.round((retained / userIds.length) * 10000) / 100;
    }

    // Day 84 completion: users whose cycle started 84+ days ago, status completed
    const day84Ago = new Date(Date.now() - 84 * 86_400_000).toISOString().split('T')[0];

    const { count: completedCycles } = await supabase
      .from('kairos_cycles')
      .select('*', { count: 'exact', head: true })
      .lte('start_date', day84Ago)
      .eq('status', 'completed');

    const { count: totalOldCycles } = await supabase
      .from('kairos_cycles')
      .select('*', { count: 'exact', head: true })
      .lte('start_date', day84Ago);

    const day84Completion =
      (totalOldCycles ?? 0) > 0
        ? Math.round(((completedCycles ?? 0) / (totalOldCycles ?? 1)) * 10000) / 100
        : 0;

    const mrrPence = await fetchMrrPence();

    // Upsert snapshot
    const { error: upsertErr } = await supabase.from('metrics_snapshots').upsert(
      {
        snapshot_date: today,
        total_users: total,
        paid_users: paid,
        conversion_rate: conversionRate,
        day7_retention: day7Retention,
        day84_completion: day84Completion,
        mrr_pence: mrrPence,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'snapshot_date' },
    );

    if (upsertErr) throw new Error(upsertErr.message);

    return new Response(
      JSON.stringify({
        snapshot_date: today,
        total_users: total,
        paid_users: paid,
        conversion_rate: conversionRate,
        day7_retention: day7Retention,
        day84_completion: day84Completion,
        mrr_pence: mrrPence,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('compute-weekly-metrics error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
