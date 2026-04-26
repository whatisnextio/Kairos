import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'base-black': '#0B0B0B',
        'base-surface': '#141414',
        'base-elevated': '#1C1C1C',
        'base-border': '#2A2A2A',
        'base-muted': '#6B6B6B',
        'base-text': '#F0F0F0',
        'base-subtext': '#A0A0A0',
        'accent-green': '#22C55E',
        'accent-green-dim': '#16A34A',
        'domain-body': '#3B82F6',
        'domain-love': '#EC4899',
        'domain-mission': '#F59E0B',
        'domain-spirit': '#8B5CF6',
        'status-done': '#22C55E',
        'status-partial': '#F59E0B',
        'status-missed': '#EF4444',
        'status-pending': '#6B6B6B',
      },
      fontFamily: {
        heading: ['Oswald', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
