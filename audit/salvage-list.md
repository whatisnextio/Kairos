# Phase 0 Salvage List

**Date:** 2026-04-26
**Instruction:** Copy these blocks verbatim into the new clean repo.

---

## 1. PWA Manifest

Source: `12k_transform_populated/public/manifest.json` (uncomment the block comment)

```json
{
  "short_name": "12K",
  "name": "12K - Your 12-Week Transformation",
  "icons": [
    { "src": "favicon.ico", "sizes": "64x64 32x32 24x24 16x16", "type": "image/x-icon" },
    { "src": "logo192.png", "type": "image/png", "sizes": "192x192" },
    { "src": "logo512.png", "type": "image/png", "sizes": "512x512" }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#0B0B0B",
  "background_color": "#0B0B0B",
  "description": "12K: Your 12-Week Transformation. Powered by the Kairos System."
}
```

**Action:** Place as `public/manifest.json`. Add real icon assets (192px, 512px PNG) before soft launch.

---

## 2. Tailwind Base Styles

Source: `12k_transform_populated/src/tailwind.css` (content inside the `/* */` block)

Key design tokens to carry forward:
- Base background: `#0B0B0B` (Core Base Black)
- Primary font: Oswald (headings), Inter (body)
- Accent colour: green (exact hex to confirm from brand doc)
- Component classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input-field`, `.card`, `.tab-item`
- Custom Tailwind token: `base-black` = `#0B0B0B`

**Action:** Wire these as custom tokens in `tailwind.config.ts`. Build component classes as shadcn/ui variants, not raw CSS classes.

---

## 3. Check-in Store Pattern

Source: `12k_transform_populated/src/store/useAppStore.ts` lines 2-42

The `setDailyCheckIn` partial reveals:

```typescript
// XP constants (values not visible — define in gamification.ts)
XP_PER_CHECK_IN_DONE    // e.g. 10
XP_PER_CHECK_IN_PARTIAL // e.g. 5

// Pattern: optimistic update first, then Supabase write
// 1. Update local Zustand state immediately
// 2. Write to Supabase daily_check_ins table
// 3. Call updateProfileXP with delta

// Tier guard pattern:
if (profile.tier !== 'free') {
  // sync to Supabase
  // free tier is local-only
}
```

**Action:** Use this pattern exactly when building the `checkInSlice` in Zustand. Free tier is local-only. Brotherhood tier syncs to Supabase.

---

## 4. AI Tab Component API

Source: `12k_transform_populated/src/pages/ImproveScreen.tsx` (lower section)

The JSX tail reveals this component API surface:

```typescript
// AICard props
interface AICardProps {
  suggestion: AISuggestion;       // the nudge/challenge object
  onComplete: (id: string) => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  isActiveChallenge?: boolean;
}

// Store actions referenced
fetchAiSuggestions()         // triggers nudge generation
acceptAiChallenge(id)        // moves suggestion to active challenges
completeAiChallenge(id)      // marks challenge done, awards XP
dismissAiSuggestion(id)      // removes from suggestions

// State slices referenced
aiSuggestions: AISuggestion[]
activeAiChallenges: AISuggestion[]
completedAiChallenges: AISuggestion[]    // last 3 only displayed

// Upgrade gate pattern:
// Free + non-Sunday: show blurred placeholder cards
// Two CTAs: "Unlock Brotherhood (£7.99/mo)" and "Unlock Lifechanger"
// NOTE: Kill Lifechanger CTA per Decision D1
```

**Action:** Build `AICard` component to this spec. Implement store actions against the `ai_nudges` Supabase table. Kill the Lifechanger CTA.

---

## 5. Service Worker Strategy (Reference Only)

Source: `12k_transform_populated/public/service-worker.js` (commented Workbox imports)

Intended caching strategies:
- Google Fonts stylesheets: `StaleWhileRevalidate`
- Google Fonts webfonts: `CacheFirst`, 1 year max age
- Static resources (scripts, styles, fonts, images): `StaleWhileRevalidate`, 30 days
- Stripe.js: `CacheFirst`, 7 days, max 1 entry
- Skip waiting: `self.skipWaiting()` on `SKIP_WAITING` message

**Action:** Implement via `vite-plugin-pwa` with Workbox config. Do not hand-roll the service worker.

---

## Nothing Else Is Salvageable

The following have zero usable content and should be built from scratch:
- All TypeScript types
- All React components
- All page components
- All store slices except the check-in pattern above
- All routing
- Supabase client
- Auth flows
- KAIROS phase logic (entirely absent from codebase)
