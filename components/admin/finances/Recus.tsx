// Reçu d'une transaction : dépôt vers Storage recus/{transactionId}/{nom}, vignette (image ou icône
// PDF), ouverture dans un nouvel onglet, retrait. S'ouvre depuis la colonne « Reçu » de Transactions.tsx.
// Règle Storage : voir storage.rules, bloc recus/ (admin seulement, 15 Mo, image/* ou application/pdf).
import React, { useRef, useState } from 'react';
import { Upload, FileText, X, ExternalLink, Trash2 } from 'lucide-react';
import { Bouton, uploadFile, deleteFile, makeStoragePath, type Language } from '../../../lib/compta/ancrage';
import { modifierTransaction } from '../../../lib/compta/transactions';
import type { Transaction } from '../../../lib/compta/types';

interface Props {
  transaction: Transaction;
  lang: Language;
  onFermer: () => void;
}

const TEXTES = {
  FR: {
    titre: 'Reçu', sous: 'Une image ou un PDF, jusqu\'à 15 Mo.',
    deposer: 'Glissez le reçu ici, ou cliquez pour le choisir', formats: 'JPG, PNG ou PDF',
    ouvrir: 'Ouvrir le reçu', retirer: 'Retirer le reçu', fermer: 'Fermer', envoi: 'Envoi en cours…',
    typeRefuse: 'Ce format n\'est pas accepté : une image ou un PDF, jusqu\'à 15 Mo.',
  },
  EN: {
    titre: 'Receipt', sous: 'An image or a PDF, up to 15 MB.',
    deposer: 'Drag the receipt here, or click to choose one', formats: 'JPG, PNG or PDF',
    ouvrir: 'Open the receipt', retirer: 'Remove the receipt', fermer: 'Close', envoi: 'Uploading…',
    typeRefuse: 'That format is not accepted: an image or a PDF, up to 15 MB.',
  },
};

const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const TAILLE_MAX = 15 * 1024 * 1024;

const Recus: React.FC<Props> = ({ transaction, lang, onFermer }) => {
  const t = TEXTES[lang];
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  const deposer = async (file: File) => {
    setErreur('');
    if (!TYPES_ACCEPTES.includes(file.type) || file.size > TAILLE_MAX) {
      setErreur(t.typeRefuse);
      return;
    }
    setBusy(true);
    try {
      const chemin = makeStoragePath(`recus/${transaction.id}`, file.name);
      const { url } = await uploadFile(chemin, file);
      await modifierTransaction(transaction.id, {
        recu: { chemin, url, nom: file.name, contentType: file.type, taille: file.size },
      });
    } finally {
      setBusy(false);
    }
  };

  const retirer = async () => {
    if (!transaction.recu) return;
    setBusy(true);
    try {
      await deleteFile(transaction.recu.chemin);
      await modifierTransaction(transaction.id, { recu: undefined });
    } finally {
      setBusy(false);
    }
  };

  const recu = transaction.recu;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-encre/40" role="dialog" aria-modal="true" onClick={onFermer}>
      <div className="w-full max-w-sm bg-papier-2 border border-filet rounded-champ shadow-panneau p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="font-serif text-h3 text-encre">{t.titre}</h2>
            <p className="text-gris text-sm mt-1">{transaction.description}</p>
          </div>
          <button type="button" onClick={onFermer} aria-label={t.fermer} className="w-9 h-9 inline-flex items-center justify-center text-gris hover:text-encre flex-shrink-0">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {recu ? (
          <div className="mt-4 space-y-4">
            <div className="border border-filet rounded-champ p-4 flex items-center gap-3">
              {recu.contentType.startsWith('image/') ? (
                <img src={recu.url} alt={recu.nom} className="w-16 h-16 object-cover rounded-champ border border-filet flex-shrink-0" />
              ) : (
                <span className="w-16 h-16 inline-flex items-center justify-center rounded-champ border border-filet text-gris flex-shrink-0">
                  <FileText className="w-6 h-6" aria-hidden="true" />
                </span>
              )}
              <p className="text-sm text-encre break-all">{recu.nom}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={recu.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-[44px] rounded-pilule border border-filet text-encre hover:border-encre px-5 text-sm font-medium">
                <ExternalLink className="w-4 h-4" aria-hidden="true" />{t.ouvrir}
              </a>
              <Bouton variante="danger" icone={Trash2} onClick={retirer} disabled={busy}>{t.retirer}</Bouton>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-gris text-sm mb-4">{t.sous}</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) deposer(f); }}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-champ py-10 px-4 text-center cursor-pointer transition-colors ${dragOver ? 'border-rose bg-rose/5' : 'border-filet hover:border-encre'}`}
            >
              <Upload className="w-6 h-6 text-gris" aria-hidden="true" />
              <p className="text-encre text-sm font-medium">{busy ? t.envoi : t.deposer}</p>
              <p className="text-[13px] text-gris">{t.formats}</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" disabled={busy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) deposer(f); }} />
            </div>
            {erreur && <p className="text-sm text-rose mt-3">{erreur}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recus;
