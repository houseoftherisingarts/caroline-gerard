import React, { useState } from 'react';
import { PenTool, Edit3, Trash2, ArrowLeft, Save, UploadCloud, Library, X } from 'lucide-react';
import NewsletterSendModal from '../../components/NewsletterSendModal';

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
import { BlogPost } from '../../types';
import BlockEditor from '../../components/BlockEditor';
import { uploadMediaFile } from '../../lib/storage';

// --- Helper Components ---
const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => (
  <button onClick={() => onChange(!checked)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none ${checked ? 'bg-gold' : 'bg-slate-700'}`}>
    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

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
          {value && <img src={value} alt="Uploaded preview" className="w-full h-full object-cover rounded-lg absolute opacity-80" />}
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
                    <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-serif text-white">Sélectionner une image</h3><button onClick={() => setIsLibraryOpen(false)} className="p-2 text-slate-400 hover:text-white"><X /></button></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2"><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{mediaLibrary.map((imgUrl, index) => (<div key={index} className="aspect-square rounded-lg overflow-hidden cursor-pointer group" onClick={() => { onUpload(imgUrl); setIsLibraryOpen(false); }}><img src={imgUrl} alt={`Media ${index}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>))}</div></div>
                </div>
            </div>
        )}
      </>
    );
  };

// --- Main Component ---
const AdminBlog = ({ posts, setPosts, mediaLibrary }: { posts: BlogPost[], setPosts: (posts: BlogPost[]) => void, mediaLibrary: string[] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost> | null>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);

  const openEditor = (post: BlogPost | null = null) => {
    if (post) {
        setCurrentPost({ ...post });
    } else {
      setCurrentPost({ title: '', excerpt: '', image: '', isPublished: false, content: '[]', date: new Date().toLocaleDateString('fr-CA') });
    }
    setActiveTab('content');
    setIsEditing(true);
  };

  const executeSave = (post: Partial<BlogPost> = currentPost!) => {
    if (!post) return;
    if (post.id) {
      setPosts(posts.map(p => p.id === post.id ? post as BlogPost : p));
    } else {
      const newPost: BlogPost = { ...post, id: `post-${Date.now()}` } as BlogPost;
      setPosts([newPost, ...posts]);
    }
    setIsEditing(false);
    setShowNewsletterModal(false);
  };

  const handleSave = () => {
    if (!currentPost) return;
    const wasPublished = currentPost.id
      ? (posts.find(p => p.id === currentPost.id)?.isPublished ?? false)
      : false;
    const isFirstPublication = currentPost.isPublished && !wasPublished;
    if (isFirstPublication) {
      setShowNewsletterModal(true);
      return;
    }
    executeSave();
  };

  const handleDeletePost = (id: string) => setPosts(posts.filter(p => p.id !== id));

  if (isEditing && currentPost) {
    return (
      <>
      {showNewsletterModal && (
        <NewsletterSendModal
          type="blog"
          defaultSubject={`Nouveau billet de blog : ${currentPost.title || ''}`}
          defaultTitle={currentPost.title || ''}
          defaultBodyText={currentPost.excerpt || ''}
          defaultImage={currentPost.image || ''}
          mediaLibrary={mediaLibrary}
          onConfirm={() => executeSave()}
          onCancel={() => setShowNewsletterModal(false)}
        />
      )}
      <div className="animate-fade-in-up space-y-6">
        <div className="flex justify-between items-center"><button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"><ArrowLeft size={18} /> Retour</button><div className="flex items-center gap-4"><div className="flex items-center gap-2"><span className={`font-bold text-sm ${currentPost.isPublished ? 'text-green-400' : 'text-slate-400'}`}>{currentPost.isPublished ? 'Publié' : 'Brouillon'}</span><ToggleSwitch checked={currentPost.isPublished || false} onChange={(isChecked) => setCurrentPost({ ...currentPost, isPublished: isChecked })}/></div><button onClick={handleSave} className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={16} /> Enregistrer</button></div></div>
        <div className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-full p-1 flex w-fit mx-auto"><button onClick={() => setActiveTab('content')} className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'content' ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}>✍️ Rédaction</button><button onClick={() => setActiveTab('seo')} className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'seo' ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}>🔍 SEO & Meta</button></div>
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-8 space-y-6">
            {activeTab === 'content' && (
                <div className="space-y-6">
                    <div className="h-64"><ImageUpload value={currentPost.image || ''} onUpload={(url) => setCurrentPost({ ...currentPost, image: url })} mediaLibrary={mediaLibrary}/></div>
                    <input type="text" placeholder="Titre de l'article" value={currentPost.title || ''} onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })} className="w-full bg-transparent text-4xl font-serif text-white focus:outline-none placeholder-slate-600"/>
                    <textarea placeholder="Extrait de l'article (pour l'aperçu)" value={currentPost.excerpt || ''} onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })} className="w-full bg-transparent text-slate-400 focus:outline-none placeholder-slate-600 resize-none" rows={2}/>
                    <BlockEditor 
                        value={currentPost.content || '[]'} 
                        onChange={(newContent) => setCurrentPost({ ...currentPost, content: newContent })} 
                        mediaLibrary={mediaLibrary} 
                    />
                </div>
            )}
            {activeTab === 'seo' && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-8">...</div> )}
        </div>
      </div>
      </>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center"><div><h1 className="text-3xl font-serif font-bold text-white">Gestion du Blog</h1><p className="text-slate-400 mt-1">Rédigez et gérez vos articles</p></div><button onClick={() => openEditor()} className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors flex items-center gap-2"><PenTool size={16} /> Rédiger un article</button></div>
      <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">{posts.map((post, index) => (<div key={post.id} className={`p-6 flex flex-col md:flex-row gap-6 items-start md:items-center ${index !== posts.length - 1 ? 'border-b border-white/5' : ''}`}><div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">{getFirstImage(post.image, post.content) ? <img src={getFirstImage(post.image, post.content)} alt={post.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/20" />}</div><div className="flex-1"><div className="flex items-center gap-3 mb-1"><span className="text-gold text-xs font-bold uppercase tracking-wider">{post.date}</span><span className="w-1 h-1 rounded-full bg-slate-600"></span><span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${post.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>{post.isPublished ? 'Publié' : 'Brouillon'}</span></div><h3 className="text-xl font-bold text-white mb-2">{post.title}</h3><p className="text-slate-400 text-sm line-clamp-2">{post.excerpt}</p></div><div className="flex gap-2"><button onClick={() => openEditor(post)} className="p-2 bg-white/5 rounded-lg text-white hover:bg-gold hover:text-midnight transition-colors"><Edit3 size={18} /></button><button onClick={() => handleDeletePost(post.id)} className="p-2 bg-white/5 rounded-lg text-white hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={18} /></button></div></div>))}
        {posts.length === 0 && (<div className="p-8 text-center text-slate-500 italic">Aucun article pour le moment.</div>)}</div>
    </div>
  );
};

export default AdminBlog;
