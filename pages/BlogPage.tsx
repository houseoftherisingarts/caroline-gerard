import React, { useState, useEffect } from 'react';

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
import { Calendar, Feather, PenTool, X, Facebook, Linkedin, Twitter, Link as LinkIcon } from 'lucide-react';
import { BlogPost } from '../types';
import BlockRenderer from '../components/BlockRenderer';
import EditableText from '../components/EditableText';

const BlogPage = ({ posts }: { posts: BlogPost[] }) => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    if (selectedPost) { document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = 'auto'; }
    return () => { document.body.style.overflow = 'auto'; };
  }, [selectedPost]);

  const handleShare = (platform: 'facebook' | 'linkedin' | 'twitter') => {
    const url = window.location.href;
    let shareUrl = '';
    switch (platform) {
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`; break;
      case 'linkedin': shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}`; break;
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`; break;
    }
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => { navigator.clipboard.writeText(window.location.href); alert('Lien copié !'); };

  return (
    <>
      <div className="min-h-screen pt-24 md:pt-40 pb-20 w-full px-4 md:px-16">
        <div className="w-full mb-10 md:mb-16 flex flex-col items-center text-center">
          <EditableText tag="span" contentKey="blog_label" defaultValue="Histoires & Pensées" className="text-gold uppercase tracking-widest text-sm font-bold mb-4" />
          <EditableText tag="h1" contentKey="blog_title" defaultValue="Le Blog" className="font-serif text-5xl md:text-7xl text-white mb-6" />
        </div>
        {posts.filter(p => p.isPublished).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {posts.filter(p => p.isPublished).map(post => (
              <article key={post.id} className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-gold/30 transition-all group flex flex-col">
                <div className="h-48 overflow-hidden relative bg-slate-800">{getFirstImage(post.image, post.content) && <img src={getFirstImage(post.image, post.content)} alt={post.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />}<div className="absolute inset-0 bg-gradient-to-t from-midnight/80 to-transparent" /><div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs font-bold text-white/80"><Calendar className="w-3 h-3 text-gold" />{post.date}</div></div>
                <div className="p-6 flex-1 flex flex-col"><h2 className="text-xl font-serif text-white mb-3 group-hover:text-gold transition-colors">{post.title}</h2><p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">{post.excerpt}</p><button onClick={() => setSelectedPost(post)} className="text-gold font-bold uppercase tracking-wider text-xs hover:text-white transition-colors flex items-center gap-2 mt-auto self-start">Lire l&apos;article <Feather className="w-3 h-3" /></button></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <PenTool className="w-16 h-16 text-white/10 mb-6" />
            <EditableText tag="h2" contentKey="blog_empty_title" defaultValue="Lancement du blog en Mars 2026" className="text-3xl font-serif text-white mb-4" />
            <EditableText tag="p" contentKey="blog_empty_text" defaultValue="Nos histoires se peaufinent. Revenez bientôt pour découvrir nos aventures écrites." className="text-slate-400 max-w-md" />
          </div>
        )}
      </div>
      {selectedPost && (
        <div className="fixed inset-0 z-[100] bg-midnight overflow-y-auto w-full h-full animate-fade-in">
          <div className="w-full max-w-screen-xl mx-auto px-4 md:px-12 pt-16 md:pt-32 pb-16 md:pb-24 relative">
            <button onClick={() => setSelectedPost(null)} className="fixed top-4 right-4 md:top-6 md:right-6 z-10 p-2.5 text-slate-400 hover:text-white bg-black/40 rounded-full transition-colors"><X size={20} /></button>
            {getFirstImage(selectedPost.image, selectedPost.content) && <img src={getFirstImage(selectedPost.image, selectedPost.content)} alt={selectedPost.title} className="w-full h-[30vh] md:h-[50vh] object-cover rounded-2xl mb-6 md:mb-8 shadow-lg" />}
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-serif text-white mb-4">{selectedPost.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between border-b border-white/10 pb-6 md:pb-8 mb-8 md:mb-12">
              <div className="flex items-center gap-2 text-sm text-gold"><Calendar size={14} /><span>Publié le {selectedPost.date}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">PARTAGER:</span>
                <button onClick={() => handleShare('facebook')} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-gold hover:border-gold/50 hover:bg-gold/10 transition-all"><Facebook size={16} /></button>
                <button onClick={() => handleShare('linkedin')} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-gold hover:border-gold/50 hover:bg-gold/10 transition-all"><Linkedin size={16} /></button>
                <button onClick={() => handleShare('twitter')} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-gold hover:border-gold/50 hover:bg-gold/10 transition-all"><Twitter size={16} /></button>
                <button onClick={handleCopyLink} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-gold hover:border-gold/50 hover:bg-gold/10 transition-all"><LinkIcon size={16} /></button>
              </div>
            </div>
            <BlockRenderer content={selectedPost.content} />
          </div>
        </div>
      )}
    </>
  );
};

export default BlogPage;
