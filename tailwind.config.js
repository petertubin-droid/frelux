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
        neon: {
          purple: '#A855F7',
          cyan: '#22D3EE',
          green: '#4ADE80',
          pink: '#F472B6',
          blue: '#60A5FA',
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
        'neon-purple': '0 0 5px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3), 0 0 40px rgba(168, 85, 247, 0.15)',
        'neon-cyan': '0 0 5px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3), 0 0 40px rgba(34, 211, 238, 0.15)',
        'neon-green': '0 0 5px rgba(74, 222, 128, 0.5), 0 0 20px rgba(74, 222, 128, 0.3), 0 0 40px rgba(74, 222, 128, 0.15)',
        'neon-blue': '0 0 5px rgba(96, 165, 250, 0.5), 0 0 20px rgba(96, 165, 250, 0.3), 0 0 40px rgba(96, 165, 250, 0.15)',
      },
      keyframes: {
        'neon-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'neon-flow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(168, 85, 247, 0.4), 0 0 15px rgba(168, 85, 247, 0.2)' },
          '50%': { boxShadow: '0 0 10px rgba(168, 85, 247, 0.6), 0 0 30px rgba(168, 85, 247, 0.4)' },
        },
      },
      animation: {
        'neon-pulse': 'neon-pulse 2.5s ease-in-out infinite',
        'neon-flow': 'neon-flow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
