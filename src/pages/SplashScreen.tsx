import { useEffect, useState } from 'react';

interface SplashScreenProps {
  errorMessage?: string | null;
  onRetry?: () => void;
}

export default function SplashScreen({ errorMessage, onRetry }: SplashScreenProps) {
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    if (errorMessage) {
      setShowSlowMessage(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setShowSlowMessage(true), 8_000);
    return () => window.clearTimeout(timeoutId);
  }, [errorMessage]);

  const showRecovery = Boolean(errorMessage) || showSlowMessage;
  const recoveryMessage =
    errorMessage ??
    'Kairos is taking longer than expected to load. Check your connection and retry if it stays here.';
  const handleRetry = onRetry ?? (() => window.location.reload());

  return (
    <main
      className="fixed inset-0 flex items-center justify-center bg-base-black px-6 text-center"
      aria-busy={errorMessage ? 'false' : 'true'}
      aria-label={errorMessage ? 'Kairos loading problem' : 'Loading 12K'}
    >
      <div className="flex max-w-sm flex-col items-center gap-6">
        <div className="relative flex h-28 w-28 items-center justify-center" aria-hidden="true">
          <div className="absolute inset-0 animate-ping rounded-2xl border border-accent-green/30" />
          <div className="absolute inset-2 rounded-2xl border border-base-border bg-base-surface/70" />
          <img
            src="/kairos-12k-mark.svg"
            alt=""
            className="relative h-20 w-20 animate-pulse rounded-xl shadow-[0_0_32px_rgba(34,197,94,0.18)]"
          />
        </div>

        {showRecovery ? (
          <div
            className="flex w-full flex-col items-center gap-4"
            role={errorMessage ? 'alert' : 'status'}
            aria-live="polite"
          >
            <p className="text-sm leading-6 text-base-subtext">{recoveryMessage}</p>
            <button type="button" className="btn-primary min-w-32" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
