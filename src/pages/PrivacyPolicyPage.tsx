import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-6 pb-4">
      <button
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="flex items-center gap-1.5 text-base-subtext hover:text-base-text text-sm mb-4 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3L5 8l5 5" />
        </svg>
        Back
      </button>
      <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide mb-4">Privacy Policy</h1>
      <div className="flex flex-col gap-4 text-base-subtext text-sm leading-relaxed">
        <p>12K takes your privacy seriously. Here is what we collect, why, and what we don't do.</p>
        <h2 className="font-heading font-medium text-base-text tracking-wide text-base">What we collect</h2>
        <p>Your email address. Your date of birth (to verify you are 18 or over). Your check-in data, domain focuses, XP, and cycle state. Nothing else.</p>
        <h2 className="font-heading font-medium text-base-text tracking-wide text-base">What we don't do</h2>
        <p>We do not sell your data. We do not share it with third parties except Supabase (our database, hosted in the EU) and Stripe (payment processing). We do not use tracking pixels or advertising networks. Analytics are handled by Plausible, which is privacy-first and cookieless.</p>
        <h2 className="font-heading font-medium text-base-text tracking-wide text-base">Your rights</h2>
        <p>You can export or delete your data at any time from the You screen. We will action deletion requests within 30 days. GDPR compliant. EU data residency.</p>
        <h2 className="font-heading font-medium text-base-text tracking-wide text-base">Contact</h2>
        <p>Privacy questions: liam@whatisnext.io</p>
      </div>
    </div>
  );
}
