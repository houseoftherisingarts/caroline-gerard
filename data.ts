import { Book, Order, BlogPost, SaleStats, Event, MediaItem } from './types';

export const books: Book[] = [
  {
    id: '1',
    title: 'William et les univers invisibles',
    subtitle: 'Quand les rêves prennent vie',
    description: "Une invitation à ouvrir ton cœur à la différence et à croire en tes rêves. William y raconte les aventures fantastiques qui prennent racine dans son monde imaginaire.",
    price: 24.95,
    image: 'https://storage.googleapis.com/salondesinconnus/Caroline/william%20cover.jpg',
    backImage: 'https://storage.googleapis.com/salondesinconnus/Caroline/615078333_26281261438145401_6607312617290889589_n.jpg',
    color: '#1e293b'
  },
  {
    id: '2',
    title: 'William et les univers invisibles',
    subtitle: 'Bientôt disponible',
    description: "La suite des aventures de William est en cours d'écriture. Restez à l'affût pour découvrir de nouveaux univers magiques et des défis encore plus extraordinaires.",
    price: 0,
    image: 'https://storage.googleapis.com/salondesinconnus/Caroline/gifr%20png.png',
    color: '#1e293b',
    comingSoon: true,
  }
];

export const recentOrders: Order[] = [
  { id: 'CMD-001', customerName: 'Sophie Martin', email: 'sophie@example.com', address: '123 Rue des Érables, Montréal', date: '2023-10-01', total: 35.59, subtotal: 24.95, delivery: 6.00, tps: 1.55, tvq: 3.09, status: 'Payé', items: [{ title: 'William et les univers invisibles', price: 24.95, quantity: 1 }] },
  { id: 'CMD-002', customerName: 'Marc Tremblay', email: 'marc@example.com', address: '456 Boul. St-Laurent, Québec', date: '2023-10-02', total: 63.37, subtotal: 49.90, delivery: 6.00, tps: 2.80, tvq: 4.67, status: 'Envoyé', items: [{ title: 'William et les univers invisibles', price: 24.95, quantity: 2 }] },
  { id: 'CMD-003', customerName: 'Isabelle Roy', email: 'isa@example.com', address: '789 Av. Cartier, Gatineau', date: '2023-10-03', total: 35.59, subtotal: 24.95, delivery: 6.00, tps: 1.55, tvq: 3.09, status: 'En attente', items: [{ title: 'William et les univers invisibles', price: 24.95, quantity: 1 }] },
];

export const blogPosts: BlogPost[] = [
  // Blog is empty until March 2026
];

export const events: Event[] = [
  {
    id: '1',
    title: "Salon de l'Éveil",
    date: '2026-02-28',
    location: 'Centre des congrès de St-Hyacinthe',
    description: "🥰 Un week-end de bonheur qui arrive à grands pas! Viens faire le plein d'inspiration les 28 février et 1er mars.\n\n📍 Je serai présente au stand Le Gardien de Phare inc. (Kiosques 741 & 742).\n🕐 Horaire de présence : Samedi de 13h à 17h.\n\nViens jaser d'écriture, de rêves et te procurer 'William et les univers invisibles'. De l'idée au livre publié! 🤩",
    type: 'lancement',
    link: 'https://www.salondeleveil.com/conferenciers-et-exposants.../'
  },
  {
    id: '2',
    title: "Salon du Livre de Trois-Rivières",
    date: '2026-03-26', // Approximate date for late March
    location: 'Trois-Rivières',
    description: "Je serai au Salon du Livre de Trois-Rivières! Présence au Stand Hydro-Québec des Auteur.e.s d'ici, horaire des séances de dédicace à venir.",
    type: 'lancement',
    link: 'https://www.sltr.qc.ca/'
  }
];

export const salesData: SaleStats[] = [
  { month: 'Juin', sales: 450, tps: 22.50, tvq: 44.89 },
  { month: 'Juil', sales: 620, tps: 31.00, tvq: 61.85 },
  { month: 'Août', sales: 800, tps: 40.00, tvq: 79.80 },
  { month: 'Sept', sales: 1200, tps: 60.00, tvq: 119.70 },
  { month: 'Oct', sales: 950, tps: 47.50, tvq: 94.76 },
];

export const mediaItems: MediaItem[] = [
  { id: '1', url: 'https://picsum.photos/200/200?random=20', name: 'Couverture Livre', type: 'image' },
  { id: '2', url: 'https://picsum.photos/200/200?random=21', name: 'Photo William', type: 'image' },
  { id: '3', url: 'https://picsum.photos/200/200?random=22', name: 'Lancement', type: 'image' },
  { id: '4', url: 'https://picsum.photos/200/200?random=23', name: 'Atelier', type: 'image' },
];