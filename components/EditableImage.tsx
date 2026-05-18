import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, UploadCloud, Library, X, Crop, RotateCcw } from 'lucide-react';
import { useSiteContent } from '../contexts/SiteContentContext';
import { uploadMediaFile } from '../lib/storage';

interface EditableImageProps {
  contentKey: string;
  defaultValue: string;
  alt: string;
  className?: string;
}

const DEFAULT_FOCAL = '50% 50%';
const focalKey = (contentKey: string) => `${contentKey}__focal`;

const EditableImage = ({ contentKey, defaultValue, alt, className = '' }: EditableImageProps) => {
  const { content, isEditMode, updateContent, mediaLibrary } = useSiteContent();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isFocalOpen, setIsFocalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const src = content[contentKey] ?? defaultValue;
  const objectPosition = content[focalKey(contentKey)] ?? DEFAULT_FOCAL;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadMediaFile(file);
    updateContent(contentKey, url);
    setIsUploading(false);
    setIsPickerOpen(false);
  };

  if (!isEditMode) {
    return <img src={src} alt={alt} className={className} style={{ objectPosition }} />;
  }

  return (
    <>
      <div className="relative group">
        <img src={src} alt={alt} className={className} style={{ objectPosition }} />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-[inherit]">
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="bg-gold text-midnight px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-white transition-colors"
          >
            <Camera size={16} /> Changer l&apos;image
          </button>
          <button
            type="button"
            onClick={() => setIsFocalOpen(true)}
            className="bg-white/90 text-midnight px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-white transition-colors"
          >
            <Crop size={16} /> Recadrer
          </button>
        </div>
      </div>

      {isPickerOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-8 animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl p-5 md:p-6 space-y-5 md:space-y-6 max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-52 overflow-y-auto custom-scrollbar pr-1">
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

      {isFocalOpen && createPortal(
        <FocalPointEditor
          src={src}
          initial={objectPosition}
          containerClassName={className}
          onCancel={() => setIsFocalOpen(false)}
          onSave={(focal) => {
            updateContent(focalKey(contentKey), focal);
            setIsFocalOpen(false);
          }}
        />,
        document.body
      )}
    </>
  );
};

interface FocalPointEditorProps {
  src: string;
  initial: string;
  containerClassName: string;
  onCancel: () => void;
  onSave: (focal: string) => void;
}

const FocalPointEditor = ({ src, initial, containerClassName, onCancel, onSave }: FocalPointEditorProps) => {
  const [focal, setFocal] = useState(initial);
  const imgRef = useRef<HTMLImageElement>(null);
  const draggingRef = useRef(false);

  const parsed = parseFocal(focal);

  const updateFromEvent = (e: React.PointerEvent<HTMLImageElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const xPct = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPct = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
    setFocal(`${xPct.toFixed(1)}% ${yPct.toFixed(1)}%`);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!draggingRef.current) return;
    updateFromEvent(e);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLImageElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-8 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl p-5 md:p-6 space-y-5 max-h-[95vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-serif text-white flex items-center gap-2">
            <Crop size={18} className="text-gold" /> Recadrer l&apos;image
          </h3>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X />
          </button>
        </div>

        <p className="text-sm text-slate-400">
          Cliquez ou glissez sur l&apos;image pour choisir le point central.
          Cette zone restera visible quand l&apos;image est rognée.
        </p>

        <div className="relative inline-block w-full bg-black/40 rounded-xl overflow-hidden">
          <img
            ref={imgRef}
            src={src}
            alt=""
            className="max-h-[55vh] w-auto mx-auto block select-none touch-none cursor-crosshair"
            draggable={false}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${parsed.x}%`,
              top: `${parsed.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="w-10 h-10 border-2 border-gold rounded-full ring-4 ring-gold/30 shadow-lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-gold rounded-full" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">Aperçu</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-black/40">
              <img src={src} alt="" className="w-full h-full object-cover" style={{ objectPosition: focal }} />
            </div>
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-black/40">
              <img src={src} alt="" className="w-full h-full object-cover" style={{ objectPosition: focal }} />
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-2 font-mono">{focal}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            onClick={() => setFocal(DEFAULT_FOCAL)}
            className="px-4 py-2 text-slate-300 hover:text-white text-sm transition-colors flex items-center gap-2"
          >
            <RotateCcw size={14} /> Réinitialiser
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(focal)}
            className="bg-gold text-midnight px-6 py-2 rounded-xl font-bold text-sm hover:bg-white transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const parseFocal = (focal: string): { x: number; y: number } => {
  const parts = focal.trim().split(/\s+/);
  const x = parseFloat(parts[0]);
  const y = parseFloat(parts[1]);
  return {
    x: Number.isFinite(x) ? clamp(x, 0, 100) : 50,
    y: Number.isFinite(y) ? clamp(y, 0, 100) : 50,
  };
};

export default EditableImage;
