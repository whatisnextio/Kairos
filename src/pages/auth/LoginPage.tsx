import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { supabase } from '@/services/supabaseClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
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
      <h1 className="font-heading text-4xl font-bold text-base-text mb-2 tracking-widest">12K</h1>
      <p className="text-base-subtext text-sm mb-10">12 weeks. One transformation.</p>

      {sent ? (
        <div className="text-center">
          <p className="text-base-text font-medium mb-2">Check your email.</p>
          <p className="text-base-subtext text-sm">Magic link sent to {email}.</p>
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="w-full max-w-sm flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={error}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Send magic link'}
          </Button>
          <p className="text-center text-base-subtext text-xs">
            No account yet?{' '}
            <Link to="/register" className="text-accent-green hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
