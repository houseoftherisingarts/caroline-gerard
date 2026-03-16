import React, { useState } from 'react';
import { Plus, Search, Video, FileText, Trash2, Download, User } from 'lucide-react';

const AdminMedia = ({ profileImage, setProfileImage }: { profileImage: string, setProfileImage: (url: string) => void }) => {
    const handleDragStart = (e: React.DragEvent, url: string) => {
        e.dataTransfer.setData("text/plain", url);
        e.dataTransfer.effectAllowed = "copy";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const url = e.dataTransfer.getData("text/plain");
        if (url) {
            setProfileImage(url);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const [mediaItems] = useState([
        { id: '1', name: 'Couverture_Livre_1.jpg', type: 'image', size: '2.4 MB', date: '2023-11-10', url: 'https://picsum.photos/seed/book1/400/600' },
        { id: '2', name: 'Portrait_Auteure.png', type: 'image', size: '4.1 MB', date: '2023-11-12', url: 'https://picsum.photos/seed/author/400/400' },
        { id: '3', name: 'Video_Presentation.mp4', type: 'video', size: '125 MB', date: '2023-11-15', url: '#' },
        { id: '4', name: 'Dossier_Presse.pdf', type: 'document', size: '1.2 MB', date: '2023-11-18', url: '#' },
        { id: '5', name: 'Banniere_Site.jpg', type: 'image', size: '3.8 MB', date: '2023-11-20', url: 'https://picsum.photos/seed/banner/1200/400' },
    ]);

    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMedia = mediaItems.filter(item => {
        const matchesFilter = filter === 'all' || item.type === filter;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-white">Médiathèque</h1>
                    <p className="text-slate-400 mt-1">Gérez vos images, vidéos et documents</p>
                </div>
                <button className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors flex items-center gap-2">
                    <Plus size={18} /> Téléverser
                </button>
            </div>

            {/* Profile Picture Slot */}
            <div className="bg-midnight/60 border border-white/10 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <User size={20} className="text-gold" /> Photo de Profil (Accueil)
                </h3>
                <div className="flex items-center gap-8">
                    <div 
                        className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-dashed border-white/20 hover:border-gold transition-colors flex items-center justify-center bg-black/20 group"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <img src={profileImage} alt="Profile Current" className="w-full h-full object-cover absolute inset-0 z-0" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            <p className="text-xs text-white font-bold text-center px-2">Glisser une image ici</p>
                        </div>
                    </div>
                    <div className="flex-1">
                         <p className="text-slate-300 text-sm mb-2">Cette photo est affichée sur la page d&apos;accueil. </p>
                         <p className="text-slate-500 text-xs italic">Glissez une image de la galerie ci-dessous vers le cercle pour la mettre à jour.</p>
                    </div>
                </div>
            </div>

            <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-2">
                        {['all', 'image', 'video', 'document'].map(f => (
                            <button 
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors uppercase tracking-wider ${filter === f ? 'bg-gold text-midnight' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                {f === 'all' ? 'Tous' : f === 'image' ? 'Images' : f === 'video' ? 'Vidéos' : 'Docs'}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Rechercher..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-gold"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredMedia.map(item => (
                        <div 
                            key={item.id} 
                            className="group relative bg-white/5 rounded-xl border border-white/5 overflow-hidden hover:border-gold/30 transition-all cursor-move"
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, item.url)}
                        >
                            <div className="aspect-square bg-slate-800 flex items-center justify-center relative">
                                {item.type === 'image' ? (
                                    <img src={item.url} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                ) : item.type === 'video' ? (
                                    <Video size={40} className="text-slate-600" />
                                ) : (
                                    <FileText size={40} className="text-slate-600" />
                                )}
                                
                                <div className="absolute inset-0 bg-midnight/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button className="p-2 bg-white/10 rounded-lg text-white hover:bg-gold hover:text-midnight transition-colors"><Download size={18} /></button>
                                    <button className="p-2 bg-white/10 rounded-lg text-white hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={18} /></button>
                                </div>
                            </div>
                            <div className="p-3">
                                <p className="text-xs font-bold text-white truncate mb-1">{item.name}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500 uppercase">{item.type}</span>
                                    <span className="text-[10px] text-slate-500">{item.size}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminMedia;
