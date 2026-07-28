/** @type {import('tailwindcss').Config} */
// Migré du config inline de index.html (cdn.tailwindcss.com) le 2026-07-27 —
// mêmes couleurs, polices et rayons, maintenant compilés au build.
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  // BlockEditor compose md:grid-cols-${n} dynamiquement (1 à 3 colonnes)
  safelist: ['md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3'],
  theme: {
    extend: {
      colors: {
        midnight: '#0f172a',
        'deep-blue': '#1e293b',
        starlight: '#fbbf24',
        gold: '#d4af37',
        paper: '#f8fafc',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Lato"', 'sans-serif'],
      },
      borderRadius: {
        xl: '30px',
        '2xl': '30px',
        '3xl': '30px',
      },
    },
  },
  plugins: [],
};
