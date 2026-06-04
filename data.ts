import { Book, BlogPost, Event } from './types';

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

