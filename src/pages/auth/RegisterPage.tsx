import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { supabase } from '@/services/supabaseClient';
import { AUTH_COPY } from '@/utils/brandCopy';
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-[20px] border border-white/10 bg-base-black/80 px-5 py-7 shadow-[0_32px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:px-7">
        <img
          src="/kairos-12k-logo.svg"
          alt="Kairos 12K"
          width="192"
          height="54"
          className="mb-6 h-auto w-48"
          draggable={false}
        />
        <p className="mb-1 font-heading text-lg font-bold tracking-wide text-base-text">
          {AUTH_COPY.headline}
        </p>
        <p className="mb-8 text-sm leading-relaxed text-base-subtext">{AUTH_COPY.body}</p>

        {sent ? (
          <div>
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
              <span className="text-sm text-base-subtext">I confirm I am 18 or over.</span>
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
              <Link to="/login" className="text-accent-green underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
