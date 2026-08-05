// stripe-webhook
// Supabase Edge Function (Deno runtime)
// Billing is disabled in the single-app model. Keep the signed webhook endpoint
// alive so old Stripe deliveries can be acknowledged without changing profiles.

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

// Stripe webhook signature verification (manual HMAC, no Stripe SDK in Deno).
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = sigHeader.split(",").map((p) => p.trim());

  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1Signatures = parts.filter((p) => p.startsWith("v1=")).map((p) =>
    p.slice(3)
  );

  if (!timestamp || v1Signatures.length === 0) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number.parseInt(timestamp)) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signedPayload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const hashBuffer = await crypto.subtle.sign("HMAC", key, messageData);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return v1Signatures.some((sig) => hashHex === sig);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sigHeader = req.headers.get("stripe-signature");
  if (!sigHeader) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const payload = await req.text();

  const valid = await verifyStripeSignature(
    payload,
    sigHeader,
    STRIPE_WEBHOOK_SECRET,
  );
  if (!valid) {
    console.error("Stripe webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    JSON.parse(payload);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  return new Response(
    JSON.stringify({
      received: true,
      ignored: true,
      reason: "billing_disabled",
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
});
