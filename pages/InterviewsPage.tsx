import React from 'react';
import { Calendar, Video, Mic, ExternalLink } from 'lucide-react';
import { Interview } from '../types';

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

  return (
    <div className="pt-32 pb-20 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6">
            Interviews & <span className="text-gold">Médias</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Retrouvez mes interventions dans les médias, podcasts et entrevues thématiques.
          </p>
          <div className="w-24 h-1 bg-gold mx-auto mt-8 rounded-full"></div>
        </div>

        {publishedInterviews.length === 0 ? (
          <div className="text-center py-20 bg-midnight/40 backdrop-blur-md rounded-3xl border border-white/10">
            <p className="text-slate-400 text-lg italic">De nouveaux contenus arrivent bientôt...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publishedInterviews.map((interview, index) => (
              <div 
                key={interview.id}
                className="group bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden hover:border-gold/30 transition-all duration-500 hover:translate-y-[-8px] animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Media Section */}
                <div className="relative overflow-hidden">
                  {interview.mediaType === 'video' ? (
                    interview.sourceType === 'youtube' ? (
                      <div className="aspect-video w-full">
                        <iframe 
                          src={`https://www.youtube.com/embed/${getYouTubeId(interview.mediaUrl)}`}
                          className="w-full h-full"
                          allowFullScreen
                          title={interview.title}
                        />
                      </div>
                    ) : (
                      <video 
                        controls 
                        src={interview.mediaUrl} 
                        className="w-full aspect-video object-cover"
                      />
                    )
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-midnight to-deep-blue flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="bg-gold/20 p-6 rounded-full text-gold group-hover:scale-110 transition-transform duration-500">
                        <Mic size={48} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${interview.mediaType === 'video' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {interview.mediaType === 'video' ? <Video size={16} /> : <Mic size={16} />}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <Calendar size={14} />
                      {new Date(interview.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  <h3 className="text-2xl font-serif font-bold text-white mb-3 group-hover:text-gold transition-colors">
                    {interview.title}
                  </h3>

                  <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3">
                    {interview.description}
                  </p>

                  {interview.mediaType === 'audio' && (
                    <div className="mt-auto">
                      <audio 
                        controls 
                        src={interview.mediaUrl} 
                        className="w-full h-10 rounded-lg bg-white/5"
                      />
                    </div>
                  )}

                  {interview.mediaType === 'video' && interview.sourceType === 'youtube' && (
                    <a 
                      href={interview.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-gold hover:text-white transition-colors uppercase tracking-widest"
                    >
                      Regarder sur YouTube <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewsPage;
