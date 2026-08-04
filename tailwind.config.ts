import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'base-black': '#0B0B0B',
        'base-bg': '#090A0A',
        'base-surface': '#141414',
        'base-elevated': '#1C1C1C',
        'base-border': '#2A2A2A',
        'base-muted': '#8C8C8C',
        'base-text': '#F0F0F0',
        'base-subtext': '#B8B8B8',
        'accent-green': '#22C55E',
        'accent-green-dim': '#16A34A',
        'domain-body': '#3B82F6',
        'domain-fuel': '#F97316',
        'domain-metime': '#8B5CF6',
        'domain-ustime': '#EC4899',
        'domain-shot': '#F59E0B',
        'domain-lens': '#14B8A6',
        'domain-nest': '#22C55E',
        'domain-roots': '#EAB308',
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
