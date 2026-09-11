import React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { PartenaireVexelPanneau } from '../../vexel/PartenaireVexelPanneau';

const AdminDevenirPartenaire = () => (
  <div className="max-w-2xl animate-fade-in">
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Devenir partenaire Vexel</h1>
      <p className="text-slate-400 mt-1 text-sm">
        Recommandez le studio et touchez une part de chaque abonnement des clients que vous amenez.
      </p>
    </div>
    <div
      style={{
        '--couleur-surface': '#0f172a',
        '--couleur-texte': '#f8fafc',
        '--couleur-muted': '#94a3b8',
        '--couleur-bordure': 'rgba(255,255,255,0.12)',
        '--couleur-accent': '#d4af37',
        '--rayon-carte': '30px',
        '--police-corps': "'Lato', sans-serif",
        '--police-titre': "'Playfair Display', serif",
      } as React.CSSProperties}
    >
      <PartenaireVexelPanneau
        slug="caroline-gerard"
        cle="ABuGpQuL0dPX9Y356I_w3M0c"
        onSucces={(resultat) => {
          setDoc(
            doc(db, 'settings', 'vexel'),
            { partenaire: { code: resultat.code, lien: resultat.lien, page: resultat.page, signeLe: new Date().toISOString() } },
            { merge: true },
          );
        }}
      />
    </div>
  </div>
);

export default AdminDevenirPartenaire;
