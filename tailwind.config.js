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
        // Jetons du module Factures et Finances (valeurs dans index.css). `rose` garde ses nuances
        // de Tailwind (AdminVentes emploie rose-400) : le module n'en prend que la teinte par défaut.
        papier: 'rgb(var(--c-papier) / <alpha-value>)',
        'papier-2': 'rgb(var(--c-papier-2) / <alpha-value>)',
        encre: 'rgb(var(--c-encre) / <alpha-value>)',
        'encre-2': 'rgb(var(--c-encre-2) / <alpha-value>)',
        gris: 'rgb(var(--c-gris) / <alpha-value>)',
        'gris-clair': 'rgb(var(--c-gris-clair) / <alpha-value>)',
        filet: 'rgb(var(--c-filet) / <alpha-value>)',
        rose: { DEFAULT: 'rgb(var(--c-rose) / <alpha-value>)' },
        'rose-vif': 'rgb(var(--c-rose-vif) / <alpha-value>)',
        'rose-clair': 'rgb(var(--c-rose-clair) / <alpha-value>)',
        trait: 'rgb(var(--c-trait) / <alpha-value>)',
        bouton: 'rgb(var(--c-bouton) / <alpha-value>)',
        'bouton-2': 'rgb(var(--c-bouton-2) / <alpha-value>)',
        'sur-bouton': 'rgb(var(--c-sur-bouton) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Lato"', 'sans-serif'],
      },
      borderRadius: {
        xl: '30px',
        '2xl': '30px',
        '3xl': '30px',
        champ: '15px',
        pilule: '9999px',
      },
      boxShadow: { panneau: '0 24px 60px -30px rgb(0 0 0 / 0.6)' },
      fontSize: {
        display: ['clamp(1.9rem, 1.4rem + 1.6vw, 2.6rem)', { lineHeight: '1.05' }],
        h2: ['clamp(1.6rem, 1.3rem + 0.9vw, 1.95rem)', { lineHeight: '1.05' }],
        h3: ['clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem)', { lineHeight: '1.15' }],
        petit: ['0.875rem', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
};
