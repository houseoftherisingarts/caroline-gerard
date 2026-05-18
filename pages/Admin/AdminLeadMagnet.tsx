import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Eye, EyeOff, FileText, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { subscribeToSettings, saveSettings } from '../../lib/firestore';
import { uploadMediaFile } from '../../lib/storage';

const AdminLeadMagnet = () => {
  const [enabled, setEnabled] = useState(false);
  const [giftUrl, setGiftUrl] = useState('');
  const [giftName, setGiftName] = useState('');
  const [giftDescription, setGiftDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeToSettings(s => {
      setEnabled(s.leadMagnetEnabled ?? false);
      setGiftUrl(s.leadMagnetUrl ?? '');
      setGiftName(s.leadMagnetName ?? '');
      setGiftDescription(s.leadMagnetDescription ?? '');
    });
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadMediaFile(file);
      setGiftUrl(url);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        leadMagnetEnabled: enabled,
        leadMagnetUrl: giftUrl,
        leadMagnetName: giftName,
        leadMagnetDescription: giftDescription,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Aimant à courriels</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Offrez un extrait du livre en échange d'une inscription à l'infolettre. Le fichier se télécharge immédiatement après l'abonnement.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="bg-midnight/60 border border-white/10 rounded-2xl px-6 py-5 mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl shrink-0 transition-colors ${enabled ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-500'}`}>
            {enabled ? <Eye size={18} /> : <EyeOff size={18} />}
          </div>
          <div>
            <p className="text-white font-bold text-sm">Activer l'aimant à courriels</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {enabled
                ? 'Le formulaire d\'inscription affiche l\'offre de téléchargement.'
                : 'Désactivé — l\'infolettre s\'affiche normalement sans l\'offre.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEnabled(v => !v)}
          className={`relative rounded-full transition-colors focus:outline-none shrink-0 ${enabled ? 'bg-green-500/70' : 'bg-slate-600'}`}
          style={{ width: 44, height: 24 }}
          aria-pressed={enabled}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {/* Settings card */}
      <div className={`bg-midnight/60 border border-white/10 rounded-2xl px-6 py-6 space-y-6 transition-opacity ${!enabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>

        {/* Gift name */}
        <div>
          <label className="block text-slate-300 text-sm font-bold mb-2">Nom du cadeau</label>
          <input
            type="text"
            value={giftName}
            onChange={e => setGiftName(e.target.value)}
            placeholder="ex : Extrait — Chapitre 1 de William et les univers invisibles"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/40 transition-colors text-sm"
          />
        </div>

        {/* Gift description */}
        <div>
          <label className="block text-slate-300 text-sm font-bold mb-2">Description (affichée dans le formulaire)</label>
          <textarea
            value={giftDescription}
            onChange={e => setGiftDescription(e.target.value)}
            placeholder="ex : Télécharge gratuitement les 2 premiers chapitres du livre..."
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/40 transition-colors resize-none text-sm"
          />
        </div>

        {/* File upload */}
        <div>
          <label className="block text-slate-300 text-sm font-bold mb-2">Fichier à télécharger (PDF)</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-sm disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Téléversement...' : 'Choisir un PDF'}
            </button>
            {giftUrl && (
              <a
                href={giftUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 bg-gold/10 border border-gold/20 rounded-xl text-gold hover:bg-gold/20 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Vérifier le fichier actuel
              </a>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = '';
            }}
          />

          {giftUrl && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <FileText className="w-3.5 h-3.5 text-gold" />
              <span className="truncate">{giftUrl.split('/').pop()?.split('?')[0]}</span>
            </div>
          )}
          {!giftUrl && (
            <p className="text-slate-600 text-xs mt-2">Aucun fichier téléversé. Le bouton de téléchargement ne fonctionnera pas sans fichier.</p>
          )}
        </div>

        {/* Preview */}
        {(giftName || giftDescription) && (
          <div className="border border-gold/20 rounded-xl px-5 py-4 bg-gold/5">
            <p className="text-gold text-xs font-bold uppercase tracking-widest mb-2">Aperçu dans le formulaire</p>
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-bold text-sm">{giftName || 'Nom du cadeau'}</p>
                <p className="text-slate-400 text-xs mt-0.5">{giftDescription || 'Description...'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-gold text-midnight font-bold rounded-xl hover:bg-white transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        {saved && (
          <div className="flex items-center gap-2 text-green-400 text-sm font-bold animate-fade-in">
            <CheckCircle className="w-4 h-4" /> Enregistré!
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeadMagnet;
