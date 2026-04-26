export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 bg-base-black flex items-center justify-center"
      aria-busy="true"
      aria-label="Loading 12K"
    >
      <p
        className="font-heading text-5xl font-bold text-base-text tracking-widest"
        aria-hidden="true"
      >
        12K
      </p>
    </div>
  );
}
