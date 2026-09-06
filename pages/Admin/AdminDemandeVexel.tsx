import React from 'react';
import DemandeVexel from './DemandeVexel';

const AdminDemandeVexel = () => (
  <div className="max-w-2xl animate-fade-in">
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Demander un changement</h1>
      <p className="text-slate-400 mt-1 text-sm">
        Ce que vous voulez voir changer sur votre site, écrit ou dicté. La demande arrive au studio à l’instant et vous suivez ce que nous en avons compris.
      </p>
    </div>
    <DemandeVexel ton="sombre" />
  </div>
);

export default AdminDemandeVexel;
