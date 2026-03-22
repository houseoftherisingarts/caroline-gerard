import React, { useRef, useState } from 'react';
import { Plus, Search, Video, FileText, Trash2, Upload, User, Loader2, Copy, Check } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';

interface AdminMediaProps {
  profileImage: string;
  setProfileImage: (url: string) => void;
  mediaLibrary: string[];
  setMediaLibrary: (lib: string[]) => void;
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

const AdminMedia = ({ profileImage, setProfileImage, mediaLibrary, setMediaLibrary }: AdminMediaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');

  // Profile image drag-and-drop
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

  // Upload to Firebase Storage
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

  // Delete from library (and attempt Storage deletion)
  const handleDelete = async (url: string) => {
    setMediaLibrary(mediaLibrary.filter(u => u !== url));
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch {
      // Ignore — external URLs (Unsplash, GCS direct links) can't be deleted this way
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(''), 2000);
  };

  const filteredMedia = mediaLibrary.filter(url => {
    const type = getFileType(url);
    const name = getFileName(url);
    const matchesFilter = filter === 'all' || type === filter;
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Médiathèque</h1>
          <p className="text-slate-400 mt-1">Gérez vos images, vidéos et documents</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
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

      {/* Profile Picture Slot */}
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

      {/* Gallery */}
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
              return (
                <div
                  key={`${url}-${idx}`}
                  className="group relative bg-white/5 rounded-xl border border-white/5 overflow-hidden hover:border-gold/30 transition-all cursor-move"
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
                    <div className="absolute inset-0 bg-midnight/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleCopy(url)}
                        title="Copier l'URL"
                        className="p-2 bg-white/10 rounded-lg text-white hover:bg-gold hover:text-midnight transition-colors"
                      >
                        {copiedUrl === url ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(url)}
                        title="Supprimer"
                        className="p-2 bg-white/10 rounded-lg text-white hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <Trash2 size={18} />
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
