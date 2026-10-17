// Le bouton « Paquet pour le comptable » de Rapports : un zip de l'exercice choisi, avec la
// progression des reçus pendant le téléchargement. La fabrication vit dans lib/compta/paquet.ts.
import React, { useState } from 'react';
import { Package, Check } from 'lucide-react';
import { Panneau, Bouton, useCollection, type Language } from '../../../lib/compta/ancrage';
import { construirePaquet, transactionsAvecRecu } from '../../../lib/compta/paquet';
import type { Compte, Periode, ReglagesCompta, Tiers, Transaction } from '../../../lib/compta/types';

const TEXTES = {
  FR: {
    titre: 'Votre comptable', bouton: 'Paquet pour le comptable',
    lede: (ex: string, n: number) => `Un zip de ${ex} : le grand livre, l'état des résultats, les taxes, le plan comptable, les tiers et ${n} reçu${n > 1 ? 's' : ''}.`,
    progres: (n: number, total: number) => `Reçus : ${n} sur ${total}`,
    fini: (m: number) => (m ? `Paquet téléchargé. ${m} reçu${m > 1 ? 's' : ''} introuvable${m > 1 ? 's' : ''}, listé${m > 1 ? 's' : ''} dans recus-manquants.txt.` : 'Paquet téléchargé.'),
    erreur: 'Le paquet n\'a pas pu être fabriqué. Réessayez.',
  },
  EN: {
    titre: 'Your accountant', bouton: 'Accountant package',
    lede: (ex: string, n: number) => `A zip of ${ex}: the ledger, income statement, taxes, chart of accounts, parties and ${n} receipt${n > 1 ? 's' : ''}.`,
    progres: (n: number, total: number) => `Receipts: ${n} of ${total}`,
    fini: (m: number) => (m ? `Package downloaded. ${m} receipt${m > 1 ? 's' : ''} could not be fetched, listed in recus-manquants.txt.` : 'Package downloaded.'),
    erreur: 'The package could not be built. Please try again.',
  },
};

interface Props { lang: Language; transactions: Transaction[]; comptes: Compte[]; reglages: ReglagesCompta; exercice: Periode }

const PaquetComptable: React.FC<Props> = ({ lang, transactions, comptes, reglages, exercice }) => {
  const t = TEXTES[lang];
  const { data: tiers } = useCollection<Tiers>('tiers');
  const [etat, setEtat] = useState<{ n: number; total: number } | null>(null);
  const [message, setMessage] = useState('');
  const enCours = etat !== null;
  const reussi = !!message && !etat && message !== t.erreur;

  const fabriquer = async () => {
    setMessage('');
    setEtat({ n: 0, total: 0 });
    try {
      const { blob, manquants } = await construirePaquet({ transactions, comptes, tiers, reglages, exercice, lang }, (n, total) => setEtat({ n, total }));
      const lien = document.createElement('a');
      lien.href = URL.createObjectURL(blob);
      lien.download = `paquet-comptable-${exercice.debut.slice(0, 4)}.zip`;
      document.body.appendChild(lien);
      lien.click();
      document.body.removeChild(lien);
      setTimeout(() => URL.revokeObjectURL(lien.href), 10000);
      setMessage(t.fini(manquants));
    } catch {
      setMessage(t.erreur);
    } finally {
      setEtat(null);
    }
  };

  return (
    <div className="no-imprime" data-paquet>
      <Panneau
        titre={t.titre}
        actions={<Bouton icone={Package} onClick={fabriquer} disabled={enCours}>{t.bouton}</Bouton>}
      >
        <p className="text-sm text-gris mesure">{t.lede(exercice.libelle, transactionsAvecRecu(transactions, exercice).length)}</p>
        <p className={`text-sm mt-3 min-h-[1.5rem] flex items-center gap-2 ${reussi ? 'text-rose font-semibold' : 'text-encre'}`} role="status" aria-live="polite">
          {reussi && <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
          {etat && etat.total > 0 ? t.progres(etat.n, etat.total) : message}
        </p>
      </Panneau>
    </div>
  );
};

export default PaquetComptable;
