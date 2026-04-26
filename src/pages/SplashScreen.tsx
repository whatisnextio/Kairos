export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 bg-base-black flex items-center justify-center"
      role="status"
      aria-label="Loading 12K"
    >
      <h1 className="font-heading text-5xl font-bold text-base-text tracking-widest" aria-hidden="true">12K</h1>
    </div>
  );
}
