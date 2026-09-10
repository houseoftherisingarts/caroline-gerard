// L'atelier des actualités. Caroline écrit une nouvelle, met une photo, publie, et partage
// depuis la même page. Les nouvelles vivent dans la collection Firestore « news » et remontent
// toutes seules sur /actualites et sur l'accueil.
import React, { useState } from 'react';
import { ArrowLeft, Edit3, Library, Newspaper, Save, Trash2, UploadCloud, X } from 'lucide-react';
import { NewsItem } from '../../types';
import { deleteNewsItem, saveNewsItem, slugifyNews } from '../../lib/firestore';
import { uploadMediaFile } from '../../lib/storage';
import { formatLong } from '../../lib/eventDate';
import { publishedNews, resume, sortNews } from '../ActualitesPage';
import PartageBoutons from '../../components/PartageBoutons';

const SITE = 'https://carolinegerard.ca';

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none ${checked ? 'bg-gold' : 'bg-slate-700'}`}
  >
    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const ChoixPhoto = ({ value, onChange, mediaLibrary }: { value: string; onChange: (url: string) => void; mediaLibrary: string[] }) => {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    onChange(await uploadMediaFile(file));
    setUploading(false);
  };

  return (
    <>
      <div className="w-full h-56 bg-black/20 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden">
        {value && <img src={value} alt="Aperçu" className="w-full h-full object-cover absolute inset-0 opacity-80" />}
        <div className="text-center z-10 p-4 bg-midnight/70 rounded-xl flex items-center gap-4">
          <div>
            <UploadCloud className="mx-auto text-slate-500 mb-1" />
            <label className="text-gold font-bold cursor-pointer hover:text-white text-sm">
              {uploading ? 'Téléversement…' : 'Choisir une photo'}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
          </div>
          <div className="border-l border-white/10 h-16 mx-2" />
          <div>
            <Library className="mx-auto text-slate-500 mb-1" />
            <button type="button" onClick={() => setLibraryOpen(true)} className="text-gold font-bold hover:text-white text-sm">Parcourir</button>
            <p className="text-xs text-slate-500 mt-1">la médiathèque</p>
          </div>
        </div>
      </div>

      {libraryOpen && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="bg-midnight/90 border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-serif text-white">Choisir une photo</h3>
              <button type="button" onClick={() => setLibraryOpen(false)} className="p-2 text-slate-400 hover:text-white"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mediaLibrary.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onChange(url); setLibraryOpen(false); }}
                    className="aspect-square rounded-lg overflow-hidden group"
                  >
                    <img src={url} alt={`Média ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const vide = (): Partial<NewsItem> => ({
  title: '', body: '', image: '', link: '', linkLabel: '',
  isPublished: false, date: new Date().toLocaleDateString('fr-CA'),
});

const AdminActualites = ({ news, mediaLibrary }: { news: NewsItem[]; mediaLibrary: string[] }) => {
  const [courante, setCourante] = useState<Partial<NewsItem> | null>(null);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  const handleSave = () => {
    if (!courante) return;
    const titre = (courante.title || '').trim();
    if (!titre) return;
    // Une adresse déjà publiée ne bouge plus : les liens partagés continuent de fonctionner.
    const slug = courante.slug || slugifyNews(titre, news.map(n => n.slug));
    const item: NewsItem = {
      id: courante.id || `news-${Date.now()}`,
      slug,
      title: titre,
      body: (courante.body || '').trim(),
      image: courante.image || '',
      date: courante.date || new Date().toLocaleDateString('fr-CA'),
      link: (courante.link || '').trim() || undefined,
      linkLabel: (courante.linkLabel || '').trim() || undefined,
      isPublished: !!courante.isPublished,
      createdAt: courante.createdAt || new Date().toISOString(),
    };
    saveNewsItem(item);
    setCourante(null);
  };

  if (courante) {
    const apercuUrl = courante.slug ? `${SITE}/actualites/${courante.slug}` : '';
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <button onClick={() => setCourante(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} /> Retour
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm ${courante.isPublished ? 'text-green-400' : 'text-slate-400'}`}>
                {courante.isPublished ? 'En ligne' : 'Brouillon'}
              </span>
              <ToggleSwitch checked={!!courante.isPublished} onChange={v => setCourante({ ...courante, isPublished: v })} />
            </div>
            <button
              onClick={handleSave}
              disabled={!(courante.title || '').trim()}
              className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-white transition-colors disabled:opacity-40"
            >
              <Save size={16} /> Enregistrer
            </button>
          </div>
        </div>

        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6 md:p-8 space-y-6">
          <ChoixPhoto value={courante.image || ''} onChange={url => setCourante({ ...courante, image: url })} mediaLibrary={mediaLibrary} />

          <input
            type="text"
            placeholder="Titre de la nouvelle"
            value={courante.title || ''}
            onChange={e => setCourante({ ...courante, title: e.target.value })}
            className="w-full bg-transparent text-3xl md:text-4xl font-serif text-white focus:outline-none placeholder-slate-600"
          />

          <textarea
            placeholder="Racontez la nouvelle en quelques lignes."
            value={courante.body || ''}
            onChange={e => setCourante({ ...courante, body: e.target.value })}
            rows={8}
            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-gold/50 placeholder-slate-600 resize-y"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
              <input
                type="date"
                value={courante.date || ''}
                onChange={e => setCourante({ ...courante, date: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Lien (facultatif)</label>
              <input
                type="text"
                placeholder="/boutique ou https://…"
                value={courante.link || ''}
                onChange={e => setCourante({ ...courante, link: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-gold/50 placeholder-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Texte du bouton</label>
              <input
                type="text"
                placeholder="Réserver ma place"
                value={courante.linkLabel || ''}
                onChange={e => setCourante({ ...courante, linkLabel: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-gold/50 placeholder-slate-600"
              />
            </div>
          </div>

          {apercuUrl && (
            <div className="border-t border-white/10 pt-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Adresse de cette nouvelle</p>
              <p className="text-gold text-sm break-all mb-4">{apercuUrl}</p>
              {courante.isPublished && (
                <PartageBoutons url={apercuUrl} title={courante.title || ''} text={resume(courante.body || '')} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const liste = sortNews(news);
  const enLigne = publishedNews(news).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Actualités</h1>
          <p className="text-slate-400 mt-1">
            {enLigne === 0
              ? 'Écrivez une première nouvelle, elle apparaîtra sur l’accueil et sur la page Actualités.'
              : `${enLigne} ${enLigne === 1 ? 'nouvelle en ligne' : 'nouvelles en ligne'}, la plus récente d’abord.`}
          </p>
        </div>
        <button
          onClick={() => setCourante(vide())}
          className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors flex items-center gap-2"
        >
          <Newspaper size={16} /> Écrire une nouvelle
        </button>
      </div>

      <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        {liste.map((item, i) => (
          <div key={item.id} className={`p-6 flex flex-col lg:flex-row gap-6 items-start lg:items-center ${i !== liste.length - 1 ? 'border-b border-white/5' : ''}`}>
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
              {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/20" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-gold text-xs font-bold uppercase tracking-wider">{formatLong({ date: item.date }, false)}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${item.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
                  {item.isPublished ? 'En ligne' : 'Brouillon'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm mb-3">{resume(item.body, 140)}</p>
              {item.isPublished && (
                <PartageBoutons url={`${SITE}/actualites/${item.slug}`} title={item.title} text={resume(item.body)} />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCourante({ ...item })} className="p-2 bg-white/5 rounded-lg text-white hover:bg-gold hover:text-midnight transition-colors" title="Modifier">
                <Edit3 size={18} />
              </button>
              {aSupprimer === item.id ? (
                <>
                  <button onClick={() => { deleteNewsItem(item.id); setASupprimer(null); }} className="px-3 py-2 bg-red-500 rounded-lg text-white text-xs font-bold">
                    Supprimer
                  </button>
                  <button onClick={() => setASupprimer(null)} className="px-3 py-2 bg-white/5 rounded-lg text-slate-300 text-xs font-bold">
                    Annuler
                  </button>
                </>
              ) : (
                <button onClick={() => setASupprimer(item.id)} className="p-2 bg-white/5 rounded-lg text-white hover:bg-red-500 transition-colors" title="Supprimer">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
        {liste.length === 0 && (
          <div className="p-8 text-center text-slate-500 italic">Aucune nouvelle pour le moment.</div>
        )}
      </div>
    </div>
  );
};

export default AdminActualites;
