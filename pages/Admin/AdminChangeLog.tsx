// Le journal des changements, tel que Caroline le lit. Le contenu vit dans lib/changelog.ts et
// s'ajoute en tête à chaque journée de travail sur le site.
import React from 'react';
import { History, Check } from 'lucide-react';
import { JOURNAL, nombreEtapes } from '../../lib/changelog';
import { formatLong } from '../../lib/eventDate';

const AdminChangeLog = () => {
  const journees = JOURNAL.length;
  const premiere = JOURNAL[JOURNAL.length - 1];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white">Journal des changements</h1>
        <p className="text-slate-400 mt-1 max-w-2xl">
          Tout ce qui a été bâti sur ton site depuis le premier jour, une journée à la fois, de la
          plus récente à la plus ancienne.
        </p>
      </div>

      {/* La seule rupture de la page : le compte, en gros, avant la frise. */}
      <div className="bg-gold text-midnight rounded-2xl px-6 py-8 md:px-10 md:py-10 flex flex-wrap items-center gap-x-10 gap-y-6">
        <div>
          <div className="font-serif text-6xl md:text-7xl leading-none">{journees}</div>
          <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-70">
            {journees === 1 ? 'journée de travail' : 'journées de travail'}
          </div>
        </div>
        <div className="w-px self-stretch bg-midnight/20 hidden md:block" />
        <div className="max-w-md">
          <p className="font-bold text-lg leading-snug">
            {nombreEtapes()} changements livrés depuis le {formatLong({ date: premiere.date }, false)}.
          </p>
          <p className="text-sm mt-2 opacity-75 leading-relaxed">
            Chaque nouvelle journée de travail s’ajoute ici toute seule, en haut de la liste.
          </p>
        </div>
      </div>

      <ol className="relative border-l border-white/10 ml-2 md:ml-3 space-y-8">
        {JOURNAL.map((entree, i) => (
          <li key={entree.date} className="relative pl-6 md:pl-10">
            <span
              className={`absolute -left-[7px] top-7 w-3.5 h-3.5 rounded-full border-2 border-midnight ${
                i === 0 ? 'bg-gold' : 'bg-slate-600'
              }`}
              aria-hidden="true"
            />
            <article className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-gold text-xs font-bold uppercase tracking-widest">
                  {formatLong({ date: entree.date }, false)}
                </span>
                {i === 0 && (
                  <span className="px-2 py-0.5 rounded bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider">
                    Dernière livraison
                  </span>
                )}
              </div>

              <h2 className="text-xl md:text-2xl font-serif text-white mb-3 leading-snug">{entree.titre}</h2>
              <p className="text-slate-300 leading-relaxed mb-6">{entree.intro}</p>

              <ul className="space-y-3">
                {entree.etapes.map((etape, j) => (
                  <li key={j} className="flex gap-3 text-slate-300 text-sm md:text-base leading-relaxed">
                    <Check size={16} className="text-gold shrink-0 mt-1" aria-hidden="true" />
                    <span>{etape}</span>
                  </li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>

      <p className="text-slate-500 text-sm flex items-center gap-2 pl-2">
        <History size={14} /> Une question sur l’une de ces journées se pose dans l’onglet « Demander un changement ».
      </p>
    </div>
  );
};

export default AdminChangeLog;
