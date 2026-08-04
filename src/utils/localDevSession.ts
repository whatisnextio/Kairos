export const DEV_SESSION_STORAGE_KEY = 'kairos_dev_session';
export const DEV_EMAIL = 'ldgmcdowell@gmail.com';
export const DEV_USER_ID = 'local-dev-liam';
export const DEV_CYCLE_ID = 'local-dev-cycle';

export function isLocalDevHost(hostname = window.location.hostname): boolean {
  return import.meta.env.DEV && ['127.0.0.1', 'localhost'].includes(hostname);
}

export function isLocalDevUser(userId?: string | null): boolean {
  return isLocalDevHost() && userId === DEV_USER_ID;
}

export function hasLocalDevSession(): boolean {
  return isLocalDevHost() && localStorage.getItem(DEV_SESSION_STORAGE_KEY) === '1';
}

export function startLocalDevSession(): void {
  if (!isLocalDevHost()) return;
  localStorage.setItem(DEV_SESSION_STORAGE_KEY, '1');
}

export function clearLocalDevSession(): void {
  if (!import.meta.env.DEV) return;
  localStorage.removeItem(DEV_SESSION_STORAGE_KEY);
}
