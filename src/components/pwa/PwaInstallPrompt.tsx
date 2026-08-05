import Button from '@/components/common/Button';
import {
  dismissInstallPrompt,
  getInstallDismissedUntil,
  isMobileUserAgent,
  isStandaloneDisplay,
} from '@/utils/pwaInstall';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type InstallMode = 'native' | 'manual';
const INSTALL_PROMPT_DELAY_MS = 2500;

function isInstallSuppressed(): boolean {
  if (typeof window === 'undefined') return true;
  return isStandaloneDisplay() || !!getInstallDismissedUntil();
}

function getInstallMode(): InstallMode | null {
  if (typeof window === 'undefined') return null;
  if (isInstallSuppressed()) return null;
  if (!isMobileUserAgent(window.navigator.userAgent)) return null;
  return /iPhone|iPad|iPod/i.test(window.navigator.userAgent) ? 'manual' : null;
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [hasOpenDialog, setHasOpenDialog] = useState(false);
  const pendingMode = useRef<InstallMode | null>(getInstallMode());

  useEffect(() => {
    if (typeof window === 'undefined' || isInstallSuppressed()) return;

    const timer =
      pendingMode.current === 'manual'
        ? window.setTimeout(() => {
            setMode(pendingMode.current);
          }, INSTALL_PROMPT_DELAY_MS)
        : null;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      pendingMode.current = 'native';
      setMode('native');
    };

    const handleInstalled = () => {
      setInstallEvent(null);
      setMode(null);
      pendingMode.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const updateDialogState = () => {
      setHasOpenDialog(document.querySelector('[role="dialog"], dialog[open]') !== null);
    };

    updateDialogState();
    const observer = new MutationObserver(updateDialogState);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (mode === null || hasOpenDialog) return null;

  const handleDismiss = () => {
    dismissInstallPrompt();
    setMode(null);
    setInstallEvent(null);
    pendingMode.current = null;
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'dismissed') dismissInstallPrompt();
    setMode(null);
    setInstallEvent(null);
    pendingMode.current = null;
  };

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      aria-label="Install Kairos"
    >
      <div className="rounded-lg border border-accent-green/40 bg-base-elevated p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border border-accent-green/40 bg-accent-green/10 text-accent-green">
            <Smartphone size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-medium uppercase tracking-wider text-base-text">
              Install Kairos
            </p>
            <p className="mt-1 text-sm text-base-subtext">
              Add 12K to your home screen for faster check-ins and reminders.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-base-muted hover:text-base-text"
            aria-label="Dismiss install prompt"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {mode === 'native' && installEvent ? (
          <Button className="mt-4 w-full gap-2" onClick={handleInstall}>
            <Download size={16} aria-hidden="true" />
            Install app
          </Button>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded border border-base-border bg-base-black/40 p-3 text-xs text-base-subtext">
            <Share size={16} className="mt-0.5 shrink-0 text-accent-green" aria-hidden="true" />
            <p>Manual install: open Safari share, then choose Add to Home Screen.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
