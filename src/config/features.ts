const TRUE_FLAG_VALUES = new Set(['1', 'true', 'yes', 'on']);

function envFlagEnabled(value: string | undefined): boolean {
  return TRUE_FLAG_VALUES.has(value?.trim().toLowerCase() ?? '');
}

export function isSquadFeatureEnabled(): boolean {
  return envFlagEnabled(import.meta.env.VITE_ENABLE_SQUAD);
}
