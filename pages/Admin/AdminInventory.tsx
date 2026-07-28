import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff, X, Check, ArrowLeft, ArrowRight, Lock, Unlock, Sparkles } from 'lucide-react';
import { Book } from '../../types';
import { uploadMediaFile } from '../../lib/storage';
import { saveSiteContentKeys } from '../../lib/firestore';
import { useSiteContent } from '../../contexts/SiteContentContext';

interface AdminInventoryProps {
  books: Book[];
  onSave: (book: Book) => Promise<void> | void;
  onDelete: (id: string) => void;
  mediaLibrary?: string[];
}

const EMPTY_FORM: Omit<Book, 'id'> = {
  title: '',
  subtitle: '',
  description: '',
  price: 0,
  image: '',
  backImage: '',
  pageImages: [],
  color: '#1e293b',
  comingSoon: false,
  isHidden: false,
  wrapped: false,
  isLocked: true,
  // metadata
  format: '',
  pageCount: undefined,
  redaction: '',
  direction: '',
  coordination: '',
  revision: '',
  coverDesign: '',
  layout: '',
  isbnPrint: '',
  isbnPdf: '',
  isbnEpub: '',
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-gold/50 transition-colors";

// Textes de la carte « livre à venir » sur la boutique (badge, étiquette, sous-texte).
// Stockés dans settings/siteContent sous les mêmes clés que le mode édition du site.
const COMING_SOON_DEFAULTS = {
  tome_label: 'Tome 2',
  coming_soon_badge: 'À venir fin 2026',
  coming_soon_sub: 'Bientôt disponible',
};
type ComingSoonTexts = typeof COMING_SOON_DEFAULTS;

const AdminInventory = ({ books, onSave, onDelete, mediaLibrary = [] }: AdminInventoryProps) => {
  const { content: siteContent } = useSiteContent();
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState<Omit<Book, 'id'>>(EMPTY_FORM);
  const [comingSoonTexts, setComingSoonTexts] = useState<ComingSoonTexts>(COMING_SOON_DEFAULTS);
  const [isUploading, setIsUploading] = useState<'front' | 'back' | 'pages' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [mediaPicker, setMediaPicker] = useState<'image' | 'backImage' | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const pagesInputRef = useRef<HTMLInputElement>(null);

  const loadComingSoonTexts = (bookId: string) => {
    setComingSoonTexts({
      tome_label: siteContent[`book_${bookId}_tome_label`] ?? COMING_SOON_DEFAULTS.tome_label,
      coming_soon_badge: siteContent[`book_${bookId}_coming_soon_badge`] ?? COMING_SOON_DEFAULTS.coming_soon_badge,
      coming_soon_sub: siteContent[`book_${bookId}_coming_soon_sub`] ?? COMING_SOON_DEFAULTS.coming_soon_sub,
    });
  };

  const openNew = () => {
    const id = `book-${Date.now()}`;
    setFormData(EMPTY_FORM);
    setEditingBook({ id, ...EMPTY_FORM });
    loadComingSoonTexts(id);
  };

  const openEdit = (book: Book) => {
    setFormData({ ...EMPTY_FORM, ...book });
    setEditingBook(book);
    loadComingSoonTexts(book.id);
  };

  const closeModal = () => {
    setEditingBook(null);
    setFormData(EMPTY_FORM);
    setMediaPicker(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked
             : name === 'price' ? parseFloat(value) || 0
             : value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'backImage') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(field === 'image' ? 'front' : 'back');
    try {
      const url = await uploadMediaFile(file);
      setFormData(prev => ({ ...prev, [field]: url }));
    } finally {
      setIsUploading(null);
    }
  };

  const handlePageImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setIsUploading('pages');
    try {
      const urls = await Promise.all(files.map(uploadMediaFile));
      setFormData(prev => ({ ...prev, pageImages: [...(prev.pageImages ?? []), ...urls] }));
    } finally {
      setIsUploading(null);
      e.target.value = '';
    }
  };

  const movePageImage = (index: number, dir: -1 | 1) => {
    setFormData(prev => {
      const list = [...(prev.pageImages ?? [])];
      const target = index + dir;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, pageImages: list };
    });
  };

  const removePageImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pageImages: (prev.pageImages ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!editingBook || !formData.title || !formData.image) return;
    setSaveError('');
    try {
      // Strip undefined values — Firestore rejects them
      const clean = Object.fromEntries(
        Object.entries({ ...formData, id: editingBook.id }).filter(([, v]) => v !== undefined)
      ) as Book;
      await onSave(clean);
      setSaved(true);
      setTimeout(() => { setSaved(false); closeModal(); }, 800);
    } catch (err) {
      setSaveError('Erreur lors de la sauvegarde. Réessayez.');
      console.error('Save error:', err);
    }
  };

  const toggleHidden = (book: Book) => {
    onSave({ ...book, isHidden: !book.isHidden });
  };

  const toggleLocked = (book: Book) => {
    // Default-locked semantics: undefined == locked, so first click unlocks.
    const currentlyLocked = book.isLocked !== false;
    onSave({ ...book, isLocked: !currentlyLocked });
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Inventaire Livres</h1>
          <p className="text-slate-400 mt-1 text-sm">Gère ton catalogue boutique — les modifications sont en temps réel.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-gold text-midnight px-5 py-2.5 rounded-xl font-bold hover:bg-white transition-colors flex items-center gap-2 text-sm shadow-lg shadow-gold/20"
        >
          <Plus size={16} /> Ajouter un livre
        </button>
      </div>

      {books.length === 0 && (
        <p className="text-center text-slate-500 italic py-16">Aucun livre dans l'inventaire.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {books.map(book => (
          <div
            key={book.id}
            className={`bg-midnight/60 backdrop-blur-md rounded-2xl border overflow-hidden transition-all ${
              book.isHidden ? 'border-white/5 opacity-60' : 'border-white/10 hover:border-gold/30'
            }`}
          >
            <div className="relative h-48 bg-slate-900">
              <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
              {book.isHidden && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-xs font-bold text-white uppercase tracking-widest bg-slate-800/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <EyeOff size={12} /> Masqué
                  </span>
                </div>
              )}
              {book.comingSoon && (
                <div className="absolute top-2 left-2 bg-gold text-midnight text-xs font-bold px-2 py-0.5 rounded-full">
                  À venir
                </div>
              )}
              <div className="absolute top-2 right-2 bg-midnight/80 px-2 py-1 rounded-lg text-xs text-gold font-bold border border-gold/20">
                {book.price > 0 ? `${book.price} $` : 'Gratuit'}
              </div>
            </div>
            <div className="p-4 space-y-1">
              <h3 className="font-bold text-white text-base leading-tight">{book.title}</h3>
              {book.subtitle && <p className="text-slate-400 text-xs">{book.subtitle}</p>}
              <p className="text-slate-500 text-xs line-clamp-2 pt-1">{book.description}</p>
            </div>
            <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3 mt-1 flex-wrap">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleHidden(book)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                    book.isHidden
                      ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {book.isHidden ? <><Eye size={13} /> Afficher</> : <><EyeOff size={13} /> Masquer</>}
                </button>
                <button
                  onClick={() => toggleLocked(book)}
                  title={book.isLocked !== false ? 'Le livre est verrouillé — cliquer pour déverrouiller' : 'Le livre est déverrouillé — cliquer pour verrouiller'}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                    book.isLocked !== false
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  }`}
                >
                  {book.isLocked !== false ? <><Lock size={13} /> Verrouillé</> : <><Unlock size={13} /> Ouvrable</>}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(book)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <Edit3 size={15} />
                </button>
                {deleteConfirm === book.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(book.id)} className="p-2 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors">
                      <Check size={15} />
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(book.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-serif text-lg text-white font-bold">
                {books.find(b => b.id === editingBook.id) ? 'Modifier le livre' : 'Nouveau livre'}
              </h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              <Field label="Titre *">
                <input name="title" value={formData.title} onChange={handleChange}
                  placeholder="Titre du livre" className={inputCls} />
              </Field>
              <Field label="Sous-titre">
                <input name="subtitle" value={formData.subtitle ?? ''} onChange={handleChange}
                  placeholder="Sous-titre (optionnel)" className={inputCls} />
              </Field>
              <Field label="Description *">
                <textarea name="description" value={formData.description} onChange={handleChange}
                  placeholder="Description du livre" rows={3} className={`${inputCls} resize-none`} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Prix ($)">
                  <input name="price" type="number" min="0" step="0.01" value={formData.price} onChange={handleChange} className={inputCls} />
                </Field>
                <Field label="Couleur (hex)">
                  <div className="flex gap-2 items-center">
                    <input name="color" value={formData.color} onChange={handleChange}
                      placeholder="#1e293b" className={`${inputCls} flex-1`} />
                    <input type="color" value={formData.color}
                      onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                  </div>
                </Field>
              </div>

              <Field label="Image de couverture (recto) *">
                <div className="space-y-2">
                  <input name="image" value={formData.image} onChange={handleChange}
                    placeholder="URL de l'image" className={inputCls} />

                  {/* hidden file input */}
                  <input ref={frontInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleImageUpload(e, 'image')} />

                  <div className="flex gap-2 flex-wrap">
                    <button type="button"
                      onClick={() => frontInputRef.current?.click()}
                      disabled={isUploading !== null}
                      className="text-xs text-gold hover:text-white transition-colors border border-gold/30 hover:border-gold px-3 py-1.5 rounded-lg disabled:opacity-40">
                      {isUploading === 'front' ? 'Téléversement...' : '⬆ Téléverser'}
                    </button>
                    {mediaLibrary.length > 0 && (
                      <button type="button"
                        onClick={() => setMediaPicker(mediaPicker === 'image' ? null : 'image')}
                        className="text-xs text-gold hover:text-white transition-colors border border-gold/30 hover:border-gold px-3 py-1.5 rounded-lg">
                        🖼 Médiathèque {mediaPicker === 'image' ? '▲' : '▼'}
                      </button>
                    )}
                  </div>

                  {/* Media picker panel */}
                  {mediaPicker === 'image' && (
                    <div className="border border-white/10 rounded-xl p-3 bg-black/30 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-4 gap-2">
                        {mediaLibrary.filter(url => /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(url)).map((url, i) => (
                          <button key={i} type="button"
                            onClick={() => { setFormData(prev => ({ ...prev, image: url })); setMediaPicker(null); }}
                            className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-gold/60 transition-colors focus:outline-none focus:border-gold">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.image && <img src={formData.image} alt="aperçu" className="h-24 rounded-lg object-cover" />}
                </div>
              </Field>

              <Field label="Image de dos (verso)">
                <div className="space-y-2">
                  <input name="backImage" value={formData.backImage ?? ''} onChange={handleChange}
                    placeholder="URL de l'image (optionnel)" className={inputCls} />

                  {/* hidden file input */}
                  <input ref={backInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleImageUpload(e, 'backImage')} />

                  <div className="flex gap-2 flex-wrap">
                    <button type="button"
                      onClick={() => backInputRef.current?.click()}
                      disabled={isUploading !== null}
                      className="text-xs text-gold hover:text-white transition-colors border border-gold/30 hover:border-gold px-3 py-1.5 rounded-lg disabled:opacity-40">
                      {isUploading === 'back' ? 'Téléversement...' : '⬆ Téléverser'}
                    </button>
                    {mediaLibrary.length > 0 && (
                      <button type="button"
                        onClick={() => setMediaPicker(mediaPicker === 'backImage' ? null : 'backImage')}
                        className="text-xs text-gold hover:text-white transition-colors border border-gold/30 hover:border-gold px-3 py-1.5 rounded-lg">
                        🖼 Médiathèque {mediaPicker === 'backImage' ? '▲' : '▼'}
                      </button>
                    )}
                  </div>

                  {/* Media picker panel */}
                  {mediaPicker === 'backImage' && (
                    <div className="border border-white/10 rounded-xl p-3 bg-black/30 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-4 gap-2">
                        {mediaLibrary.filter(url => /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(url)).map((url, i) => (
                          <button key={i} type="button"
                            onClick={() => { setFormData(prev => ({ ...prev, backImage: url })); setMediaPicker(null); }}
                            className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-gold/60 transition-colors focus:outline-none focus:border-gold">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.backImage && <img src={formData.backImage} alt="aperçu dos" className="h-24 rounded-lg object-cover" />}
                </div>
              </Field>

              <Field label="Pages intérieures (livre feuilletable)">
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500 leading-relaxed -mt-1">
                    Téléverse les pages intérieures dans l'ordre.
                  </p>
                  <input ref={pagesInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={handlePageImagesUpload} />
                  <button type="button"
                    onClick={() => pagesInputRef.current?.click()}
                    disabled={isUploading !== null}
                    className="text-xs text-gold hover:text-white transition-colors border border-gold/30 hover:border-gold px-3 py-1.5 rounded-lg disabled:opacity-40">
                    {isUploading === 'pages' ? 'Téléversement...' : '⬆ Téléverser des pages'}
                  </button>
                  {(formData.pageImages?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {formData.pageImages!.map((url, i) => (
                        <div key={`${url}-${i}`} className="relative group rounded-lg overflow-hidden bg-black/30 border border-white/10">
                          <img src={url} alt={`page ${i + 1}`} className="w-full h-24 object-cover" />
                          <div className="absolute top-1 left-1 bg-midnight/80 text-gold text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {i + 1}
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => movePageImage(i, -1)}
                              disabled={i === 0}
                              className="p-1.5 bg-white/10 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Reculer"
                            >
                              <ArrowLeft size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removePageImage(i)}
                              className="p-1.5 bg-red-500/30 rounded-full text-white hover:bg-red-500/60"
                              title="Supprimer"
                            >
                              <Trash2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePageImage(i, 1)}
                              disabled={i === formData.pageImages!.length - 1}
                              className="p-1.5 bg-white/10 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Avancer"
                            >
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" name="comingSoon" checked={formData.comingSoon ?? false}
                    onChange={handleChange} className="w-4 h-4 accent-gold" />
                  À venir (comingSoon)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" name="isHidden" checked={formData.isHidden ?? false}
                    onChange={handleChange} className="w-4 h-4 accent-gold" />
                  Masqué dans la boutique
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" name="isLocked" checked={formData.isLocked !== false}
                    onChange={handleChange} className="w-4 h-4 accent-gold" />
                  <span>
                    <Lock size={13} className="inline mr-1 -mt-0.5" />
                    Verrouillé <span className="text-xs text-slate-500">— désactive l'ouverture du livre feuilletable</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" name="wrapped" checked={formData.wrapped ?? false}
                      onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 rounded-full transition-colors peer-checked:bg-gold bg-white/10 border border-white/20 peer-checked:border-gold/60" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    🎁 <span className="font-bold text-gold">Wrap</span> — afficher comme cadeau emballé
                  </span>
                </label>
                {formData.wrapped && (
                  <p className="text-xs text-slate-500 ml-14 -mt-1 italic">
                    Le livre apparaîtra comme un cadeau mystère. Même taille visuelle que le livre.
                  </p>
                )}
              </div>

              {/* ── Bibliographic metadata ── */}
              <div className="border-t border-white/10 pt-4 mt-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Informations supplémentaires</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Format">
                      <input name="format" value={formData.format ?? ''} onChange={handleChange}
                        placeholder="ex : 6 × 9 pouces" className={inputCls} />
                    </Field>
                    <Field label="Nombre de pages">
                      <input name="pageCount" type="number" min="1" value={formData.pageCount ?? ''}
                        onChange={e => setFormData(p => ({ ...p, pageCount: parseInt(e.target.value) || undefined }))}
                        placeholder="288" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Rédaction">
                    <input name="redaction" value={formData.redaction ?? ''} onChange={handleChange}
                      placeholder="ex : Collectif d'écriture..." className={inputCls} />
                  </Field>
                  <Field label="Accompagnement littéraire">
                    <input name="coordination" value={formData.coordination ?? ''} onChange={handleChange}
                      placeholder="ex : Julie L'Archer, legardiendephare.com" className={inputCls} />
                  </Field>
                  <Field label="Édition">
                    <input name="direction" value={formData.direction ?? ''} onChange={handleChange}
                      placeholder="ex : Jérémy Parent" className={inputCls} />
                  </Field>
                  <Field label="Révision">
                    <input name="revision" value={formData.revision ?? ''} onChange={handleChange}
                      placeholder="ex : Charles DuBois" className={inputCls} />
                  </Field>
                  <Field label="Couverture et graphisme">
                    <input name="coverDesign" value={formData.coverDesign ?? ''} onChange={handleChange}
                      placeholder="ex : Sonia Lapointe, Bulle Design & Événement" className={inputCls} />
                  </Field>
                  <Field label="Mise en page">
                    <input name="layout" value={formData.layout ?? ''} onChange={handleChange}
                      placeholder="ex : Alejandro Natan" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-1 gap-2">
                    <Field label="ISBN (imprimé)">
                      <input name="isbnPrint" value={formData.isbnPrint ?? ''} onChange={handleChange}
                        placeholder="978-2-925574-01-9" className={inputCls} />
                    </Field>
                    <Field label="ISBN (PDF)">
                      <input name="isbnPdf" value={formData.isbnPdf ?? ''} onChange={handleChange}
                        placeholder="978-2-925574-02-6" className={inputCls} />
                    </Field>
                    <Field label="ISBN (ePUB)">
                      <input name="isbnEpub" value={formData.isbnEpub ?? ''} onChange={handleChange}
                        placeholder="978-2-925574-03-3" className={inputCls} />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900 border-t border-white/10 px-6 py-4 flex flex-col gap-3">
              {saveError && <p className="text-red-400 text-xs text-center">{saveError}</p>}
              <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 bg-white/5 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-colors text-sm">
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.image}
                className="flex-[2] py-3 bg-gold text-midnight rounded-xl font-bold hover:bg-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saved ? <><Check size={16} /> Sauvegardé!</> : 'Enregistrer'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;
