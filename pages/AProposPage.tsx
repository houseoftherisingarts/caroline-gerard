import React from 'react';
import { Helmet } from 'react-helmet-async';
import EditableText from '../components/EditableText';
import EditableImage from '../components/EditableImage';
import NewsletterForm from '../components/NewsletterForm';

const AProposPage = () => {
  return (
    <div className="min-h-screen pt-32 pb-12 w-full overflow-hidden">
      <Helmet>
        <title>Caroline Gérard | À Propos</title>
        <meta name="description" content="Découvrez l'histoire de Caroline Gérard et de son fils William Lorrain, auteurs de William et les univers invisibles." />
      </Helmet>

      {/* About Story Section — Caroline */}
      <section className="w-full py-24 px-8 md:px-16 lg:px-24 bg-white/5 backdrop-blur-md border-y border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-gold/20 blur-[100px] rounded-full"></div>
            <EditableImage
              contentKey="home_about_image"
              defaultValue="https://storage.googleapis.com/salondesinconnus/Caroline/633700443_26079336325032669_114992372982053452_n.jpg"
              alt="Caroline et William"
              className="relative z-10 w-full max-w-md mx-auto rounded-[40px] shadow-2xl border-4 border-white/10 -rotate-2 hover:rotate-0 transition-all duration-700"
            />
          </div>
          <div className="flex-1 space-y-8">
            <EditableText tag="span" contentKey="home_about_label" defaultValue="Présentation de l'auteure" className="text-gold uppercase tracking-widest text-sm font-bold" />
            <h2 className="font-serif text-5xl md:text-6xl text-white">
              <EditableText tag="span" contentKey="home_about_h2_line1" defaultValue="Une histoire" />
              <br />
              <EditableText tag="span" contentKey="home_about_h2_line2" defaultValue="d'amour et de mots" className="italic text-gold" />
            </h2>
            <div className="space-y-6 text-slate-300 text-lg leading-relaxed font-light">
              <EditableText tag="p" contentKey="home_about_p1" defaultValue="Je suis une femme passionnée par la vie, les livres et l'aventure, ainsi qu'une maman comblée de bonheur. L'année 2025 a marqué un tournant décisif dans ma vie : j'ai réalisé l'un de mes plus grands rêves, celui de devenir une auteure publiée." />
              <EditableText tag="p" contentKey="home_about_p2" defaultValue="J'ai d'abord eu l'immense privilège de participer au recueil collectif Les Nouveaux Gardiens de phare, ce qui m'a permis de rendre hommage à une jeune femme exceptionnelle et talentueuse, ma fille Dariane." />
              <EditableText tag="p" contentKey="home_about_p3" defaultValue="En parallèle, j'ai vécu une aventure extraordinaire avec mon fils, un jeune ado merveilleusement atypique. Ensemble, nous avons coécrit une œuvre remplie de magie et de lumière : William et les univers invisibles - Quand les rêves prennent vie." />
              <EditableText tag="p" contentKey="home_about_p4" defaultValue="Ce premier tome est une invitation à ouvrir ton cœur à la différence et à croire en tes rêves. Pour William, il est également le premier d'une longue série de livres, ainsi que le début d'une quête passionnante dans la poursuite de ses rêves." />
            </div>
          </div>
        </div>
      </section>

      {/* William Presentation Section */}
      <section className="w-full py-24 px-8 md:px-16 lg:px-24 bg-midnight/40 backdrop-blur-md border-b border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
            <EditableImage
              contentKey="home_william_image"
              defaultValue="https://storage.googleapis.com/salondesinconnus/Caroline/william%20stars.png"
              alt="William Lorrain"
              className="relative z-10 w-full max-w-md mx-auto rounded-[40px] shadow-2xl border-4 border-white/10 rotate-2 hover:rotate-0 transition-all duration-700"
            />
          </div>
          <div className="flex-1 space-y-8">
            <EditableText tag="span" contentKey="home_william_label" defaultValue="Présentation de l'auteur" className="text-gold uppercase tracking-widest text-sm font-bold" />
            <h2 className="font-serif text-5xl md:text-6xl text-white">
              <EditableText tag="span" contentKey="home_william_h2_line1" defaultValue="William Lorrain" />
              <br />
              <EditableText tag="span" contentKey="home_william_h2_line2" defaultValue="L'imagination sans limites" className="italic text-gold" />
            </h2>
            <div className="space-y-6 text-slate-300 text-lg leading-relaxed font-light">
              <EditableText tag="p" contentKey="home_william_p1" defaultValue="Je suis un adolescent doté d'une imagination sans limites, en mission sur la Terre. J'adore explorer le monde et écrire des aventures. J'aime aussi lire, dessiner et jouer au basketball." />
              <EditableText tag="p" contentKey="home_william_p2" defaultValue="Je rêve de partir à New York sur les traces de Kevin McCallister et de voir les Backstreet Boys en concert." />
              <EditableText tag="p" contentKey="home_william_p3" defaultValue="William et les univers invisibles est mon premier livre. J'aimerais écrire d'autres aventures et publier un deuxième et un troisième livres." />
            </div>
          </div>
        </div>
      </section>

      <NewsletterForm />
    </div>
  );
};

export default AProposPage;
