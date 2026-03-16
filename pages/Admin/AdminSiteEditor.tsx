import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Check, Globe } from 'lucide-react';
import { useSiteContent } from '../../contexts/SiteContentContext';
import HomePage from '../HomePage';
import ContactPage from '../ContactPage';

const PAGES = [
  { id: 'home', label: 'Accueil' },
  { id: 'contact', label: 'Contact' },
];

const AdminSiteEditor = ({ profileImage }: { profileImage: string }) => {
  const { enterEditMode, exitEditMode, saveChanges, pendingChanges } = useSiteContent();
  const [selectedPage, setSelectedPage] = useState('home');
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  useEffect(() => {
    enterEditMode();
    return () => exitEditMode();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await saveChanges();
    setIsSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  };

  return (
    <div className="min-h-screen bg-midnight text-white">
      {/* Editor Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-[9998] bg-gold text-midnight flex items-center gap-3 px-5 py-3 shadow-2xl">
        <Link
          to="/admin"
          className="flex items-center gap-2 font-bold hover:opacity-60 transition-opacity text-sm"
        >
          <ArrowLeft size={16} /> Admin
        </Link>

        <div className="w-px h-5 bg-midnight/20" />

        <Globe size={16} className="opacity-60" />
        <span className="font-bold text-sm uppercase tracking-widest">Mode Édition</span>

        <div className="w-px h-5 bg-midnight/20" />

        <select
          value={selectedPage}
          onChange={e => setSelectedPage(e.target.value)}
          className="bg-midnight/10 border border-midnight/20 rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer focus:outline-none"
        >
          {PAGES.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        <div className="flex-1" />

        {hasPendingChanges && !savedFlash && (
          <span className="text-sm text-midnight/70 font-medium animate-pulse hidden sm:block">
            ● Modifications non sauvegardées
          </span>
        )}

        {savedFlash && (
          <span className="text-sm font-bold flex items-center gap-1 text-green-800">
            <Check size={14} /> Sauvegardé !
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving || !hasPendingChanges}
          className="flex items-center gap-2 bg-midnight text-gold px-5 py-2 rounded-xl font-bold text-sm hover:bg-midnight/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={14} /> {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Hint bar */}
      <div className="fixed top-[52px] left-0 right-0 z-[9997] bg-midnight/80 backdrop-blur-md border-b border-white/5 px-5 py-2 flex items-center gap-2 text-xs text-slate-400">
        <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
        Survolez un texte ou une image et cliquez pour le modifier
      </div>

      {/* Page content */}
      <div className="pt-28">
        {selectedPage === 'home' && <HomePage profileImage={profileImage} />}
        {selectedPage === 'contact' && <ContactPage />}
      </div>
    </div>
  );
};

export default AdminSiteEditor;
