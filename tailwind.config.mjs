import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            DEFAULT: '#003087',
            light: '#0a42a6',
            dark: '#002261',
            glow: 'rgba(0, 48, 135, 0.15)',
          },
          yellow: {
            DEFAULT: '#FEC500',
            hover: '#E5B100',
            glow: 'rgba(254, 197, 0, 0.2)',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['Geist Mono', 'Courier New', 'Courier', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [typography()],
};
