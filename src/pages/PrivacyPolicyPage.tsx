import { PRIVACY_COPY } from '@/utils/brandCopy';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="flex items-center gap-1.5 text-base-subtext hover:text-base-text text-sm mb-4 transition-colors"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 3L5 8l5 5" />
        </svg>
        Back
      </button>
      <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide mb-4">
        Privacy Policy
      </h1>
      <div className="flex flex-col gap-4 text-base-subtext text-sm leading-relaxed">
        <p>{PRIVACY_COPY.intro}</p>
        <h2 className="font-heading font-medium text-base-text tracking-wide text-base">
          What we collect
        </h2>
        <p>{PRIVACY_COPY.collected}</p>
        <h2 className="font-heading font-medium text-base-text tracking-wide text-base">
          What we don't do
        </h2>
        <p>{PRIVACY_COPY.notDone}</p>
        <h2 className="font-heading font-medium text-base-text tracking-wide text-base">
          Your rights
        </h2>
        <p>{PRIVACY_COPY.rights}</p>
        <h2 className="font-heading font-medium text-base-text tracking-wide text-base">Contact</h2>
        <p>Privacy questions: liam@whatisnext.io</p>
      </div>
    </div>
  );
}
