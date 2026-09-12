import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import QuillIcon from '../components/QuillIcon';

// 404 sur mesure, dans l'univers étoilé de William (StarField tourne déjà en
// fond, monté globalement par App.tsx) plutôt qu'une page blanche générique.
const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-28 md:pt-40 pb-24 w-full px-5 md:px-16 flex flex-col items-center text-center">
      <Helmet>
        <title>Page introuvable | Caroline Gérard</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-5">
          <span className="text-xs font-bold uppercase tracking-widest">Page introuvable</span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="bg-gold/20 p-4 rounded-full mb-4"
        >
          <QuillIcon className="text-gold w-8 h-8" />
        </motion.div>

        <h1
          className="font-serif text-6xl md:text-9xl text-gold leading-none mb-4"
          style={{ textShadow: '0 0 30px rgba(212, 175, 55, 0.25)' }}
        >
          404
        </h1>

        <p className="font-serif text-base md:text-2xl text-white mb-4 leading-snug">
          Dans l'histoire de William, chaque monde a sa porte, mais celle-ci n'en a pas.
        </p>

        <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-2 max-w-xl">
          L'adresse que vous avez suivie ne correspond à aucune page de ce site, peut-être
          parce qu'elle a changé depuis votre dernière visite.
        </p>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 max-w-xl">
          Le reste du site vous attend à sa bonne place, avec les histoires de Caroline et
          de William.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gold text-midnight font-bold uppercase tracking-widest text-sm hover:bg-starlight transition-colors"
        >
          Retour à l'accueil
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
