// AEO updated 2026-05-06
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { useSiteContent } from '../contexts/SiteContentContext';
import EditableText from '../components/EditableText';
import { useEditableString } from '../components/EditableField';
import { saveLead } from '../lib/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { VisibilitySettings, DEFAULT_VIS } from '../lib/firestore';

interface ContactPageProps {
  vis?: VisibilitySettings;
}

const ContactPage: React.FC<ContactPageProps> = ({ vis = DEFAULT_VIS }) => {
  const { content } = useSiteContent();
  const email = (content['contact_email'] ?? 'caroline@carolinegerard.ca').replace(/<[^>]*>/g, '').trim();
  const formDestination = (content['contact_form_destination'] ?? 'caroline@carolinegerard.ca').replace(/<[^>]*>/g, '').trim();
  const phone = (content['contact_phone'] ?? '').replace(/<[^>]*>/g, '').trim();

  const [name, setName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Editable form strings (placeholders, errors, aria labels)
  const namePh = useEditableString('contact_form_name_placeholder', 'Ton nom');
  const emailPh = useEditableString('contact_form_email_placeholder', 'ton@courriel.com');
  const subjectPh = useEditableString('contact_form_subject_placeholder', 'Sujet (optionnel)');
  const messagePh = useEditableString('contact_form_message_placeholder', 'Ton message…');
  const errMissingFields = useEditableString('contact_form_err_missing', 'Remplis au moins ton nom, ton courriel et le message.');
  const errInvalidEmail = useEditableString('contact_form_err_email', 'Adresse courriel invalide.');
  const errSendFailed = useEditableString('contact_form_err_send', "Impossible d'envoyer le message. Réessaie ou écris-moi directement par courriel.");
  const ariaNameLabel = useEditableString('contact_form_name_aria', 'Nom complet');
  const ariaEmailLabel = useEditableString('contact_form_email_aria', 'Adresse courriel');
  const ariaSubjectLabel = useEditableString('contact_form_subject_aria', 'Sujet');
  const ariaMessageLabel = useEditableString('contact_form_message_aria', 'Message');
  const ariaFormLabel = useEditableString('contact_form_aria', 'Formulaire de contact');
  const ariaEmailLink = useEditableString('contact_email_aria_link', `Envoyer un courriel à ${email}`);

  const canonicalUrl = 'https://carolinegerard.ca/contact';
  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact — Caroline Gérard',
    url: canonicalUrl,
    inLanguage: 'fr-CA',
    mainEntity: {
      '@type': 'Person',
      name: 'Caroline Gérard',
      jobTitle: 'Auteure jeunesse',
      email: `mailto:${email}`,
      ...(phone ? { telephone: phone } : {}),
      contactPoint: [{
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email,
        availableLanguage: ['French'],
        areaServed: 'CA',
      }],
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !senderEmail.trim() || !message.trim()) {
      setErrorMsg(errMissingFields);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      setErrorMsg(errInvalidEmail);
      return;
    }
    setStatus('loading');
    setErrorMsg('');

    const lead = {
      id: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source: 'Formulaire de contact',
      name: name.trim(),
      email: senderEmail.trim().toLowerCase(),
      message: `Sujet: ${subject || '(non précisé)'}\n\n${message.trim()}`,
      date: new Date().toISOString(),
      isRead: false,
      archived: false,
    };

    try {
      await saveLead(lead);
      try {
        const sendContactForm = httpsCallable(functions, 'sendContactForm');
        await sendContactForm({
          name: lead.name,
          email: lead.email,
          subject: subject || '(sans sujet)',
          message: message.trim(),
        });
      } catch {
        // Non-blocking: lead is saved in Firestore even if email forwarding fails
      }
      setStatus('success');
      setName(''); setSenderEmail(''); setSubject(''); setMessage('');
    } catch {
      setStatus('error');
      setErrorMsg(errSendFailed);
    }
  };

  return (
    <div className="min-h-screen pt-24 md:pt-40 pb-20 w-full px-5 md:px-16 flex flex-col items-center">
      <Helmet>
        <title>Caroline Gérard | Contact — Auteure jeunesse</title>
        <meta name="description" content="Contactez Caroline Gérard, auteure de « William et les univers invisibles ». Questions, collaborations, demandes média ou simplement pour dire bonjour." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_CA" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Contact — Caroline Gérard, auteure jeunesse" />
        <meta property="og:description" content="Écrivez à Caroline Gérard pour toute question, collaboration ou demande média." />
        <script type="application/ld+json">{JSON.stringify(contactJsonLd)}</script>
      </Helmet>

      <div className="w-full mb-8 md:mb-12 flex flex-col items-center text-center">
        <EditableText tag="span" contentKey="contact_label" defaultValue="Restons connectés" className="text-gold uppercase tracking-widest text-sm font-bold mb-4" />
        <EditableText tag="h1" contentKey="contact_title" defaultValue="Contactez-nous" className="font-serif text-4xl md:text-5xl lg:text-7xl text-white mb-4 md:mb-6" />
        <EditableText tag="p" contentKey="contact_description" defaultValue="Pour toute question, collaboration ou simplement pour dire bonjour." className="text-slate-400 max-w-2xl text-lg mb-12" />
      </div>

      <div className="flex flex-col items-center gap-6 md:gap-8 w-full max-w-2xl">
        {/* Carte Courriel */}
        <div className="bg-white/5 backdrop-blur-md p-10 rounded-2xl border border-white/10 text-center flex flex-col items-center hover:border-gold/30 transition-all w-full">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-6 text-gold">
            <Mail size={32} aria-hidden="true" />
          </div>
          <EditableText tag="h2" contentKey="contact_email_card_title" defaultValue="Courriel" className="text-2xl font-serif text-white mb-2" />
          <a href={`mailto:${email}`} className="text-slate-300 hover:text-gold transition-colors text-lg" aria-label={ariaEmailLink}>
            <EditableText tag="span" contentKey="contact_email" defaultValue="caroline@carolinegerard.ca" />
          </a>
          <EditableText
            tag="p"
            contentKey="contact_email_subtext"
            defaultValue="Réponse sous 2 à 5 jours ouvrables."
            className="text-slate-500 text-xs mt-3"
          />
        </div>

        {/* Carte Formulaire de contact */}
        {!vis.hideContactForm && (
          <div className="bg-white/5 backdrop-blur-md p-8 md:p-10 rounded-2xl border border-white/10 hover:border-gold/30 transition-all w-full">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-6 text-gold">
                <MessageSquare size={32} aria-hidden="true" />
              </div>
              <EditableText tag="h2" contentKey="contact_form_title" defaultValue="Formulaire de contact" className="text-2xl font-serif text-white mb-2" />
              <EditableText
                tag="p"
                contentKey="contact_form_subtext"
                defaultValue="Écris-moi en toute simplicité — je te répondrai personnellement."
                className="text-slate-400 text-sm"
              />
            </div>

            {status === 'success' ? (
              <div className="flex flex-col items-center text-center py-10">
                <CheckCircle className="w-12 h-12 text-green-400 mb-4" aria-hidden="true" />
                <EditableText
                  tag="p"
                  contentKey="contact_form_success_title"
                  defaultValue="Message envoyé !"
                  className="text-white font-bold text-lg mb-2"
                />
                <EditableText
                  tag="p"
                  contentKey="contact_form_success_text"
                  defaultValue="Merci pour ton message. Je te reviens dès que possible."
                  className="text-slate-400 text-sm"
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" aria-label={ariaFormLabel}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="sr-only">{ariaNameLabel}</span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={namePh}
                      autoComplete="name"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </label>
                  <label className="block">
                    <span className="sr-only">{ariaEmailLabel}</span>
                    <input
                      type="email"
                      required
                      value={senderEmail}
                      onChange={e => setSenderEmail(e.target.value)}
                      placeholder={emailPh}
                      autoComplete="email"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="sr-only">{ariaSubjectLabel}</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder={subjectPh}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </label>
                <label className="block">
                  <span className="sr-only">{ariaMessageLabel}</span>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={messagePh}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors resize-none"
                  />
                </label>
                {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-gold text-midnight font-bold rounded-xl hover:bg-white transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  {status === 'loading'
                    ? <EditableText tag="span" contentKey="contact_form_submitting" defaultValue="Envoi en cours…" />
                    : <EditableText tag="span" contentKey="contact_form_submit_btn" defaultValue="Envoyer mon message" />}
                </button>
                <EditableText
                  tag="p"
                  contentKey="contact_form_legal"
                  defaultValue="En envoyant ce message, tu acceptes que tes coordonnées soient utilisées uniquement pour te répondre, conformément à la Loi 25 (Québec)."
                  className="text-slate-600 text-xs text-center mt-2"
                />
                {/* Adresse de destination — visible uniquement en mode édition */}
                <p className="text-slate-700 text-[10px] text-center pt-1">
                  <span className="opacity-60">Destination des messages : </span>
                  <EditableText
                    tag="span"
                    contentKey="contact_form_destination"
                    defaultValue="caroline@carolinegerard.ca"
                    className="opacity-60"
                  />
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactPage;
