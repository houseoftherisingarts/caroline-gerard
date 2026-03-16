import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSiteContent } from '../contexts/SiteContentContext';

interface EditableTextProps {
  contentKey: string;
  defaultValue: string;
  tag?: keyof JSX.IntrinsicElements;
  className?: string;
}

const EditableText = ({ contentKey, defaultValue, tag: Tag = 'span', className = '' }: EditableTextProps) => {
  const { content, isEditMode, updateContent } = useSiteContent();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const TagEl = Tag as React.ElementType;

  const value = content[contentKey] ?? defaultValue;

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalValue(value);
    setIsEditing(true);
  };

  const handleCommit = () => {
    updateContent(contentKey, localValue);
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  if (!isEditMode) return <TagEl className={className}>{value}</TagEl>;

  return (
    <>
      <TagEl
        className={`${className} cursor-pointer hover:ring-2 hover:ring-gold/60 hover:ring-offset-1 hover:ring-offset-black/20 rounded transition-all`}
        onClick={handleStartEdit}
        title="Cliquer pour modifier"
      >
        {value}
      </TagEl>

      {isEditing && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={handleCommit}
        >
          <div
            className="bg-slate-900 border border-gold/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl mx-4"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs text-slate-400 mb-3 uppercase tracking-widest font-bold">Modifier le texte</p>
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={e => {
                setLocalValue(e.target.value);
                const ta = e.target;
                ta.style.height = 'auto';
                ta.style.height = ta.scrollHeight + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') setIsEditing(false);
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommit();
              }}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-gold/50 resize-none min-h-[80px]"
            />
            <p className="text-xs text-slate-500 mt-2">Ctrl+Entrée pour confirmer · Échap pour annuler</p>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">
                Annuler
              </button>
              <button onClick={handleCommit} className="bg-gold text-midnight px-6 py-2 rounded-xl font-bold text-sm hover:bg-white transition-colors">
                Enregistrer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default EditableText;
