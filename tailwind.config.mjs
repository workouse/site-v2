import typography from '@tailwindcss/typography';

/*
 * Colors, spacing and radii reference the CSS variables defined in
 * src/styles/tokens.css. Font sizes mirror the typography table of the
 * design system (tokens.css exposes them only as shorthands).
 */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        indigo: 'var(--text-link)',
        ivory: 'var(--surface-page)',
        raised: 'var(--surface-raised)',
        subtle: 'var(--surface-subtle)',
        line: 'var(--border-subtle)',
        amber: 'var(--accent-sparing)',
        lilac: 'var(--decor-lilac)',
      },
      spacing: {
        0: 'var(--space-0)',
        4: 'var(--space-4)',
        8: 'var(--space-8)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
        24: 'var(--space-24)',
        32: 'var(--space-32)',
        40: 'var(--space-40)',
        48: 'var(--space-48)',
        64: 'var(--space-64)',
        80: 'var(--space-80)',
        96: 'var(--space-96)',
        120: 'var(--space-120)',
      },
      borderRadius: {
        none: 'var(--radius-0)',
        sm: 'var(--radius-2)',
        md: 'var(--radius-4)',
        lg: 'var(--radius-8)',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"DM Sans Variable"', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-desktop': ['112px', { lineHeight: '0.98', letterSpacing: '-2.24px', fontWeight: '400' }],
        'display-tablet': ['80px', { lineHeight: '0.98', letterSpacing: '-1.6px', fontWeight: '400' }],
        'display-mobile': ['60px', { lineHeight: '0.98', letterSpacing: '-1.2px', fontWeight: '400' }],
        'heading-section': ['64px', { lineHeight: '66px', letterSpacing: '0', fontWeight: '400' }],
        'heading-compact': ['40px', { lineHeight: '44px', letterSpacing: '0', fontWeight: '400' }],
        'body-large': ['20px', { lineHeight: '32px', letterSpacing: '0', fontWeight: '400' }],
        body: ['16px', { lineHeight: '26px', letterSpacing: '0', fontWeight: '400' }],
        ui: ['14px', { lineHeight: '20px', letterSpacing: '0', fontWeight: '500' }],
        label: ['12px', { lineHeight: '18px', letterSpacing: '0', fontWeight: '500' }],
      },
      animation: {
        'pulse-slow': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [typography()],
};
