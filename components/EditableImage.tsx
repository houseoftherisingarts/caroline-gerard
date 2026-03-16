import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, UploadCloud, Library, X } from 'lucide-react';
import { useSiteContent } from '../contexts/SiteContentContext';
import { uploadMediaFile } from '../lib/storage';

interface EditableImageProps {
  contentKey: string;
  defaultValue: string;
  alt: string;
  className?: string;
}

const EditableImage = ({ contentKey, defaultValue, alt, className = '' }: EditableImageProps) => {
  const { content, isEditMode, updateContent, mediaLibrary } = useSiteContent();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const src = content[contentKey] ?? defaultValue;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadMediaFile(file);
    updateContent(contentKey, url);
    setIsUploading(false);
    setIsPickerOpen(false);
  };

  if (!isEditMode) return <img src={src} alt={alt} className={className} />;

  return (
    <>
      <div className="relative group cursor-pointer" onClick={() => setIsPickerOpen(true)}>
        <img src={src} alt={alt} className={className} />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[inherit]">
          <span className="bg-gold text-midnight px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
            <Camera size={16} /> Changer l&apos;image
          </span>
        </div>
      </div>

      {isPickerOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-serif text-white">Changer l&apos;image</h3>
              <button onClick={() => setIsPickerOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                <X />
              </button>
            </div>

            <label className="block w-full py-6 bg-gold/10 border-2 border-dashed border-gold/40 rounded-xl text-center cursor-pointer hover:bg-gold/20 transition-colors">
              <UploadCloud className="mx-auto mb-2 text-gold" size={32} />
              <span className="text-gold font-bold block">
                {isUploading ? 'Téléversement...' : 'Téléverser une image'}
              </span>
              <span className="text-slate-500 text-sm mt-1 block">JPG, PNG, WEBP</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
            </label>

            {mediaLibrary.length > 0 && (
              <div>
                <p className="text-slate-400 text-sm mb-3 flex items-center gap-2 font-bold uppercase tracking-widest">
                  <Library size={14} /> Médiathèque
                </p>
                <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {mediaLibrary.map((imgUrl, i) => (
                    <button
                      key={i}
                      className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-gold transition-all"
                      onClick={() => { updateContent(contentKey, imgUrl); setIsPickerOpen(false); }}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default EditableImage;
