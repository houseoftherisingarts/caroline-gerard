import React, { useState } from 'react';
import { Conference } from '../../types';
import { PenTool, Edit3, Trash2, ArrowLeft, Save } from 'lucide-react';
import BlockEditor from '../../components/BlockEditor';

// --- Reusable Components from Blog Editor ---
const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => (
  <button onClick={() => onChange(!checked)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none ${checked ? 'bg-gold' : 'bg-slate-700'}`}>
    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

// --- Main Component ---
const AdminConferences = ({ conferences, setConferences, mediaLibrary }: { conferences: Conference[], setConferences: (c: Conference[]) => void, mediaLibrary: string[] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentConference, setCurrentConference] = useState<Partial<Conference> | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');

  const openEditor = (conference: Conference | null = null) => {
    if (conference) {
      setCurrentConference({ ...conference });
    } else {
      setCurrentConference({ 
        title: '', 
        description: '', 
        image: '', 
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

  const updateCurrentConference = (data: Partial<Conference>) => {
      setCurrentConference(prev => prev ? { ...prev, ...data } : null);
  }

  const handleSave = () => {
    if (!currentConference) return;

    if (currentConference.id) {
      setConferences(conferences.map(c => c.id === currentConference.id ? currentConference as Conference : c));
    } else {
      const newConference: Conference = { ...currentConference, id: `conf-${Date.now()}` } as Conference;
      setConferences([newConference, ...conferences]);
    }
    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    setConferences(conferences.filter(c => c.id !== id));
  };

  if (isEditing && currentConference) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="flex justify-between items-center">
          <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} /> Retour
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm ${currentConference.isPublished ? 'text-green-400' : 'text-slate-400'}`}>
                {currentConference.isPublished ? 'Publiée' : 'Brouillon'}
              </span>
              <ToggleSwitch 
                checked={currentConference.isPublished || false} 
                onChange={(isChecked) => updateCurrentConference({ isPublished: isChecked })}
              />
            </div>
            <button onClick={handleSave} className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Save size={16} /> Enregistrer
            </button>
          </div>
        </div>
        <div className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-full p-1 flex w-fit mx-auto">
            <button onClick={() => setActiveTab('content')} className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'content' ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}>✍️ Contenu</button>
            <button onClick={() => setActiveTab('seo')} className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'seo' ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}>🔍 SEO & Meta</button>
        </div>
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-8 space-y-6">
            {activeTab === 'content' && (
                <div className="space-y-6">
                    <input 
                        type="text" 
                        placeholder="Titre de la conférence" 
                        value={currentConference.title || ''} 
                        onChange={(e) => updateCurrentConference({ title: e.target.value })} 
                        className="w-full bg-transparent text-4xl font-serif text-white focus:outline-none placeholder-slate-600 border-b border-white/10 py-2"
                    />
                    <textarea 
                        placeholder="Description courte (pour l'aperçu)" 
                        value={currentConference.description || ''} 
                        onChange={(e) => updateCurrentConference({ description: e.target.value })} 
                        className="w-full bg-transparent text-slate-400 focus:outline-none placeholder-slate-600 resize-none" rows={2}
                    />
                    <BlockEditor 
                        value={currentConference.content || '[]'} 
                        onChange={(newContent) => updateCurrentConference({ content: newContent })} 
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
                                <span className="px-3 text-slate-500 text-sm">/conferences/</span>
                                <input type="text" value={currentConference.slug || ''} onChange={(e) => updateCurrentConference({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="flex-1 bg-transparent p-2 text-white focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Titre (Meta Title)</label>
                            <input type="text" value={currentConference.metaTitle || ''} onChange={(e) => updateCurrentConference({ metaTitle: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Description (Meta Description)</label>
                            <textarea value={currentConference.metaDescription || ''} onChange={(e) => updateCurrentConference({ metaDescription: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none resize-none" rows={4}></textarea>
                        </div>
                    </div>
                    <div className="bg-black/20 border border-white/10 rounded-xl p-6">
                        <h4 className="text-sm font-bold text-slate-400 mb-2">Aperçu Google</h4>
                        <div className="bg-slate-900 p-4 rounded-lg">
                            <p className="text-blue-400 text-lg truncate">{currentConference.metaTitle || currentConference.title || 'Nouveau Titre'}</p>
                            <p className="text-green-400 text-sm truncate">https://caroline-gerard.com/conferences/{currentConference.slug || 'nouveau-slug'}</p>
                            <p className="text-slate-400 text-sm mt-1 line-clamp-2">{currentConference.metaDescription || currentConference.description || 'Description de la conférence...'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Conférences & Ateliers</h1>
          <p className="text-slate-400 mt-1">Gérez vos prochains événements</p>
        </div>
        <button onClick={() => openEditor()} className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors flex items-center gap-2">
          <PenTool size={16} /> Ajouter une conférence
        </button>
      </div>
      <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        {conferences.map((conf, index) => (
          <div key={conf.id} className={`p-6 flex flex-col md:flex-row gap-6 items-start md:items-center ${index !== conferences.length - 1 ? 'border-b border-white/5' : ''}`}>
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
              {conf.image ? <img src={conf.image} alt={conf.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/20"></div>}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${conf.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
                  {conf.isPublished ? 'Publiée' : 'Brouillon'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{conf.title}</h3>
              <p className="text-slate-400 text-sm line-clamp-2">{conf.description}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEditor(conf)} className="p-2 bg-white/5 rounded-lg text-white hover:bg-gold hover:text-midnight transition-colors">
                <Edit3 size={18} />
              </button>
              <button onClick={() => handleDelete(conf.id)} className="p-2 bg-white/5 rounded-lg text-white hover:bg-red-500 hover:text-white transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {conferences.length === 0 && (
          <div className="p-8 text-center text-slate-500 italic">Aucune conférence pour le moment.</div>
        )}
      </div>
    </div>
  );
};

export default AdminConferences;
