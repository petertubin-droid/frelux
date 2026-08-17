/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#6B21A8',
          'purple-light': '#9333EA',
          'purple-dark': '#4C1D95',
          navy: '#0F172A',
          'navy-mid': '#1E293B',
          'navy-light': '#334155',
        },
        accent: {
          orange: '#F97316',
          yellow: '#EAB308',
          green: '#22C55E',
          cyan: '#06B6D4',
        },
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'elevated': '0 12px 40px rgba(0, 0, 0, 0.10)',
      },
    },
  },
  plugins: [],
};
