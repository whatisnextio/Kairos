// Kairos. One screen, one score, one tap.

import {
  STREAK_THRESHOLD,
  alcoholFreeStreak,
  computeScore,
  computeStreak,
  incomingStreakFor,
  isTrendingDown,
  personalBests,
  recentTrend,
} from './score.js';
import {
  isMilestone,
  milestoneMessage,
  streakBrokenMessage,
  trendingDownMessage,
} from './notifications.js';
import {
  cancelReminders,
  checkPermission,
  initChannels,
  notify,
  permission,
  requestPermission,
  scheduleReminders,
} from './delivery.js';
import {
  entryFor,
  exportData,
  importData,
  loadEntries,
  loadSettings,
  saveSettings,
  todayKey,
  upsertEntry,
} from './storage.js';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Tell Capgo this bundle loaded successfully — prevents rollback on OTA error.
CapacitorUpdater.notifyAppReady();

const $ = (id) => document.getElementById(id);

const state = {
  entries: loadEntries(),
  settings: loadSettings(),
  today: todayKey(),
  draft: { training: 0, recovery: 0, alcoholFree: false },
};

// Seed the draft from any entry already saved for today.
const existing = entryFor(state.today, state.entries);
if (existing) {
  state.draft = {
    training: existing.training ?? 0,
    recovery: existing.recovery ?? 0,
    alcoholFree: existing.alcoholFree,
  };
}

// ─── Derived values ──────────────────────────────────────────────────────────

function incomingStreak() {
  return incomingStreakFor(state.entries, state.today, STREAK_THRESHOLD);
}

function draftScore() {
  return computeScore({
    training: state.draft.training,
    recovery: state.draft.recovery,
    alcoholFree: state.draft.alcoholFree,
    incomingStreak: incomingStreak(),
  });
}

function yesterdayScore() {
  const y = entryFor(yesterdayKey(), state.entries);
  return y ? y.score : null;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function displayEntries() {
  const withoutToday = state.entries.filter((e) => e.date !== state.today);
  return [
    ...withoutToday,
    { date: state.today, score: draftScore(), alcoholFree: state.draft.alcoholFree },
  ];
}

function reminderState() {
  const today = entryFor(state.today, state.entries);
  return {
    yesterdayScore: yesterdayScore(),
    streak: computeStreak(state.entries, STREAK_THRESHOLD),
    loggedToday: today != null,
    alcoholConfirmedToday: today != null && today.alcoholFree === true,
  };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function render() {
  renderDate();
  renderHero();
  renderStats();
  renderBests();
  renderTrend();
  renderInputs();
  renderReminderStatus();
}

function renderDate() {
  $('date').textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function renderHero() {
  const score = draftScore();
  $('score').textContent = String(score);
  $('gauge-value').setAttribute('stroke-dashoffset', String(100 - score));

  const y = yesterdayScore();
  const delta = $('delta');
  delta.classList.remove('delta--up', 'delta--down');
  if (y == null) {
    delta.textContent = 'No score yesterday';
  } else {
    const diff = score - y;
    if (diff > 0) {
      delta.textContent = `Up ${diff} on yesterday`;
      delta.classList.add('delta--up');
    } else if (diff < 0) {
      delta.textContent = `Down ${-diff} on yesterday`;
      delta.classList.add('delta--down');
    } else {
      delta.textContent = 'Level with yesterday';
    }
  }
}

function renderStats() {
  const shown = displayEntries();
  const streak = computeStreak(shown, STREAK_THRESHOLD);
  const dry = alcoholFreeStreak(shown);
  const pb = personalBests(shown, STREAK_THRESHOLD);

  $('streak').textContent = String(streak);
  $('dry-streak').textContent = String(dry);
  $('streak-best').textContent = pb.longestStreak ? `Best ${pb.longestStreak}` : '';
  $('dry-best').textContent = pb.longestAlcoholFree ? `Best ${pb.longestAlcoholFree}` : '';
}

function renderBests() {
  const pb = personalBests(displayEntries(), STREAK_THRESHOLD);
  $('best-score').textContent = pb.bestScore > 0 ? String(pb.bestScore) : '—';
  $('best-streak').textContent = pb.longestStreak > 0 ? String(pb.longestStreak) : '—';
  $('best-dry').textContent = pb.longestAlcoholFree > 0 ? String(pb.longestAlcoholFree) : '—';
}

function renderTrend() {
  const points = recentTrend(displayEntries(), 7);
  const svg = $('trend');
  if (points.length === 0) {
    $('trend-wrap').innerHTML = '<p class="trend__empty">Save your first day to start the trend.</p>';
    return;
  }

  const W = 300;
  const H = 120;
  const padL = 6;
  const padR = 30;
  const padT = 12;
  const padB = 14;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const x = (i) => (points.length === 1 ? W - padR : padL + (i / (points.length - 1)) * innerW);
  const y = (s) => padT + (1 - s / 100) * innerH;

  const coords = points.map((p, i) => ({ x: x(i), y: y(p.score), score: p.score }));
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${padL.toFixed(1)},${(H - padB).toFixed(1)} ${line} ${coords[coords.length - 1].x.toFixed(1)},${(H - padB).toFixed(1)}`;
  const threshold = y(STREAK_THRESHOLD);
  const last = coords[coords.length - 1];

  svg.innerHTML = `
    <defs>
      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff5a00" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#ff5a00" stop-opacity="0" />
      </linearGradient>
    </defs>
    <line x1="${padL}" y1="${threshold.toFixed(1)}" x2="${W - padR}" y2="${threshold.toFixed(1)}"
      stroke="#3a3a3a" stroke-width="1" stroke-dasharray="3 4" />
    <polygon points="${area}" fill="url(#fill)" />
    <polyline points="${line}" fill="none" stroke="#ff5a00" stroke-width="2.5"
      stroke-linejoin="round" stroke-linecap="round" />
    <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4.5" fill="#ff5a00"
      stroke="#000" stroke-width="2" />
    <g transform="translate(${(last.x + 6).toFixed(1)}, ${(last.y - 9).toFixed(1)})">
      <rect width="26" height="18" rx="4" fill="#ff5a00" />
      <text x="13" y="13" text-anchor="middle" font-size="11" font-weight="700" fill="#000">${last.score}</text>
    </g>`;
  svg.setAttribute('aria-label', `Last ${points.length} days of Kairos scores, ending at ${last.score} today.`);

  $('trend-start').textContent = formatShort(points[0].date);
}

function formatShort(dateStr) {
  const [yr, mo, da] = dateStr.split('-').map(Number);
  return new Date(yr, mo - 1, da).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function renderInputs() {
  $('training').value = String(state.draft.training);
  $('training-out').textContent = String(state.draft.training);
  $('recovery').value = String(state.draft.recovery);
  $('recovery-out').textContent = String(state.draft.recovery);
  const pressed = state.draft.alcoholFree;
  $('alcohol').setAttribute('aria-pressed', String(pressed));
  $('alcohol-state').textContent = pressed ? 'YES' : 'NO';
}

function renderReminderStatus() {
  const status = $('rem-status');
  const btn = $('rem-toggle');
  const perm = permission();
  if (state.settings.notificationsEnabled && perm === 'granted') {
    status.textContent = 'On. 06:30, 12:30, 20:00.';
    btn.textContent = 'Turn off';
  } else if (perm === 'denied') {
    status.textContent = 'Blocked in device settings.';
    btn.textContent = 'Turn on';
  } else {
    status.textContent = 'Off. 06:30, 12:30, 20:00.';
    btn.textContent = 'Turn on';
  }
}

function renderHistory() {
  const list = $('history-list');
  const sorted = [...state.entries].sort((a, b) => (a.date > b.date ? -1 : 1));
  if (sorted.length === 0) {
    list.innerHTML = '<li class="history__empty">No entries yet. Save your first day.</li>';
    return;
  }
  list.innerHTML = sorted
    .map((entry) => {
      const dry = entry.alcoholFree;
      return `<li class="history-entry">
        <span class="history-entry__date">${formatShort(entry.date)}</span>
        <span class="history-entry__meta">Training ${entry.training ?? '—'} · Recovery ${entry.recovery ?? '—'}</span>
        <span class="history-entry__score">${entry.score}</span>
        <span class="history-entry__dry${dry ? '' : ' history-entry__dry--no'}" aria-label="${dry ? 'Dry' : ''}">Dry</span>
      </li>`;
    })
    .join('');
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function save() {
  const prevStreak = computeStreak(state.entries, STREAK_THRESHOLD);
  const wasTrendingDown = isTrendingDown(state.entries, 3);

  const score = draftScore();
  const entry = {
    date: state.today,
    training: state.draft.training,
    recovery: state.draft.recovery,
    alcoholFree: state.draft.alcoholFree,
    score,
  };
  state.entries = upsertEntry(entry);

  flash('Saved. No excuses.');
  render();
  fireEventNotifications({ prevStreak, wasTrendingDown, score });

  // Reschedule with updated state — "logged today" suppresses the midday nag.
  if (state.settings.notificationsEnabled) {
    scheduleReminders(reminderState());
  }
}

function flash(message) {
  const el = $('saved-flag');
  el.textContent = message;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => { el.textContent = ''; }, 4000);
}

function fireEventNotifications({ prevStreak, wasTrendingDown, score }) {
  const newStreak = computeStreak(state.entries, STREAK_THRESHOLD);
  if (newStreak > prevStreak && isMilestone(newStreak)) {
    notify('Kairos', milestoneMessage(newStreak), 'milestone');
  } else if (prevStreak > 0 && score < STREAK_THRESHOLD) {
    notify('Kairos', streakBrokenMessage(score), 'streak-broken');
  }
  if (!wasTrendingDown && isTrendingDown(state.entries, 3)) {
    notify('Kairos', trendingDownMessage(), 'trending-down');
  }
}

// ─── Export / import ─────────────────────────────────────────────────────────

function handleExport() {
  const json = exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kairos-${state.today}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(file) {
  if (!file) return;
  const text = await file.text();
  const result = importData(text);
  const status = $('import-status');
  status.textContent = result.message;
  if (result.ok) {
    state.entries = loadEntries();
    render();
    if ($('history-toggle').getAttribute('aria-expanded') === 'true') renderHistory();
  }
  setTimeout(() => { status.textContent = ''; }, 5000);
}

// ─── Reminder toggle ─────────────────────────────────────────────────────────

async function toggleReminders() {
  if (state.settings.notificationsEnabled) {
    state.settings = saveSettings({ notificationsEnabled: false });
    await cancelReminders();
    renderReminderStatus();
    return;
  }
  const result = await requestPermission();
  if (result === 'granted') {
    state.settings = saveSettings({ notificationsEnabled: true });
    await scheduleReminders(reminderState());
  }
  renderReminderStatus();
}

// ─── Wiring ──────────────────────────────────────────────────────────────────

function onSlider(id, key) {
  $(id).addEventListener('input', (e) => {
    state.draft[key] = Number(e.target.value);
    $(`${id}-out`).textContent = String(state.draft[key]);
    renderHero();
    renderStats();
    renderBests();
    renderTrend();
  });
}
onSlider('training', 'training');
onSlider('recovery', 'recovery');

$('alcohol').addEventListener('click', () => {
  state.draft.alcoholFree = !state.draft.alcoholFree;
  renderInputs();
  renderHero();
  renderStats();
  renderBests();
  renderTrend();
});

$('save').addEventListener('click', save);
$('rem-toggle').addEventListener('click', toggleReminders);

$('history-toggle').addEventListener('click', () => {
  const body = $('history-body');
  const btn = $('history-toggle');
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  body.hidden = expanded;
  btn.setAttribute('aria-expanded', String(!expanded));
  btn.textContent = expanded ? 'Show' : 'Hide';
  if (!expanded) renderHistory();
});

$('export-btn').addEventListener('click', handleExport);
$('import-input').addEventListener('change', (e) => {
  handleImport(e.target.files[0]);
  e.target.value = '';
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    state.today = todayKey();
    initChannels()
      .then(() => checkPermission())
      .then((p) => {
        renderReminderStatus();
        if (state.settings.notificationsEnabled && p === 'granted') {
          scheduleReminders(reminderState());
        }
      });
    render();
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

render();

// Init sequence: create Android channels, prime permission cache, reschedule if enabled.
initChannels().then(() => checkPermission()).then((p) => {
  renderReminderStatus();
  if (state.settings.notificationsEnabled && p === 'granted') {
    scheduleReminders(reminderState());
  }
});
