import React, { useState } from 'react';
import { X, Send, Mail, UploadCloud, Library, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { uploadMediaFile } from '../lib/storage';

interface Props {
  type: 'blog' | 'event';
  defaultSubject: string;
  defaultTitle: string;
  defaultBodyText: string;
  defaultImage: string;
  mediaLibrary: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

const NewsletterSendModal: React.FC<Props> = ({
  type,
  defaultSubject,
  defaultTitle,
  defaultBodyText,
  defaultImage,
  mediaLibrary,
  onConfirm,
  onCancel,
}) => {
  const [subject, setSubject] = useState(defaultSubject);
  const [title, setTitle] = useState(defaultTitle);
  const [bodyText, setBodyText] = useState(defaultBodyText);
  const [imageUrl, setImageUrl] = useState(defaultImage);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadMediaFile(file);
    setImageUrl(url);
    setIsUploading(false);
  };

  const handleSendAndPublish = async () => {
    if (!subject.trim() || !title.trim() || !bodyText.trim()) {
      setError('Veuillez remplir le sujet, le titre et le texte.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const sendNewsletter = httpsCallable(functions, 'sendNewsletter');
      await sendNewsletter({ subject, title, bodyText, imageUrl: imageUrl || undefined });
      setSuccess(true);
      setTimeout(onConfirm, 1200);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Erreur lors de l'envoi.");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-midnight border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gold/20 p-2 rounded-full text-gold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Envoyer une infolettre</h2>
              <p className="text-slate-400 text-sm">
                {type === 'blog'
                  ? 'Notifiez vos abonnés de ce nouvel article avant de le publier'
                  : 'Notifiez vos abonnés de ce nouvel événement avant de le publier'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row min-h-0">

          {/* ── Editor ── */}
          <div className="flex-1 p-8 space-y-5 lg:border-r border-white/10">

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sujet du courriel</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="Ex: Un nouvel article est disponible!"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Titre principal</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Texte</label>
              <textarea
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold/50 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Image (optionnelle)</label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="URL de l'image..."
                />
                <label className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-gold/40 cursor-pointer transition-colors text-sm shrink-0">
                  <UploadCloud className="w-4 h-4" />
                  {isUploading ? 'Téléversement...' : 'Téléverser'}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
                </label>
                <button
                  onClick={() => setIsLibraryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-gold/40 transition-colors text-sm shrink-0"
                >
                  <Library className="w-4 h-4" /> Médiathèque
                </button>
              </div>
              {imageUrl && (
                <img src={imageUrl} alt="" className="mt-3 w-full h-28 object-cover rounded-xl border border-white/10" />
              )}
            </div>
          </div>

          {/* ── Preview ── */}
          <div className="flex-1 p-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Aperçu du courriel</p>
            <div className="rounded-xl overflow-hidden border border-white/10 text-sm">
              <div style={{ background: '#0f0f23', padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ color: '#C8A96E', fontSize: '18px', fontFamily: 'Georgia, serif' }}>Caroline Gérard</div>
                <div style={{ color: '#888', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Infolettre</div>
              </div>
              {imageUrl && (
                <img src={imageUrl} alt="" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block' }} />
              )}
              <div style={{ background: '#fff', padding: '20px 16px' }}>
                <div style={{ color: '#0f0f23', fontSize: '16px', fontFamily: 'Georgia, serif', marginBottom: '10px', fontWeight: 'bold' }}>
                  {title || 'Titre…'}
                </div>
                <div style={{ color: '#555', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                  {bodyText || 'Votre texte ici…'}
                </div>
              </div>
              <div style={{ background: '#f0f0f0', padding: '10px', textAlign: 'center', fontSize: '9px', color: '#aaa' }}>
                © 2026 Caroline Gérard · Infolettre — communauté des rêveurs
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          {success ? (
            <div className="flex items-center gap-2 text-green-400 font-bold">
              <CheckCircle className="w-5 h-5" /> Infolettre envoyée avec succès!
            </div>
          ) : (
            <>
              <div className="flex-1">
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={onCancel}
                  className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors text-sm font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirm}
                  className="px-5 py-2.5 bg-white/10 text-white hover:bg-white/20 rounded-xl font-bold text-sm transition-colors"
                >
                  Publier sans envoyer
                </button>
                <button
                  onClick={handleSendAndPublish}
                  disabled={sending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gold text-midnight rounded-xl font-bold text-sm hover:bg-white transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Envoi en cours…' : 'Envoyer & Publier'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Media Library Picker */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
          <div className="bg-midnight/80 border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-serif text-white">Sélectionner une image</h3>
              <button onClick={() => setIsLibraryOpen(false)} className="p-2 text-slate-400 hover:text-white"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mediaLibrary.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden cursor-pointer group" onClick={() => { setImageUrl(url); setIsLibraryOpen(false); }}>
                    <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterSendModal;
