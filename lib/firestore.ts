import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  increment,
  query,
  where,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { BlogPost, AppEvent, Conference, Interview, Lead, Subscriber, Member, CommunityMessage, Book, PromoCode, EmailLog, Testimonial, ConsignmentLocation, ConsignmentMovement } from '../types';

// --- Generic helper ---

function subscribeToCollection<T>(name: string, cb: (items: T[]) => void) {
  return onSnapshot(collection(db, name), snap => {
    cb(snap.docs.map(d => d.data() as T));
  });
}

// --- Books ---

export const subscribeToBooks = (cb: (books: Book[]) => void) =>
  subscribeToCollection<Book>('books', cb);

export const saveBook = (book: Book) =>
  setDoc(doc(db, 'books', book.id), book);

export const deleteBook = (id: string) =>
  deleteDoc(doc(db, 'books', id));

// --- Promo Codes ---

export const subscribeToPromoCodes = (cb: (codes: PromoCode[]) => void) =>
  subscribeToCollection<PromoCode>('promoCodes', cb);

export const savePromoCode = (code: PromoCode) =>
  setDoc(doc(db, 'promoCodes', code.id), code);

export const deletePromoCode = (id: string) =>
  deleteDoc(doc(db, 'promoCodes', id));

export const getPromoCode = (code: string) =>
  getDoc(doc(db, 'promoCodes', code.toUpperCase().trim()));

export const incrementPromoUse = (id: string) =>
  updateDoc(doc(db, 'promoCodes', id), { usedCount: increment(1) });

// --- Blog Posts ---

export const subscribeToPosts = (cb: (posts: BlogPost[]) => void) =>
  subscribeToCollection<BlogPost>('posts', cb);

export const savePost = (post: BlogPost) =>
  setDoc(doc(db, 'posts', post.id), post);

export const deletePost = (id: string) =>
  deleteDoc(doc(db, 'posts', id));

// --- Events ---

export const subscribeToEvents = (cb: (events: AppEvent[]) => void) =>
  subscribeToCollection<AppEvent>('events', cb);

export const saveEvent = (event: AppEvent) =>
  setDoc(doc(db, 'events', event.id), event);

export const deleteEvent = (id: string) =>
  deleteDoc(doc(db, 'events', id));

// --- Conferences ---

export const subscribeToConferences = (cb: (conferences: Conference[]) => void) =>
  subscribeToCollection<Conference>('conferences', cb);

export const saveConference = (conference: Conference) =>
  setDoc(doc(db, 'conferences', conference.id), conference);

export const deleteConference = (id: string) =>
  deleteDoc(doc(db, 'conferences', id));

// --- Interviews ---

export const subscribeToInterviews = (cb: (interviews: Interview[]) => void) =>
  subscribeToCollection<Interview>('interviews', cb);

export const saveInterview = (interview: Interview) =>
  setDoc(doc(db, 'interviews', interview.id), interview);

export const deleteInterview = (id: string) =>
  deleteDoc(doc(db, 'interviews', id));

// --- Leads (CRM — formulaire de contact, demandes de conférence) ---

export const subscribeToLeads = (cb: (leads: Lead[]) => void) =>
  subscribeToCollection<Lead>('leads', cb);

export const saveLead = (lead: Lead) =>
  setDoc(doc(db, 'leads', lead.id), lead);

export const markLeadRead = (id: string, isRead = true) =>
  updateDoc(doc(db, 'leads', id), { isRead });

export const archiveLead = (id: string, archived = true) =>
  updateDoc(doc(db, 'leads', id), { archived });

export const deleteLead = (id: string) =>
  deleteDoc(doc(db, 'leads', id));

// --- Email log (audit trail of all outbound mail from Cloud Functions) ---

export const subscribeToEmailLog = (cb: (entries: EmailLog[]) => void) =>
  subscribeToCollection<EmailLog>('emailLog', cb);

export const deleteEmailLogEntry = (id: string) =>
  deleteDoc(doc(db, 'emailLog', id));

// --- Kanban ---

export type KanbanData = {
  projects: { id: string; name: string }[];
  tasks: {
    id: string;
    title: string;
    notes: string;
    deadline: string;
    status: string;
    projectId: string;
    subtasks: { id: string; title: string; completed: boolean }[];
  }[];
};

const kanbanRef = () => doc(db, 'kanban', 'main');

export const subscribeToKanban = (cb: (data: KanbanData) => void) =>
  onSnapshot(kanbanRef(), snap => {
    if (snap.exists()) cb(snap.data() as KanbanData);
  });

export const saveKanban = (data: KanbanData) =>
  setDoc(kanbanRef(), data);

// --- Invoices ---

export type StoredInvoice = {
  id: string;
  number: string;
  clientName: string;
  savedAt: string;
  meta: { number: string; date: string; dueDate: string; terms: string };
  billTo: { name: string; address: string; email: string };
  shipTo: { name: string; address: string; phone: string };
  items: { id: string; description: string; isTaxable: boolean; quantity: number; rate: number }[];
  shipping: { method: string; cost: number };
};

export const subscribeToInvoices = (cb: (invoices: StoredInvoice[]) => void) =>
  subscribeToCollection<StoredInvoice>('invoices', cb);

export const saveInvoice = (invoice: StoredInvoice) =>
  setDoc(doc(db, 'invoices', invoice.id), invoice);

export const deleteInvoice = (id: string) =>
  deleteDoc(doc(db, 'invoices', id));

// --- Abandoned Checkouts ---

export type AbandonedCheckout = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  cartItems: { title: string; price: number; quantity: number }[];
  subtotal: number;
  startedAt: string;
};

export const subscribeToAbandonedCheckouts = (cb: (items: AbandonedCheckout[]) => void) =>
  subscribeToCollection<AbandonedCheckout>('abandonedCheckouts', cb);

export const saveAbandonedCheckout = (checkout: AbandonedCheckout) =>
  setDoc(doc(db, 'abandonedCheckouts', checkout.id), checkout);

export const deleteAbandonedCheckout = (id: string) =>
  deleteDoc(doc(db, 'abandonedCheckouts', id));

// --- Visitor Counter (IP-unique, deduped server-side by the recordVisit fn) ---

const recordVisitFn = httpsCallable(functions, 'recordVisit');

// Pings the server once; the function dedupes by hashed IP so the same computer
// is only ever counted once. Failures are swallowed — a visit counter must never
// break the page.
export const recordVisit = (): Promise<unknown> =>
  recordVisitFn().catch(() => null);

export const subscribeToVisitorCount = (cb: (count: number) => void) =>
  onSnapshot(doc(db, 'settings', 'analytics'), snap => {
    const data = snap.exists() ? snap.data() : {};
    // Prefer the new IP-unique tally; fall back to the legacy raw counter.
    cb((data.uniqueVisitors ?? data.visitors ?? 0) as number);
  });

// --- Orders ---

export const subscribeToOrders = (cb: (orders: import('../types').Order[]) => void) =>
  subscribeToCollection<import('../types').Order>('orders', cb);

export const updateOrderStatus = (id: string, status: 'Payé' | 'Envoyé' | 'En attente') =>
  setDoc(doc(db, 'orders', id), { status }, { merge: true });

// --- Site Content (editable text & images) ---

export type SiteContent = Record<string, string>;

const siteContentRef = () => doc(db, 'settings', 'siteContent');

export const subscribeToSiteContent = (cb: (content: SiteContent) => void) =>
  onSnapshot(siteContentRef(), snap => {
    cb(snap.exists() ? (snap.data() as SiteContent) : {});
  });

export const saveSiteContent = (content: SiteContent) =>
  setDoc(siteContentRef(), content);

// --- Site Settings ---

export type VisibilitySettings = {
  // Pages (hides nav link + redirects route when true)
  hideConferences: boolean;
  hideEspaceClient: boolean;
  hidePageAPropos: boolean;
  hidePageBoutique: boolean;
  hidePageEvenements: boolean;
  hidePageInterviews: boolean;
  hidePageBlog: boolean;
  hidePageContact: boolean;
  // Sections — Accueil
  hideHomeHero: boolean;
  hideHomeMission: boolean;
  hideHomeGallery: boolean;
  hideHomeNewsletter: boolean;
  hideHomeLireLeBlog: boolean;
  // Sections — Contact
  hideContactForm: boolean;
  // Sections — À Propos
  hideAProposCaroline: boolean;
  hideAProposWilliam: boolean;
  hideAProposNewsletter: boolean;
  // Éléments communs
  hideFooterNewsletter: boolean;
  hideMemberCta: boolean;
};

export const DEFAULT_VIS: VisibilitySettings = {
  hideConferences: false,
  hideEspaceClient: false,
  hidePageAPropos: false,
  hidePageBoutique: false,
  hidePageEvenements: false,
  hidePageInterviews: false,
  hidePageBlog: false,
  hidePageContact: false,
  hideHomeHero: false,
  hideHomeMission: false,
  hideHomeGallery: false,
  hideHomeNewsletter: false,
  hideHomeLireLeBlog: false,
  hideContactForm: false,
  hideAProposCaroline: false,
  hideAProposWilliam: false,
  hideAProposNewsletter: false,
  hideFooterNewsletter: false,
  hideMemberCta: false,
};

export const VIS_KEYS = Object.keys(DEFAULT_VIS) as (keyof VisibilitySettings)[];

export type SiteSettings = {
  mediaLibrary?: string[];
  profileImage?: string;
  showVisitorCount?: boolean;
  leadMagnetEnabled?: boolean;
  leadMagnetUrl?: string;
  leadMagnetName?: string;
  leadMagnetDescription?: string;
  /** Scale factor for sphere gallery images. Default 0.28. Range 0.10–0.90. */
  sphereImageScale?: number;
  /** Photos displayed in the homepage sphere gallery. */
  sphereGalleryImages?: { id: string; url: string; alt: string; description?: string; showDescription?: boolean }[];
} & { [K in keyof VisibilitySettings]?: boolean };

const settingsRef = () => doc(db, 'settings', 'main');

export const subscribeToSettings = (cb: (s: SiteSettings) => void) =>
  onSnapshot(settingsRef(), snap => {
    if (snap.exists()) cb(snap.data() as SiteSettings);
  });

export const saveSettings = (settings: Partial<SiteSettings>) =>
  setDoc(settingsRef(), settings, { merge: true });

// --- Newsletter Subscribers ---

export const subscribeToSubscribers = (cb: (items: Subscriber[]) => void) =>
  subscribeToCollection<Subscriber>('subscribers', cb);

export const saveSubscriber = (sub: Subscriber) =>
  setDoc(doc(db, 'subscribers', sub.id), sub);

export const deleteSubscriber = (id: string) =>
  deleteDoc(doc(db, 'subscribers', id));

// --- Community Members ---

export const subscribeToMembers = (cb: (items: Member[]) => void) =>
  subscribeToCollection<Member>('members', cb);

export const saveMember = (member: Member) =>
  setDoc(doc(db, 'members', member.id), member);

export const deleteMember = (id: string) =>
  deleteDoc(doc(db, 'members', id));

// --- Community Messages ---

export const sendCommunityMessage = (msg: CommunityMessage) =>
  setDoc(doc(db, 'communityMessages', msg.id), msg);

// Subscribe to all messages for a specific member (member's own thread)
export const subscribeToMemberMessages = (memberId: string, cb: (msgs: CommunityMessage[]) => void) =>
  onSnapshot(
    query(collection(db, 'communityMessages'), where('memberId', '==', memberId), orderBy('createdAt', 'asc')),
    snap => cb(snap.docs.map(d => d.data() as CommunityMessage))
  );

// Subscribe to all messages (admin view)
export const subscribeToAllMessages = (cb: (msgs: CommunityMessage[]) => void) =>
  onSnapshot(
    query(collection(db, 'communityMessages'), orderBy('createdAt', 'asc')),
    snap => cb(snap.docs.map(d => d.data() as CommunityMessage))
  );

export const markMessageRead = (id: string) =>
  updateDoc(doc(db, 'communityMessages', id), { read: true });

export const deleteCommunityMessage = (id: string) =>
  deleteDoc(doc(db, 'communityMessages', id));

// --- Consignations (dépositaires) ---

export const subscribeToConsignmentLocations = (cb: (items: ConsignmentLocation[]) => void) =>
  subscribeToCollection<ConsignmentLocation>('consignmentLocations', cb);

export const saveConsignmentLocation = (loc: ConsignmentLocation) =>
  setDoc(doc(db, 'consignmentLocations', loc.id), loc);

export const deleteConsignmentLocation = (id: string) =>
  deleteDoc(doc(db, 'consignmentLocations', id));

export const subscribeToConsignmentMovements = (cb: (items: ConsignmentMovement[]) => void) =>
  subscribeToCollection<ConsignmentMovement>('consignmentMovements', cb);

export const saveConsignmentMovement = (mov: ConsignmentMovement) =>
  setDoc(doc(db, 'consignmentMovements', mov.id), mov);

export const deleteConsignmentMovement = (id: string) =>
  deleteDoc(doc(db, 'consignmentMovements', id));

// --- Testimonials ---

export const subscribeToTestimonials = (cb: (items: Testimonial[]) => void) =>
  subscribeToCollection<Testimonial>('testimonials', cb);

export const saveTestimonial = (t: Testimonial) =>
  setDoc(doc(db, 'testimonials', t.id), t);

export const deleteTestimonial = (id: string) =>
  deleteDoc(doc(db, 'testimonials', id));

export const toggleTestimonialPublished = (id: string, isPublished: boolean) =>
  updateDoc(doc(db, 'testimonials', id), { isPublished });

// --- Initial seed ---

const DEFAULT_MEDIA = [
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1455390582262-044cdead2708?q=80&w=1973&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop',
];

const DEFAULT_PROFILE_IMAGE =
  'https://storage.googleapis.com/salondesinconnus/Caroline/Gemini_Generated_Image_8wrovw8wrovw8wro.png';

export async function seedIfEmpty(initialPosts: BlogPost[], initialBooks: Book[]) {
  const postsSnap = await getDocs(collection(db, 'posts'));
  if (postsSnap.empty && initialPosts.length > 0) {
    const batch = writeBatch(db);
    initialPosts.forEach(post => batch.set(doc(db, 'posts', post.id), post));
    await batch.commit();
  }

  const booksSnap = await getDocs(collection(db, 'books'));
  if (booksSnap.empty && initialBooks.length > 0) {
    const batch = writeBatch(db);
    initialBooks.forEach(book => batch.set(doc(db, 'books', book.id), book));
    await batch.commit();
  }

  const settingsSnap = await getDoc(settingsRef());
  if (!settingsSnap.exists()) {
    await setDoc(settingsRef(), {
      mediaLibrary: DEFAULT_MEDIA,
      profileImage: DEFAULT_PROFILE_IMAGE,
      showVisitorCount: true,
    });
  }
}
