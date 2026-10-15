import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bold, Italic, Type, AlignLeft, Link2, Unlink } from 'lucide-react';
import { useSiteContent } from '../contexts/SiteContentContext';

/** Les pages du site qu'un lien posé dans un texte peut viser. */
const PAGES_DU_SITE: { label: string; href: string }[] = [
  { label: 'Accueil', href: '/' },
  { label: 'À propos', href: '/a-propos' },
  { label: 'Boutique', href: '/boutique' },
  { label: 'Actualités', href: '/actualites' },
  { label: 'Événements', href: '/evenements' },
  { label: 'Médias', href: '/interviews' },
  { label: 'Conférence', href: '/conferences' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
  { label: 'Espace client', href: '/communaute' },
];

const estInterne = (href: string) => href.startsWith('/') && !href.startsWith('//');

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
    className={`inline-flex items-center px-2.5 py-1.5 rounded text-sm font-bold transition-colors select-none ${
      active ? 'bg-gold text-midnight' : 'bg-white/10 text-white hover:bg-white/20'
    }`}
  >
    {children}
  </button>
);

const EditableText = ({ contentKey, defaultValue, tag: Tag = 'span', className = '' }: EditableTextProps) => {
  const { content, isEditMode, updateContent } = useSiteContent();
  const [isEditing, setIsEditing] = useState(false);
  const [lienOuvert, setLienOuvert] = useState(false);
  const [lienHref, setLienHref] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const navigate = useNavigate();
  const TagEl = Tag as React.ElementType;

  // Un lien vers une page du site posé dans le texte change de page sans recharger le site.
  const handleViewClick = (e: React.MouseEvent) => {
    const a = (e.target as Element).closest?.('a');
    if (!a || a.target === '_blank') return;
    const href = a.getAttribute('href') ?? '';
    if (!estInterne(href)) return;
    e.preventDefault();
    navigate(href);
  };

  const value = content[contentKey] ?? defaultValue;

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Un texte éditable vit parfois dans un lien : sans ceci, le clic ouvrirait la
    // fenêtre de modification et changerait de page en même temps.
    e.preventDefault();
    setIsEditing(true);
  };

  const handleCommit = () => {
    const html = editorRef.current?.innerHTML ?? value;
    updateContent(contentKey, html);
    setIsEditing(false);
    setLienOuvert(false);
  };

  const memoriserSelection = () => {
    const sel = window.getSelection();
    selectionRef.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
  };

  const ouvrirLien = () => {
    memoriserSelection();
    const noeud = selectionRef.current?.commonAncestorContainer as Node | undefined;
    const el = noeud instanceof Element ? noeud : noeud?.parentElement ?? null;
    setLienHref(el?.closest('a')?.getAttribute('href') ?? '');
    setLienOuvert(true);
  };

  const poserLien = () => {
    const href = lienHref.trim();
    if (!href || !editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (selectionRef.current) { sel?.removeAllRanges(); sel?.addRange(selectionRef.current); }
    const libelle = PAGES_DU_SITE.find(p => p.href === href)?.label ?? href;
    const externe = !estInterne(href);
    if (!sel || sel.isCollapsed) {
      document.execCommand('insertHTML', false, `<a href="${href}"${externe ? ' target="_blank" rel="noopener"' : ''}>${libelle}</a>`);
    } else {
      document.execCommand('createLink', false, href);
      editorRef.current.querySelectorAll<HTMLAnchorElement>(`a[href="${href}"]`).forEach(a => {
        if (externe) { a.target = '_blank'; a.rel = 'noopener'; } else { a.removeAttribute('target'); a.removeAttribute('rel'); }
      });
    }
    setLienOuvert(false);
  };

  const retirerLien = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (selectionRef.current) { sel?.removeAllRanges(); sel?.addRange(selectionRef.current); }
    const noeud = sel?.anchorNode;
    const el = noeud instanceof Element ? noeud : noeud?.parentElement ?? null;
    const a = el?.closest('a');
    if (a && sel?.isCollapsed) {
      const r = document.createRange(); r.selectNodeContents(a); sel.removeAllRanges(); sel.addRange(r);
    }
    document.execCommand('unlink');
    setLienOuvert(false);
  };

  // Set initial HTML content and focus when modal opens
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = value;
      editorRef.current.focus();
      setLienOuvert(false);
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
        className={`texte-site ${className}`}
        onClick={handleViewClick}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <>
      <TagEl
        className={`texte-site ${className} cursor-pointer hover:ring-2 hover:ring-gold/60 hover:ring-offset-1 hover:ring-offset-black/20 rounded transition-all`}
        onClick={handleStartEdit}
        title="Cliquer pour modifier"
        dangerouslySetInnerHTML={{ __html: value }}
      />

      {isEditing && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleCommit}
        >
          <div
            className="bg-slate-900 border border-gold/40 rounded-t-2xl sm:rounded-2xl p-4 md:p-6 w-full sm:max-w-2xl shadow-2xl sm:mx-4 max-h-[90vh] overflow-y-auto"
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

              <div className="w-px h-6 bg-white/10" />

              <ToolBtn onClick={ouvrirLien} active={lienOuvert} title="Lien vers une page">
                <Link2 size={14} />
                <span className="text-xs ml-1">Lien</span>
              </ToolBtn>
            </div>

            {lienOuvert && (
              <div className="mb-3 p-3 rounded-xl bg-black/30 border border-gold/30 flex flex-wrap items-center gap-2">
                <p className="w-full text-xs text-slate-400">
                  Sélectionne d'abord le mot à lier dans ton texte, puis choisis une page du site ou colle une adresse.
                </p>
                <select
                  value={PAGES_DU_SITE.some(p => p.href === lienHref) ? lienHref : ''}
                  onChange={e => setLienHref(e.target.value)}
                  className="bg-white/10 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold/50 cursor-pointer"
                >
                  <option value="">Page du site…</option>
                  {PAGES_DU_SITE.map(p => <option key={p.href} value={p.href}>{p.label}</option>)}
                </select>
                <input
                  type="text"
                  value={lienHref}
                  onChange={e => setLienHref(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); poserLien(); } }}
                  placeholder="ou une adresse : https://…"
                  className="flex-1 min-w-[12rem] bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold/50 placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={poserLien}
                  disabled={!lienHref.trim()}
                  className="bg-gold text-midnight px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-white transition-colors disabled:opacity-40"
                >
                  Poser le lien
                </button>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={retirerLien}
                  title="Retirer le lien"
                  className="flex items-center gap-1 text-slate-300 border border-white/15 px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Unlink size={13} /> Retirer
                </button>
              </div>
            )}

            {/* Editable content area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="texte-site w-full min-h-[80px] max-h-[50vh] overflow-y-auto bg-black/30 border border-white/10 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-gold/50 leading-relaxed"
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
