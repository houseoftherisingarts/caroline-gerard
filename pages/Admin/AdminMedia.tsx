import React, { useRef, useState } from 'react';
import { Plus, Search, Video, FileText, Trash2, Upload, User, Loader2, Copy, Check, Globe, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';

type SphereImg = { id: string; url: string; alt: string; description?: string; showDescription?: boolean };

interface AdminMediaProps {
  profileImage: string;
  setProfileImage: (url: string) => void;
  mediaLibrary: string[];
  setMediaLibrary: (lib: string[]) => void;
  sphereGalleryImages: SphereImg[];
  onSetSphereGalleryImages: (imgs: SphereImg[]) => void;
}

function getFileType(url: string): 'image' | 'video' | 'document' {
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)$/.test(clean)) return 'image';
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(clean)) return 'video';
  return 'document';
}

function getFileName(url: string): string {
  try {
    const clean = url.split('?')[0];
    const parts = clean.split('/');
    const last = parts[parts.length - 1];
    return decodeURIComponent(last).replace(/^\d+_/, '');
  } catch {
    return 'fichier';
  }
}

const AdminMedia = ({
  profileImage, setProfileImage,
  mediaLibrary, setMediaLibrary,
  sphereGalleryImages, onSetSphereGalleryImages,
}: AdminMediaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, url: string) => {
    e.dataTransfer.setData('text/plain', url);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const url = e.dataTransfer.getData('text/plain');
    if (url) setProfileImage(url);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError('');
    const newUrls: string[] = [];
    try {
      for (const file of Array.from<File>(files)) {
        const storageRef = ref(storage, `mediatheque/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      }
      setMediaLibrary([...newUrls, ...mediaLibrary]);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Erreur lors du téléversement. Veuillez réessayer.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (url: string) => {
    setMediaLibrary(mediaLibrary.filter(u => u !== url));
    // Also remove from sphere if present
    onSetSphereGalleryImages(sphereGalleryImages.filter(img => img.url !== url));
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch { /* external URLs */ }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(''), 2000);
  };

  // ── Sphere gallery toggle ───────────────────────────────────────────────────

  const isInSphere = (url: string) => sphereGalleryImages.some(img => img.url === url);

  const toggleSphere = (url: string) => {
    if (isInSphere(url)) {
      onSetSphereGalleryImages(sphereGalleryImages.filter(img => img.url !== url));
    } else {
      const name = getFileName(url).replace(/\.[^.]+$/, '');
      onSetSphereGalleryImages([
        ...sphereGalleryImages,
        { id: `${Date.now()}_${Math.random()}`, url, alt: `Caroline Gérard — ${name}` },
      ]);
    }
  };

  const removeFromSphere = (id: string) =>
    onSetSphereGalleryImages(sphereGalleryImages.filter(img => img.id !== id));

  // ── Filtered library ────────────────────────────────────────────────────────

  const filteredMedia = mediaLibrary.filter(url => {
    const type = getFileType(url);
    const name = getFileName(url);
    const matchesFilter = filter === 'all' || type === filter;
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Médiathèque</h1>
          <p className="text-slate-400 mt-1">Gère tes images, vidéos et documents</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf" multiple className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {uploading ? 'Téléversement...' : 'Téléverser'}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <Upload size={16} /> {uploadError}
        </div>
      )}

      {/* ── Sphere Gallery Section ──────────────────────────────────────────── */}
      <div className="bg-midnight/60 border border-gold/20 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Globe size={20} className="text-gold" /> Galerie Sphère (Accueil)
        </h3>
        <p className="text-slate-500 text-xs mb-4">
          Clique sur <span className="text-gold font-bold">⊕</span> sur une image ci-dessous pour l'ajouter à la sphère. {sphereGalleryImages.length === 0 && <span className="italic">Aucune sélection — galerie par défaut affichée.</span>}
        </p>

        {sphereGalleryImages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {sphereGalleryImages.map(img => (
              <div
                key={img.id}
                style={{
                  borderRadius: 12, border: '1.5px solid rgba(200,169,110,0.45)',
                  background: 'rgba(4,6,18,0.6)', overflow: 'hidden',
                  boxShadow: '0 0 14px rgba(200,169,110,0.1)',
                }}
              >
                {/* Thumbnail */}
                <div style={{ position: 'relative', height: 100 }}>
                  <img src={img.url} alt={img.alt}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={() => removeFromSphere(img.id)}
                    title="Retirer de la sphère"
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(4,6,18,0.88)', border: '1px solid rgba(200,169,110,0.5)',
                      color: '#C8A96E', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={11} />
                  </button>
                </div>

                {/* Description + toggle */}
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    rows={2}
                    placeholder="Description (optionnelle)…"
                    value={img.description ?? ''}
                    onChange={e => onSetSphereGalleryImages(
                      sphereGalleryImages.map(s => s.id === img.id ? { ...s, description: e.target.value } : s)
                    )}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                      color: '#e2e8f0', fontSize: 11, padding: '6px 8px',
                      resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                    }}
                  />

                  {/* Toggle: afficher la description en agrandissement */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    {/* pill toggle */}
                    <div style={{ position: 'relative', width: 36, height: 20, flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={img.showDescription ?? false}
                        onChange={e => onSetSphereGalleryImages(
                          sphereGalleryImages.map(s => s.id === img.id ? { ...s, showDescription: e.target.checked } : s)
                        )}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      />
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 10,
                        background: img.showDescription ? '#C8A96E' : 'rgba(255,255,255,0.12)',
                        border: `1px solid ${img.showDescription ? 'rgba(200,169,110,0.8)' : 'rgba(255,255,255,0.15)'}`,
                        transition: 'background 0.2s, border-color 0.2s',
                      }} />
                      <div style={{
                        position: 'absolute', top: 2, left: img.showDescription ? 17 : 2,
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                        transition: 'left 0.2s',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: img.showDescription ? '#C8A96E' : '#64748b', letterSpacing: '0.05em', lineHeight: 1.3 }}>
                      Afficher en agrandissement
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Profile Picture ─────────────────────────────────────────────────── */}
      <div className="bg-midnight/60 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <User size={20} className="text-gold" /> Photo de Profil (Accueil)
        </h3>
        <div className="flex items-center gap-8">
          <div
            className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-dashed border-white/20 hover:border-gold transition-colors flex items-center justify-center bg-black/20 group"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <img src={profileImage} alt="Profile actuel" className="w-full h-full object-cover absolute inset-0 z-0" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <p className="text-xs text-white font-bold text-center px-2">Glisser une image ici</p>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-slate-300 text-sm mb-2">Cette photo est affichée sur la page d&apos;accueil.</p>
            <p className="text-slate-500 text-xs italic">Glissez une image de la galerie ci-dessous vers le cercle pour la mettre à jour.</p>
          </div>
        </div>
      </div>

      {/* ── Media Library ───────────────────────────────────────────────────── */}
      <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2">
            {(['all', 'image', 'video', 'document'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors uppercase tracking-wider ${filter === f ? 'bg-gold text-midnight' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                {f === 'all' ? 'Tous' : f === 'image' ? 'Images' : f === 'video' ? 'Vidéos' : 'Docs'}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {filteredMedia.length === 0 ? (
          <div
            className="border-2 border-dashed border-white/10 rounded-xl py-16 flex flex-col items-center gap-4 text-slate-500 cursor-pointer hover:border-gold/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={40} className="opacity-40" />
            <p className="text-sm">Aucun fichier · Cliquez pour téléverser</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredMedia.map((url, idx) => {
              const type = getFileType(url);
              const name = getFileName(url);
              const inSphere = isInSphere(url);
              return (
                <div
                  key={`${url}-${idx}`}
                  className="group relative bg-white/5 rounded-xl overflow-hidden transition-all cursor-move"
                  style={{
                    border: inSphere
                      ? '2px solid rgba(200,169,110,0.7)'
                      : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: inSphere ? '0 0 16px rgba(200,169,110,0.15)' : undefined,
                  }}
                  draggable
                  onDragStart={e => handleDragStart(e, url)}
                >
                  <div className="aspect-square bg-slate-800 flex items-center justify-center relative">
                    {type === 'image' ? (
                      <img src={url} alt={name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : type === 'video' ? (
                      <Video size={40} className="text-slate-600" />
                    ) : (
                      <FileText size={40} className="text-slate-600" />
                    )}

                    {/* Sphere badge — always visible when in sphere */}
                    {inSphere && (
                      <div style={{
                        position: 'absolute', top: 6, left: 6,
                        background: 'rgba(200,169,110,0.95)', borderRadius: 6,
                        padding: '2px 6px', fontSize: 9, fontWeight: 700,
                        color: '#080a18', letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                        Sphère ✓
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-midnight/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {/* Toggle sphere button */}
                      {type === 'image' && (
                        <button
                          onClick={() => toggleSphere(url)}
                          title={inSphere ? 'Retirer de la sphère' : 'Ajouter à la sphère'}
                          className="p-2 rounded-lg transition-colors"
                          style={{
                            background: inSphere ? 'rgba(200,169,110,0.9)' : 'rgba(200,169,110,0.15)',
                            border: '1px solid rgba(200,169,110,0.6)',
                            color: inSphere ? '#080a18' : '#C8A96E',
                          }}
                        >
                          <Globe size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(url)}
                        title="Copier l'URL"
                        className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
                      >
                        {copiedUrl === url ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(url)}
                        title="Supprimer"
                        className="p-2 bg-white/10 rounded-lg text-white hover:bg-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-white truncate mb-1">{name}</p>
                    <span className="text-[10px] text-slate-500 uppercase">{type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMedia;
