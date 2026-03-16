import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, Feather, BookOpen } from 'lucide-react';

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
            <span className="uppercase tracking-[0.2em] text-xs font-bold">Auteure & Maman</span>
          </div>
          <h1 className="font-serif text-6xl md:text-8xl leading-tight text-white drop-shadow-2xl">
            Croire en <br/>
            ses rêves, <br/>
            <span className="italic text-gold">un mot à la fois.</span>
          </h1>
          <p className="text-xl text-slate-300 leading-relaxed max-w-2xl font-light">
            Bienvenue dans notre univers insolite et merveilleux. Je suis Caroline, la maman de William, 
            un jeune héros atypique. Ensemble, nous écrivons des aventures pour ouvrir les cœurs à la différence.
          </p>
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
          {/* Abstract blobs/shapes behind */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-600/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gold/10 rounded-full blur-[60px]" />
          
          <img 
            src={profileImage} 
            alt="Caroline et William" 
            className="relative z-10 rounded-[60px] border-4 border-white/10 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700 w-[75%] object-cover object-top aspect-square"
          />
        </div>
      </section>

       {/* About Story Section - Moved from Contact */}
       <section className="w-full py-24 px-8 md:px-16 lg:px-24 bg-white/5 backdrop-blur-md border-y border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 relative">
                <div className="absolute inset-0 bg-gold/20 blur-[100px] rounded-full"></div>
                <img 
                src="https://storage.googleapis.com/salondesinconnus/Caroline/633700443_26079336325032669_114992372982053452_n.jpg" 
                alt="Caroline et William" 
                className="relative z-10 w-full max-w-md mx-auto rounded-[40px] shadow-2xl border-4 border-white/10 -rotate-2 hover:rotate-0 transition-all duration-700"
                />
            </div>
            <div className="flex-1 space-y-8">
                <span className="text-gold uppercase tracking-widest text-sm font-bold">Présentation de l&apos;auteure</span>
                <h2 className="font-serif text-5xl md:text-6xl text-white">Une histoire <br/><span className="italic text-gold">d&apos;amour et de mots</span></h2>
                
                <div className="space-y-6 text-slate-300 text-lg leading-relaxed font-light">
                  <p>
                      Je suis une femme <span className="text-white font-bold">passionnée par la vie, les livres et l&apos;aventure</span>, ainsi qu’une maman comblée de bonheur. L&apos;année 2025 a marqué un tournant décisif dans ma vie : j&apos;ai réalisé l&apos;un de mes plus grands rêves, celui de devenir une auteure publiée.
                  </p>
                  <p>
                      J&apos;ai d&apos;abord eu l&apos;immense privilège de participer au recueil collectif <span className="italic text-gold">Les Nouveaux Gardiens de phare</span>, ce qui m&apos;a permis de rendre hommage à une jeune femme exceptionnelle et talentueuse, ma fille <span className="text-white font-bold">Dariane</span>.
                  </p>
                  <p>
                      En parallèle, j&apos;ai vécu une aventure extraordinaire avec mon fils, un jeune ado merveilleusement atypique. Ensemble, nous avons coécrit une œuvre remplie de magie et de lumière : <span className="italic text-gold">William et les univers invisibles - Quand les rêves prennent vie</span>.
                  </p>
                  <p>
                      Ce premier tome est une invitation à ouvrir ton cœur à la différence et à croire en tes rêves. Pour <span className="text-white font-bold">William</span>, il est également le premier d&apos;une longue série de livres, ainsi que le début d&apos;une quête passionnante dans la poursuite de ses rêves.
                  </p>
                </div>
            </div>
        </div>
      </section>

      {/* William Presentation Section */}
      <section className="w-full py-24 px-8 md:px-16 lg:px-24 bg-midnight/40 backdrop-blur-md border-b border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="flex-1 relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
                <img 
                src="https://storage.googleapis.com/salondesinconnus/Caroline/william%20stars.png" 
                alt="William Lorrain" 
                className="relative z-10 w-full max-w-md mx-auto rounded-[40px] shadow-2xl border-4 border-white/10 rotate-2 hover:rotate-0 transition-all duration-700"
                />
            </div>
            <div className="flex-1 space-y-8">
                <span className="text-gold uppercase tracking-widest text-sm font-bold">Présentation de l&apos;auteur</span>
                <h2 className="font-serif text-5xl md:text-6xl text-white">William Lorrain <br/><span className="italic text-gold">L&apos;imagination sans limites</span></h2>
                
                <div className="space-y-6 text-slate-300 text-lg leading-relaxed font-light">
                  <p>
                      Je suis un adolescent doté d&apos;une imagination sans limites, en mission sur la Terre. J&apos;adore explorer le monde et écrire des aventures. J&apos;aime aussi lire, dessiner et jouer au basketball.
                  </p>
                  <p>
                      Je rêve de partir à New York sur les traces de Kevin McCallister et de voir les Backstreet Boys en concert.
                  </p>
                  <p>
                      <span className="italic text-gold">William et les univers invisibles</span> est mon premier livre. J&apos;aimerais écrire d&apos;autres aventures et publier un deuxième et un troisième livres.
                  </p>
                </div>
            </div>
        </div>
      </section>


      {/* Mission Preview */}
      <section className="w-full py-24 relative overflow-hidden">
        <Feather className="w-96 h-96 text-white/5 absolute -top-20 -right-20 rotate-12" />
        <div className="w-full px-8 md:px-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
           <div>
             <h2 className="font-serif text-4xl md:text-6xl mb-8 text-gold">Une mission de cœur</h2>
             <p className="text-slate-200 text-xl leading-relaxed mb-6">
              &quot;William et les univers invisibles est né d&apos;un magnifique rêve commun... Ce premier livre est une invitation à ouvrir ton cœur à la différence.&quot;
             </p>
             <p className="text-slate-400 text-lg">
               Au travers de nos écrits, nous souhaitons inspirer chaque parent et chaque enfant à voir la beauté unique qui réside en eux.
             </p>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-8 rounded-xl border border-white/10 backdrop-blur-sm">
                <Star className="w-8 h-8 text-gold mb-4" />
                <h3 className="text-xl font-serif text-white mb-2">Inspiration</h3>
                <p className="text-sm text-slate-400">Partager notre histoire pour donner de l&apos;espoir.</p>
              </div>
              <div className="bg-white/5 p-8 rounded-xl border border-white/10 backdrop-blur-sm mt-12">
                <BookOpen className="w-8 h-8 text-gold mb-4" />
                <h3 className="text-xl font-serif text-white mb-2">Imaginaire</h3>
                <p className="text-sm text-slate-400">Voyager dans des mondes où tout est possible.</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
