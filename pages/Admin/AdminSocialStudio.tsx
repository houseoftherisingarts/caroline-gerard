import React, { useState, useRef, useEffect } from 'react';
import { Download, Image as ImageIcon, X, Plus, Move, Trash2, Square, Smartphone, Monitor, Sparkles, Loader2, Upload, Save } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Types & Constants ---

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  isBold: boolean;
  color: string;
}

interface Format {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

const FORMATS: Format[] = [
  { id: 'square', label: 'Carré (1:1)', width: 1080, height: 1080, icon: <Square className="w-4 h-4"/> },
  { id: 'portrait', label: 'Story (9:16)', width: 1080, height: 1920, icon: <Smartphone className="w-4 h-4"/> },
  { id: 'feed', label: 'Feed (4:5)', width: 1080, height: 1350, icon: <ImageIcon className="w-4 h-4"/> },
  { id: 'landscape', label: 'Paysage (16:9)', width: 1920, height: 1080, icon: <Monitor className="w-4 h-4"/> },
];

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1455390582262-044cdead2708?q=80&w=1973&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop',
];

// --- Component ---

const AdminSocialStudio = ({ mediaLibrary, setMediaLibrary }: { mediaLibrary: string[], setMediaLibrary: (lib: string[]) => void }) => {
  // State
  const [selectedFormat, setSelectedFormat] = useState<Format>(FORMATS[0]);
  const [bgImage, setBgImage] = useState("https://picsum.photos/1080/1080");
  const [isGrayscale, setIsGrayscale] = useState(true);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  // Nano Banana State (AI)
  const [isNanoOpen, setIsNanoOpen] = useState(false);
  const [nanoPrompt, setNanoPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [nanoRefImage, setNanoRefImage] = useState<File | null>(null);
  const [nanoRefPreview, setNanoRefPreview] = useState<string | null>(null);
  const nanoFileInputRef = useRef<HTMLInputElement>(null);

  // Text Layers
  const [layers, setLayers] = useState<TextLayer[]>([
    { id: '1', text: "Votre message inspirant", x: 540, y: 540, fontSize: 60, isBold: true, color: '#ffffff' },
    { id: '2', text: "@caroline", x: 540, y: 900, fontSize: 30, isBold: false, color: '#94a3b8' }
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('1');

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- LOGIC ---

  const addLayer = () => {
    const newLayer: TextLayer = {
      id: Date.now().toString(),
      text: "Nouveau texte",
      x: selectedFormat.width / 2,
      y: selectedFormat.height / 2,
      fontSize: 40,
      isBold: false,
      color: '#ffffff'
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const removeLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  // --- GEMINI GENERATION ---
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/png;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleNanoImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNanoRefImage(file);
      setNanoRefPreview(URL.createObjectURL(file));
    }
  };

  const handleNanoGenerate = async () => {
    if (!nanoPrompt && !nanoRefImage) return;
    setIsGenerating(true);

    try {
      // Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      
      // Add Image Part if exists
      if (nanoRefImage) {
        const base64Data = await fileToBase64(nanoRefImage);
        parts.push({
          inlineData: {
            mimeType: nanoRefImage.type,
            data: base64Data
          }
        });
      }

      // Add Text Part
      if (nanoPrompt) {
        parts.push({ text: nanoPrompt });
      }

      // Use the specified model for image generation
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
           // Note: imageConfig might not be fully supported on 2.5-flash-image in all environments yet, 
           // but we keep it as per prompt logic.
        }
      });

      let foundImage = false;
      // Iterate through parts to find the image
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64String = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64String}`;
            setBgImage(imageUrl);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
         // Fallback if no image returned
         console.warn("No image returned from Gemini, using fallback.");
         setBgImage(`https://picsum.photos/1080/1080?random=${Date.now()}`);
      }

      setIsNanoOpen(false);
      setNanoRefImage(null);
      setNanoRefPreview(null);
      setNanoPrompt('');
    } catch (error) {
      console.error("Gemini Generation Error", error);
      setBgImage(`https://picsum.photos/1080/1080?random=${Date.now()}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- DRAWING ---

  const generateCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load Image
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = bgImage;
    
    img.onload = () => {
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw BG
      ctx.save();
      if (isGrayscale) {
        ctx.filter = 'grayscale(100%) brightness(60%)'; // Darker for text readability
      } else {
        ctx.filter = 'brightness(70%)';
      }
      
      // Calculate "Cover" fit
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width / 2) - (img.width / 2) * scale;
      const y = (canvas.height / 2) - (img.height / 2) * scale;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      ctx.restore();

      // Draw Layers
      layers.forEach(layer => {
        ctx.save();
        ctx.font = `${layer.isBold ? 'bold' : 'normal'} ${layer.fontSize}px serif`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Shadow for readability
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Multiline wrapping logic
        const maxWidth = canvas.width * 0.8;
        const words = layer.text.split(' ');
        let line = '';
        const lines = [];
        
        for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        const lineHeight = layer.fontSize * 1.2;
        const startY = layer.y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((l, i) => {
          ctx.fillText(l, layer.x, startY + (i * lineHeight));
        });
        
        // Draw selection box if selected
        if (layer.id === selectedLayerId && !isDragging) {
           ctx.strokeStyle = "#fbbf24"; // Gold
           ctx.lineWidth = 2;
           ctx.shadowColor = "transparent";
           const totalHeight = lines.length * lineHeight;
           ctx.strokeRect(layer.x - maxWidth/2, layer.y - totalHeight/2 - 10, maxWidth, totalHeight + 20);
        }

        ctx.restore();
      });
    };
  };

  useEffect(() => {
    generateCanvas();
  }, [layers, bgImage, isGrayscale, selectedFormat, selectedLayerId]);


  // --- MOUSE HANDLERS ---

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoordinates(e);
    
    const clickedLayer = layers.find(layer => {
       const dx = coords.x - layer.x;
       const dy = coords.y - layer.y;
       return Math.abs(dx) < 300 && Math.abs(dy) < layer.fontSize * 2; 
    });

    if (clickedLayer) {
      setSelectedLayerId(clickedLayer.id);
      setIsDragging(true);
      setDragOffset({
        x: coords.x - clickedLayer.x,
        y: coords.y - clickedLayer.y
      });
    } else {
      setSelectedLayerId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !selectedLayerId) return;
    
    const coords = getCanvasCoordinates(e);
    updateLayer(selectedLayerId, {
      x: coords.x - dragOffset.x,
      y: coords.y - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        // Deselect before printing to remove the box
        const currentSelection = selectedLayerId;
        setSelectedLayerId(null);
        
        setTimeout(() => {
            const link = document.createElement('a');
            link.download = `caroline-social-${selectedFormat.id}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            setSelectedLayerId(currentSelection); 
        }, 50);
    }
  };

  const handleSaveToLibrary = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        const currentSelection = selectedLayerId;
        setSelectedLayerId(null);
        
        setTimeout(() => {
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            setMediaLibrary([dataUrl, ...mediaLibrary]);
            alert("Image sauvegardée dans la médiathèque !");
            setSelectedLayerId(currentSelection);
        }, 50);
    }
  };

  return (
    <div className="h-full animate-fade-in-up space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-serif font-bold text-white">Social Studio</h1>
            <p className="text-slate-400 mt-1">Générez des visuels de marque pour les réseaux sociaux.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls - Left Panel */}
        <div className="lg:col-span-1 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2">
          
          {/* Format Selector */}
          <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Format</h3>
             <div className="grid grid-cols-2 gap-3">
                {FORMATS.map(fmt => (
                   <button
                     key={fmt.id}
                     onClick={() => setSelectedFormat(fmt)}
                     className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${selectedFormat.id === fmt.id ? 'bg-gold text-midnight border-gold font-bold' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
                   >
                     {fmt.icon}
                     <span className="text-xs font-medium mt-2">{fmt.label}</span>
                   </button>
                ))}
             </div>
          </div>

          {/* Text Layers */}
          <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6 space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calques Texte</h3>
                <button onClick={addLayer} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white flex items-center gap-1 transition-colors border border-white/5">
                   <Plus className="w-3 h-3" /> Ajouter
                </button>
             </div>
             
             <div className="space-y-3">
                {layers.map((layer) => (
                   <div 
                      key={layer.id} 
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedLayerId === layer.id ? 'bg-white/10 border-gold/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                      onClick={() => setSelectedLayerId(layer.id)}
                   >
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">ID: {layer.id}</span>
                         <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} className="text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                         </button>
                      </div>
                      
                      {selectedLayerId === layer.id ? (
                        <div className="space-y-3">
                           <textarea 
                              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-gold/50 text-sm h-20 resize-none"
                              value={layer.text}
                              onChange={(e) => updateLayer(layer.id, { text: e.target.value })}
                           />
                           <div className="flex gap-2">
                              <input 
                                 type="number" 
                                 className="w-20 bg-black/20 border border-white/10 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-gold/50 text-xs"
                                 value={layer.fontSize}
                                 onChange={(e) => updateLayer(layer.id, { fontSize: parseInt(e.target.value) })}
                                 title="Taille Police"
                              />
                              <button 
                                 onClick={() => updateLayer(layer.id, { isBold: !layer.isBold })}
                                 className={`px-3 rounded-lg border flex items-center justify-center ${layer.isBold ? 'bg-white text-midnight border-white font-bold' : 'border-white/20 text-slate-400'}`}
                              >
                                 B
                              </button>
                              <input 
                                 type="color" 
                                 className="h-9 w-9 bg-transparent border-0 cursor-pointer rounded overflow-hidden"
                                 value={layer.color}
                                 onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                              />
                           </div>
                        </div>
                      ) : (
                         <p className="text-sm text-white truncate font-serif">{layer.text}</p>
                      )}
                   </div>
                ))}
             </div>
          </div>

          {/* Background */}
          <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Image de fond
            </h3>
            
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-sm text-slate-300 font-medium">Noir & Blanc</span>
                <button 
                  onClick={() => setIsGrayscale(!isGrayscale)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${isGrayscale ? 'bg-gold' : 'bg-slate-700'}`}
                >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-midnight rounded-full transition-transform ${isGrayscale ? 'translate-x-6' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => setBgImage(`https://picsum.photos/1080/1080?random=${Math.random()}`)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold border border-white/10 transition-colors"
                >
                    Aléatoire
                </button>
                <button 
                    onClick={() => setIsGalleryOpen(true)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold border border-white/10 transition-colors"
                >
                    Galerie
                </button>
                <button 
                    onClick={() => setIsNanoOpen(true)}
                    className="col-span-2 w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                >
                    <Sparkles className="w-4 h-4" /> Génération IA (Nano Banana)
                </button>
            </div>
          </div>

        </div>

        {/* Canvas - Right Panel */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center bg-midnight/40 rounded-2xl border border-white/5 p-8">
             <div ref={containerRef} className="relative rounded-sm overflow-hidden shadow-2xl border-8 border-white/5 bg-slate-900">
                <canvas 
                   ref={canvasRef}
                   width={selectedFormat.width}
                   height={selectedFormat.height}
                   className="max-h-[70vh] w-auto max-w-full cursor-move touch-none"
                   onMouseDown={handleMouseDown}
                   onMouseMove={handleMouseMove}
                   onMouseUp={handleMouseUp}
                   onMouseLeave={handleMouseUp}
                   onTouchStart={handleMouseDown}
                   onTouchMove={handleMouseMove}
                   onTouchEnd={handleMouseUp}
                />
             </div>
             
             <div className="flex gap-4 mt-8">
                <button onClick={handleDownload} className="bg-white text-midnight font-bold py-3 px-6 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg">
                   <Download className="w-4 h-4" /> Télécharger
                </button>
                <button onClick={handleSaveToLibrary} className="bg-gold text-midnight font-bold py-3 px-6 rounded-xl hover:bg-white transition-colors flex items-center gap-2 shadow-lg shadow-gold/20">
                   <Save className="w-4 h-4" /> Sauvegarder
                </button>
             </div>

             <p className="text-slate-500 text-sm mt-6 flex items-center gap-2">
                <Move className="w-4 h-4" /> Glissez les textes avec la souris pour les positionner
             </p>
        </div>

      </div>

      {/* GALLERY MODAL */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-midnight border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                 <h2 className="text-xl font-serif font-bold text-white">Sélectionner une image</h2>
                 <button onClick={() => setIsGalleryOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
              </div>
              <div className="p-6 overflow-y-auto grid grid-cols-3 md:grid-cols-4 gap-4 custom-scrollbar">
                  {[...mediaLibrary, ...DEFAULT_IMAGES].map((img, idx) => (
                    <button 
                      key={idx}
                      onClick={() => { setBgImage(img); setIsGalleryOpen(false); }}
                      className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-gold transition-all relative group"
                    >
                       <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold uppercase tracking-widest">
                          Utiliser
                       </div>
                    </button>
                  ))}
              </div>
           </div>
        </div>
      )}

      {/* NANO BANANA MODAL */}
      {isNanoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
           <div className="bg-midnight border border-purple-500/30 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.2)] w-full max-w-md">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                 <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400"/> Génération IA</h2>
                 <button onClick={() => setIsNanoOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
              </div>
              <div className="p-6 space-y-6">
                 
                 {/* Image Upload Area */}
                 <div 
                    onClick={() => nanoFileInputRef.current?.click()}
                    className={`
                        relative w-full h-40 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden group
                        ${nanoRefPreview ? 'border-purple-500/50 bg-slate-900' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}
                    `}
                 >
                    {nanoRefPreview ? (
                        <>
                            <img src={nanoRefPreview} alt="Reference" className="h-full w-full object-contain opacity-50" />
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNanoRefImage(null);
                                    setNanoRefPreview(null);
                                    if(nanoFileInputRef.current) nanoFileInputRef.current.value = '';
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-colors"
                                title="Retirer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center text-slate-500 group-hover:text-slate-300 transition-colors">
                            <Upload className="w-8 h-8 mb-3" />
                            <span className="text-xs font-bold uppercase tracking-widest">Image de référence (Optionnel)</span>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={nanoFileInputRef}
                        onChange={handleNanoImageSelect}
                        className="hidden" 
                        accept="image/*"
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-purple-500/50 text-sm h-32 resize-none" 
                        placeholder="Décrivez l'image de fond idéale..."
                        value={nanoPrompt}
                        onChange={(e) => setNanoPrompt(e.target.value)}
                    />
                 </div>

                 <button 
                    onClick={handleNanoGenerate}
                    disabled={isGenerating || (!nanoPrompt && !nanoRefImage)}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}
                    {isGenerating ? 'L\'IA travaille...' : 'Générer l\'image'}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default AdminSocialStudio;
