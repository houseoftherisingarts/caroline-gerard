// Le fil d'actualités de Caroline. La page /actualites montre le fil complet, et chaque nouvelle
// possède sa propre adresse /actualites/<slug> pour que le lien partagé sur Facebook affiche la
// bonne photo et le bon titre (les balises sont posées par la fonction ogActualite à la livraison).
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Calendar, Newspaper } from 'lucide-react';
import { NewsItem } from '../types';
import { thumb } from '../lib/img';
import { formatLong } from '../lib/eventDate';
import EditableText from '../components/EditableText';
import PartageBoutons from '../components/PartageBoutons';

const SITE = 'https://carolinegerard.ca';

export const sortNews = (items: NewsItem[]): NewsItem[] =>
  [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '')
    || (b.createdAt || '').localeCompare(a.createdAt || ''));

export const publishedNews = (items: NewsItem[]): NewsItem[] =>
  sortNews(items.filter(n => n.isPublished));

const dateLabel = (item: NewsItem) => formatLong({ date: item.date }, false);

/** Extrait de quelques lignes, pour les cartes et pour la description de partage. */
export const resume = (body: string, max = 180): string => {
  const plat = (body || '').replace(/\s+/g, ' ').trim();
  return plat.length <= max ? plat : `${plat.slice(0, max - 1).trimEnd()}…`;
};

const LienNouvelle = ({ item }: { item: NewsItem }) => {
  if (!item.link) return null;
  const externe = /^https?:\/\//i.test(item.link) && !item.link.startsWith(SITE);
  const label = item.linkLabel?.trim() || 'En savoir plus';
  const classe = 'inline-flex items-center gap-2 text-gold font-bold uppercase tracking-wider text-xs hover:text-white transition-colors';
  return externe
    ? <a href={item.link} target="_blank" rel="noopener noreferrer" className={classe}>{label} <ArrowUpRight className="w-3.5 h-3.5" /></a>
    : <Link to={item.link} className={classe}>{label} <ArrowUpRight className="w-3.5 h-3.5" /></Link>;
};

// ── Une nouvelle, en pleine page ────────────────────────────────────────────
const NouvelleSeule = ({ item }: { item: NewsItem }) => {
  const url = `${SITE}/actualites/${item.slug}`;
  const description = resume(item.body);

  return (
    <>
      <Helmet>
        <title>{`${item.title} | Caroline Gérard`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_CA" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={item.title} />
        <meta property="og:description" content={description} />
        {item.image && <meta property="og:image" content={item.image} />}
        <meta name="twitter:card" content={item.image ? 'summary_large_image' : 'summary'} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: item.title,
          datePublished: item.date,
          image: item.image || undefined,
          description,
          inLanguage: 'fr-CA',
          mainEntityOfPage: url,
          author: { '@type': 'Person', name: 'Caroline Gérard' },
          publisher: { '@type': 'Organization', name: 'Caroline Gérard' },
        })}</script>
      </Helmet>

      <div className="min-h-screen pt-24 md:pt-36 pb-20 w-full px-4 md:px-16">
        <div className="w-full max-w-5xl mx-auto">
          <Link to="/actualites" className="inline-flex items-center gap-2 text-slate-400 hover:text-gold transition-colors text-xs font-bold uppercase tracking-widest mb-8">
            <ArrowLeft size={14} /> Toutes les actualités
          </Link>

          {item.image && (
            <div className="w-full h-[32vh] md:h-[52vh] rounded-2xl overflow-hidden mb-8 bg-slate-800">
              <img src={thumb(item.image, 1600)} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gold mb-4">
            <Calendar size={14} /> {dateLabel(item)}
          </div>

          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl text-white mb-8 leading-tight">{item.title}</h1>

          <p className="text-slate-300 text-base md:text-lg leading-relaxed whitespace-pre-line mb-8">{item.body}</p>

          <LienNouvelle item={item} />

          <div className="border-t border-white/10 mt-10 pt-6 flex flex-wrap items-center gap-4">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Partager</span>
            <PartageBoutons url={url} title={item.title} text={description} />
          </div>
        </div>
      </div>
    </>
  );
};

// ── Le fil ──────────────────────────────────────────────────────────────────
const CarteLarge = ({ item }: { item: NewsItem }) => (
  <article className="grid md:grid-cols-12 gap-6 md:gap-10 items-center bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-gold/30 transition-all overflow-hidden group">
    <Link to={`/actualites/${item.slug}`} className="md:col-span-7 block h-56 md:h-[26rem] overflow-hidden bg-slate-800">
      {item.image && (
        <img src={thumb(item.image, 1200)} alt={item.title}
             className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
      )}
    </Link>
    <div className="md:col-span-5 p-6 md:pr-10 md:py-10">
      <div className="flex items-center gap-2 text-xs font-bold text-gold mb-4">
        <Calendar className="w-3 h-3" /> {dateLabel(item)}
      </div>
      <h2 className="font-serif text-2xl md:text-4xl text-white mb-4 leading-tight">
        <Link to={`/actualites/${item.slug}`} className="hover:text-gold transition-colors">{item.title}</Link>
      </h2>
      <p className="text-slate-400 leading-relaxed mb-6">{resume(item.body, 260)}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link to={`/actualites/${item.slug}`} className="text-gold font-bold uppercase tracking-wider text-xs hover:text-white transition-colors">
          Lire la suite
        </Link>
        <PartageBoutons url={`${SITE}/actualites/${item.slug}`} title={item.title} text={resume(item.body)} />
      </div>
    </div>
  </article>
);

const Carte = ({ item }: { item: NewsItem }) => (
  <article className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-gold/30 transition-all group flex flex-col">
    <Link to={`/actualites/${item.slug}`} className="h-52 overflow-hidden relative bg-slate-800 block">
      {item.image && (
        <img src={thumb(item.image, 800)} alt={item.title}
             className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 to-transparent" />
      <span className="absolute bottom-4 left-4 flex items-center gap-2 text-xs font-bold text-white/80">
        <Calendar className="w-3 h-3 text-gold" /> {dateLabel(item)}
      </span>
    </Link>
    <div className="p-6 flex-1 flex flex-col">
      <h2 className="text-xl font-serif text-white mb-3 leading-snug">
        <Link to={`/actualites/${item.slug}`} className="hover:text-gold transition-colors">{item.title}</Link>
      </h2>
      <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">{resume(item.body)}</p>
      <PartageBoutons url={`${SITE}/actualites/${item.slug}`} title={item.title} text={resume(item.body)} className="mt-auto" />
    </div>
  </article>
);

const ActualitesPage = ({ news }: { news: NewsItem[] }) => {
  const { slug } = useParams();
  const publiees = publishedNews(news);

  if (slug) {
    const item = publiees.find(n => n.slug === slug);
    // Les nouvelles arrivent de Firestore : tant que la liste est vide, on attend au lieu de rediriger.
    if (!item) return news.length === 0
      ? <div className="min-h-screen pt-40 text-center text-slate-500">Chargement…</div>
      : <Navigate to="/actualites" replace />;
    return <NouvelleSeule item={item} />;
  }

  const [une, ...suite] = publiees;
  const canonical = `${SITE}/actualites`;

  return (
    <>
      <Helmet>
        <title>Actualités | Caroline Gérard — Les nouvelles de l'autrice</title>
        <meta name="description" content="Les nouvelles de Caroline Gérard : salons du livre, dédicaces, parutions, coulisses et annonces autour de ses livres jeunesse écrits avec son fils William Lorrain." />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_CA" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content="Actualités — Caroline Gérard" />
        <meta property="og:description" content="Les nouvelles, les salons et les coulisses de Caroline Gérard." />
      </Helmet>

      <div className="min-h-screen pt-24 md:pt-40 pb-20 w-full px-4 md:px-16">
        <div className="w-full mb-10 md:mb-16 flex flex-col items-center text-center">
          <EditableText tag="span" contentKey="news_label" defaultValue="Ce qui se passe" className="text-gold uppercase tracking-widest text-sm font-bold mb-4" />
          <EditableText tag="h1" contentKey="news_title" defaultValue="Actualités" className="font-serif text-5xl md:text-7xl text-white mb-6" />
          <EditableText tag="p" contentKey="news_intro" defaultValue="Les salons, les dédicaces, les parutions et les coulisses, au fur et à mesure." className="text-slate-400 max-w-2xl" />
        </div>

        {publiees.length > 0 ? (
          <div className="max-w-7xl mx-auto space-y-8">
            <CarteLarge item={une} />
            {suite.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {suite.map(item => <Carte key={item.id} item={item} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6">
            <Newspaper className="w-16 h-16 text-white/10 mb-6" />
            <EditableText tag="h2" contentKey="news_empty_title" defaultValue="Les premières nouvelles arrivent bientôt" className="text-3xl font-serif text-white mb-4" />
            <EditableText tag="p" contentKey="news_empty_text" defaultValue="En attendant, suivez les prochains rendez-vous sur la page Événements." className="text-slate-400 max-w-md" />
            <Link to="/evenements" className="mt-8 text-gold font-bold uppercase tracking-wider text-xs hover:text-white transition-colors">
              Voir les événements
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default ActualitesPage;
