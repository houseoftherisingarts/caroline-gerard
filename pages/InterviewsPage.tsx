// AEO updated 2026-05-06
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Calendar, Video, Mic, ExternalLink } from 'lucide-react';
import { Interview } from '../types';
import EditableText from '../components/EditableText';

interface InterviewsPageProps {
  interviews: Interview[];
}

const InterviewsPage: React.FC<InterviewsPageProps> = ({ interviews }) => {
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const publishedInterviews = interviews
    .filter(i => i.isPublished)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const canonicalUrl = 'https://carolinegerard.ca/interviews';
  const mediaJsonLd = publishedInterviews.map(i => {
    const ytId = i.mediaType === 'video' && i.sourceType === 'youtube' ? getYouTubeId(i.mediaUrl) : null;
    return {
      '@context': 'https://schema.org',
      '@type': i.mediaType === 'video' ? 'VideoObject' : 'PodcastEpisode',
      name: i.title,
      description: i.description,
      uploadDate: i.date,
      datePublished: i.date,
      inLanguage: 'fr-CA',
      author: { '@type': 'Person', name: 'Caroline Gérard' },
      contentUrl: i.mediaUrl,
      ...(ytId ? { embedUrl: `https://www.youtube.com/embed/${ytId}`, thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` } : {}),
    };
  });

  return (
    <div className="pt-24 md:pt-32 pb-20 px-4 md:px-6 relative z-10">
      <Helmet>
        <title>Interviews & Médias | Caroline Gérard</title>
        <meta name="description" content="Retrouvez les interviews, entrevues vidéo et podcasts de Caroline Gérard, auteure de « William et les univers invisibles »." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_CA" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Interviews & Médias — Caroline Gérard" />
        <meta property="og:description" content="Vidéos, entrevues et podcasts avec Caroline Gérard." />
        {mediaJsonLd.map((m, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(m)}</script>
        ))}
      </Helmet>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 md:mb-16 animate-fade-in">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-4 md:mb-6">
            <EditableText tag="span" contentKey="interviews_title_main" defaultValue="Interviews &" />
            {' '}
            <EditableText tag="span" contentKey="interviews_title_gold" defaultValue="Médias" className="text-gold" />
          </h1>
          <EditableText tag="p" contentKey="interviews_description" defaultValue="Retrouvez mes interventions dans les médias, podcasts et entrevues thématiques." className="text-xl text-slate-400 max-w-2xl mx-auto" />
          <div className="w-24 h-1 bg-gold mx-auto mt-8 rounded-full"></div>
        </div>

        {publishedInterviews.length === 0 ? (
          <div className="text-center py-20 bg-midnight/40 backdrop-blur-md rounded-3xl border border-white/10">
            <EditableText tag="p" contentKey="interviews_empty" defaultValue="De nouveaux contenus arrivent bientôt..." className="text-slate-400 text-lg italic" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {publishedInterviews.map((interview, index) => (
              <div
                key={interview.id}
                className="group bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden hover:border-gold/30 transition-all duration-500 hover:translate-y-[-6px] animate-fade-in-up flex flex-col"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative overflow-hidden shrink-0">
                  {interview.mediaType === 'video' ? (
                    interview.sourceType === 'youtube' ? (
                      <div className="aspect-video w-full">
                        <iframe src={`https://www.youtube.com/embed/${getYouTubeId(interview.mediaUrl)}`} className="w-full h-full" allowFullScreen title={interview.title} />
                      </div>
                    ) : (
                      <video controls src={interview.mediaUrl} className="w-full aspect-video object-cover" />
                    )
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-midnight to-deep-blue flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="bg-gold/20 p-6 rounded-full text-gold group-hover:scale-110 transition-transform duration-500"><Mic size={48} /></div>
                    </div>
                  )}
                </div>
                <div className="p-5 md:p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg shrink-0 ${interview.mediaType === 'video' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {interview.mediaType === 'video' ? <Video size={16} /> : <Mic size={16} />}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <Calendar size={14} />
                      {new Date(interview.date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-serif font-bold text-white mb-3 group-hover:text-gold transition-colors leading-snug">{interview.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4 flex-1">{interview.description}</p>
                  <div className="mt-auto">
                    {interview.mediaType === 'audio' && (
                      <audio controls src={interview.mediaUrl} className="w-full h-10 rounded-lg bg-white/5" />
                    )}
                    {interview.mediaType === 'video' && interview.sourceType === 'youtube' && (
                      <a href={interview.mediaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-gold hover:text-white transition-colors uppercase tracking-widest">
                        <EditableText tag="span" contentKey="interviews_youtube_link" defaultValue="Regarder sur YouTube" /> <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Liens internes contextuels (AEO) */}
        <div className="max-w-3xl mx-auto mt-16 text-center text-slate-400 text-sm leading-relaxed">
          <p>
            <EditableText tag="span" contentKey="interviews_links_intro" defaultValue="Pour en savoir plus sur Caroline et William, visite la page " />
            <Link to="/a-propos" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="interviews_links_apropos" defaultValue="À Propos" />
            </Link>
            <EditableText tag="span" contentKey="interviews_links_seg2" defaultValue=". Pour découvrir le livre, fais un saut à la " />
            <Link to="/boutique" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="interviews_links_boutique" defaultValue="boutique" />
            </Link>
            <EditableText tag="span" contentKey="interviews_links_seg3" defaultValue=". Pour les demandes média, écris-nous via la " />
            <Link to="/contact" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="interviews_links_contact" defaultValue="page contact" />
            </Link>
            <EditableText tag="span" contentKey="interviews_links_outro" defaultValue="." />
          </p>
        </div>
      </div>
    </div>
  );
};

export default InterviewsPage;
