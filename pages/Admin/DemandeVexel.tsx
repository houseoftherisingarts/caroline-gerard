import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';

type Props = { nom?: string; courriel?: string; ton?: 'clair' | 'sombre' };

const DemandeVexel = ({ nom, courriel, ton = 'sombre' }: Props) => {
  const [hauteur, setHauteur] = useState(620);
  const [utilisateur, setUtilisateur] = useState({ nom: '', courriel: '' });

  useEffect(() => onAuthStateChanged(auth, user => {
    setUtilisateur({ nom: user?.displayName ?? '', courriel: user?.email ?? '' });
  }), []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://vexelwebstudio.com') return;
      if (event.data?.vexelDemande === 'hauteur') {
        setHauteur(Math.max(520, event.data.valeur + 24));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const finalNom = nom ?? utilisateur.nom;
  const finalCourriel = courriel ?? utilisateur.courriel;

  return (
    <iframe
      src={`https://vexelwebstudio.com/demande/?client=caroline-gerard&cle=ABuGpQuL0dPX9Y356I_w3M0c&ton=${ton}&nom=${encodeURIComponent(finalNom)}&courriel=${encodeURIComponent(finalCourriel)}`}
      title="Demande de changement · Vexel Webstudio"
      allow="microphone"
      style={{ width: '100%', minHeight: hauteur, border: 0, borderRadius: 15, background: 'transparent' }}
    />
  );
};

export default DemandeVexel;
