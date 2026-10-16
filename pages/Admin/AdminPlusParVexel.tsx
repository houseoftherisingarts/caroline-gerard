import React from 'react';
import { PlusParVexel } from '../../vexel/PlusParVexel';

// Section « Plus par Vexel » : les outils offerts par le studio, lus en direct dans le
// catalogue publié par Vexel. Canon du site (admin sombre, or, Playfair et Lato).
const AdminPlusParVexel = () => (
  <div className="max-w-4xl animate-fade-in">
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Plus par Vexel</h1>
      <p className="text-slate-400 mt-1 text-sm">
        Les programmes que le studio bâtit entre deux sites et offre à ses clients, gratuits ou payants.
      </p>
    </div>
    <div
      style={{
        '--couleur-surface': '#0f172a',
        '--couleur-texte': '#f8fafc',
        '--couleur-muted': '#94a3b8',
        '--couleur-bordure': 'rgba(255,255,255,0.12)',
        '--couleur-accent': '#d4af37',
        '--couleur-accent-texte': '#0f172a',
        '--rayon-carte': '30px',
        '--police-corps': "'Lato', sans-serif",
        '--police-titre': "'Playfair Display', serif",
        '--police-etiquette': "'Lato', sans-serif",
      } as React.CSSProperties}
    >
      <PlusParVexel />
    </div>
  </div>
);

export default AdminPlusParVexel;
