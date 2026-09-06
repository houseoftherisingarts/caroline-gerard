import React, { useState } from 'react';
import { AppEvent } from '../../types';
import { PenTool, Edit, Trash2, ArrowLeft, Save, UploadCloud, Library, X as XIcon } from 'lucide-react';
import BlockEditor from '../../components/BlockEditor';
import { uploadMediaFile } from '../../lib/storage';
import NewsletterSendModal from '../../components/NewsletterSendModal';
import { Precision, precisionOf, formatLong, MONTH_OPTIONS } from '../../lib/eventDate';

// --- Helpers ---
const getFirstImage = (image: string | undefined, content: string): string => {
  if (image) return image;
  try {
    const rows = JSON.parse(content || '[]');
    for (const row of rows) {
      for (const col of row.columns) {
        if (col.type === 'image' && col.value) return col.value;
      }
    }
  } catch {}
  return '';
};

// --- Reusable Components ---
const ImageUpload = ({ value, onUpload, mediaLibrary }: { value: string, onUpload: (url: string) => void, mediaLibrary: string[] }) => {
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setIsUploading(true);
        const url = await uploadMediaFile(file);
        onUpload(url);
        setIsUploading(false);
      }
    };
    return (
      <>
        <div className="w-full h-full bg-black/20 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center relative min-h-[150px]">
          {value && <img src={value} alt="Aperçu" className="w-full h-full object-cover rounded-lg absolute opacity-80" />}
          <div className="text-center z-10 p-4 bg-midnight/60 rounded-xl flex items-center gap-4">
            <div>
              <UploadCloud className="mx-auto text-slate-500 mb-1" />
              <label className="text-gold font-bold cursor-pointer hover:text-white text-sm">{isUploading ? 'Téléversement...' : 'Choisir un fichier'}<input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} /></label>
              <p className="text-xs text-slate-500 mt-1">ou glisser-déposer</p>
            </div>
            <div className="border-l border-white/10 h-16 mx-2"></div>
            <div>
              <Library className="mx-auto text-slate-500 mb-1" />
              <button onClick={() => setIsLibraryOpen(true)} className="text-gold font-bold cursor-pointer hover:text-white text-sm">Parcourir</button>
              <p className="text-xs text-slate-500 mt-1">la médiathèque</p>
            </div>
          </div>
        </div>
        {isLibraryOpen && (
            <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
                <div className="bg-midnight/80 border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-serif text-white">Sélectionner une image</h3><button onClick={() => setIsLibraryOpen(false)} className="p-2 text-slate-400 hover:text-white"><XIcon /></button></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2"><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{mediaLibrary.map((imgUrl, index) => (<div key={index} className="aspect-square rounded-lg overflow-hidden cursor-pointer group" onClick={() => { onUpload(imgUrl); setIsLibraryOpen(false); }}><img src={imgUrl} alt={`Media ${index}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>))}</div></div>
                </div>
            </div>
        )}
      </>
    );
};

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => (
  <button onClick={() => onChange(!checked)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none ${checked ? 'bg-gold' : 'bg-slate-700'}`}>
    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

// --- Main Component ---
const AdminEvents = ({ events, setEvents, mediaLibrary }: { events: AppEvent[], setEvents: (e: AppEvent[]) => void, mediaLibrary: string[] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<AppEvent> | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  // Précision de la date (jour exact, mois seul, année seule) et saisie mois/année en cours.
  const [precision, setPrecision] = useState<Precision>('day');
  const [ym, setYm] = useState({ y: '', m: '' });
  const [error, setError] = useState('');

  const openEditor = (event: AppEvent | null = null) => {
    const date = event?.date || '';
    setPrecision(date ? precisionOf(date) : 'day');
    setYm({ y: date.slice(0, 4), m: date.slice(5, 7) });
    setError('');
    if (event) {
      setCurrentEvent({ ...event, endDate: event.endDate || '' });
    } else {
      setCurrentEvent({ 
        title: '', 
        description: '', 
        date: '', 
        endDate: '',
        location: '', 
        image: '', 
        link: '', 
        isPublished: false, 
        content: '[]', 
        slug: '', 
        metaTitle: '', 
        metaDescription: '' 
      });
    }
    setActiveTab('content');
    setIsEditing(true);
  };

  const updateCurrentEvent = (data: Partial<AppEvent>) => {
      setError('');
      setCurrentEvent(prev => prev ? { ...prev, ...data } : null);
  }

  // Changer de précision garde ce qui peut l'être (le jour devient un mois, le mois une année); la fin ne survit qu'au jour exact.
  const changePrecision = (p: Precision) => {
    if (p === precision) return;
    const d = currentEvent?.date || '';
    const y = d.slice(0, 4), m = d.slice(5, 7);
    setPrecision(p);
    setYm({ y, m });
    const date = p === 'day' ? (d.length >= 10 ? d : '') : p === 'month' ? (y && m ? `${y}-${m}` : '') : y;
    updateCurrentEvent(p === 'day' ? { date } : { date, endDate: '' });
  };
  const changeYm = (next: { y: string; m: string }) => {
    setYm(next);
    const y = /^\d{4}$/.test(next.y) ? next.y : '';
    updateCurrentEvent({ date: precision === 'year' ? y : (y && next.m ? `${y}-${next.m}` : '') });
  };

  const executeSave = (evt: Partial<AppEvent> = currentEvent!) => {
    if (!evt) return;
    if (evt.id) {
      setEvents(events.map(e => e.id === evt.id ? evt as AppEvent : e));
    } else {
      const newEvent: AppEvent = { ...evt, id: `evt-${Date.now()}` } as AppEvent;
      setEvents([newEvent, ...events]);
    }
    setIsEditing(false);
    setShowNewsletterModal(false);
  };

  const handleSave = () => {
    if (!currentEvent) return;
    if (!currentEvent.title?.trim()) { setError('Un titre est requis.'); return; }
    if (!currentEvent.date) {
      setError(precision === 'month' ? 'Choisissez le mois et inscrivez l\'année à quatre chiffres.' : precision === 'year' ? 'Inscrivez l\'année à quatre chiffres.' : 'Choisissez la date de début.');
      return;
    }
    if (currentEvent.endDate && currentEvent.endDate < currentEvent.date) { setError('La date de fin doit venir après la date de début.'); return; }
    const wasPublished = currentEvent.id
      ? (events.find(e => e.id === currentEvent.id)?.isPublished ?? false)
      : false;
    const isFirstPublication = currentEvent.isPublished && !wasPublished;
    if (isFirstPublication) {
      setShowNewsletterModal(true);
      return;
    }
    executeSave();
  };

  const handleDelete = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const eventDefaultBody = (e: Partial<AppEvent>) => {
    const datePart = e.date ? formatLong({ date: e.date, endDate: e.endDate }) : '';
    const locationPart = e.location ? ` — ${e.location}` : '';
    return `${datePart}${locationPart}\n\n${e.description || ''}`.trim();
  };

  if (isEditing && currentEvent) {
    return (
      <>
      {showNewsletterModal && (
        <NewsletterSendModal
          type="event"
          defaultSubject={`Nouvel événement : ${currentEvent.title || ''}`}
          defaultTitle={currentEvent.title || ''}
          defaultBodyText={eventDefaultBody(currentEvent)}
          defaultImage={currentEvent.image || ''}
          mediaLibrary={mediaLibrary}
          onConfirm={() => executeSave()}
          onCancel={() => setShowNewsletterModal(false)}
        />
      )}
      <div className="animate-fade-in-up space-y-6">
        <div className="flex justify-between items-center">
          <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} /> Retour
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm ${currentEvent.isPublished ? 'text-green-400' : 'text-slate-400'}`}>
                {currentEvent.isPublished ? 'Publié' : 'Brouillon'}
              </span>
              <ToggleSwitch 
                checked={currentEvent.isPublished || false} 
                onChange={(isChecked) => updateCurrentEvent({ isPublished: isChecked })}
              />
            </div>
            <button onClick={handleSave} className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Save size={16} /> Enregistrer
            </button>
          </div>
        </div>
        {error && <p role="alert" className="text-red-400 text-sm font-bold text-right">{error}</p>}
        <div className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-full p-1 flex w-fit mx-auto">
            <button onClick={() => setActiveTab('content')} className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'content' ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}>✍️ Contenu</button>
            <button onClick={() => setActiveTab('seo')} className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'seo' ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}>🔍 SEO & Meta</button>
        </div>
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-8 space-y-6">
            {activeTab === 'content' && (
                <div className="space-y-6">
                    <div className="h-64"><ImageUpload value={currentEvent.image || ''} onUpload={(url) => updateCurrentEvent({ image: url })} mediaLibrary={mediaLibrary} /></div>
                    <input
                        type="text"
                        placeholder="Titre de l'événement"
                        value={currentEvent.title || ''} 
                        onChange={(e) => updateCurrentEvent({ title: e.target.value })} 
                        className="w-full bg-transparent text-4xl font-serif text-white focus:outline-none placeholder-slate-600 border-b border-white/10 py-2"
                    />
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quand</span>
                            <div role="group" aria-label="Précision de la date" className="bg-black/20 border border-white/10 rounded-full p-1 flex">
                                {([['day', 'Date exacte'], ['month', 'Mois seulement'], ['year', 'Année seulement']] as [Precision, string][]).map(([p, label]) => (
                                    <button key={p} type="button" aria-pressed={precision === p} onClick={() => changePrecision(p)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${precision === p ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}>{label}</button>
                                ))}
                            </div>
                        </div>
                        {precision === 'day' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="block"><span className="block text-xs text-slate-500 mb-1">Début</span>
                                    <input type="date" value={currentEvent.date || ''} onChange={(e) => updateCurrentEvent({ date: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" />
                                </label>
                                <label className="block"><span className="block text-xs text-slate-500 mb-1">Fin (facultatif, pour une période)</span>
                                    <input type="date" value={currentEvent.endDate || ''} min={currentEvent.date || undefined} onChange={(e) => updateCurrentEvent({ endDate: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" />
                                </label>
                            </div>
                        )}
                        {precision === 'month' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <select aria-label="Mois" value={ym.m} onChange={(e) => changeYm({ ...ym, m: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white">
                                    <option value="" className="text-slate-900">Mois</option>
                                    {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value} className="text-slate-900">{o.label}</option>)}
                                </select>
                                <input type="number" inputMode="numeric" aria-label="Année" placeholder="Année (ex. 2027)" min={2020} max={2100} value={ym.y} onChange={(e) => changeYm({ ...ym, y: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" />
                            </div>
                        )}
                        {precision === 'year' && (
                            <input type="number" inputMode="numeric" aria-label="Année" placeholder="Année (ex. 2027)" min={2020} max={2100} value={ym.y} onChange={(e) => changeYm({ ...ym, y: e.target.value })} className="w-full md:w-1/2 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        )}
                        {precision !== 'day' && (
                            <p className="text-xs text-slate-500">Sans jour précis, l'événement s'affiche au bas de la liste avec la mention « date à confirmer ».</p>
                        )}
                    </div>
                    <input type="text" placeholder="Lieu" value={currentEvent.location || ''} onChange={(e) => updateCurrentEvent({ location: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" />
                    <input type="text" placeholder="Lien (Billet/Infos)" value={currentEvent.link || ''} onChange={(e) => updateCurrentEvent({ link: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" />
                    <textarea 
                        placeholder="Description courte (pour l'aperçu)" 
                        value={currentEvent.description || ''} 
                        onChange={(e) => updateCurrentEvent({ description: e.target.value })} 
                        className="w-full bg-transparent text-slate-400 focus:outline-none placeholder-slate-600 resize-none" rows={2}
                    />
                    <BlockEditor 
                        value={currentEvent.content || '[]'} 
                        onChange={(newContent) => updateCurrentEvent({ content: newContent })} 
                        mediaLibrary={mediaLibrary} 
                    />
                </div>
            )}
            {activeTab === 'seo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">URL / Slug</label>
                            <div className="flex items-center bg-black/20 border border-white/10 rounded-lg">
                                <span className="px-3 text-slate-500 text-sm">/evenements/</span>
                                <input type="text" value={currentEvent.slug || ''} onChange={(e) => updateCurrentEvent({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="flex-1 bg-transparent p-2 text-white focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Titre (Meta Title)</label>
                            <input type="text" value={currentEvent.metaTitle || ''} onChange={(e) => updateCurrentEvent({ metaTitle: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Description (Meta Description)</label>
                            <textarea value={currentEvent.metaDescription || ''} onChange={(e) => updateCurrentEvent({ metaDescription: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none resize-none" rows={4}></textarea>
                        </div>
                    </div>
                    <div className="bg-black/20 border border-white/10 rounded-xl p-6">
                        <h4 className="text-sm font-bold text-slate-400 mb-2">Aperçu Google</h4>
                        <div className="bg-slate-900 p-4 rounded-lg">
                            <p className="text-blue-400 text-lg truncate">{currentEvent.metaTitle || currentEvent.title || 'Nouveau Titre'}</p>
                            <p className="text-green-400 text-sm truncate">https://caroline-gerard.com/evenements/{currentEvent.slug || 'nouveau-slug'}</p>
                            <p className="text-slate-400 text-sm mt-1 line-clamp-2">{currentEvent.metaDescription || currentEvent.description || 'Description de l\'événement...'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
      </>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Événements</h1>
          <p className="text-slate-400 mt-1">Gère tes apparitions publiques</p>
        </div>
        <button onClick={() => openEditor()} className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors flex items-center gap-2">
          <PenTool size={16} /> Ajouter un événement
        </button>
      </div>
      <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        {events.map((event, index) => (
          <div key={event.id} className={`p-6 flex flex-col md:flex-row gap-6 items-start md:items-center ${index !== events.length - 1 ? 'border-b border-white/5' : ''}`}>
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
              {getFirstImage(event.image, event.content) ? <img src={getFirstImage(event.image, event.content)} alt={event.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/20"></div>}
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-3 mb-1">
                <span className="text-gold text-xs font-bold uppercase tracking-wider">{formatLong(event, false)}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${event.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
                  {event.isPublished ? 'Publié' : 'Brouillon'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
              <p className="text-slate-400 text-sm line-clamp-2">{event.description}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEditor(event)} className="p-2 bg-white/5 rounded-lg text-white hover:bg-gold hover:text-midnight transition-colors">
                <Edit size={18} />
              </button>
              <button onClick={() => handleDelete(event.id)} className="p-2 bg-white/5 rounded-lg text-white hover:bg-red-500 hover:text-white transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="p-8 text-center text-slate-500 italic">Aucun événement pour le moment.</div>
        )}
      </div>
    </div>
  );
};

export default AdminEvents;
