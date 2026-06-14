# Kairos

One daily score that tells the truth about how you are living. No noise. No
logging marathon. One screen, one score, one tap.

This is **Phase 1**: a self-contained, installable PWA. Dark mode only, orange on
black, a nod to the Garmin aesthetic. Local storage only, no account, no backend,
no network. Your data stays on the device.

## Kairos vs 12K

**Kairos is the framework** (the scoring philosophy and the daily mirror). 12K is
the larger 84-day transformation product that also runs on the Kairos framework
and lives in the rest of this repo. This folder is the standalone Kairos daily
score app and does not touch the 12K React app.

## The score

A single 0-100 number from four weighted inputs:

| Input | Weight | Phase 1 | Phase 2 source |
|---|---|---|---|
| Training | 40% | manual slider | Garmin / MyZone |
| Recovery (sleep + HRV) | 30% | manual slider | Oura / Garmin |
| Alcohol-free day | 20% | one tap | one tap |
| Streak bonus | 10% | calculated | calculated |

Training and Recovery are kept separate on purpose. Recovery is the axis that
catches overwork and burnout, so a heavy-but-wrecked day still reads as a bad day.

- **Streak**: consecutive days with a score of 60 or above. A missed day breaks it.
- **Alcohol-free streak**: separate counter, consecutive confirmed dry days.
- **Personal bests**: highest score, longest streak, longest dry run. History is
  never deleted, the low points stay visible.

## Run it

No build step. Serve the folder over HTTP (a service worker needs http/https, it
will not register from `file://`):

```bash
cd kairos
python3 -m http.server 8000
# open http://localhost:8000
```

On Android, open it in Chrome and choose "Add to home screen" to install it.

## Tests

The scoring engine and notification copy are pure and unit tested. They run with
the repo's existing vitest:

```bash
npx vitest run kairos
```

## Notifications

Blunt by design: no emojis, no fluff, just the fact. Morning brief (06:30),
midday nudge (12:30), evening alcohol check (20:00), plus streak milestones,
streak-broken, and "three days dropping". Phase 1 delivers these best-effort while
the app is open. Reliable background delivery needs Phase 2 (push / FCM).

## Roadmap

- **Phase 2**: OAuth sync with Garmin, Oura, MyZone and Google so Training and
  Recovery fill themselves. Background notifications. Personal-bests dashboard.
- **Phase 3**: Strava, weekly summary, optional share with one trusted person.

## Files

| File | Role |
|---|---|
| `index.html` | the one screen |
| `app.js` | DOM controller and reminder scheduler |
| `score.js` | pure scoring engine (tested) |
| `notifications.js` | notification copy and delivery (copy tested) |
| `storage.js` | localStorage persistence |
| `sw.js` | offline cache + notification routing |
| `manifest.webmanifest` | PWA install metadata |
