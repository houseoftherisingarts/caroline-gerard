// L'import Facebook : Caroline choisit le dossier que Facebook lui a remis (« Télécharger vos
// informations », format JSON, déjà décompressé), coche les publications qu'elle veut garder, et
// chacune devient un brouillon d'actualité avec son texte, sa date et ses photos. Rien ne se
// publie tout seul : elle relit chaque brouillon et le met en ligne depuis la liste.
import React, { useEffect, useMemo, useState } from 'react';
import { Download, FolderOpen, X } from 'lucide-react';
import { NewsItem } from '../../types';
import { saveNewsItem, slugifyNews } from '../../lib/firestore';
import { uploadMediaFile } from '../../lib/storage';
import { formatLong } from '../../lib/eventDate';
import { lirePublications, titreDepuis, PublicationFacebook } from '../../lib/facebook';
import { resume } from '../ActualitesPage';

type Props = {
  news: NewsItem[];
  onClose: () => void;
  /** Les deux portes vers Firebase, remplaçables sur le banc d'essai. */
  enregistrer?: (item: NewsItem) => Promise<unknown>;
  televerser?: (f: File) => Promise<string>;
};

const ImportFacebook = ({ news, onClose, enregistrer = saveNewsItem, televerser = uploadMediaFile }: Props) => {
  const [publications, setPublications] = useState<PublicationFacebook[] | null>(null);
  const [choisies, setChoisies] = useState<Set<string>>(new Set());
  const [lecture, setLecture] = useState(false);
  const [progres, setProgres] = useState<{ fait: number; total: number } | null>(null);
  const [fini, setFini] = useState<number | null>(null);
  const [erreur, setErreur] = useState('');

  const dejaLa = useMemo(() => new Set(news.map(n => n.source).filter(Boolean)), [news]);
  const apercus = useMemo(
    () => new Map((publications || []).filter(p => p.photos[0]).map(p => [p.id, URL.createObjectURL(p.photos[0])])),
    [publications],
  );
  useEffect(() => () => apercus.forEach(url => URL.revokeObjectURL(url)), [apercus]);

  const lire = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichiers = e.target.files ? Array.from(e.target.files) : [];
    if (!fichiers.length) return;
    setLecture(true);
    setErreur('');
    try {
      const pubs = await lirePublications(fichiers);
      setPublications(pubs);
      setChoisies(new Set(pubs.filter(p => !dejaLa.has(p.id)).map(p => p.id)));
      if (!pubs.length) setErreur("Aucune publication trouvée dans ce dossier. Vérifie que tu as demandé le format JSON à Facebook et que tu as choisi le dossier décompressé.");
    } catch {
      setErreur("Le dossier n'a pas pu être lu. Réessaie en choisissant le dossier principal de ta copie Facebook.");
    }
    setLecture(false);
  };

  const basculer = (id: string) => setChoisies(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const importer = async () => {
    const liste = (publications || []).filter(p => choisies.has(p.id));
    if (!liste.length) return;
    const slugs = news.map(n => n.slug);
    let fait = 0;
    setProgres({ fait, total: liste.length });
    setErreur('');
    try {
      for (const p of liste) {
        const urls: string[] = [];
        for (const photo of p.photos) urls.push(await televerser(photo));
        const titre = titreDepuis(p.texte, formatLong({ date: p.date }, false));
        const slug = slugifyNews(titre, slugs);
        slugs.push(slug);
        await enregistrer({
          id: `news-${Date.now()}-${fait}`,
          slug,
          title: titre,
          body: p.texte,
          image: urls[0] || '',
          images: urls.slice(1),
          date: p.date,
          link: p.lien,
          linkLabel: p.lien ? 'Voir le lien' : undefined,
          isPublished: false,
          createdAt: new Date().toISOString(),
          source: p.id,
        });
        fait++;
        setProgres({ fait, total: liste.length });
      }
      setFini(fait);
    } catch (e) {
      console.error('Import Facebook interrompu', e);
      setErreur(`L'import s'est arrêté après ${fait} ${fait === 1 ? 'brouillon' : 'brouillons'}. Ceux-là sont bien enregistrés; réessaie dans un instant pour la suite.`);
      setProgres(null);
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Importer de Facebook</h1>
          <p className="text-slate-400 mt-1">Tes publications Facebook deviennent des brouillons d'actualités, texte, date et photos compris.</p>
        </div>
        <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <X size={18} /> Fermer
        </button>
      </div>

      {fini !== null ? (
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-gold/30 p-6 md:p-8 space-y-4">
          <p className="text-white text-lg">
            {fini === 0 ? 'Aucun brouillon créé.' : `${fini} ${fini === 1 ? 'brouillon créé' : 'brouillons créés'}.`}
          </p>
          <p className="text-slate-400 text-sm">Ils t'attendent dans la liste des actualités, marqués Brouillon : relis chacun, ajuste le titre si tu veux, puis mets-le en ligne.</p>
          <button onClick={onClose} className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors">Voir mes actualités</button>
        </div>
      ) : (
        <>
          <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6 md:p-8 space-y-5">
            <ol className="space-y-3 text-slate-300 text-sm leading-relaxed list-decimal pl-5">
              <li>Sur Facebook, dans tes paramètres, ouvre <span className="text-white">Télécharger vos informations</span> et demande une copie de tes <span className="text-white">publications</span>, au format <span className="text-white">JSON</span>, avec la qualité des photos la plus élevée.</li>
              <li>Facebook te prévient quand la copie est prête. Télécharge le fichier, puis double-clique dessus pour l'ouvrir : un dossier apparaît à côté.</li>
              <li>Choisis ce dossier ici, coche les publications à garder, et laisse-moi faire le reste.</li>
            </ol>
            <label className={`inline-flex items-center gap-2 bg-gold text-midnight px-4 py-2 rounded-lg font-bold cursor-pointer hover:bg-white transition-colors ${lecture ? 'opacity-60 pointer-events-none' : ''}`}>
              <FolderOpen size={16} /> {lecture ? 'Lecture du dossier…' : publications ? 'Choisir un autre dossier' : 'Choisir le dossier Facebook'}
              <input type="file" multiple onChange={lire} className="hidden" disabled={lecture} {...({ webkitdirectory: '' } as Record<string, string>)} />
            </label>
            {erreur && <p role="alert" className="bg-red-500/15 border border-red-400/40 text-red-200 rounded-xl px-4 py-3 text-sm">{erreur}</p>}
          </div>

          {publications && publications.length > 0 && (
            <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <p className="text-slate-300 text-sm">
                  {publications.length} {publications.length === 1 ? 'publication trouvée' : 'publications trouvées'}, {choisies.size} {choisies.size === 1 ? 'cochée' : 'cochées'}.
                  {' '}
                  <button type="button" onClick={() => setChoisies(new Set(publications.map(p => p.id)))} className="text-gold hover:text-white">Tout cocher</button>
                  {' · '}
                  <button type="button" onClick={() => setChoisies(new Set())} className="text-gold hover:text-white">Tout décocher</button>
                </p>
                <button
                  onClick={importer}
                  disabled={!choisies.size || !!progres}
                  className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-white transition-colors disabled:opacity-40"
                >
                  <Download size={16} />
                  {progres ? `Brouillon ${Math.min(progres.fait + 1, progres.total)} sur ${progres.total}…` : `Créer ${choisies.size} ${choisies.size === 1 ? 'brouillon' : 'brouillons'}`}
                </button>
              </div>
              {publications.map((p, i) => {
                const deja = dejaLa.has(p.id);
                return (
                  <label key={p.id} className={`p-4 md:p-6 flex gap-4 items-start cursor-pointer hover:bg-white/5 ${i !== publications.length - 1 ? 'border-b border-white/5' : ''} ${deja ? 'opacity-50' : ''}`}>
                    <input type="checkbox" checked={choisies.has(p.id)} onChange={() => basculer(p.id)} disabled={!!progres} className="mt-1 accent-gold w-4 h-4 flex-shrink-0" />
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      {apercus.get(p.id) ? <img src={apercus.get(p.id)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                        <span className="text-gold text-xs font-bold uppercase tracking-wider">{formatLong({ date: p.date }, false)}</span>
                        <span className="text-slate-500 text-xs">{p.photos.length} {p.photos.length === 1 ? 'photo' : 'photos'}{p.manquantes ? `, ${p.manquantes} absente${p.manquantes > 1 ? 's' : ''} du dossier` : ''}{p.lien ? ', un lien' : ''}</span>
                        {deja && <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-600/50 text-slate-300">Déjà importée</span>}
                      </div>
                      <h3 className="text-white font-bold mb-1">{titreDepuis(p.texte, formatLong({ date: p.date }, false))}</h3>
                      <p className="text-slate-400 text-sm">{resume(p.texte, 160)}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImportFacebook;
