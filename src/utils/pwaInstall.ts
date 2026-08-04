const MOBILE_UA_PATTERN = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const DISMISS_MS = 1000 * 60 * 60 * 24 * 14;

export const PWA_INSTALL_DISMISSED_UNTIL_KEY = 'kairos_pwa_install_dismissed_until';

export function isMobileUserAgent(userAgent: string): boolean {
  return MOBILE_UA_PATTERN.test(userAgent);
}

export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function getInstallDismissedUntil(now = Date.now()): number {
  const raw = window.localStorage.getItem(PWA_INSTALL_DISMISSED_UNTIL_KEY);
  const dismissedUntil = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(dismissedUntil) && dismissedUntil > now ? dismissedUntil : 0;
}

export function dismissInstallPrompt(now = Date.now()): void {
  window.localStorage.setItem(PWA_INSTALL_DISMISSED_UNTIL_KEY, String(now + DISMISS_MS));
}
