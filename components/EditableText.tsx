import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Type, AlignLeft } from 'lucide-react';
import { useSiteContent } from '../contexts/SiteContentContext';

interface EditableTextProps {
  contentKey: string;
  defaultValue: string;
  tag?: keyof React.JSX.IntrinsicElements;
  className?: string;
}

// Toolbar button for the rich text editor
const ToolBtn = ({ onClick, active, title, children }: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    onMouseDown={e => { e.preventDefault(); onClick(); }}
    title={title}
    className={`px-2.5 py-1.5 rounded text-sm font-bold transition-colors select-none ${
      active ? 'bg-gold text-midnight' : 'bg-white/10 text-white hover:bg-white/20'
    }`}
  >
    {children}
  </button>
);

const EditableText = ({ contentKey, defaultValue, tag: Tag = 'span', className = '' }: EditableTextProps) => {
  const { content, isEditMode, updateContent } = useSiteContent();
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const TagEl = Tag as React.ElementType;

  const value = content[contentKey] ?? defaultValue;

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCommit = () => {
    const html = editorRef.current?.innerHTML ?? value;
    updateContent(contentKey, html);
    setIsEditing(false);
  };

  // Set initial HTML content and focus when modal opens
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = value;
      editorRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rich text commands
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value ?? undefined);
    editorRef.current?.focus();
  };

  const insertParagraph = () => {
    exec('insertHTML', '<br><br>');
  };

  // View mode: render stored HTML (or plain text — plain text is valid HTML)
  if (!isEditMode) {
    return (
      <TagEl
        className={className}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <>
      <TagEl
        className={`${className} cursor-pointer hover:ring-2 hover:ring-gold/60 hover:ring-offset-1 hover:ring-offset-black/20 rounded transition-all`}
        onClick={handleStartEdit}
        title="Cliquer pour modifier"
        dangerouslySetInnerHTML={{ __html: value }}
      />

      {isEditing && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleCommit}
        >
          <div
            className="bg-slate-900 border border-gold/40 rounded-2xl p-6 w-full max-w-2xl shadow-2xl mx-4"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Escape') setIsEditing(false);
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommit();
            }}
          >
            <p className="text-xs text-slate-400 mb-3 uppercase tracking-widest font-bold">Modifier le texte</p>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-white/10">
              <ToolBtn onClick={() => exec('bold')} title="Gras (Ctrl+B)">
                <Bold size={14} />
              </ToolBtn>
              <ToolBtn onClick={() => exec('italic')} title="Italique (Ctrl+I)">
                <Italic size={14} />
              </ToolBtn>

              <div className="w-px h-6 bg-white/10" />

              {/* Font size */}
              <div className="flex items-center gap-1">
                <Type size={13} className="text-slate-400" />
                <select
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => { exec('fontSize', e.target.value); editorRef.current?.focus(); }}
                  defaultValue=""
                  className="bg-white/10 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gold/50 cursor-pointer"
                >
                  <option value="" disabled>Taille</option>
                  <option value="1">Très petit</option>
                  <option value="2">Petit</option>
                  <option value="3">Normal</option>
                  <option value="4">Grand</option>
                  <option value="5">Très grand</option>
                  <option value="6">Titre</option>
                </select>
              </div>

              <div className="w-px h-6 bg-white/10" />

              <ToolBtn onClick={insertParagraph} title="Ajouter un paragraphe">
                <AlignLeft size={14} />
                <span className="text-xs ml-1">¶</span>
              </ToolBtn>
            </div>

            {/* Editable content area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="w-full min-h-[80px] max-h-[50vh] overflow-y-auto bg-black/30 border border-white/10 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-gold/50 leading-relaxed"
              style={{ whiteSpace: 'pre-wrap' }}
            />

            <p className="text-xs text-slate-500 mt-2">Ctrl+Entrée pour confirmer · Échap pour annuler</p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCommit}
                className="bg-gold text-midnight px-6 py-2 rounded-xl font-bold text-sm hover:bg-white transition-colors"
              >
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
