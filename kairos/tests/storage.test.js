import { beforeEach, describe, expect, it } from 'vitest';
import { exportData, importData } from '../storage.js';

// Minimal localStorage stub for Node/vitest (no jsdom installed).
const _store = {};
global.localStorage = {
  getItem: (k) => Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null,
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { Object.keys(_store).forEach((k) => delete _store[k]); },
};

beforeEach(() => {
  localStorage.clear();
});

describe('exportData', () => {
  it('exports empty entries when nothing saved', () => {
    const json = exportData();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.entries).toEqual([]);
  });
});

describe('importData', () => {
  it('rejects missing entries array', () => {
    const result = importData('{}');
    expect(result.ok).toBe(false);
  });

  it('rejects malformed JSON', () => {
    const result = importData('not json');
    expect(result.ok).toBe(false);
  });

  it('rejects entries with missing score', () => {
    const result = importData(JSON.stringify({ entries: [{ date: '2026-06-01' }] }));
    expect(result.ok).toBe(false);
  });

  it('imports valid entries', () => {
    const entries = [
      { date: '2026-06-01', score: 72, training: 70, recovery: 65, alcoholFree: true },
      { date: '2026-06-02', score: 58, training: 40, recovery: 50, alcoholFree: false },
    ];
    const result = importData(JSON.stringify({ version: 1, entries }));
    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
  });

  it('round-trips through export then import', () => {
    const entries = [{ date: '2026-06-10', score: 80, training: 90, recovery: 80, alcoholFree: true }];
    importData(JSON.stringify({ version: 1, entries }));
    const exported = exportData();
    const parsed = JSON.parse(exported);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].score).toBe(80);
  });

  it('imported entries win on date conflicts', () => {
    importData(JSON.stringify({ entries: [{ date: '2026-06-10', score: 50, training: 40, recovery: 40, alcoholFree: false }] }));
    importData(JSON.stringify({ entries: [{ date: '2026-06-10', score: 80, training: 90, recovery: 80, alcoholFree: true }] }));
    const exported = JSON.parse(exportData());
    expect(exported.entries).toHaveLength(1);
    expect(exported.entries[0].score).toBe(80);
  });
});
