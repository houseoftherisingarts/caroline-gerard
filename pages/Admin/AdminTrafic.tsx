// Trafic du site, jour par jour, tel que Caroline le lit dans son Espace Auteure.
// Source : la collection trafic/{AAAA-MM-JJ}, tenue par la fonction recordVisit à chaque page vue.
// Les journées d'avant le compteur quotidien (13 septembre 2026) portent seulement les nouveaux
// visiteurs reconstitués depuis le compteur d'adresses uniques, et sont marquées « partiel ».
import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Eye, Users, CalendarDays, Newspaper, Info } from 'lucide-react';
import { subscribeToTrafic, decodePageKey, type JourTrafic } from '../../lib/firestore';
import { AppEvent, NewsItem } from '../../types';

// Palette validée (dataviz, fond #0f172a) : or pour les vues, bleu pour les visiteurs.
const COULEUR_VUES = '#ad8826';
const COULEUR_VISITEURS = '#4f8fd0';

const jourQuebec = (d = new Date()) =>
  new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const jourMoins = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return jourQuebec(d);
};

const libelleCourt = (jour: string) => {
  const [a, m, j] = jour.split('-').map(Number);
  return new Date(a, m - 1, j).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
};

const libelleLong = (jour: string) => {
  const [a, m, j] = jour.split('-').map(Number);
  return new Date(a, m - 1, j).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
};

type Repere = { type: 'evenement' | 'nouvelle'; titre: string };

type Point = JourTrafic & { libelle: string; reperes: Repere[] };

const Tuile = ({ titre, vues, visiteurs, sous }: { titre: string; vues: number; visiteurs: number; sous?: string }) => (
  <div className="bg-midnight/60 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-lg border border-white/10">
    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{titre}</p>
    <div className="flex items-end gap-6 mt-2">
      <div>
        <p className="text-2xl md:text-3xl font-bold text-white leading-none">{vues.toLocaleString('fr-CA')}</p>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Eye size={12} style={{ color: COULEUR_VUES }} /> vues</p>
      </div>
      <div>
        <p className="text-2xl md:text-3xl font-bold text-white leading-none">{visiteurs.toLocaleString('fr-CA')}</p>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Users size={12} style={{ color: COULEUR_VISITEURS }} /> visiteurs</p>
      </div>
    </div>
    {sous && <p className="text-slate-500 text-xs mt-3">{sous}</p>}
  </div>
);

const InfoBulle = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm shadow-xl max-w-xs">
      <p className="text-white font-bold capitalize">{libelleLong(p.jour)}</p>
      <p className="text-slate-300 mt-1">{p.vues.toLocaleString('fr-CA')} vues · {p.visiteurs.toLocaleString('fr-CA')} visiteurs</p>
      {p.partiel && <p className="text-slate-500 text-xs mt-1">Journée d'avant le compteur : nouveaux visiteurs seulement.</p>}
      {p.reperes.map((r, i) => (
        <p key={i} className="text-gold text-xs mt-1 flex items-center gap-1">
          {r.type === 'evenement' ? <CalendarDays size={12} /> : <Newspaper size={12} />} {r.titre}
        </p>
      ))}
    </div>
  );
};

const AdminTrafic = ({ events, news }: { events: AppEvent[]; news: NewsItem[] }) => {
  const [jours, setJours] = useState<JourTrafic[]>([]);
  const [fenetre, setFenetre] = useState<30 | 90>(30);

  useEffect(() => subscribeToTrafic(setJours, 90), []);

  const parJour = useMemo(() => new Map(jours.map(j => [j.jour, j])), [jours]);

  const reperesParJour = useMemo(() => {
    const m = new Map<string, Repere[]>();
    const ajoute = (jour: string, r: Repere) => m.set(jour, [...(m.get(jour) ?? []), r]);
    events.filter(e => e.isPublished && /^\d{4}-\d{2}-\d{2}$/.test(e.date)).forEach(e => ajoute(e.date, { type: 'evenement', titre: e.title }));
    news.filter(n => n.isPublished && /^\d{4}-\d{2}-\d{2}$/.test(n.date)).forEach(n => ajoute(n.date, { type: 'nouvelle', titre: n.title }));
    return m;
  }, [events, news]);

  // Une entrée par jour de la fenêtre, y compris les jours à zéro, pour que la courbe ne mente pas.
  const serie: Point[] = useMemo(() => {
    const out: Point[] = [];
    for (let i = fenetre - 1; i >= 0; i--) {
      const jour = jourMoins(i);
      const t = parJour.get(jour);
      out.push({
        jour,
        vues: t?.vues ?? 0,
        visiteurs: t?.visiteurs ?? 0,
        pages: t?.pages,
        partiel: t?.partiel,
        libelle: libelleCourt(jour),
        reperes: reperesParJour.get(jour) ?? [],
      });
    }
    return out;
  }, [fenetre, parJour, reperesParJour]);

  const somme = (n: number) => {
    const depuis = jourMoins(n - 1);
    return jours.filter(j => j.jour >= depuis).reduce(
      (acc, j) => ({ vues: acc.vues + (j.vues ?? 0), visiteurs: acc.visiteurs + (j.visiteurs ?? 0) }),
      { vues: 0, visiteurs: 0 },
    );
  };
  const aujourdhui = parJour.get(jourQuebec());
  const sept = somme(7);
  const trente = somme(30);

  const pagesPopulaires = useMemo(() => {
    const depuis = jourMoins(29);
    const total = new Map<string, number>();
    jours.filter(j => j.jour >= depuis && j.pages).forEach(j => {
      Object.entries(j.pages!).forEach(([k, v]) => total.set(k, (total.get(k) ?? 0) + v));
    });
    return [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [jours]);

  const maxVuesPage = pagesPopulaires[0]?.[1] ?? 1;
  const compteurVivant = jours.some(j => !j.partiel);
  const journeesRecentes = [...serie].reverse().filter(p => p.vues > 0 || p.visiteurs > 0 || p.reperes.length > 0).slice(0, 21);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Trafic du site</h1>
        <p className="text-slate-400 mt-1 text-sm max-w-2xl">
          Le nombre de pages vues et de visiteurs distincts, jour par jour, avec tes événements et tes nouvelles
          posés sur les mêmes journées pour voir ce qui fait bouger la courbe. Tes propres passages dans l'Espace Auteure ne comptent pas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <Tuile titre="Aujourd'hui" vues={aujourdhui?.vues ?? 0} visiteurs={aujourdhui?.visiteurs ?? 0} sous={libelleLong(jourQuebec())} />
        <Tuile titre="7 derniers jours" vues={sept.vues} visiteurs={sept.visiteurs} />
        <Tuile titre="30 derniers jours" vues={trente.vues} visiteurs={trente.visiteurs} />
      </div>

      <div className="bg-midnight/60 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/10 shadow-lg mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
          <h2 className="text-base md:text-xl font-bold text-white">Vues et visiteurs par jour</h2>
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            {([30, 90] as const).map(n => (
              <button
                key={n}
                onClick={() => setFenetre(n)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${fenetre === n ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}
              >
                {n} jours
              </button>
            ))}
          </div>
        </div>

        {!compteurVivant && (
          <p className="text-slate-500 text-xs mb-4 flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            Le compteur jour par jour a démarré le 13 septembre 2026. Les journées d'avant montrent seulement les nouveaux visiteurs, sans les pages vues.
          </p>
        )}

        <div className="h-56 md:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} barCategoryGap="20%" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="libelle" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={fenetre === 30 ? 2 : 9} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
              <Tooltip content={<InfoBulle />} cursor={{ fill: '#ffffff08' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} iconType="circle" iconSize={8} />
              <Bar dataKey="vues" name="Pages vues" fill={COULEUR_VUES} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="visiteurs" name="Visiteurs" fill={COULEUR_VISITEURS} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-slate-500 text-xs mt-3 flex items-center gap-2">
          <CalendarDays size={12} className="text-gold" /> Un événement ou une nouvelle publiée ce jour-là apparaît dans la bulle quand tu passes la souris sur la journée.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2 bg-midnight/60 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/10 shadow-lg">
          <h2 className="text-base md:text-xl font-bold text-white mb-4">Journée par journée</h2>
          {journeesRecentes.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Rien à montrer encore : la première journée s'inscrira dès la prochaine visite sur le site.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/10">
                    <th className="py-2 pr-4 font-bold">Jour</th>
                    <th className="py-2 pr-4 font-bold text-right">Vues</th>
                    <th className="py-2 pr-4 font-bold text-right">Visiteurs</th>
                    <th className="py-2 font-bold">Ce jour-là</th>
                  </tr>
                </thead>
                <tbody>
                  {journeesRecentes.map(p => (
                    <tr key={p.jour} className="border-b border-white/5 last:border-0">
                      <td className="py-2.5 pr-4 text-white whitespace-nowrap capitalize">{libelleLong(p.jour)}</td>
                      <td className="py-2.5 pr-4 text-right text-white font-bold">{p.partiel ? <span className="text-slate-600">·</span> : p.vues.toLocaleString('fr-CA')}</td>
                      <td className="py-2.5 pr-4 text-right text-white font-bold">{p.visiteurs.toLocaleString('fr-CA')}</td>
                      <td className="py-2.5 text-slate-300">
                        {p.reperes.map((r, i) => (
                          <span key={i} className="inline-flex items-center gap-1 mr-3 text-xs">
                            {r.type === 'evenement' ? <CalendarDays size={12} className="text-gold" /> : <Newspaper size={12} className="text-gold" />}
                            {r.titre}
                          </span>
                        ))}
                        {p.partiel && p.reperes.length === 0 && <span className="text-slate-600 text-xs">nouveaux visiteurs seulement</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-midnight/60 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/10 shadow-lg">
          <h2 className="text-base md:text-xl font-bold text-white mb-1">Pages les plus vues</h2>
          <p className="text-slate-500 text-xs mb-4">Sur les 30 derniers jours</p>
          {pagesPopulaires.length === 0 ? (
            <p className="text-slate-500 text-sm py-6 text-center">Les pages s'inscriront ici dès les premières visites.</p>
          ) : (
            <ul className="space-y-3">
              {pagesPopulaires.map(([cle, n]) => (
                <li key={cle}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white truncate mr-3">{decodePageKey(cle)}</span>
                    <span className="text-slate-300 font-bold shrink-0">{n.toLocaleString('fr-CA')}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(4, (n / maxVuesPage) * 100)}%`, backgroundColor: COULEUR_VUES }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTrafic;
