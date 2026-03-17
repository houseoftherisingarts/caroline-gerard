import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Check, Globe } from 'lucide-react';
import { useSiteContent } from '../../contexts/SiteContentContext';
import HomePage from '../HomePage';
import ContactPage from '../ContactPage';
import BlogPage from '../BlogPage';
import EventsPage from '../EventsPage';
import ConferencesPage from '../ConferencesPage';
import InterviewsPage from '../InterviewsPage';
import ShopPage from '../ShopPage';
import EditableText from '../../components/EditableText';
import { BlogPost, AppEvent, Conference, Interview, Book } from '../../types';

const PAGES = [
  { id: 'home',        label: 'Accueil' },
  { id: 'boutique',    label: 'Boutique' },
  { id: 'blog',        label: 'Blog' },
  { id: 'evenements',  label: 'Événements' },
  { id: 'conferences', label: 'Conférences' },
  { id: 'interviews',  label: 'Interviews & Médias' },
  { id: 'contact',     label: 'Contact' },
  { id: 'footer',      label: 'Pied de page' },
];

interface AdminSiteEditorProps {
  profileImage: string;
  posts: BlogPost[];
  events: AppEvent[];
  conferences: Conference[];
  interviews: Interview[];
  addToCart: (book: Book) => void;
  visitorCount: number;
  showVisitorCount: boolean;
}

const AdminSiteEditor = ({
  profileImage, posts, events, conferences, interviews, addToCart, visitorCount, showVisitorCount,
}: AdminSiteEditorProps) => {
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

  const renderPage = () => {
    switch (selectedPage) {
      case 'home':        return <HomePage profileImage={profileImage} />;
      case 'boutique':    return <ShopPage addToCart={addToCart} />;
      case 'blog':        return <BlogPage posts={posts} />;
      case 'evenements':  return <EventsPage events={events} />;
      case 'conferences': return <ConferencesPage conferences={conferences} />;
      case 'interviews':  return <InterviewsPage interviews={interviews} />;
      case 'contact':     return <ContactPage />;
      case 'footer':      return <FooterEditor visitorCount={visitorCount} showVisitorCount={showVisitorCount} />;
      default:            return null;
    }
  };

  return (
    <div className="min-h-screen bg-midnight text-white">
      {/* Editor Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-[9998] bg-gold text-midnight flex items-center gap-3 px-5 py-3 shadow-2xl">
        <Link to="/admin" className="flex items-center gap-2 font-bold hover:opacity-60 transition-opacity text-sm">
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
          {PAGES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
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
        {renderPage()}
      </div>
    </div>
  );
};

// Dedicated footer editor view
const FooterEditor = ({ visitorCount, showVisitorCount }: { visitorCount: number, showVisitorCount: boolean }) => (
  <div className="min-h-screen flex items-center justify-center p-12">
    <div className="w-full max-w-3xl">
      <p className="text-slate-500 text-xs uppercase tracking-widest mb-8 text-center">Aperçu du pied de page</p>
      <div className="bg-midnight/60 backdrop-blur-md border-t border-white/5 py-12 px-8 rounded-2xl border border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="font-serif text-3xl text-gold mb-2">Caroline Gérard</h3>
            <EditableText tag="p" contentKey="footer_tagline" defaultValue="Accompagner mon fils sur sa route et l'aider à croire en ses rêves." className="text-slate-400 max-w-sm" />
          </div>
          <div className="text-sm text-slate-600 flex flex-col items-center md:items-end gap-2">
            <EditableText tag="p" contentKey="footer_copyright" defaultValue="© 2026 Copyright Vexel Studio. Tous droits réservés." />
            {showVisitorCount && (
              <p className="text-slate-500">{visitorCount.toLocaleString('fr-FR')} Visiteurs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AdminSiteEditor;
