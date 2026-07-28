// AEO updated 2026-05-06
import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import EditableText from '../components/EditableText';
import EditableImage from '../components/EditableImage';
import NewsletterForm from '../components/NewsletterForm';
import TestimonialsSection from '../components/TestimonialsSection';
import { VisibilitySettings, DEFAULT_VIS } from '../lib/firestore';

const AProposPage = ({ vis = DEFAULT_VIS }: { vis?: VisibilitySettings }) => {
  const canonicalUrl = 'https://carolinegerard.ca/a-propos';
  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'À Propos — Caroline Gérard et William Lorrain',
    url: canonicalUrl,
    inLanguage: 'fr-CA',
    description: "Histoire de Caroline Gérard, auteure jeunesse, et de son fils William Lorrain, coauteur de la série « William et les univers invisibles ».",
    mainEntity: [
      {
        '@type': 'Person',
        name: 'Caroline Gérard',
        jobTitle: 'Auteure jeunesse',
        knowsAbout: ['Littérature jeunesse', 'Écriture coécrite parent-enfant', 'Différence et neurodiversité'],
        nationality: { '@type': 'Country', name: 'Canada' },
        url: 'https://carolinegerard.ca/',
      },
      {
        '@type': 'Person',
        name: 'William Lorrain',
        jobTitle: 'Coauteur',
        description: "Adolescent atypique à l'imagination sans limites, coauteur de William et les univers invisibles.",
      },
    ],
  };

  return (
    <div className="min-h-screen pt-20 md:pt-32 pb-12 w-full overflow-hidden">
      <Helmet>
        <title>À Propos | Caroline Gérard et William Lorrain — Auteurs jeunesse</title>
        <meta name="description" content="Découvrez l'histoire de Caroline Gérard, auteure jeunesse du Québec, et de son fils William Lorrain, coauteur de « William et les univers invisibles »." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:locale" content="fr_CA" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="À Propos — Caroline Gérard et William Lorrain" />
        <meta property="og:description" content="Histoire d'une mère et de son fils auteurs, et de la naissance de William et les univers invisibles." />
        <script type="application/ld+json">{JSON.stringify(aboutJsonLd)}</script>
      </Helmet>

      {/* About Story Section — Caroline */}
      {!vis.hideAProposCaroline && (
      <section className="w-full py-12 md:py-24 px-5 md:px-16 lg:px-24 bg-white/5 backdrop-blur-md border-y border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-8 md:gap-16">
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
            <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl text-white">
              <EditableText tag="span" contentKey="home_about_h2_line1" defaultValue="Une histoire" />
              <br />
              <EditableText tag="span" contentKey="home_about_h2_line2" defaultValue="d'amour et de mots" className="text-gold font-medium" />
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
      )}

      {/* William Presentation Section */}
      {!vis.hideAProposWilliam && (
      <section className="w-full py-12 md:py-24 px-5 md:px-16 lg:px-24 bg-midnight/40 backdrop-blur-md border-b border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-8 md:gap-16">
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
            <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl text-white">
              <EditableText tag="span" contentKey="home_william_h2_line1" defaultValue="William Lorrain" />
              <br />
              <EditableText tag="span" contentKey="home_william_h2_line2" defaultValue="L'imagination sans limites" className="text-gold font-medium" />
            </h2>
            <div className="space-y-6 text-slate-300 text-lg leading-relaxed font-light">
              <EditableText tag="p" contentKey="home_william_p1" defaultValue="Je suis un adolescent doté d'une imagination sans limites, en mission sur la Terre. J'adore explorer le monde et écrire des aventures. J'aime aussi lire, dessiner et jouer au basketball." />
              <EditableText tag="p" contentKey="home_william_p2" defaultValue="Je rêve de partir à New York sur les traces de Kevin McCallister et de voir les Backstreet Boys en concert." />
              <EditableText tag="p" contentKey="home_william_p3" defaultValue="William et les univers invisibles est mon premier livre. J'aimerais écrire d'autres aventures et publier un deuxième et un troisième livres." />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Liens internes contextuels (AEO) */}
      <section className="w-full px-5 md:px-16 lg:px-24 py-8 md:py-12">
        <div className="max-w-4xl mx-auto text-center text-slate-400 text-sm md:text-base leading-relaxed space-y-3">
          <p>
            <EditableText tag="span" contentKey="apropos_links_intro" defaultValue="Pour découvrir le premier tome de notre histoire, visite la " />
            <Link to="/boutique" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="apropos_links_boutique" defaultValue="boutique en ligne" />
            </Link>
            <EditableText tag="span" contentKey="apropos_links_seg2" defaultValue=". Tu peux aussi nous rencontrer en personne lors de nos prochains " />
            <Link to="/evenements" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="apropos_links_evenements" defaultValue="salons et lancements" />
            </Link>
            <EditableText tag="span" contentKey="apropos_links_seg3" defaultValue=", écouter nos " />
            <Link to="/interviews" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="apropos_links_interviews" defaultValue="interviews et entrevues" />
            </Link>
            <EditableText tag="span" contentKey="apropos_links_seg4" defaultValue=", ou nous écrire via notre " />
            <Link to="/contact" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="apropos_links_contact" defaultValue="page contact" />
            </Link>
            <EditableText tag="span" contentKey="apropos_links_outro" defaultValue="." />
          </p>
        </div>
      </section>

      {/* Social proof */}
      <TestimonialsSection page="apropos" />

      {!vis.hideAProposNewsletter && <NewsletterForm hideMemberCta={vis.hideMemberCta} />}
    </div>
  );
};

export default AProposPage;
