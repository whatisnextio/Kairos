import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'base-black': 'rgb(var(--color-base-black) / <alpha-value>)',
        'base-bg': 'rgb(var(--color-base-bg) / <alpha-value>)',
        'base-surface': 'rgb(var(--color-base-surface) / <alpha-value>)',
        'base-elevated': 'rgb(var(--color-base-elevated) / <alpha-value>)',
        'base-border': 'rgb(var(--color-base-border) / <alpha-value>)',
        'base-muted': 'rgb(var(--color-base-muted) / <alpha-value>)',
        'base-text': 'rgb(var(--color-base-text) / <alpha-value>)',
        'base-subtext': 'rgb(var(--color-base-subtext) / <alpha-value>)',
        'accent-green': 'rgb(var(--color-accent-green) / <alpha-value>)',
        'accent-green-dim': 'rgb(var(--color-accent-green-dim) / <alpha-value>)',
        'domain-body': 'rgb(var(--color-domain-body) / <alpha-value>)',
        'domain-fuel': 'rgb(var(--color-domain-fuel) / <alpha-value>)',
        'domain-metime': 'rgb(var(--color-domain-metime) / <alpha-value>)',
        'domain-ustime': 'rgb(var(--color-domain-ustime) / <alpha-value>)',
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
