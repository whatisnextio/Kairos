// stripe-webhook
// Supabase Edge Function (Deno runtime)
// Receives Stripe webhook events and syncs subscription state to profiles.
//
// Handled events:
//   customer.subscription.created    → tier = brotherhood, status = active
//   customer.subscription.updated    → status = event status
//   customer.subscription.deleted    → tier = free, status = cancelled
//   checkout.session.completed       → links stripe_customer_id to profile
//
// Webhook secret is verified via Stripe-Signature header.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Stripe webhook signature verification (manual HMAC — no Stripe SDK in Deno)
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = sigHeader.split(',').map((p) => p.trim());

  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  // Stripe sends multiple v1= values during key rotation — accept any match
  const v1Signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));

  if (!timestamp || v1Signatures.length === 0) return false;

  // Reject events older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number.parseInt(timestamp)) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signedPayload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const hashBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return v1Signatures.some((sig) => hashHex === sig);
}

function mapStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    trialing: 'active',
    paused: 'past_due',
    incomplete: 'past_due',
    incomplete_expired: 'cancelled',
  };
  return statusMap[stripeStatus] ?? stripeStatus;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sigHeader = req.headers.get('stripe-signature');
  if (!sigHeader) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const payload = await req.text();

  const valid = await verifyStripeSignature(payload, sigHeader, STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.error('Stripe webhook signature verification failed');
    return new Response('Invalid signature', { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const obj = event.data.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Link stripe customer ID to profile via client_reference_id (= profile.id)
        const customerId = obj.customer as string;
        const subscriptionId = obj.subscription as string | null;
        const userId =
          (obj.client_reference_id as string | null) ??
          (obj.metadata as Record<string, string> | null)?.user_id;

        if (!userId || !customerId) break;

        await supabase
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId ?? null,
          })
          .eq('id', userId);

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const customerId = obj.customer as string;
        const subStatus = obj.status as string;
        const subId = obj.id as string;
        // Retain brotherhood during grace periods (past_due = first payment failure).
        // Only downgrade on incomplete (never paid) or hard cancellation paths.
        const graceStatuses = new Set(['active', 'trialing', 'past_due']);
        const tier = graceStatuses.has(subStatus) ? 'brotherhood' : 'free';

        await supabase
          .from('profiles')
          .update({
            tier,
            stripe_subscription_id: subId,
            subscription_status: mapStatus(subStatus),
          })
          .eq('stripe_customer_id', customerId);

        break;
      }

      case 'customer.subscription.deleted': {
        const customerId = obj.customer as string;

        await supabase
          .from('profiles')
          .update({
            tier: 'free',
            stripe_subscription_id: null,
            subscription_status: 'cancelled',
          })
          .eq('stripe_customer_id', customerId);

        break;
      }

      default:
        // Unhandled event type — acknowledge but don't act
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('stripe-webhook error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
