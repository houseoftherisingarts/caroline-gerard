export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  price: number;
  image: string;
  backImage?: string;
  pageImages?: string[];
  color: string;
  comingSoon?: boolean;
  isHidden?: boolean;
  // Bibliographic metadata
  format?: string;       // e.g. "6 × 9 pouces"
  pageCount?: number;    // e.g. 288
  redaction?: string;    // writing credits
  direction?: string;    // ideation / direction
  coordination?: string; // coordination / accompaniment
  revision?: string;     // proofreading / révision
  coverDesign?: string;  // cover & graphic design
  layout?: string;       // mise en page
  isbnPrint?: string;    // ISBN imprimé
  isbnPdf?: string;      // ISBN PDF
  isbnEpub?: string;     // ISBN ePUB
  wrapped?: boolean;     // show as sealed gift instead of 3D book
  isLocked?: boolean;    // when true (or undefined), clicking the cover does NOT open the flip modal
}

export type PromoCode = {
  id: string;          // uppercased code — used as Firestore doc ID
  code: string;
  percentage: number;  // 1-100
  expiresAt: string;   // ISO date string, '' = never expires
  maxUses: number;     // 0 = unlimited
  usedCount: number;
  isActive: boolean;
  createdAt: string;
};

export interface OrderItem {
  title: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  squarePaymentId?: string;
  customerName: string;
  email: string;
  phone?: string;
  date: string;
  total: number;
  subtotal?: number;
  delivery?: number;
  tps?: number;
  tvq?: number;
  status: 'Payé' | 'Envoyé' | 'En attente';
  items: OrderItem[];
  address?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  image: string;
  isPublished?: boolean;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  type: 'atelier' | 'conférence' | 'lancement' | 'autre';
  link?: string;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
}

export interface SaleStats {
  month: string;
  sales: number;
  tps: number;
  tvq: number;
}

export interface DocumentItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface InvoiceQuote {
  id: string;
  type: 'facture' | 'devis';
  clientName: string;
  clientEmail: string;
  date: string;
  dueDate: string;
  items: DocumentItem[];
  total: number;
  status: 'Brouillon' | 'Envoyé' | 'Payé' | 'Accepté' | 'Signé';
  terms: string;
  signature?: string; // Data URL or text
}

export interface ProductOffer {
  id: string;
  title: string;
  price: number;
  category: 'freemium' | 'low' | 'mid' | 'high' | 'premium' | 'ultra';
  description?: string;
  status: 'active' | 'planned' | 'inactive' | 'concept';
  type: 'product' | 'service';
  isPublished: boolean; // If true and type is service, shows on Contact page
}

export interface CartItem {
  book: Book;
  quantity: number;
}

export type Conference = { id: string; title: string; description: string; image: string; isPublished: boolean; content: string; slug: string; metaTitle: string; metaDescription: string; };
export type Lead = {
  id: string;
  source: string;
  name: string;
  email: string;
  message: string;
  date: string;
  isRead?: boolean;
  archived?: boolean;
};

export type EmailLog = {
  id: string;
  type: 'order_receipt' | 'order_admin_notification' | 'subscriber_welcome' | 'newsletter' | 'conference_announcement' | 'direct_message' | 'contact_form';
  to: string | string[];
  subject: string;
  preview: string;
  sentAt: string;
  success: boolean;
  errorMessage?: string;
  meta?: Record<string, string | number | null>;
};

export type AppEvent = { id: string; title: string; date: string; location: string; description: string; image: string; link?: string; isPublished: boolean; content: string; slug: string; metaTitle: string; metaDescription: string; };

export type Interview = { id: string; title: string; description: string; mediaType: 'video' | 'audio'; sourceType: 'youtube' | 'upload'; mediaUrl: string; date: string; isPublished: boolean; };

export type Subscriber = {
  id: string;
  email: string;
  subscribedAt: string;
};

export type Testimonial = {
  id: string;
  quote: string;
  signature: string;
  page: 'boutique' | 'apropos';
  type: 'admin' | 'client';
  isPublished: boolean;
  createdAt: string;
  email?: string;
  order?: number; // smaller = earlier; falls back to createdAt desc when absent
};

// --- Consignations (livres en dépôt chez des détaillants) ---

export type ConsignmentLocation = {
  id: string;
  name: string;
  commissionPct: number;   // % retenu par le dépositaire — Caroline l'inscrit elle-même
  contactName?: string;
  contactInfo?: string;    // téléphone / courriel, texte libre
  notes?: string;
  createdAt: string;
};

export type ConsignmentMovementType = 'depot' | 'vente' | 'retour' | 'paiement';

export type ConsignmentMovement = {
  id: string;
  locationId: string;
  type: ConsignmentMovementType;
  bookId?: string;
  bookTitle?: string;      // dénormalisé pour l'affichage historique
  qty?: number;            // depot / vente / retour
  unitPrice?: number;      // vente : prix unitaire au moment de la vente
  commissionPct?: number;  // vente : % retenu, figé au moment de la saisie
  amount?: number;         // paiement : montant reçu du dépositaire
  date: string;            // jour de l'événement (ISO)
  note?: string;
  createdAt: string;
};

export type Member = {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: 'google' | 'email';
  joinedAt: string;
};

export type CommunityMessage = {
  id: string;
  memberId: string;
  memberEmail: string;
  memberName: string;
  direction: 'from_member' | 'from_caroline';
  body: string;
  createdAt: string;
  read: boolean;
};