// Les pièces jointes d'un devis ou d'une facture : un PDF ou une image, 20 Mo au plus, dans Storage
// sous documents/{docId}/ (storage.rules). Cochée « visible par le client », la pièce paraît sur la
// page publique par son adresse de téléchargement, recopiée dans le miroir (lib/factures.ts).
import React, { useRef, useState } from 'react';
import { Paperclip, Trash2 } from 'lucide-react';
import { Panneau, Bouton, uploadFile, deleteFile, makeStoragePath, type Language } from '../../../lib/compta/ancrage';
import type { PieceJointe } from '../../../types';

interface Props {
  lang: Language;
  docId: string;
  pieces: PieceJointe[];
  onChange: (pieces: PieceJointe[]) => Promise<void> | void;
}

const T = {
  FR: {
    titre: 'Pièces jointes', joindre: 'Joindre un fichier', aide: 'Un PDF ou une image, 20 Mo au plus.',
    visible: 'Visible par le client', retirer: 'Retirer', aucune: 'Aucune pièce jointe.',
    refusType: 'Seuls les PDF et les images sont acceptés.', refusTaille: 'Ce fichier dépasse 20 Mo.',
    echec: "Le dépôt n'a pas abouti. Réessayez.", envoi: 'Dépôt en cours...',
  },
  EN: {
    titre: 'Attachments', joindre: 'Attach a file', aide: 'A PDF or an image, 20 MB at most.',
    visible: 'Visible to the client', retirer: 'Remove', aucune: 'No attachment.',
    refusType: 'Only PDFs and images are accepted.', refusTaille: 'This file is over 20 MB.',
    echec: 'The upload failed. Try again.', envoi: 'Uploading...',
  },
};

const MAX = 20 * 1024 * 1024;
const taille = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

const PiecesJointes: React.FC<Props> = ({ lang, docId, pieces, onChange }) => {
  const t = T[lang];
  const entree = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const deposer = async (fichier: File | undefined) => {
    if (!fichier) return;
    if (!(fichier.type === 'application/pdf' || fichier.type.startsWith('image/'))) return setMessage(t.refusType);
    if (fichier.size >= MAX) return setMessage(t.refusTaille);
    setMessage('');
    setEnvoi(true);
    try {
      const { url, path } = await uploadFile(makeStoragePath(`documents/${docId}`, fichier.name), fichier);
      await onChange([...pieces, { nom: fichier.name, chemin: path, url, type: fichier.type, taille: fichier.size, visibleClient: false }]);
    } catch {
      setMessage(t.echec);
    }
    setEnvoi(false);
    if (entree.current) entree.current.value = '';
  };

  const retirer = async (piece: PieceJointe) => {
    await deleteFile(piece.chemin).catch(() => { /* déjà absent de Storage : on retire quand même la fiche */ });
    await onChange(pieces.filter((p) => p.chemin !== piece.chemin));
  };

  const basculer = (piece: PieceJointe) =>
    onChange(pieces.map((p) => (p.chemin === piece.chemin ? { ...p, visibleClient: !p.visibleClient } : p)));

  return (
    <Panneau titre={t.titre} className="space-y-4">
      {pieces.length === 0 ? (
        <p className="text-sm text-gris">{t.aucune}</p>
      ) : (
        <ul className="divide-y divide-filet border-y border-filet">
          {pieces.map((p) => (
            <li key={p.chemin} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-encre hover:text-rose break-all">
                  <Paperclip className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {p.nom}
                </a>
                <p className="text-[13px] text-gris">{taille(p.taille)}</p>
                <label className="flex items-center gap-2 text-sm text-encre cursor-pointer min-h-[36px]">
                  <input type="checkbox" checked={p.visibleClient} onChange={() => basculer(p)} className="w-4 h-4 accent-current text-rose" />
                  {t.visible}
                </label>
              </div>
              <button onClick={() => retirer(p)} aria-label={`${t.retirer} ${p.nom}`} className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-gris hover:text-rose transition-colors">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={entree}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        aria-label={t.joindre}
        onChange={(e) => deposer(e.target.files?.[0])}
      />
      <Bouton variante="secondaire" icone={Paperclip} onClick={() => entree.current?.click()} disabled={envoi} className="w-full">
        {envoi ? t.envoi : t.joindre}
      </Bouton>
      <p className="text-[13px] text-gris">{t.aide}</p>
      {message && <p role="alert" className="text-sm text-rose">{message}</p>}
    </Panneau>
  );
};

export default PiecesJointes;
