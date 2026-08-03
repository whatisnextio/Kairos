import { useNavigate } from 'react-router-dom';

const FAQS = [
  {
    q: 'What is 12K?',
    a: '12K is a 365-day structured transformation campaign for men. You track progress across eight life domains, earn XP, get daily AI nudges, and stay accountable with a silent squad.',
  },
  {
    q: 'What is the KAIROS system?',
    a: 'KAIROS is the five-phase arc that structures your 365 days: Gate (1-7), Stabilise (8-56), Build (57-151), Perform (152-217), Elite (218-365). Each phase has a distinct focus and intention.',
  },
  {
    q: 'What are the eight domains?',
    a: 'Body, Fuel, Me Time, Us Time, Shot (career and finances), Lens (creativity and perspective), Nest (home and environment), and Roots (faith, purpose, inner life). You check in across all eight every day.',
  },
  {
    q: 'What is the Brotherhood squad?',
    a: "A group of 4-8 men matched to you by phase and cycle start date. You see each other's daily check-in status as coloured dots. No names, no chat, no leaderboards. Silent accountability.",
  },
  {
    q: 'How does the AI nudge work?',
    a: 'Every day, a short personalised message is generated based on your identity anchor, current phase, recent check-ins, and streaks. Brotherhood members get one daily. Free users get one on Sundays.',
  },
  {
    q: 'What is the free tier?',
    a: 'Free users can track all eight domains, see basic progress rings, do weekly Vibe Checks, and get a Sunday AI nudge. All data is stored on your device.',
  },
  {
    q: 'What is Brotherhood?',
    a: '£7.99/month. Daily AI nudges, silent squad access, cloud sync, push notifications, weekly squad pulse, and a full 365-day cycle reflection when you finish.',
  },
  {
    q: 'Can I cancel?',
    a: 'Yes. Cancel any time from the Stripe portal. No penalty. 7-day refund for new subscribers, contact liam@whatisnext.io.',
  },
  {
    q: 'What happens at Day 365?',
    a: 'You receive an AI-generated cycle reflection summarising your entire 365 days across all eight domains. Then you can start a new cycle or take a break.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. We do not sell your data. EU data residency. No tracking pixels. See Privacy Policy for full details.',
  },
];

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
        {FAQS.map(({ q, a }) => (
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
