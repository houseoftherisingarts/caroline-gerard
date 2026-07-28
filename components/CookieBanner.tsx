import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Check } from 'lucide-react';
import EditableText from './EditableText';

const CONSENT_KEY = '_cg_consent';

export type ConsentValue = 'accepted' | 'declined' | null;

export function getConsent(): ConsentValue {
  try {
    return (localStorage.getItem(CONSENT_KEY) as ConsentValue) ?? null;
  } catch {
    return null;
  }
}

function setConsent(value: 'accepted' | 'declined') {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // private browsing — ignore
  }
}

const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner only if no decision has been made yet
    if (getConsent() === null) {
      // Small delay so the banner doesn't flash on first render
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setConsent('accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    setConsent('declined');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[45] p-4 animate-fade-in">
      <div className="max-w-5xl mx-auto bg-midnight border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="bg-gold/15 p-2 rounded-xl text-gold shrink-0 mt-0.5">
            <Cookie className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <EditableText tag="p" contentKey="cookie_banner_title" defaultValue="Ce site utilise des témoins (cookies)" className="text-white font-bold text-sm mb-0.5" />
            <p className="text-slate-400 text-xs leading-relaxed">
              <EditableText tag="span" contentKey="cookie_banner_msg" defaultValue="Nous utilisons des cookies analytiques (Firebase / Google) pour mesurer l'audience, avec ton consentement. Les cookies essentiels sont toujours actifs." />{' '}
              <Link to="/conditions#cookies" className="text-gold hover:underline underline-offset-2">
                <EditableText tag="span" contentKey="cookie_banner_more_link" defaultValue="En savoir plus" />
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="flex items-center gap-1.5 px-4 py-2 text-slate-400 hover:text-white border border-white/10 hover:border-white/30 rounded-xl text-sm font-bold transition-colors"
          >
            <X className="w-3.5 h-3.5" /> <EditableText tag="span" contentKey="cookie_banner_decline_btn" defaultValue="Refuser" />
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-1.5 px-5 py-2 bg-gold text-midnight rounded-xl text-sm font-bold hover:bg-white transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> <EditableText tag="span" contentKey="cookie_banner_accept_btn" defaultValue="Accepter" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
