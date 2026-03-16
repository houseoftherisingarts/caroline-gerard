import React, { useState } from 'react';
import { Video, Mic, Youtube, Upload, Save, Trash2, Plus, Globe, Lock, Calendar, FileText, Edit3 } from 'lucide-react';
import { Interview } from '../../types';

interface AdminInterviewsProps {
  interviews: Interview[];
  setInterviews: (interviews: Interview[]) => void;
}

const AdminInterviews: React.FC<AdminInterviewsProps> = ({ interviews, setInterviews }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Interview>>({
    title: '',
    description: '',
    mediaType: 'video',
    sourceType: 'youtube',
    mediaUrl: '',
    date: new Date().toISOString().split('T')[0],
    isPublished: false,
  });

  const handleSave = () => {
    if (!formData.title || !formData.date) return;

    if (editingId) {
      setInterviews(interviews.map(i => i.id === editingId ? { ...formData, id: editingId } as Interview : i));
    } else {
      const newInterview: Interview = {
        ...formData,
        id: Date.now().toString(),
      } as Interview;
      setInterviews([...interviews, newInterview]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet entretien ?')) {
      setInterviews(interviews.filter(i => i.id !== id));
      if (editingId === id) resetForm();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      mediaType: 'video',
      sourceType: 'youtube',
      mediaUrl: '',
      date: new Date().toISOString().split('T')[0],
      isPublished: false,
    });
  };

  const startEdit = (interview: Interview) => {
    setEditingId(interview.id);
    setFormData(interview);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Interviews & Médias</h1>
          <p className="text-slate-400 mt-1">Gérez vos passages médias, podcasts et interviews vidéo.</p>
        </div>
        {editingId && (
          <button 
            onClick={resetForm}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all flex items-center gap-2 border border-white/10"
          >
            <Plus className="w-4 h-4" /> Nouvel Entretien
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 p-6 sticky top-8">
            <h2 className="text-xl font-serif font-bold text-gold mb-6 flex items-center gap-2">
              {editingId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? 'Modifier l\'entretien' : 'Ajouter un entretien'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Titre</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-colors outline-none"
                  placeholder="Ex: Interview Radio-Canada"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-gold/50 transition-colors outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-colors outline-none h-32 resize-none"
                  placeholder="Bref résumé de l'intervention..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setFormData({ ...formData, mediaType: 'video' })}
                  className={`py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    formData.mediaType === 'video' 
                      ? 'bg-gold text-midnight border-gold font-bold shadow-lg shadow-gold/20' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Video className="w-4 h-4" /> Vidéo
                </button>
                <button 
                  onClick={() => setFormData({ ...formData, mediaType: 'audio' })}
                  className={`py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    formData.mediaType === 'audio' 
                      ? 'bg-gold text-midnight border-gold font-bold shadow-lg shadow-gold/20' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Mic className="w-4 h-4" /> Audio
                </button>
              </div>

              {formData.mediaType === 'video' && (
                <div className="space-y-4 pt-2">
                  <div className="flex bg-black/20 rounded-xl p-1 border border-white/5">
                    <button 
                      onClick={() => setFormData({ ...formData, sourceType: 'youtube' })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        formData.sourceType === 'youtube' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Lien YouTube
                    </button>
                    <button 
                      onClick={() => setFormData({ ...formData, sourceType: 'upload' })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        formData.sourceType === 'upload' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Téléverser
                    </button>
                  </div>

                  {formData.sourceType === 'youtube' ? (
                    <div className="relative">
                      <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                      <input 
                        type="text"
                        value={formData.mediaUrl}
                        onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-gold/50 transition-colors outline-none text-sm"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-gold/30 transition-colors cursor-pointer group">
                      <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2 group-hover:text-gold transition-colors" />
                      <p className="text-xs text-slate-400">Cliquez pour téléverser un fichier MP4</p>
                    </div>
                  )}
                </div>
              )}

              {formData.mediaType === 'audio' && (
                <div className="pt-2">
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-gold/30 transition-colors cursor-pointer group">
                    <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2 group-hover:text-gold transition-colors" />
                    <p className="text-xs text-slate-400">Cliquez pour téléverser un fichier MP3</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                <span className="text-sm font-bold text-slate-300">Publier en ligne</span>
                <button 
                  onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.isPublished ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isPublished ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-gold text-midnight font-bold py-4 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
                >
                  <Save className="w-5 h-5" /> Enregistrer
                </button>
                {editingId && (
                  <button 
                    onClick={() => handleDelete(editingId)}
                    className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 space-y-4">
          {interviews.length === 0 ? (
            <div className="bg-midnight/40 border border-white/5 rounded-2xl p-12 text-center">
              <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-slate-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-serif text-white mb-2">Aucun média enregistré</h3>
              <p className="text-slate-400">Commencez par ajouter votre première interview ou podcast.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interviews.map(interview => (
                <div 
                  key={interview.id}
                  onClick={() => startEdit(interview)}
                  className={`group bg-midnight/60 backdrop-blur-md rounded-2xl border p-5 transition-all cursor-pointer hover:translate-y-[-4px] ${
                    editingId === interview.id ? 'border-gold ring-1 ring-gold/30' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg ${interview.mediaType === 'video' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {interview.mediaType === 'video' ? <Video className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                      interview.isPublished ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                    }`}>
                      {interview.isPublished ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {interview.isPublished ? 'Public' : 'Brouillon'}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-serif font-bold text-white mb-1 group-hover:text-gold transition-colors">{interview.title}</h3>
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(interview.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                    {interview.description || 'Aucune description...'}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                      {interview.sourceType === 'youtube' ? 'YouTube' : 'Fichier Direct'}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(interview.id);
                      }}
                      className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInterviews;
