import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { trackAddToCart, trackBeginCheckout, trackPageView } from './lib/analytics';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { 
  Feather, 
  ShoppingCart, 
  Menu, 
  X,
  Facebook,
  Lock,
  Eye,
} from 'lucide-react';

import StarField from './components/StarField';
import CartDrawer from './components/CartDrawer';
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
import { SiteContentProvider } from './contexts/SiteContentContext';

import { recentOrders, salesData, blogPosts } from './data';
import { Book, Order, ProductOffer, CartItem, BlogPost, Conference, Lead, AppEvent, Interview } from './types';
import {
  subscribeToPosts, savePost, deletePost,
  subscribeToEvents, saveEvent, deleteEvent,
  subscribeToConferences, saveConference, deleteConference,
  subscribeToInterviews, saveInterview, deleteInterview,
  subscribeToSettings, saveSettings,
  subscribeToLeads,
  subscribeToSiteContent, saveSiteContent,
  seedIfEmpty,
} from './lib/firestore';
import type { SiteContent } from './lib/firestore';

// --- Layout Components ---

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(pathname);
  }, [pathname]);

  return null;
};

const Navigation = ({ cartCount, onOpenCart }: { cartCount: number, onOpenCart: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) return null; 

  return (
    <nav className="fixed w-full z-50 top-0 px-6 py-6 transition-all duration-300">
      <div className="w-full bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 px-8 py-4 flex justify-between items-center shadow-2xl">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-gold/20 p-2 rounded-full group-hover:bg-gold/40 transition-colors">
            <Feather className="text-gold w-6 h-6" />
          </div>
          <span className="font-serif text-2xl text-white tracking-wide">
            Caroline <span className="text-gold">Gérard</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8 xl:gap-10">
          <Link to="/" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Accueil</Link>
          <Link to="/boutique" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Boutique</Link>
          <Link to="/evenements" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Événements</Link>
          <Link to="/interviews" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Médias</Link>
          <Link to="/conferences" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Conférence</Link>
          <Link to="/blog" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Blog</Link>
          <Link to="/contact" className="text-sm font-bold hover:text-gold transition-colors tracking-widest uppercase">Contact</Link>
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

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute top-24 left-6 right-6 bg-deep-blue rounded-xl p-8 flex flex-col gap-6 border border-gold/20 shadow-xl lg:hidden z-50">
          <Link to="/" onClick={() => setIsOpen(false)} className="text-xl font-serif text-center hover:text-gold">Accueil</Link>
          <Link to="/boutique" onClick={() => setIsOpen(false)} className="text-xl font-serif text-center hover:text-gold">Boutique</Link>
          <Link to="/evenements" onClick={() => setIsOpen(false)} className="text-xl font-serif text-center hover:text-gold">Événements</Link>
          <Link to="/interviews" onClick={() => setIsOpen(false)} className="text-xl font-serif text-center hover:text-gold">Médias</Link>
          <Link to="/conferences" onClick={() => setIsOpen(false)} className="text-xl font-serif text-center hover:text-gold">Conférence</Link>
          <Link to="/blog" onClick={() => setIsOpen(false)} className="text-xl font-serif text-center hover:text-gold">Blog</Link>
          <Link to="/contact" onClick={() => setIsOpen(false)} className="text-xl font-serif text-center hover:text-gold">Contact</Link>
        </div>
      )}
    </nav>
  );
};

const Footer = ({ visitorCount, showVisitorCount }: { visitorCount: number, showVisitorCount: boolean }) => (
  <footer className="bg-midnight/60 backdrop-blur-md border-t border-white/5 py-12 px-8 relative z-10 w-full">
    <div className="w-full flex flex-col md:flex-row justify-between items-center gap-8">
      <div className="text-center md:text-left">
        <h3 className="font-serif text-3xl text-gold mb-2">Caroline Gérard</h3>
        <p className="text-slate-400 max-w-sm">
          Accompagner mon fils sur sa route et l&apos;aider à croire en ses rêves.
        </p>
      </div>
      <div className="flex gap-6">
        <a href="https://www.facebook.com/caroline.gerard.338" target="_blank" rel="noopener noreferrer" className="p-4 bg-white/5 rounded-full hover:bg-gold hover:text-midnight transition-all">
          <Facebook className="w-6 h-6" />
        </a>
      </div>
      <div className="text-sm text-slate-600 flex flex-col items-center md:items-end gap-4">
        <p>© 2026 Copyright Vexel Studio. Tous droits réservés.</p>
        <div className="flex items-center gap-6">
          {showVisitorCount && (
            <div className="flex items-center gap-2 text-slate-500">
              <Eye size={14} />
              <span>{visitorCount.toLocaleString('fr-FR')} Visiteurs</span>
            </div>
          )}
          <Link to="/admin" className="flex items-center gap-2 text-slate-500 hover:text-gold transition-colors px-3 py-1.5 border border-slate-800 rounded-lg hover:border-gold/50">
            <Lock className="w-3 h-3" /> Espace Admin
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

// --- App Container ---

const App = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Lifted state for Profile Image
  const [profileImage, setProfileImage] = useState<string>('https://storage.googleapis.com/salondesinconnus/Caroline/Gemini_Generated_Image_8wrovw8wrovw8wro.png');
  
  // Lifted state for Offers to share between Admin and Public
  const [offers] = useState<ProductOffer[]>([
    { id: '1', title: 'Guide PDF Gratuit', price: 0, category: 'freemium', description: 'Lead magnet pour capturer des emails', status: 'active', type: 'product', isPublished: true },
    { id: '2', title: 'Atelier Découverte', price: 47, category: 'low', description: 'Session zoom de 1h pour découvrir votre potentiel', status: 'active', type: 'service', isPublished: true },
    { id: '3', title: 'Formation En Ligne', price: 197, category: 'mid', description: 'Accès à vie au portail de formation', status: 'planned', type: 'product', isPublished: false },
    { id: '4', title: 'Coaching de Groupe', price: 997, category: 'high', description: '12 semaines intensives de transformation', status: 'concept', type: 'service', isPublished: false },
    { id: '5', title: 'Mentorat Privé', price: 2500, category: 'premium', description: 'Accompagnement VIP 1-on-1', status: 'active', type: 'service', isPublished: false },
  ]);

  // Admin Dashboard State
  const [recentOrdersList, setRecentOrdersList] = useState<Order[]>(recentOrders);
  const [salesDataState, setSalesDataState] = useState(salesData);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<string[]>([]);
  const [visitorCount] = useState(1284);
  const [showVisitorCount, setShowVisitorCount] = useState(true);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent>({});

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
    return onAuthStateChanged(auth, user => setIsAuthenticated(!!user));
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
      }),
      subscribeToSiteContent(setSiteContent),
    ];
    seedIfEmpty(blogPosts);
    return () => unsubs.forEach(u => u());
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

  return (
    <HelmetProvider>
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
            ) : isAuthenticated ? (
              <AdminLayout>
                <Routes>
                  <Route index element={<AdminDashboard recentOrdersList={recentOrdersList} setRecentOrdersList={setRecentOrdersList} salesDataState={salesDataState} setSalesDataState={setSalesDataState} visitorCount={visitorCount} showVisitorCount={showVisitorCount} setShowVisitorCount={handleSetShowVisitorCount} leads={leads} />} />
                  <Route path="commandes" element={<AdminOrders />} />
                  <Route path="factures" element={<AdminInvoices />} />
                  <Route path="echelle" element={<AdminProductLadder offers={offers} />} />
                  <Route path="studio" element={<AdminSocialStudio mediaLibrary={mediaLibrary} setMediaLibrary={handleSetMediaLibrary} />} />
                  <Route path="contenu" element={<AdminBlog posts={posts} setPosts={handleSetPosts} mediaLibrary={mediaLibrary} />} />
                  <Route path="evenements" element={<AdminEvents events={events} setEvents={handleSetEvents} mediaLibrary={mediaLibrary} />} />
                  <Route path="medias" element={<AdminMedia profileImage={profileImage} setProfileImage={handleSetProfileImage} mediaLibrary={mediaLibrary} setMediaLibrary={handleSetMediaLibrary} />} />
                  <Route path="produits" element={<AdminInventory />} />
                  <Route path="conferences" element={<AdminConferences conferences={conferences} setConferences={handleSetConferences} mediaLibrary={mediaLibrary} />} />
                  <Route path="interviews" element={<AdminInterviews interviews={interviews} setInterviews={handleSetInterviews} />} />
                  <Route path="kanban" element={<AdminKanban />} />
                  <Route path="editeur" element={<AdminSiteEditor profileImage={profileImage} />} />
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
              <Navigation cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />
              <CartDrawer 
                isOpen={isCartOpen} 
                onClose={() => setIsCartOpen(false)} 
                cartItems={cartItems}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
              />
              <Routes>
                <Route path="/" element={
                  <>
                    <Helmet>
                      <title>Caroline Gérard | Accueil</title>
                      <meta name="description" content="Bienvenue dans l'univers de Caroline Gérard et William Lorrain." />
                    </Helmet>
                    <HomePage profileImage={profileImage} />
                  </>
                } />
                <Route path="/boutique" element={
                  <>
                    <Helmet>
                      <title>Caroline Gérard | Boutique</title>
                      <meta name="description" content="Découvrez nos livres et laissez-vous emporter par la magie des mots." />
                    </Helmet>
                    <ShopPage addToCart={addToCart} />
                  </>
                } />
                <Route path="/checkout" element={
                  <>
                    <Helmet>
                      <title>Caroline Gérard | Caisse</title>
                    </Helmet>
                    <CheckoutPage cartItems={cartItems} total={cartTotal} />
                  </>
                } />
                <Route path="/blog" element={
                  <>
                    <Helmet>
                      <title>Caroline Gérard | Blog</title>
                    </Helmet>
                    <BlogPage posts={posts} />
                  </>
                } />
                <Route path="/evenements" element={
                  <>
                    <Helmet>
                      <title>Caroline Gérard | Événements</title>
                    </Helmet>
                    <EventsPage events={events} />
                  </>
                } />
                <Route path="/conferences" element={
                  <>
                    <Helmet>
                      <title>Caroline Gérard | Conférences</title>
                    </Helmet>
                    <ConferencesPage conferences={conferences} />
                  </>
                } />
                <Route path="/interviews" element={
                  <>
                    <Helmet>
                      <title>Caroline Gérard | Interviews & Médias</title>
                    </Helmet>
                    <InterviewsPage interviews={interviews} />
                  </>
                } />
                <Route path="/contact" element={
                  <>
                    <Helmet>
                      <title>Caroline Gérard | Contact</title>
                    </Helmet>
                    <ContactPage />
                  </>
                } />
                {/* Fallback to Home if unknown route in public section */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Footer visitorCount={visitorCount} showVisitorCount={showVisitorCount} />
            </div>
          } />
        </Routes>
      </Router>
      </SiteContentProvider>
    </HelmetProvider>
  );
};

export default App;
