export type DismissibleTipId = 'settings-sub-focus';

export const DISMISSIBLE_TIP_STORAGE_PREFIX = 'kairos_dismissible_tip_v1';

export function getDismissibleTipStorageKey(profileId: string, tipId: DismissibleTipId): string {
  return `${DISMISSIBLE_TIP_STORAGE_PREFIX}:${profileId}:${tipId}`;
}

export function readDismissibleTip(profileId: string | null | undefined, tipId: DismissibleTipId) {
  if (!profileId || typeof window === 'undefined') return true;
  return window.localStorage.getItem(getDismissibleTipStorageKey(profileId, tipId)) === '1';
}

export function writeDismissibleTip(profileId: string, tipId: DismissibleTipId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getDismissibleTipStorageKey(profileId, tipId), '1');
}
