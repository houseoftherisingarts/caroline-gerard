import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, Feather, BookOpen } from 'lucide-react';
import EditableText from '../components/EditableText';
import NewsletterForm from '../components/NewsletterForm';

const HomePage = ({ profileImage }: { profileImage: string }) => {
  return (
    <div className="min-h-screen pt-32 pb-12 w-full overflow-hidden">
      <Helmet>
        <title>Caroline Gérard | Auteure & Maman</title>
        <meta name="description" content="Bienvenue dans notre univers insolite et merveilleux. Découvrez les aventures de William et les univers invisibles." />
        <meta property="og:title" content="Caroline Gérard | Auteure & Maman" />
        <meta property="og:description" content="Découvrez les aventures de William et les univers invisibles." />
        <meta property="og:image" content={profileImage} />
      </Helmet>

      {/* Hero Section */}
      <section className="w-full px-8 md:px-16 lg:px-24 flex flex-col md:flex-row items-center gap-16 mb-24 min-h-[70vh]">
        <div className="flex-1 space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-4">
            <Star className="w-4 h-4 fill-current animate-pulse" />
            <EditableText
              tag="span"
              contentKey="home_hero_badge"
              defaultValue="Auteure & Maman"
              className="uppercase tracking-[0.2em] text-xs font-bold"
            />
          </div>
          <h1 className="font-serif text-5xl md:text-7xl leading-tight text-white drop-shadow-2xl">
            <EditableText tag="span" contentKey="home_hero_title_line1" defaultValue="Croire en ses rêves," />
            <br />
            <EditableText tag="span" contentKey="home_hero_title_italic" defaultValue="un mot à la fois." className="italic text-gold" />
          </h1>
          <EditableText
            tag="p"
            contentKey="home_hero_p"
            defaultValue="Bienvenue dans notre univers insolite et merveilleux. Je suis Caroline, la maman de William, un jeune héros atypique. Ensemble, nous écrivons des aventures pour ouvrir les cœurs à la différence."
            className="text-xl text-slate-300 leading-relaxed max-w-2xl font-light"
          />
          <div className="pt-8 flex flex-wrap gap-6">
            <Link to="/boutique" className="px-10 py-4 bg-gold text-midnight font-bold text-lg rounded-xl hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              Découvrir nos livres
            </Link>
            <Link to="/blog" className="px-10 py-4 border border-white/20 text-white font-medium text-lg rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm">
              Lire le blog
            </Link>
          </div>
        </div>

        <div className="flex-1 relative flex justify-center w-full">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-600/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gold/10 rounded-full blur-[60px]" />
          <img
            src={profileImage}
            alt="Caroline et William"
            className="relative z-10 rounded-[60px] border-4 border-white/10 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700 w-[75%] object-cover object-top aspect-square"
          />
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterForm />

      {/* Mission Preview */}
      <section className="w-full py-24 relative overflow-hidden">
        <Feather className="w-96 h-96 text-white/5 absolute -top-20 -right-20 rotate-12" />
        <div className="w-full px-8 md:px-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          <div>
            <EditableText tag="h2" contentKey="home_mission_title" defaultValue="Une mission de cœur" className="font-serif text-4xl md:text-6xl mb-8 text-gold" />
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
    </div>
  );
};

export default HomePage;
