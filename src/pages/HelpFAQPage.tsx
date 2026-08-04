import { HELP_FAQS } from '@/utils/brandCopy';
import { useNavigate } from 'react-router-dom';

export default function HelpFAQPage() {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-6 pb-4">
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
        Help and FAQ
      </h1>
      <div className="flex flex-col gap-4">
        {HELP_FAQS.map(({ q, a }) => (
          <div key={q}>
            <p className="font-heading font-medium text-base-text text-sm tracking-wide mb-1">
              {q}
            </p>
            <p className="text-base-subtext text-sm leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
