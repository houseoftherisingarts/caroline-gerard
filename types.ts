export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  price: number;
  image: string;
  backImage?: string;
  color: string;
}

export interface Order {
  id: string;
  customerName: string;
  date: string;
  total: number;
  status: 'Payé' | 'Envoyé' | 'En attente';
  items: string[];
  email: string;
  address: string;
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
export type Lead = { id: string; source: string; name: string; email: string; message: string; date: string; };

export type AppEvent = { id: string; title: string; date: string; location: string; description: string; image: string; link?: string; isPublished: boolean; content: string; slug: string; metaTitle: string; metaDescription: string; };

export type Interview = { id: string; title: string; description: string; mediaType: 'video' | 'audio'; sourceType: 'youtube' | 'upload'; mediaUrl: string; date: string; isPublished: boolean; };