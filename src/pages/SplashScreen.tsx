export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 bg-base-black flex items-center justify-center"
      aria-busy="true"
      aria-label="Loading 12K"
    >
      <div className="relative flex h-28 w-28 items-center justify-center" aria-hidden="true">
        <div className="absolute inset-0 rounded-2xl border border-accent-green/30 animate-ping" />
        <div className="absolute inset-2 rounded-2xl border border-base-border bg-base-surface/70" />
        <img
          src="/kairos-12k-mark.svg"
          alt=""
          className="relative h-20 w-20 rounded-xl shadow-[0_0_32px_rgba(34,197,94,0.18)] animate-pulse"
        />
      </div>
    </div>
  );
}
