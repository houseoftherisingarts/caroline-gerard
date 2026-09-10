/**
 * Le crayon de Caroline. Un bouton rond en bas à droite, visible seulement quand elle est
 * connectée à son Espace Auteure, qui allume le mode édition sur la vraie page du site plutôt
 * que dans l'aperçu de l'admin. Une fois allumé, chaque texte et chaque photo déjà déclarés
 * éditables (EditableText, EditableImage, EditableField) se laissent cliquer sur place, et la
 * barre du bas compte les changements en attente jusqu'à l'enregistrement.
 *
 * Le module reprend le geste du crayon livré à Laurie (Xena Horizon) et à Krystine, porté ici
 * sur la mécanique de contenu qui existait déjà dans ce dépôt : aucun composant n'a été rebalisé.
 */
import React, { useEffect, useState } from 'react';
import { Check, PencilLine, Save, X } from 'lucide-react';
import { useSiteContent } from '../contexts/SiteContentContext';

const CrayonSite = ({ visible }: { visible: boolean }) => {
  const { isEditMode, enterEditMode, exitEditMode, saveChanges, pendingChanges } = useSiteContent();
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);

  const nb = Object.keys(pendingChanges).length;

  // Un compte qui se déconnecte, ou une page rouverte : on ne reste jamais coincé en édition.
  useEffect(() => {
    if (!visible && isEditMode) exitEditMode();
  }, [visible, isEditMode, exitEditMode]);

  // Filet contre la fermeture d'onglet avec des changements non enregistrés.
  useEffect(() => {
    if (!isEditMode || nb === 0) return;
    const garde = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', garde);
    return () => window.removeEventListener('beforeunload', garde);
  }, [isEditMode, nb]);

  if (!visible) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveChanges();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuit = () => {
    if (nb > 0 && !confirmQuit) { setConfirmQuit(true); return; }
    setConfirmQuit(false);
    exitEditMode();
  };

  if (!isEditMode) {
    return (
      <button
        type="button"
        onClick={enterEditMode}
        title="Modifier cette page"
        aria-label="Modifier cette page"
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-gold text-midnight shadow-2xl
                   flex items-center justify-center hover:bg-white hover:scale-105 active:scale-95
                   transition-all duration-300 ring-4 ring-gold/20"
      >
        <PencilLine size={22} />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 md:p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-3xl bg-midnight/95 backdrop-blur-xl
                      border border-gold/40 rounded-2xl shadow-2xl px-4 py-3 md:px-6 md:py-4
                      flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 text-gold">
          <PencilLine size={18} />
          <span className="font-bold text-sm uppercase tracking-widest">Modification</span>
        </div>

        <p className="text-slate-400 text-xs md:text-sm flex-1 min-w-[12rem]">
          {confirmQuit
            ? `Vous avez ${nb === 1 ? 'un changement' : `${nb} changements`} qui ne sont pas enregistrés. Quitter quand même ?`
            : savedFlash
              ? 'Vos changements sont en ligne.'
              : nb === 0
                ? 'Cliquez sur un texte ou sur une photo pour la changer.'
                : nb === 1 ? '1 changement en attente' : `${nb} changements en attente`}
        </p>

        {savedFlash && !confirmQuit && (
          <span className="flex items-center gap-1.5 text-green-400 text-sm font-bold">
            <Check size={15} /> Enregistré
          </span>
        )}

        {!confirmQuit && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || nb === 0}
            className="flex items-center gap-2 bg-gold text-midnight px-4 py-2 rounded-xl font-bold text-sm
                       hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={14} /> {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        )}

        <button
          type="button"
          onClick={handleQuit}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
            confirmQuit
              ? 'bg-red-500/90 text-white hover:bg-red-500'
              : 'text-slate-300 border border-white/15 hover:bg-white/10 hover:text-white'
          }`}
        >
          <X size={14} /> {confirmQuit ? 'Quitter sans enregistrer' : 'Terminer'}
        </button>

        {confirmQuit && (
          <button
            type="button"
            onClick={() => setConfirmQuit(false)}
            className="text-slate-400 text-sm hover:text-white transition-colors"
          >
            Revenir
          </button>
        )}
      </div>
    </div>
  );
};

export default CrayonSite;
