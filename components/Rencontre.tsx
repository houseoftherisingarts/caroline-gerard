// La rencontre vidéo d'un rendez-vous confirmé : salle Jitsi Meet nommée d'après le rendez-vous,
// aucune clé d'API, aucun serveur. Utilisée dans l'onglet Agenda de l'Espace Auteure et dans
// l'onglet Rendez-vous de la Communauté (lib/rendezvous.ts).
import React, { useEffect, useRef, useState } from 'react';
import { salleUrl } from '../lib/rendezvous';

interface RencontreProps {
  salle: string;
  nom: string;
  onQuitter: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiMeetAPI;
  }
}

interface JitsiMeetAPI {
  on: (evenement: string, gestionnaire: () => void) => void;
  dispose: () => void;
}

const SCRIPT_JITSI = 'https://meet.jit.si/external_api.js';
let chargementScript: Promise<void> | null = null;

/** Injecte le script Jitsi une seule fois pour toute la session, promesse partagée entre les montages. */
function chargerScriptJitsi(): Promise<void> {
  if (typeof window !== 'undefined' && window.JitsiMeetExternalAPI) return Promise.resolve();
  if (!chargementScript) {
    chargementScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_JITSI;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        chargementScript = null;
        reject(new Error('jitsi-script'));
      };
      document.head.appendChild(script);
    });
  }
  return chargementScript;
}

/** La rencontre vidéo : salle Jitsi Meet nommée d'après le rendez-vous, aucune clé d'API. */
const Rencontre: React.FC<RencontreProps> = ({ salle, nom, onQuitter }) => {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiMeetAPI | null>(null);
  const [pret, setPret] = useState(false);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    let annule = false;
    const delaiSecours = window.setTimeout(() => {
      if (!annule) setEchec(true);
    }, 8000);

    chargerScriptJitsi()
      .then(() => {
        if (annule || !conteneurRef.current || !window.JitsiMeetExternalAPI) return;
        const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: salle,
          parentNode: conteneurRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: nom },
          configOverwrite: { prejoinPageEnabled: true, disableDeepLinking: true, subject: 'Rencontre Caroline Gérard' },
          interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
        });
        apiRef.current = api;
        api.on('videoConferenceLeft', onQuitter);
        api.on('readyToClose', onQuitter);
        window.clearTimeout(delaiSecours);
        setPret(true);
      })
      .catch(() => {
        if (!annule) setEchec(true);
      });

    return () => {
      annule = true;
      window.clearTimeout(delaiSecours);
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salle, nom]);

  return (
    <div className="space-y-4">
      <div className="relative w-full h-[70vh] md:h-auto md:aspect-video md:min-h-[480px] bg-black/30 border border-white/10 rounded-xl overflow-hidden">
        <div ref={conteneurRef} className="absolute inset-0" />
        {!pret && !echec && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
            <span className="w-8 h-8 rounded-full border-2 border-white/20 border-t-gold animate-spin" />
            <p className="text-slate-400 text-sm">Ouverture de la salle…</p>
          </div>
        )}
        {echec && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <a
              href={salleUrl(salle)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-gold text-midnight hover:bg-white px-5 py-3 text-sm font-bold transition-colors"
            >
              Ouvrir la rencontre dans un nouvel onglet
            </a>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onQuitter}
        className="px-5 py-2.5 rounded-lg border border-white/10 text-white text-sm font-bold hover:border-gold hover:text-gold transition-colors"
      >
        Quitter la rencontre
      </button>
    </div>
  );
};

export default Rencontre;
