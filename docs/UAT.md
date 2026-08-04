# 12K MVP UAT Matrix

Use this matrix before treating a user-facing PR as ready.

## Automated Gates

| Gate | Command | Evidence |
| --- | --- | --- |
| Lint | `npm run lint` | Biome passes for `src`. |
| TypeScript | `npm run typecheck` | `tsc --noEmit` passes. |
| Unit tests | `npm test` | Vitest passes. |
| Build | `npm run build` | Vite and service worker build complete with `NODE_OPTIONS=--max-old-space-size=4096` available in CI. |
| E2E smoke | `npm run test:e2e` | Login, onboarding, Today, Progress, Improve, You, manifest/icons, 3-tap check-in, mobile overflow, and WCAG A/AA smoke pass. |
| Lighthouse | `npm run lighthouse` | Accessibility and best-practices are enforced; viewport/HTTPS/mobile zoom audits are enforced; performance is reported at 0.85 or higher. |

## Manual Mobile UAT

Run on a real installed PWA when possible.

| Area | Check |
| --- | --- |
| Login | Magic-link form is visible, branded, and does not overflow on mobile. |
| Onboarding | Three-step flow explains 12K, identity, first lever, and first action without marketing clutter. |
| Today | A core check-in can be completed in no more than three taps from the dashboard. |
| Catch-up | Missed actions show a recovery path and do not make the day feel failed. |
| Improve | Paid users see one to three actionable cards; Free users see a clear paid gate. |
| Progress | Free users see visual progress only; paid users see status, XP, badges, weekly bonus, and protection. |
| You | Profile image, reset journey, custom routes, notification preferences, export, and billing states are visible where relevant. |
| Privacy | Public labels remain discreet on the phone screen and notifications. |
| PWA | Manifest, icons, viewport-fit, installability, service worker, and double-tap behaviour remain correct. Lighthouse 12 no longer exposes the legacy PWA category, so manifest/icon installability is covered by Playwright. |

## Browser Coverage

CI runs Chromium mobile and WebKit mobile smoke. Manual production checks should cover:

- iOS Safari installed PWA.
- Android Chrome installed PWA.
- Desktop Chrome login and recovery paths.

## Known External Blockers

- Stripe checkout live redirect depends on `VITE_STRIPE_CHECKOUT_URL` being configured in Vercel production and preview.
