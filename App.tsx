import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { trackAddToCart, trackBeginCheckout, trackPageView } from './lib/analytics';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import {
  ShoppingCart,
  Menu,
  X,
  Facebook,
  Lock,
  Eye,
  Scale,
} from 'lucide-react';
import QuillIcon from './components/QuillIcon';

import StarField from './components/StarField';
import CartDrawer from './components/CartDrawer';
import EditableText from './components/EditableText';
import CheckoutPage from './components/CheckoutPage';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import BlogPage from './pages/BlogPage';
import ContactPage from './pages/ContactPage';
import ConferencesPage from './pages/ConferencesPage';
import EventsPage from './pages/EventsPage';
import InterviewsPage from './pages/InterviewsPage';
import AdminLogin from './pages/Admin/AdminLogin';
import AdminLayout from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminOrders from './pages/Admin/AdminOrders';
import AdminInventory from './pages/Admin/AdminInventory';
import AdminBlog from './pages/Admin/AdminBlog';
import AdminEvents from './pages/Admin/AdminEvents';
import AdminInvoices from './pages/Admin/AdminInvoices';
import AdminProductLadder from './pages/Admin/AdminProductLadder';
import AdminSocialStudio from './pages/Admin/AdminSocialStudio';
import AdminMedia from './pages/Admin/AdminMedia';
import AdminConferences from './pages/Admin/AdminConferences';
import AdminKanban from './pages/Admin/AdminKanban';
import AdminInterviews from './pages/Admin/AdminInterviews';
import AdminSiteEditor from './pages/Admin/AdminSiteEditor';
import AdminCommunaute from './pages/Admin/AdminCommunaute';
import AdminVisibilite from './pages/Admin/AdminVisibilite';
import AdminPromoCodes from './pages/Admin/AdminPromoCodes';
import AdminTestimonials from './pages/Admin/AdminTestimonials';
import AdminLeadMagnet from './pages/Admin/AdminLeadMagnet';
import AProposPage from './pages/AProposPage';
import CommunautePage from './pages/CommunautePage';
import TermsPage from './pages/TermsPage';
import IntroScreen from './components/IntroScreen';
import NewsletterForm from './components/NewsletterForm';
import CookieBanner from './components/CookieBanner';
import { SiteContentProvider } from './contexts/SiteContentContext';

import { blogPosts, books } from './data';
import { Book, Order, ProductOffer, CartItem, BlogPost, Conference, Lead, AppEvent, Interview } from './types';
import {
  subscribeToPosts, savePost, deletePost,
  subscribeToEvents, saveEvent, deleteEvent,
  subscribeToConferences, saveConference, deleteConference,
  subscribeToInterviews, saveInterview, deleteInterview,
  subscribeToSettings, saveSettings,
  subscribeToLeads,
  subscribeToSiteContent, saveSiteContent,
  subscribeToBooks, saveBook, deleteBook,
  seedIfEmpty,
  recordVisit,
  subscribeToVisitorCount,
  DEFAULT_VIS, VIS_KEYS,
} from './lib/firestore';
import type { SiteContent, VisibilitySettings } from './lib/firestore';

// --- Layout Components ---

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(pathname);
  }, [pathname]);

  return null;
};

const Navigation = ({ cartCount, onOpenCart, vis }: { cartCount: number, onOpenCart: () => void, vis: VisibilitySettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) return null; 

  return (
    <nav className="fixed w-full z-50 top-0 px-3 py-3 lg:px-6 lg:py-6 transition-all duration-300">
      <div className="w-full bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 px-4 py-3 lg:px-8 lg:py-4 flex justify-between items-center shadow-2xl">
        <Link to="/" className="flex items-center gap-3 group" aria-label="Caroline Gérard — retour à l'accueil">
          <div className="bg-gold/20 p-2 rounded-full group-hover:bg-gold/40 transition-colors">
            <QuillIcon className="text-gold w-6 h-6" />
          </div>
          <span className="font-serif text-gold text-lg lg:text-xl tracking-wide whitespace-nowrap">
            Caroline <span className="italic">Gérard</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8 xl:gap-10">
          <Link to="/" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Accueil</Link>
          {!vis.hidePageAPropos && <Link to="/a-propos" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">À Propos</Link>}
          {!vis.hidePageBoutique && <Link to="/boutique" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Boutique</Link>}
          {!vis.hidePageEvenements && <Link to="/evenements" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Événements</Link>}
          {!vis.hidePageInterviews && <Link to="/interviews" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Médias</Link>}
          {!vis.hideConferences && <Link to="/conferences" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Conférence</Link>}
          {!vis.hidePageBlog && <Link to="/blog" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Blog</Link>}
          {!vis.hidePageContact && <Link to="/contact" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Contact</Link>}
          {!vis.hideEspaceClient && <Link to="/communaute" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase border border-gold/30 px-3 py-1.5 rounded-lg hover:border-gold">Espace client</Link>}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenCart}
            className="relative p-2 text-white hover:text-gold transition-colors group"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-midnight text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile Toggle */}
          <button className="lg:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu — full-screen overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-x-0 top-0 bg-midnight/98 backdrop-blur-xl border-b border-gold/20 shadow-2xl lg:hidden z-50 flex flex-col overflow-y-auto" style={{ maxHeight: '100dvh' }}>
            {/* Menu header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="bg-gold/20 p-1.5 rounded-full">
                <QuillIcon className="text-gold w-5 h-5" />
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                <X size={22} />
              </button>
            </div>
            {/* Links */}
            <div className="flex flex-col py-4 px-4 gap-1">
              {([
                { to: '/', label: 'Accueil', hidden: false },
                { to: '/a-propos', label: 'À Propos', hidden: vis.hidePageAPropos },
                { to: '/boutique', label: 'Boutique', hidden: vis.hidePageBoutique },
                { to: '/evenements', label: 'Événements', hidden: vis.hidePageEvenements },
                { to: '/interviews', label: 'Médias', hidden: vis.hidePageInterviews },
                { to: '/conferences', label: 'Conférence', hidden: vis.hideConferences },
                { to: '/blog', label: 'Blog', hidden: vis.hidePageBlog },
                { to: '/contact', label: 'Contact', hidden: vis.hidePageContact },
              ] as { to: string; label: string; hidden: boolean }[])
                .filter(item => !item.hidden)
                .map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-serif text-white hover:text-gold transition-colors px-4 py-3 rounded-xl hover:bg-white/5 active:bg-white/10"
                  >
                    {label}
                  </Link>
                ))
              }
              {!vis.hideEspaceClient && (
                <Link
                  to="/communaute"
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-serif text-gold border border-gold/30 rounded-xl py-3 px-4 text-center mt-2 hover:bg-gold hover:text-midnight transition-all"
                >
                  Espace client
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

const Footer = ({ visitorCount, showVisitorCount, vis }: { visitorCount: number, showVisitorCount: boolean, vis: VisibilitySettings }) => (
  <footer className="bg-midnight/60 backdrop-blur-md border-t border-white/5 relative z-10 w-full">
    {!vis.hideFooterNewsletter && <NewsletterForm compact hideMemberCta={vis.hideMemberCta} />}
    <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6 py-8 md:py-12 px-6 md:px-8">
      <div className="text-center md:text-left">
        <h3 className="font-serif text-2xl md:text-3xl text-gold mb-2">Caroline Gérard</h3>
        <EditableText tag="p" contentKey="footer_tagline" defaultValue="Accompagner mon fils sur sa route et l'aider à croire en ses rêves." className="text-slate-400 max-w-sm text-sm md:text-base" />
      </div>
      <div className="flex gap-4">
        <a href="https://www.facebook.com/caroline.gerard.338" target="_blank" rel="noopener noreferrer" className="p-3 md:p-4 bg-white/5 rounded-full hover:bg-gold hover:text-midnight transition-all">
          <Facebook className="w-5 h-5 md:w-6 md:h-6" />
        </a>
      </div>
      <div className="text-xs md:text-sm text-slate-600 flex flex-col items-center md:items-end gap-3">
        <EditableText tag="p" contentKey="footer_copyright" defaultValue="© 2026 Copyright Vexel Studio. Tous droits réservés." />
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 md:gap-6">
          {showVisitorCount && (
            <div className="flex items-center gap-2 text-slate-500">
              <Eye size={13} />
              <span>{visitorCount.toLocaleString('fr-FR')} Visiteurs uniques</span>
            </div>
          )}
          <Link to="/conditions" className="flex items-center gap-1.5 text-slate-500 hover:text-gold transition-colors">
            <Scale className="w-3 h-3" /> Conditions
          </Link>
          <Link to="/admin" className="flex items-center gap-1.5 text-slate-500 hover:text-gold transition-colors px-2.5 py-1 border border-slate-800 rounded-lg hover:border-gold/50">
            <Lock className="w-3 h-3" /> Admin
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

// --- App Container ---

const App = () => {
  const [showIntro, setShowIntro] = useState(!window.location.pathname.startsWith('/admin'));
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Lifted state for Profile Image
  const [profileImage, setProfileImage] = useState<string>('https://storage.googleapis.com/salondesinconnus/Caroline/Gemini_Generated_Image_8wrovw8wrovw8wro.png');
  
  // Lifted state for Offers to share between Admin and Public
  const [offers] = useState<ProductOffer[]>([
    { id: '1', title: 'Guide PDF Gratuit', price: 0, category: 'freemium', description: 'Lead magnet pour capturer des emails', status: 'active', type: 'product', isPublished: true },
    { id: '2', title: 'Atelier Découverte', price: 47, category: 'low', description: 'Session zoom de 1h pour découvrir ton potentiel', status: 'active', type: 'service', isPublished: true },
    { id: '3', title: 'Formation En Ligne', price: 197, category: 'mid', description: 'Accès à vie au portail de formation', status: 'planned', type: 'product', isPublished: false },
    { id: '4', title: 'Coaching de Groupe', price: 997, category: 'high', description: '12 semaines intensives de transformation', status: 'concept', type: 'service', isPublished: false },
    { id: '5', title: 'Mentorat Privé', price: 2500, category: 'premium', description: 'Accompagnement VIP 1-on-1', status: 'active', type: 'service', isPublished: false },
  ]);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<string[]>([]);
  const [visitorCount, setVisitorCount] = useState(0); // IP-unique tally from Firestore
  const [showVisitorCount, setShowVisitorCount] = useState(true);
  const [sphereImageScale, setSphereImageScale] = useState(0.42);
  const [sphereGalleryImages, setSphereGalleryImages] = useState<{ id: string; url: string; alt: string }[]>([]);
  const [vis, setVis] = useState<VisibilitySettings>(DEFAULT_VIS);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent>({});
  const [firestoreBooks, setFirestoreBooks] = useState<Book[]>([]);

  const addToCart = (book: Book) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.book.id === book.id);
      if (existing) {
        return prev.map(item => item.book.id === book.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { book, quantity: 1 }];
    });
    trackAddToCart(book.title, book.price);
    setIsCartOpen(true);
  };

  const updateQuantity = (bookId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.book.id === bookId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeItem = (bookId: string) => {
    setCartItems(prev => prev.filter(item => item.book.id !== bookId));
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.book.price * item.quantity), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // --- Firebase Auth ---
  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setIsAuthenticated(!!user);
      const ADMIN_EMAILS = ['alex@lesalondesinconnus.com', 'krystine@inspiratanature.com'];
      setIsAdmin(!!user && (!!user.email && (ADMIN_EMAILS.includes(user.email) || user.email.endsWith('@admin.local'))));
    });
  }, []);

  // --- Firestore subscriptions ---
  useEffect(() => {
    const unsubs = [
      subscribeToPosts(setPosts),
      subscribeToEvents(setEvents),
      subscribeToConferences(setConferences),
      subscribeToInterviews(setInterviews),
      subscribeToLeads(setLeads),
      subscribeToSettings(s => {
        if (s.mediaLibrary) setMediaLibrary(s.mediaLibrary);
        if (s.profileImage) setProfileImage(s.profileImage);
        if (s.showVisitorCount !== undefined) setShowVisitorCount(s.showVisitorCount);
        if (s.sphereImageScale !== undefined) setSphereImageScale(s.sphereImageScale);
        if (s.sphereGalleryImages) setSphereGalleryImages(s.sphereGalleryImages);
        setVis(prev => {
          const next = { ...prev };
          VIS_KEYS.forEach(k => {
            const v = (s as Record<string, unknown>)[k];
            if (v !== undefined) (next as Record<string, boolean>)[k] = v as boolean;
          });
          return next;
        });
      }),
      subscribeToSiteContent(setSiteContent),
      subscribeToBooks(setFirestoreBooks),
      subscribeToVisitorCount(setVisitorCount),
    ];
    seedIfEmpty(blogPosts, books);
    return () => unsubs.forEach(u => u());
  }, []);

  // Record the visit once per browser session; the server dedupes by hashed IP
  // so multiple sessions from the same computer are only counted once.
  useEffect(() => {
    if (!sessionStorage.getItem('_cg_visited')) {
      sessionStorage.setItem('_cg_visited', '1');
      recordVisit();
    }
  }, []);

  // --- Firestore-persisted setters ---
  // Each setter diffs old vs new, deletes removed items, saves new/changed ones.

  const handleSetPosts = useCallback((newPosts: BlogPost[]) => {
    setPosts(prev => {
      const prevMap = new Map(prev.map(p => [p.id, p]));
      const newMap = new Map(newPosts.map(p => [p.id, p]));
      prev.forEach(p => { if (!newMap.has(p.id)) deletePost(p.id); });
      newPosts.forEach(p => {
        const old = prevMap.get(p.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(p)) savePost(p);
      });
      return newPosts;
    });
  }, []);

  const handleSetEvents = useCallback((newEvents: AppEvent[]) => {
    setEvents(prev => {
      const prevMap = new Map(prev.map(e => [e.id, e]));
      const newMap = new Map(newEvents.map(e => [e.id, e]));
      prev.forEach(e => { if (!newMap.has(e.id)) deleteEvent(e.id); });
      newEvents.forEach(e => {
        const old = prevMap.get(e.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(e)) saveEvent(e);
      });
      return newEvents;
    });
  }, []);

  const handleSetConferences = useCallback((newConfs: Conference[]) => {
    setConferences(prev => {
      const prevMap = new Map(prev.map(c => [c.id, c]));
      const newMap = new Map(newConfs.map(c => [c.id, c]));
      prev.forEach(c => { if (!newMap.has(c.id)) deleteConference(c.id); });
      newConfs.forEach(c => {
        const old = prevMap.get(c.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(c)) saveConference(c);
      });
      return newConfs;
    });
  }, []);

  const handleSetInterviews = useCallback((newInterviews: Interview[]) => {
    setInterviews(prev => {
      const prevMap = new Map(prev.map(i => [i.id, i]));
      const newMap = new Map(newInterviews.map(i => [i.id, i]));
      prev.forEach(i => { if (!newMap.has(i.id)) deleteInterview(i.id); });
      newInterviews.forEach(i => {
        const old = prevMap.get(i.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(i)) saveInterview(i);
      });
      return newInterviews;
    });
  }, []);

  const handleSetMediaLibrary = useCallback((lib: string[]) => {
    setMediaLibrary(lib);
    saveSettings({ mediaLibrary: lib });
  }, []);

  const handleSetProfileImage = useCallback((img: string) => {
    setProfileImage(img);
    saveSettings({ profileImage: img });
  }, []);

  const handleSetShowVisitorCount = useCallback((show: boolean) => {
    setShowVisitorCount(show);
    saveSettings({ showVisitorCount: show });
  }, []);

  const handleSetVis = useCallback((key: keyof VisibilitySettings, value: boolean) => {
    setVis(prev => ({ ...prev, [key]: value }));
    saveSettings({ [key]: value } as Record<string, boolean>);
  }, []);

  const handleSetSphereImageScale = useCallback((scale: number) => {
    setSphereImageScale(scale);
    saveSettings({ sphereImageScale: scale });
  }, []);

  const handleSetSphereGalleryImages = useCallback((imgs: { id: string; url: string; alt: string }[]) => {
    setSphereGalleryImages(imgs);
    saveSettings({ sphereGalleryImages: imgs });
  }, []);

  const handleSaveBook = useCallback((book: Book) => {
    saveBook(book);
  }, []);

  const handleDeleteBook = useCallback((id: string) => {
    deleteBook(id);
  }, []);

  return (
    <HelmetProvider>
      {showIntro && <IntroScreen onDone={() => setShowIntro(false)} />}
      <SiteContentProvider
        content={siteContent}
        mediaLibrary={mediaLibrary}
        onSave={saveSiteContent}
      >
      <Router>
        <ScrollToTop />
        <StarField />
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            isAuthenticated === null ? (
              <div className="min-h-screen bg-midnight flex items-center justify-center">
                <div className="text-slate-400 animate-pulse">Chargement...</div>
              </div>
            ) : isAdmin ? (
              <AdminLayout>
                <Routes>
                  <Route index element={<AdminDashboard showVisitorCount={showVisitorCount} setShowVisitorCount={handleSetShowVisitorCount} leads={leads} />} />
                  <Route path="commandes" element={<AdminOrders />} />
                  <Route path="factures" element={<AdminInvoices />} />
                  <Route path="echelle" element={<AdminProductLadder offers={offers} />} />
                  <Route path="studio" element={<AdminSocialStudio mediaLibrary={mediaLibrary} setMediaLibrary={handleSetMediaLibrary} />} />
                  <Route path="contenu" element={<AdminBlog posts={posts} setPosts={handleSetPosts} mediaLibrary={mediaLibrary} />} />
                  <Route path="evenements" element={<AdminEvents events={events} setEvents={handleSetEvents} mediaLibrary={mediaLibrary} />} />
                  <Route path="medias" element={<AdminMedia profileImage={profileImage} setProfileImage={handleSetProfileImage} mediaLibrary={mediaLibrary} setMediaLibrary={handleSetMediaLibrary} sphereGalleryImages={sphereGalleryImages} onSetSphereGalleryImages={handleSetSphereGalleryImages} />} />
                  <Route path="produits" element={<AdminInventory books={firestoreBooks} onSave={handleSaveBook} onDelete={handleDeleteBook} mediaLibrary={mediaLibrary} />} />
                  <Route path="codes-promo" element={<AdminPromoCodes />} />
                  <Route path="temoignages" element={<AdminTestimonials />} />
                  <Route path="lead-magnet" element={<AdminLeadMagnet />} />
                  <Route path="conferences" element={<AdminConferences conferences={conferences} setConferences={handleSetConferences} mediaLibrary={mediaLibrary} />} />
                  <Route path="interviews" element={<AdminInterviews interviews={interviews} setInterviews={handleSetInterviews} />} />
                  <Route path="kanban" element={<AdminKanban />} />
                  <Route path="communaute" element={<AdminCommunaute />} />
                  <Route path="visibilite" element={<AdminVisibilite vis={vis} onSetVis={handleSetVis} sphereImageScale={sphereImageScale} onSetSphereImageScale={handleSetSphereImageScale} />} />
                  <Route path="editeur" element={<AdminSiteEditor profileImage={profileImage} posts={posts} events={events} conferences={conferences} interviews={interviews} books={firestoreBooks} addToCart={addToCart} visitorCount={visitorCount} showVisitorCount={showVisitorCount} />} />
                  <Route path="*" element={<div className="text-center p-12 text-slate-500">Section en développement...</div>} />
                </Routes>
              </AdminLayout>
            ) : (
              <AdminLogin />
            )
          } />

          {/* Public Routes */}
          <Route path="*" element={
            <div className="relative min-h-screen text-white">
              <Navigation cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} vis={vis} />
              <CartDrawer 
                isOpen={isCartOpen} 
                onClose={() => setIsCartOpen(false)} 
                cartItems={cartItems}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
              />
              <Routes>
                <Route path="/" element={<HomePage profileImage={profileImage} vis={vis} sphereImageScale={sphereImageScale} sphereGalleryImages={sphereGalleryImages.length > 0 ? sphereGalleryImages : undefined} />} />
                <Route path="/a-propos" element={
                  vis.hidePageAPropos ? <Navigate to="/" replace /> : <AProposPage vis={vis} />
                } />
                <Route path="/boutique" element={
                  vis.hidePageBoutique ? <Navigate to="/" replace /> : <ShopPage books={firestoreBooks} addToCart={addToCart} />
                } />
                <Route path="/checkout" element={
                  <>
                    <Helmet>
                      <title>Caroline Gérard | Caisse</title>
                      <meta name="robots" content="noindex, nofollow" />
                    </Helmet>
                    <CheckoutPage cartItems={cartItems} total={cartTotal} onOrderComplete={() => setCartItems([])} />
                  </>
                } />
                <Route path="/blog" element={
                  vis.hidePageBlog ? <Navigate to="/" replace /> : <BlogPage posts={posts} />
                } />
                <Route path="/evenements" element={
                  vis.hidePageEvenements ? <Navigate to="/" replace /> : <EventsPage events={events} />
                } />
                <Route path="/conferences" element={
                  vis.hideConferences ? <Navigate to="/" replace /> : <ConferencesPage conferences={conferences} />
                } />
                <Route path="/interviews" element={
                  vis.hidePageInterviews ? <Navigate to="/" replace /> : <InterviewsPage interviews={interviews} />
                } />
                <Route path="/contact" element={
                  vis.hidePageContact ? <Navigate to="/" replace /> : <ContactPage vis={vis} />
                } />
                <Route path="/communaute" element={
                  vis.hideEspaceClient ? <Navigate to="/" replace /> :
                  <CommunautePage posts={posts} events={events} conferences={conferences} />
                } />
                <Route path="/conditions" element={<TermsPage />} />
                {/* Fallback to Home if unknown route in public section */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Footer visitorCount={visitorCount} showVisitorCount={showVisitorCount} vis={vis} />
              <CookieBanner />
            </div>
          } />
        </Routes>
      </Router>
      </SiteContentProvider>
    </HelmetProvider>
  );
};

export default App;
