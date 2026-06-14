// localStorage persistence for Kairos. Phase 1 is local-first: no account, no
// backend. Everything lives on the device under versioned keys so a future
// migration can branch on the version.

const ENTRIES_KEY = 'kairos.entries.v1';
const SETTINGS_KEY = 'kairos.settings.v1';

/** Today's date as YYYY-MM-DD in the device's local timezone. */
export function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private-mode failure. Nothing we can do but carry on in memory.
  }
}

/** All entries, oldest-first. Each: { date, garmin, alcoholFree, score }. */
export function loadEntries() {
  const entries = read(ENTRIES_KEY, []);
  return Array.isArray(entries) ? entries : [];
}

/** Insert or replace the entry for its date, then persist. Returns the new list. */
export function upsertEntry(entry) {
  const entries = loadEntries().filter((e) => e.date !== entry.date);
  entries.push(entry);
  entries.sort((a, b) => (a.date < b.date ? -1 : 1));
  write(ENTRIES_KEY, entries);
  return entries;
}

/** The entry for a given date, or null. */
export function entryFor(date, entries = loadEntries()) {
  return entries.find((e) => e.date === date) ?? null;
}

const DEFAULT_SETTINGS = { notificationsEnabled: false, shown: {} };

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) };
}

export function saveSettings(partial) {
  const next = { ...loadSettings(), ...partial };
  write(SETTINGS_KEY, next);
  return next;
}
