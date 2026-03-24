/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        primary:   { DEFAULT: '#1a56db', light: '#3b82f6', dark: '#1e3a8a' },
        secondary: { DEFAULT: '#7c3aed', light: '#a78bfa', dark: '#4c1d95' },
        accent:    { DEFAULT: '#f59e0b', light: '#fcd34d', dark: '#b45309' },
        success:   { DEFAULT: '#10b981', light: '#6ee7b7', dark: '#065f46' },
        danger:    { DEFAULT: '#ef4444', light: '#fca5a5', dark: '#991b1b' },
        surface:   { DEFAULT: '#f8fafc', card: '#ffffff', border: '#e2e8f0' },
        ink:       { DEFAULT: '#0f172a', muted: '#64748b', faint: '#cbd5e1' },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06)',
        lift: '0 4px 24px rgba(0,0,0,.12)',
        glow: '0 0 0 3px rgba(26,86,219,.25)',
      },
      borderRadius: { xl2: '1rem', xl3: '1.5rem' },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [
    // scrollbar-hide utility
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-none': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      })
    },
  ],
}
