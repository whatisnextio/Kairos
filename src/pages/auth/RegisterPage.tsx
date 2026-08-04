import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { supabase } from '@/services/supabaseClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const isOver18 = () => {
    if (!dob) return false;
    const birth = new Date(dob);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    return birth <= cutoff;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOver18()) {
      setError('You must be 18 or over to use 12K.');
      return;
    }
    if (!ageConfirmed) {
      setError('Please confirm you are 18 or over.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, data: { date_of_birth: dob } },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-base-black flex flex-col items-center justify-center px-6 py-12">
      <img
        src="/kairos-12k-logo.svg"
        alt="Kairos 12K"
        className="w-48 mb-4"
        draggable={false}
      />
      <p className="text-base-text font-heading font-bold text-lg tracking-wide mb-1">
        365 days. Eight domains. One man.
      </p>
      <p className="text-base-subtext text-sm text-center max-w-xs mb-10">
        Build the body, the focus, the relationships, and the life. All at once. No shortcuts.
      </p>

      {sent ? (
        <div className="text-center">
          <p className="text-base-text font-medium mb-2">Check your email.</p>
          <p className="text-base-subtext text-sm">Confirm your address to continue.</p>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="w-full max-w-sm flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="dob"
            type="date"
            label="Date of birth"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
          />
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 accent-accent-green"
            />
            <span className="text-sm text-base-subtext">
              I confirm I am 18 years of age or over. 12K is an adult product.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-xs text-status-missed">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading || !ageConfirmed} className="w-full">
            {loading ? 'Sending...' : 'Create account'}
          </Button>
          <p className="text-center text-base-subtext text-xs">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-green hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
