// AEO updated 2026-05-06
import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, Feather, BookOpen, Camera } from 'lucide-react';
import EditableText from '../components/EditableText';
import NewsletterForm from '../components/NewsletterForm';
import SphereGallery, { SphereImage } from '../components/SphereGallery';
import { VisibilitySettings, DEFAULT_VIS } from '../lib/firestore';
import { thumb } from '../lib/img';

const HOME_GALLERY_IMAGES: SphereImage[] = [
  { id: '1', url: 'https://storage.googleapis.com/salondesinconnus/Caroline/615078333_26281261438145401_6607312617290889589_n.jpg', alt: 'Caroline Gérard et William Lorrain — Galerie photo 1' },
  { id: '2', url: 'https://storage.googleapis.com/salondesinconnus/Caroline/633700443_26079336325032669_114992372982053452_n.jpg', alt: 'Caroline Gérard et William Lorrain — Galerie photo 2' },
  { id: '3', url: 'https://storage.googleapis.com/salondesinconnus/Caroline/william%20stars.png', alt: 'William et les univers invisibles — Galerie photo 3' },
  { id: '4', url: 'https://storage.googleapis.com/salondesinconnus/Caroline/william%20cover.jpg', alt: 'Couverture — William et les univers invisibles' },
  { id: '5', url: 'https://storage.googleapis.com/salondesinconnus/Caroline/Gemini_Generated_Image_8wrovw8wrovw8wro.png', alt: 'Caroline Gérard — Galerie photo 5' },
  { id: '6', url: 'https://storage.googleapis.com/salondesinconnus/Caroline/gifr%20png.png', alt: 'Caroline Gérard — Galerie photo 6' },
];

const HomePage = ({ profileImage, vis = DEFAULT_VIS, sphereImageScale, sphereGalleryImages }: { profileImage: string; vis?: VisibilitySettings; sphereImageScale?: number; sphereGalleryImages?: SphereImage[] }) => {
  const canonicalUrl = 'https://carolinegerard.ca/';
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Caroline Gérard',
    alternateName: ['Caroline Gerard'],
    jobTitle: 'Auteure jeunesse',
    description: "Auteure québécoise et maman de William Lorrain. Coécriture de la série « William et les univers invisibles ».",
    url: canonicalUrl,
    image: profileImage,
    sameAs: ['https://www.facebook.com/caroline.gerard.338'],
    nationality: { '@type': 'Country', name: 'Canada' },
    address: { '@type': 'PostalAddress', addressRegion: 'QC', addressCountry: 'CA' },
    knowsAbout: ["Littérature jeunesse", "Différence et neurodiversité", "Écriture coécrite parent-enfant"],
  };
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Caroline Gérard',
    alternateName: 'carolinegerard.ca',
    url: canonicalUrl,
    inLanguage: 'fr-CA',
    publisher: { '@type': 'Person', name: 'Caroline Gérard' },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://carolinegerard.ca/blog?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
  const bookJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: 'William et les univers invisibles — Quand les rêves prennent vie',
    author: [
      { '@type': 'Person', name: 'Caroline Gérard' },
      { '@type': 'Person', name: 'William Lorrain' },
    ],
    inLanguage: 'fr-CA',
    bookFormat: 'https://schema.org/Paperback',
    numberOfPages: 72,
    isbn: '978-2-925574-26-2',
    publisher: { '@type': 'Organization', name: 'Un Million de Rêves' },
    image: 'https://storage.googleapis.com/salondesinconnus/Caroline/william%20cover.jpg',
    description: "Récit jeunesse coécrit par Caroline Gérard et son fils William Lorrain. Une invitation à ouvrir le cœur à la différence et à croire en ses rêves.",
    url: 'https://carolinegerard.ca/boutique',
    workExample: {
      '@type': 'Book',
      bookEdition: '1re édition',
      isbn: '978-2-925574-26-2',
      bookFormat: 'https://schema.org/Paperback',
      offers: {
        '@type': 'Offer',
        price: '24.95',
        priceCurrency: 'CAD',
        availability: 'https://schema.org/InStock',
        url: 'https://carolinegerard.ca/boutique',
      },
    },
  };

  return (
    <div className="min-h-screen pt-20 md:pt-32 pb-12 w-full overflow-hidden">
      <Helmet>
        <title>Caroline Gérard | Auteure & Maman — William et les univers invisibles</title>
        <meta name="description" content="Caroline Gérard, auteure québécoise. Coécriture avec son fils William Lorrain de « William et les univers invisibles — Quand les rêves prennent vie ». Une invitation à ouvrir le cœur à la différence." />
        <meta name="keywords" content="Caroline Gérard, William Lorrain, William et les univers invisibles, auteure jeunesse Québec, livre jeunesse différence, neurodiversité, croire en ses rêves" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_CA" />
        <meta property="og:site_name" content="Caroline Gérard" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Caroline Gérard | Auteure & Maman — William et les univers invisibles" />
        <meta property="og:description" content="Découvrez les aventures de William et les univers invisibles, coécrites par Caroline Gérard et son fils William Lorrain." />
        <meta property="og:image" content={profileImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Caroline Gérard | Auteure" />
        <meta name="twitter:description" content="William et les univers invisibles — un livre jeunesse coécrit avec son fils." />
        <meta name="twitter:image" content={profileImage} />
        <script type="application/ld+json">{JSON.stringify(personJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(bookJsonLd)}</script>
      </Helmet>

      {/* Hero Section */}
      {!vis.hideHomeHero && (
        <section className="w-full px-5 md:px-16 lg:px-24 flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-12 md:mb-24 min-h-[70vh]">
          <div className="flex-1 space-y-5 md:space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-4">
              <Star className="w-4 h-4 fill-current animate-pulse" />
              <EditableText
                tag="span"
                contentKey="home_hero_badge"
                defaultValue="Auteure & Maman"
                className="uppercase tracking-[0.2em] text-xs font-bold"
              />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-7xl leading-tight text-white drop-shadow-2xl">
              <EditableText tag="span" contentKey="home_hero_title_line1" defaultValue="Croire en ses rêves," />
              <br />
              <EditableText tag="span" contentKey="home_hero_title_italic" defaultValue="un mot à la fois." className="text-gold font-medium" />
            </h1>
            <EditableText
              tag="p"
              contentKey="home_hero_p"
              defaultValue="Bienvenue dans notre univers insolite et merveilleux. Je suis Caroline, la maman de William, un jeune héros atypique. Ensemble, nous écrivons des aventures pour ouvrir les cœurs à la différence."
              className="text-xl text-slate-300 leading-relaxed max-w-2xl font-light"
            />
            <div className="pt-4 md:pt-8 flex flex-wrap gap-3 md:gap-6">
              <Link to="/boutique" className="px-7 md:px-10 py-3 md:py-4 bg-gold text-midnight font-bold text-base md:text-lg rounded-xl hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                <EditableText tag="span" contentKey="home_hero_btn_primary" defaultValue="Découvrir nos livres" />
              </Link>
              {!vis.hideHomeLireLeBlog && (
                <Link to="/blog" className="px-7 md:px-10 py-3 md:py-4 border border-white/20 text-white font-medium text-base md:text-lg rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm">
                  <EditableText tag="span" contentKey="home_hero_btn_secondary" defaultValue="Lire le blog" />
                </Link>
              )}
            </div>
          </div>

          <div className="flex-1 relative flex justify-center w-full">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-600/10 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gold/10 rounded-full blur-[60px]" />
            <img
              src={thumb(profileImage, 800)}
              alt="Caroline et William"
              className="relative z-10 rounded-[60px] border-4 border-white/10 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700 w-[75%] object-cover object-top aspect-square"
            />
          </div>
        </section>
      )}

      {/* Mission Preview */}
      {!vis.hideHomeMission && (
        <section className="w-full py-24 relative overflow-hidden">
          <Feather className="w-96 h-96 text-white/5 absolute -top-20 -right-20 rotate-12" />
          <div className="w-full px-5 md:px-24 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center max-w-7xl mx-auto">
            <div>
              <EditableText tag="h2" contentKey="home_mission_title" defaultValue="Une mission de cœur" className="font-serif text-3xl md:text-4xl lg:text-6xl mb-6 md:mb-8 text-gold" />
              <EditableText tag="p" contentKey="home_mission_quote" defaultValue="William et les univers invisibles est né d'un magnifique rêve commun... Ce premier livre est une invitation à ouvrir ton cœur à la différence." className="text-slate-200 text-xl leading-relaxed mb-6" />
              <EditableText tag="p" contentKey="home_mission_p2" defaultValue="Au travers de nos écrits, nous souhaitons inspirer chaque parent et chaque enfant à voir la beauté unique qui réside en eux." className="text-slate-400 text-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-8 rounded-xl border border-white/10 backdrop-blur-sm">
                <Star className="w-8 h-8 text-gold mb-4" />
                <EditableText tag="h3" contentKey="home_mission_card1_title" defaultValue="Inspiration" className="text-xl font-serif text-white mb-2" />
                <EditableText tag="p" contentKey="home_mission_card1_text" defaultValue="Partager notre histoire pour donner de l'espoir." className="text-sm text-slate-400" />
              </div>
              <div className="bg-white/5 p-8 rounded-xl border border-white/10 backdrop-blur-sm mt-12">
                <BookOpen className="w-8 h-8 text-gold mb-4" />
                <EditableText tag="h3" contentKey="home_mission_card2_title" defaultValue="Imaginaire" className="text-xl font-serif text-white mb-2" />
                <EditableText tag="p" contentKey="home_mission_card2_text" defaultValue="Voyager dans des mondes où tout est possible." className="text-sm text-slate-400" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Galerie photos — éditable depuis l'admin (Modifier le site → Accueil) */}
      {!vis.hideHomeGallery && (
        <section className="w-full py-16 md:py-24 px-5 md:px-16 lg:px-24 relative">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-10 md:mb-14">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-4">
                <Camera className="w-4 h-4" />
                <EditableText
                  tag="span"
                  contentKey="home_gallery_label"
                  defaultValue="Notre univers en images"
                  className="uppercase tracking-[0.2em] text-xs font-bold"
                />
              </div>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white mb-4">
                <EditableText tag="span" contentKey="home_gallery_title_line1" defaultValue="Quelques " />
                <EditableText tag="span" contentKey="home_gallery_title_italic" defaultValue="moments précieux" className="text-gold font-medium" />
              </h2>
              <EditableText
                tag="p"
                contentKey="home_gallery_description"
                defaultValue="Salons du livre, lancements, dédicaces, instants de complicité avec William : un aperçu de notre aventure d'auteurs."
                className="text-slate-400 max-w-2xl text-base md:text-lg"
              />
            </div>

            <SphereGallery images={sphereGalleryImages ?? HOME_GALLERY_IMAGES} height={560} baseImageScale={sphereImageScale} />

            <p className="text-center text-slate-500 text-sm mt-8">
              <Link to="/a-propos" className="text-gold hover:underline">
                <EditableText tag="span" contentKey="home_gallery_link_apropos" defaultValue="Lire notre histoire complète sur la page À Propos →" />
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* Newsletter */}
      {!vis.hideHomeNewsletter && <NewsletterForm hideMemberCta={vis.hideMemberCta} />}
    </div>
  );
};

export default HomePage;
