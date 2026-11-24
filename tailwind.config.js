/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          50: '#EFF5FF',
          100: '#DBE8FE',
          200: '#BFD5FD',
          300: '#93BAFB',
          400: '#6096F7',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
          950: '#0B1736',
        },
        ink: '#172033',
        muted: '#64748B',
        subtle: '#94A3B8',
        line: '#E5EAF1',
        canvas: '#F5F7FB',
        surface: '#FFFFFF',
        success: '#15803D',
        danger: '#DC2626',
        warning: '#B45309',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04)',
        raised: '0 1px 2px rgba(16, 24, 40, 0.05), 0 8px 24px -12px rgba(16, 24, 40, 0.12)',
        pop: '0 12px 32px -8px rgba(11, 23, 54, 0.18), 0 2px 6px rgba(11, 23, 54, 0.06)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      screens: {
        xs: '420px',
      },
    },
  },
  plugins: [],
};
