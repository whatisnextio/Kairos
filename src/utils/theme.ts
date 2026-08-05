export type ThemePreference = 'dark' | 'light';

export function normaliseThemePreference(value: unknown): ThemePreference {
  return value === 'light' ? 'light' : 'dark';
}

export function applyThemePreference(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const next = normaliseThemePreference(theme);
  document.documentElement.dataset.theme = next;
  document.documentElement.classList.toggle('light', next === 'light');
  document.documentElement.classList.toggle('dark', next === 'dark');
}
