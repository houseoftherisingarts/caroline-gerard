import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { saveMember, subscribeToMemberMessages, sendCommunityMessage, markMessageRead } from '../lib/firestore';
import { BlogPost, AppEvent, Conference, Member, Order, CommunityMessage } from '../types';
import EditableText from '../components/EditableText';
import { useEditableString } from '../components/EditableField';
import {
  Star,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  BookOpen,
  Calendar,
  ShoppingBag,
  ExternalLink,
  Download,
  CheckCircle,
  MessageSquare,
  Send,
} from 'lucide-react';
// ─── ICS builder ─────────────────────────────────────────────────────────────

function toICSDate(dateStr: string): string {
  return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function downloadICS(event: AppEvent) {
  const start = toICSDate(event.date);
  const end = toICSDate(new Date(new Date(event.date).getTime() + 2 * 3600 * 1000).toISOString());
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    `SUMMARY:${event.title}`, `DTSTART:${start}`, `DTEND:${end}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${event.title.replace(/\s+/g, '_')}.ics` });
  a.click();
}

function googleCalendarLink(event: AppEvent): string {
  const start = toICSDate(event.date);
  const end = toICSDate(new Date(new Date(event.date).getTime() + 2 * 3600 * 1000).toISOString());
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${start}/${end}`, details: event.description, location: event.location })}`;
}

// ─── Member registration on first sign-in ────────────────────────────────────

async function ensureMemberSaved(user: User) {
  if (user.email?.endsWith('@admin.local')) return;
  try {
    await saveMember({
      id: user.uid, uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? user.email ?? '',
      photoURL: user.photoURL ?? undefined,
      provider: user.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
      joinedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to save member profile:', err);
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Tab = 'actualites' | 'commandes' | 'evenements' | 'messages';

const TabButton = ({ id, label, active, badge, onClick }: { id: Tab; label: React.ReactNode; active: boolean; badge?: number; onClick: (t: Tab) => void }) => (
  <button
    onClick={() => onClick(id)}
    className={`relative px-5 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-gold text-midnight shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
  >
    {label}
    {!!badge && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </button>
);

// ─── Chat bubble ─────────────────────────────────────────────────────────────

const Bubble = ({ msg, isOwnMessage }: { msg: CommunityMessage; isOwnMessage: boolean }) => (
  <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
    <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
      isOwnMessage
        ? 'bg-gold text-midnight rounded-br-sm'
        : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
    }`}>
      {!isOwnMessage && <EditableText tag="p" contentKey="comm_bubble_caroline_name" defaultValue="Caroline Gérard" className="text-xs font-bold text-gold mb-1" />}
      {msg.body}
      <p className={`text-[10px] mt-1 ${isOwnMessage ? 'text-midnight/60 text-right' : 'text-slate-500'}`}>
        {new Date(msg.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        {isOwnMessage && !msg.read && <span className="ml-1">· <EditableText tag="span" contentKey="comm_msg_pending" defaultValue="En attente" /></span>}
        {isOwnMessage && msg.read && <span className="ml-1">· <EditableText tag="span" contentKey="comm_msg_read" defaultValue="Lu ✓" /></span>}
      </p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

interface CommunautePageProps {
  posts: BlogPost[];
  events: AppEvent[];
  conferences: Conference[];
}

const CommunautePage = ({ posts, events, conferences }: CommunautePageProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('actualites');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [msgDraft, setMsgDraft] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Email auth form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Editable strings (placeholders, error messages, dynamic labels)
  const placeholderEmail = useEditableString('comm_auth_email_placeholder', 'Courriel');
  const placeholderPassword = useEditableString('comm_auth_password_placeholder', 'Mot de passe');
  const placeholderMsgDraft = useEditableString('comm_chat_input_placeholder', 'Écris ton message… (Entrée pour envoyer)');
  const errGenericConnection = useEditableString('comm_auth_err_generic', 'Erreur de connexion.');
  const errBadCredentials = useEditableString('comm_auth_err_bad_creds', 'Courriel ou mot de passe incorrect.');
  const errEmailInUse = useEditableString('comm_auth_err_email_in_use', 'Ce courriel est déjà utilisé. Essaie de te connecter.');
  const errWeakPassword = useEditableString('comm_auth_err_weak_pwd', 'Le mot de passe doit contenir au moins 6 caractères.');

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u && !u.email?.endsWith('@admin.local')) {
        setUser(u);
        await ensureMemberSaved(u);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
  }, []);

  // Subscribe to messages for this member
  useEffect(() => {
    if (!user) return;
    return subscribeToMemberMessages(user.uid, msgs => {
      setMessages(msgs);
      // Mark Caroline's unread messages as read
      msgs.filter(m => m.direction === 'from_caroline' && !m.read)
          .forEach(m => markMessageRead(m.id));
    });
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch orders when switching to that tab
  useEffect(() => {
    if (tab !== 'commandes' || !user?.email) return;
    setOrdersLoading(true);
    getDocs(query(collection(db, 'orders'), where('email', '==', user.email)))
      .then(snap => setOrders(snap.docs.map(d => d.data() as Order)))
      .finally(() => setOrdersLoading(false));
  }, [tab, user]);

  const unreadFromCaroline = messages.filter(m => m.direction === 'from_caroline' && !m.read).length;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgDraft.trim() || !user) return;
    setMsgSending(true);
    const msg: CommunityMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      memberId: user.uid,
      memberEmail: user.email ?? '',
      memberName: user.displayName ?? user.email ?? '',
      direction: 'from_member',
      body: msgDraft.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    await sendCommunityMessage(msg);
    setMsgDraft('');
    setMsgSending(false);
  };

  const handleGoogleSignIn = async () => {
    setAuthError(''); setAuthBusy(true);
    try { await signInWithPopup(auth, googleProvider); }
    catch (e: unknown) { setAuthError((e as Error).message ?? errGenericConnection); }
    finally { setAuthBusy(false); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthBusy(true);
    try {
      if (isRegister) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential'))
        setAuthError(errBadCredentials);
      else if (code.includes('email-already-in-use'))
        setAuthError(errEmailInUse);
      else if (code.includes('weak-password'))
        setAuthError(errWeakPassword);
      else setAuthError((e as Error).message ?? errGenericConnection);
    } finally { setAuthBusy(false); }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <EditableText tag="div" contentKey="comm_loading" defaultValue="Chargement..." className="text-slate-400 animate-pulse" />
    </div>
  );

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen pt-32 pb-16 px-6 flex flex-col items-center justify-center">
      <Helmet>
        <title>Caroline Gérard | Communauté des Rêveurs</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Espace membre privé de la communauté des rêveurs de Caroline Gérard." />
      </Helmet>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-4">
            <Star className="w-4 h-4 fill-current" />
            <EditableText tag="span" contentKey="comm_login_badge" defaultValue="Communauté des Rêveurs" className="text-xs font-bold uppercase tracking-widest" />
          </div>
          <EditableText tag="h1" contentKey="comm_login_title" defaultValue="Ton espace membre" className="font-serif text-4xl text-white mb-2" />
          <EditableText tag="p" contentKey="comm_login_subtitle" defaultValue="Actualités, commandes, événements et messagerie." className="text-slate-400" />
        </div>
        <div className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <button onClick={handleGoogleSignIn} disabled={authBusy}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white text-gray-800 font-bold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 mb-6">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {authBusy
              ? <EditableText tag="span" contentKey="comm_auth_connecting" defaultValue="Connexion..." />
              : <EditableText tag="span" contentKey="comm_auth_google_btn" defaultValue="Continuer avec Google" />}
          </button>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <EditableText tag="span" contentKey="comm_auth_separator" defaultValue="ou" className="text-slate-500 text-sm" />
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={placeholderEmail} required
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={placeholderPassword} required minLength={6}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors" />
            </div>
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            <button type="submit" disabled={authBusy}
              className="w-full py-3.5 bg-gold text-midnight font-bold rounded-xl hover:bg-white transition-colors disabled:opacity-50">
              {authBusy
                ? <EditableText tag="span" contentKey="comm_auth_submitting" defaultValue="Connexion..." />
                : isRegister
                  ? <EditableText tag="span" contentKey="comm_auth_register_btn" defaultValue="Créer mon compte" />
                  : <EditableText tag="span" contentKey="comm_auth_signin_btn" defaultValue="Se connecter" />}
            </button>
          </form>
          <button onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
            className="w-full text-center text-slate-400 text-sm mt-4 hover:text-white transition-colors">
            {isRegister
              ? <EditableText tag="span" contentKey="comm_auth_toggle_to_signin" defaultValue="Déjà un compte? Se connecter" />
              : <EditableText tag="span" contentKey="comm_auth_toggle_to_register" defaultValue="Pas de compte? S'inscrire gratuitement" />}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Logged in ──────────────────────────────────────────────────────────────
  const publishedPosts = posts.filter(p => p.isPublished);
  const publishedEvents = events.filter(e => e.isPublished).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const publishedConfs = conferences.filter(c => c.isPublished);

  return (
    <div className="min-h-screen pt-32 pb-16 px-6 md:px-12">
      <Helmet>
        <title>Caroline Gérard | Communauté des Rêveurs</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.photoURL
            ? <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full border-2 border-gold/40" />
            : <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center border-2 border-gold/40"><UserIcon className="text-gold w-6 h-6" /></div>
          }
          <div>
            <p className="text-white font-bold">{user.displayName ?? user.email}</p>
            <EditableText tag="p" contentKey="comm_header_subtitle" defaultValue="Communauté des Rêveurs" className="text-slate-500 text-sm" />
          </div>
        </div>
        <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition-colors">
          <LogOut className="w-4 h-4" /> <EditableText tag="span" contentKey="comm_signout_btn" defaultValue="Se déconnecter" />
        </button>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-2 flex-wrap mb-8 p-2 bg-midnight/60 rounded-xl border border-white/10 w-fit">
          <TabButton id="actualites" label={<EditableText tag="span" contentKey="comm_tab_actualites" defaultValue="Actualités" />} active={tab === 'actualites'} onClick={setTab} />
          <TabButton id="commandes" label={<EditableText tag="span" contentKey="comm_tab_commandes" defaultValue="Mes commandes" />} active={tab === 'commandes'} onClick={setTab} />
          <TabButton id="evenements" label={<EditableText tag="span" contentKey="comm_tab_evenements" defaultValue="Événements" />} active={tab === 'evenements'} onClick={setTab} />
          <TabButton id="messages" label={<EditableText tag="span" contentKey="comm_tab_messages" defaultValue="Messages" />} active={tab === 'messages'} badge={unreadFromCaroline} onClick={setTab} />
        </div>

        {/* ── Actualités ── */}
        {tab === 'actualites' && (
          <div className="space-y-4">
            {publishedConfs.length === 0 && publishedPosts.length === 0
              ? <EditableText tag="p" contentKey="comm_actualites_empty" defaultValue="Aucune actualité pour le moment." className="text-slate-500 text-center py-16" />
              : <>
                  {publishedConfs.slice(0, 3).map(c => (
                    <div key={c.id} className="bg-midnight/60 border border-white/10 rounded-xl p-6 flex gap-4 items-start hover:border-gold/30 transition-colors">
                      {c.image && <img src={c.image} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <EditableText tag="span" contentKey="comm_actualites_conf_badge" defaultValue="Conférence" className="text-xs text-gold font-bold uppercase tracking-wider" />
                        <h3 className="text-white font-bold mt-1">{c.title}</h3>
                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">{c.description}</p>
                      </div>
                    </div>
                  ))}
                  {publishedPosts.slice(0, 6).map(post => (
                    <div key={post.id} className="bg-midnight/60 border border-white/10 rounded-xl p-6 flex gap-4 items-start hover:border-gold/30 transition-colors">
                      {post.image && <img src={post.image} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <EditableText tag="span" contentKey="comm_actualites_blog_badge" defaultValue="Article de blog" className="text-xs text-blue-400 font-bold uppercase tracking-wider" />
                        <h3 className="text-white font-bold mt-1">{post.title}</h3>
                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">{post.excerpt}</p>
                        <p className="text-slate-600 text-xs mt-2">{new Date(post.date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <BookOpen className="text-slate-600 w-5 h-5 shrink-0 mt-1" />
                    </div>
                  ))}
                </>
            }
          </div>
        )}

        {/* ── Commandes ── */}
        {tab === 'commandes' && (
          <div>
            {ordersLoading
              ? <EditableText tag="p" contentKey="comm_orders_loading" defaultValue="Chargement de tes commandes..." className="text-slate-500 text-center py-16 animate-pulse" />
              : orders.length === 0
                ? <div className="text-center py-16"><ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-4" /><EditableText tag="p" contentKey="comm_orders_empty" defaultValue="Aucune commande trouvée pour ce compte." className="text-slate-500" /></div>
                : <div className="space-y-4">
                    {orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
                      <div key={order.id} className="bg-midnight/60 border border-white/10 rounded-xl p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div>
                            <p className="text-white font-bold">{order.id}</p>
                            <p className="text-slate-500 text-sm">{new Date(order.date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${order.status === 'Envoyé' ? 'bg-green-500/20 text-green-400' : order.status === 'Payé' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {order.status}
                            </span>
                            <span className="text-gold font-bold">{order.total.toFixed(2)} $</span>
                          </div>
                        </div>
                        <div className="space-y-1 border-t border-white/5 pt-3">
                          {order.items.map((item, i) => <p key={i} className="text-slate-400 text-sm">{item.quantity}× {item.title}</p>)}
                        </div>
                        {order.status === 'Envoyé' && (
                          <div className="mt-3 flex items-center gap-2 text-green-400 text-sm"><CheckCircle className="w-4 h-4" /> <EditableText tag="span" contentKey="comm_order_shipped_msg" defaultValue="Ton livre est en route!" /></div>
                        )}
                      </div>
                    ))}
                  </div>
            }
          </div>
        )}

        {/* ── Événements ── */}
        {tab === 'evenements' && (
          <div className="space-y-4">
            {publishedEvents.length === 0
              ? <div className="text-center py-16"><Calendar className="w-12 h-12 text-slate-700 mx-auto mb-4" /><EditableText tag="p" contentKey="comm_events_empty" defaultValue="Aucun événement à venir." className="text-slate-500" /></div>
              : publishedEvents.map(event => (
                  <div key={event.id} className="bg-midnight/60 border border-white/10 rounded-xl p-6 hover:border-gold/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="text-gold w-4 h-4 shrink-0" />
                          <span className="text-gold text-sm font-bold">
                            {new Date(event.date).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <h3 className="text-white font-bold text-lg">{event.title}</h3>
                        <p className="text-slate-400 text-sm mt-1">{event.location}</p>
                        <p className="text-slate-500 text-sm mt-2 line-clamp-2">{event.description}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <a href={googleCalendarLink(event)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-sm font-bold transition-colors whitespace-nowrap">
                          <ExternalLink className="w-4 h-4" /> <EditableText tag="span" contentKey="comm_event_google_btn" defaultValue="Google Agenda" />
                        </a>
                        <button onClick={() => downloadICS(event)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap">
                          <Download className="w-4 h-4" /> <EditableText tag="span" contentKey="comm_event_ics_btn" defaultValue="Télécharger .ics" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        )}

        {/* ── Messages ── */}
        {tab === 'messages' && (
          <div className="bg-midnight/60 border border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ height: '65vh' }}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3 shrink-0">
              <MessageSquare className="text-gold w-5 h-5" />
              <div>
                <EditableText tag="p" contentKey="comm_chat_header_name" defaultValue="Caroline Gérard" className="text-white font-bold" />
                <EditableText tag="p" contentKey="comm_chat_header_subtitle" defaultValue="Messagerie privée" className="text-slate-500 text-xs" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <MessageSquare className="w-12 h-12 text-slate-700 mb-4" />
                  <EditableText tag="p" contentKey="comm_chat_empty_title" defaultValue="Aucun message pour le moment." className="text-slate-500 text-sm" />
                  <EditableText tag="p" contentKey="comm_chat_empty_subtitle" defaultValue="Envoyez un message à Caroline ci-dessous." className="text-slate-600 text-xs mt-1" />
                </div>
              )}
              {messages.map(msg => (
                <React.Fragment key={msg.id}>
                  <Bubble msg={msg} isOwnMessage={msg.direction === 'from_member'} />
                </React.Fragment>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="px-4 py-4 border-t border-white/10 flex gap-3 shrink-0">
              <textarea
                value={msgDraft}
                onChange={e => setMsgDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as unknown as React.FormEvent); } }}
                placeholder={placeholderMsgDraft}
                rows={2}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors resize-none text-sm"
              />
              <button
                type="submit"
                disabled={msgSending || !msgDraft.trim()}
                className="px-4 py-3 bg-gold text-midnight rounded-xl hover:bg-white transition-colors disabled:opacity-40 shrink-0 self-end"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunautePage;
