import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const edgeFunctionRoot = 'supabase/functions';
const corsProtectedFunctions = [
  'compute-weekly-metrics',
  'delete-account',
  'generate-cycle-reflection',
  'generate-kairos-nudge',
  'generate-squad-pulse',
  'match-to-squad',
  'save-push-subscription',
  'send-daily-push',
];

function functionSource(name: string): string {
  return readFileSync(join(edgeFunctionRoot, name, 'index.ts'), 'utf8');
}

describe('security hardening', () => {
  it('uses explicit CORS allowlisting instead of wildcard browser origins', () => {
    const helper = readFileSync('supabase/functions/_shared/cors.ts', 'utf8');

    expect(helper).toContain('https://www.12k.app');
    expect(helper).toContain('https://12k.app');
    expect(helper).toContain('http://localhost:5173');
    expect(helper).toContain('isAllowedCorsOrigin');
    expect(helper).toContain('authorization, content-type, apikey, x-client-info');
    expect(helper).not.toContain("Access-Control-Allow-Origin': '*'");

    for (const name of corsProtectedFunctions) {
      const source = functionSource(name);
      expect(source).toMatch(/from ["']\.\.\/_shared\/cors\.ts["']/);
      expect(source).toContain('preflightResponse(req');
      expect(source).not.toContain("Access-Control-Allow-Origin': '*'");
    }
  });

  it('keeps Stripe webhook signature-gated and outside browser CORS handling', () => {
    const source = functionSource('stripe-webhook');

    expect(source).toContain('verifyStripeSignature');
    expect(source).toMatch(/req\.headers\.get\(["']stripe-signature["']\)/);
    expect(source).toContain('billing_disabled');
    expect(source).not.toContain('.from("profiles")');
    expect(source).not.toMatch(/from ["']\.\.\/_shared\/cors\.ts["']/);
  });

  it('keeps backend enforcement for client-visible app access state', () => {
    const profileGuard = readFileSync('supabase/migrations/027_single_app_access.sql', 'utf8');
    const customRoutes = readFileSync('supabase/migrations/027_single_app_access.sql', 'utf8');

    expect(profileGuard).toContain('guard_profile_sensitive_fields');
    expect(profileGuard).toContain('Profile app access fields cannot be changed directly');
    expect(profileGuard).toContain("new.tier <> 'brotherhood'");
    expect(customRoutes).not.toContain("p.tier in ('brotherhood', 'lifechanger')");
    expect(customRoutes).toContain('auth.uid() = user_id');
  });

  it('keeps admin metrics protected by server-side admin checks', () => {
    const adminMetricsMigration = readFileSync(
      'supabase/migrations/026_harden_admin_metrics_auth.sql',
      'utf8',
    );
    const computeMetrics = functionSource('compute-weekly-metrics');
    const adminMetricsPage = readFileSync('src/pages/AdminMetricsPage.tsx', 'utf8');

    expect(adminMetricsMigration).toContain("auth.jwt() -> 'app_metadata' ->> 'role'");
    expect(adminMetricsMigration).toContain("= 'admin'");
    expect(adminMetricsMigration).toContain('using (public.is_admin())');

    expect(computeMetrics).toContain('function isAdminUser');
    expect(computeMetrics).toContain('role === "admin"');
    expect(computeMetrics).toContain('Deno.env.get("ADMIN_EMAILS") ?? ""');
    expect(computeMetrics).not.toContain('?? "liam@whatisnext.io"');

    expect(adminMetricsPage).toContain('VITE_ADMIN_EMAILS');
    expect(adminMetricsPage).not.toContain("['liam@whatisnext.io']");
  });

  it('keeps push delivery secrets in the Supabase deployment path', () => {
    const workflow = readFileSync('.github/workflows/supabase-deploy.yml', 'utf8');

    expect(workflow).toContain('VAPID_PUBLIC_KEY: ${{ secrets.VAPID_PUBLIC_KEY }}');
    expect(workflow).toContain('VAPID_PRIVATE_KEY: ${{ secrets.VAPID_PRIVATE_KEY }}');
    expect(workflow).toContain('VAPID_PUBLIC_KEY="$VAPID_PUBLIC_KEY"');
    expect(workflow).toContain('VAPID_PRIVATE_KEY="$VAPID_PRIVATE_KEY"');
  });

  it('documents the reviewed security surfaces and residual risks', () => {
    const review = readFileSync('docs/SECURITY_REVIEW.md', 'utf8');
    const functionNames = readdirSync(edgeFunctionRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => entry.name);

    expect(review).toContain('Row Level Security');
    expect(review).toContain('Client-visible app-access checks versus backend enforcement');
    expect(review).toContain('Local persistence');
    expect(review).toContain('Hosted Supabase migration state was not re-read');
    expect(functionNames).toContain('stripe-webhook');
  });
});
