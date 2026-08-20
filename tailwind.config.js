/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          // Deep, refined violet — premium and sophisticated
          purple: '#6D28D9',
          'purple-light': '#8B5CF6',
          'purple-lighter': '#A78BFA',
          'purple-dark': '#5B21B6',
          'purple-deep': '#4C1D95',
          // Rich navy — true premium dark
          navy: '#0A0A1A',
          'navy-mid': '#12122A',
          'navy-light': '#1E1E3A',
          'navy-soft': '#2A2A4A',
        },
        accent: {
          orange: '#F97316',
          yellow: '#EAB308',
          green: '#10B981',
          'green-light': '#34D399',
          cyan: '#06B6D4',
          'cyan-light': '#22D3EE',
          rose: '#F43F5E',
          amber: '#F59E0B',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F7',
          200: '#E5E5EA',
          300: '#D1D1D6',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-headings)', 'system-ui', 'sans-serif'],
        nav: ['var(--font-nav)', 'system-ui', 'sans-serif'],
        btn: ['var(--font-btn)', 'system-ui', 'sans-serif'],
        calcTitle: ['var(--font-calc-title)', 'system-ui', 'sans-serif'],
        calcResult: ['var(--font-calc-result)', 'system-ui', 'sans-serif'],
        admin: ['var(--font-admin)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      borderRadius: {
        'xl-lg': '0.875rem',
        '2xl-lg': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.03)',
        'elevated': '0 12px 40px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
        'premium': '0 2px 8px rgba(0, 0, 0, 0.03), 0 12px 32px rgba(0, 0, 0, 0.05)',
        'premium-lg': '0 4px 12px rgba(0, 0, 0, 0.04), 0 24px 64px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 0 1px rgba(109, 40, 217, 0.08), 0 8px 32px rgba(109, 40, 217, 0.06)',
        'glow-purple': '0 0 0 1px rgba(109, 40, 217, 0.1), 0 8px 32px rgba(109, 40, 217, 0.1)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'dark-card': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'dark-card-hover': '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out both',
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in-down': 'fade-in-down 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'mesh-purple': 'radial-gradient(at 20% 20%, rgba(109, 40, 217, 0.15) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(139, 92, 246, 0.1) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
};
