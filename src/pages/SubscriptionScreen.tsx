import { useAppStore } from '@/store/useAppStore';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';

const STRIPE_CHECKOUT_URL = import.meta.env.VITE_STRIPE_CHECKOUT_URL as string;

export default function SubscriptionScreen() {
  const { profile } = useAppStore();

  const handleUpgrade = () => {
    if (!STRIPE_CHECKOUT_URL || !profile) return;
    const url = new URL(STRIPE_CHECKOUT_URL);
    // Pass user ID so the webhook can link the Stripe customer back to this profile
    url.searchParams.set('client_reference_id', profile.id);
    window.location.href = url.toString();
  };

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">Brotherhood</h1>
      <p className="text-base-subtext text-sm">
        The full 12K system. Daily AI nudges. Silent squad accountability. Cloud sync.
      </p>

      <Card className="border-accent-green/40">
        <p className="font-heading text-3xl font-bold text-base-text">£7.99</p>
        <p className="text-base-subtext text-sm">per month. Cancel anytime.</p>

        <ul className="mt-4 flex flex-col gap-2">
          {[
            'Daily AI nudge, personal not generic',
            'Silent squad, 4-8 men, same phase, anonymous',
            'Cloud sync across devices',
            'Weekly squad pulse',
            'Day 84 cycle reflection',
            'Full XP and streak tracking',
            'Push notifications',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-base-text">
              <span className="text-accent-green font-bold">+</span>
              {feature}
            </li>
          ))}
        </ul>

        <Button onClick={handleUpgrade} className="w-full mt-6" disabled={profile?.tier === 'brotherhood'}>
          {profile?.tier === 'brotherhood' ? 'Already active' : 'Unlock Brotherhood'}
        </Button>
      </Card>

      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">Free tier</p>
        <ul className="flex flex-col gap-2">
          {[
            'Track 4 domains',
            'Basic progress rings',
            'Weekly Vibe Check',
            'Sunday AI nudge',
            'Local device only',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-base-subtext">
              <span className="text-base-muted">-</span>
              {feature}
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-base-muted text-xs text-center">
        7-day refund if it's not for you. No questions.
      </p>
    </div>
  );
}
