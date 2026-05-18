import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, X } from 'lucide-react';
import { useSiteContent } from '../contexts/SiteContentContext';

export const useEditableString = (contentKey: string, defaultValue: string): string => {
  const { content } = useSiteContent();
  return content[contentKey] ?? defaultValue;
};

interface EditableFieldPencilProps {
  contentKey: string;
  defaultValue: string;
  label?: string;
  className?: string;
}

const EditableFieldPencil = ({ contentKey, defaultValue, label, className = '' }: EditableFieldPencilProps) => {
  const { content, isEditMode, updateContent } = useSiteContent();
  const [isOpen, setIsOpen] = useState(false);

  if (!isEditMode) return null;

  const value = content[contentKey] ?? defaultValue;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsOpen(true); }}
        title={label ? `Modifier : ${label}` : 'Modifier le texte'}
        className={`inline-flex items-center justify-center w-6 h-6 rounded-md bg-gold/90 text-midnight hover:bg-gold shadow-md transition-colors ${className}`}
      >
        <Pencil size={12} />
      </button>

      {isOpen && createPortal(
        <FieldStringModal
          label={label}
          initialValue={value}
          defaultValue={defaultValue}
          onCancel={() => setIsOpen(false)}
          onSave={(next) => {
            updateContent(contentKey, next);
            setIsOpen(false);
          }}
        />,
        document.body
      )}
    </>
  );
};

interface FieldStringModalProps {
  label?: string;
  initialValue: string;
  defaultValue: string;
  onCancel: () => void;
  onSave: (value: string) => void;
}

const FieldStringModal = ({ label, initialValue, defaultValue, onCancel, onSave }: FieldStringModalProps) => {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSave(value);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-slate-900 border border-gold/40 rounded-t-2xl sm:rounded-2xl p-5 md:p-6 w-full sm:max-w-xl shadow-2xl sm:mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-bold">
          Modifier {label ? `· ${label}` : 'le texte'}
        </p>
        <div className="flex justify-end mb-3">
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-base focus:outline-none focus:border-gold/50 leading-relaxed resize-y min-h-[80px] max-h-[40vh]"
        />

        <p className="text-xs text-slate-500 mt-2">
          Texte brut · Ctrl+Entrée pour confirmer · Échap pour annuler
        </p>

        <div className="flex justify-between items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => setValue(defaultValue)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Réinitialiser au texte par défaut
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => onSave(value)}
              className="bg-gold text-midnight px-6 py-2 rounded-xl font-bold text-sm hover:bg-white transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditableFieldPencil;
