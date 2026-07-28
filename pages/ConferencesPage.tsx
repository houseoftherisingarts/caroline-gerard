// AEO updated 2026-05-06
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Conference, Lead } from '../types';
import { X, Info } from 'lucide-react';
import BlockRenderer from '../components/BlockRenderer';
import { saveLead } from '../lib/firestore';
import { trackConferenceBooking } from '../lib/analytics';
import EditableText from '../components/EditableText';
import { thumb } from '../lib/img';

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
    <div className="bg-midnight/60 border border-white/10 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl sm:m-4 p-5 md:p-8 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
      {children}
    </div>
  </div>
);

const ConferencesPage = ({ conferences }: { conferences: Conference[] }) => {
  const [bookingModalOpen, setBookingModalOpen] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState<Conference | null>(null);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', eventInfo: '', details: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const openBookingModal = (conferenceId: string) => {
    setBookingModalOpen(conferenceId);
    setIsSubmitted(false);
    setFormData({ name: '', company: '', email: '', eventInfo: '', details: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const conference = conferences.find(c => c.id === bookingModalOpen);
    if (!conference) return;
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      source: `Intervention - ${conference.title}`,
      name: formData.name,
      email: formData.email,
      message: `Entreprise: ${formData.company}\nDate/Lieu: ${formData.eventInfo}\n\nDétails: ${formData.details}`,
      date: new Date().toISOString(),
      isRead: false,
      archived: false,
    };
    saveLead(newLead);
    trackConferenceBooking(conference.title);
    setIsSubmitted(true);
    setTimeout(() => setBookingModalOpen(null), 2000);
  };

  const selectedBookingConference = conferences.find(c => c.id === bookingModalOpen);

  const canonicalUrl = 'https://carolinegerard.ca/conferences';
  const servicesJsonLd = conferences.filter(c => c.isPublished).map(c => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: c.title,
    description: c.description,
    image: c.image,
    provider: { '@type': 'Person', name: 'Caroline Gérard', url: 'https://carolinegerard.ca/' },
    serviceType: 'Conférence et intervention',
    areaServed: { '@type': 'Country', name: 'Canada' },
    url: canonicalUrl,
    inLanguage: 'fr-CA',
  }));

  return (
    <div className="container mx-auto px-4 pt-24 md:pt-32 pb-16 md:pb-20">
      <Helmet>
        <title>Conférences | Caroline Gérard — Interventions & ateliers</title>
        <meta name="description" content="Engager Caroline Gérard pour une conférence, un atelier ou une intervention en milieu scolaire, événementiel ou corporatif. Thèmes : différence, écriture, créativité." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_CA" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Conférences — Caroline Gérard" />
        <meta property="og:description" content="Sollicite une intervention de Caroline Gérard pour ton prochain événement." />
        {servicesJsonLd.map((s, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
        ))}
      </Helmet>
      <div className="text-center mb-10 md:mb-16">
        <EditableText tag="h1" contentKey="conferences_title" defaultValue="Engager Caroline" className="text-3xl md:text-5xl font-serif font-bold text-white" />
        <EditableText tag="p" contentKey="conferences_description" defaultValue="Sollicite une intervention de Caroline Gérard pour ton prochain événement, séminaire ou atelier d'entreprise. Partage un thème et discutons des possibilités." className="text-slate-400 mt-4 max-w-2xl mx-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {conferences.filter(c => c.isPublished).map(conference => (
          <div key={conference.id} className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden flex flex-col group">
            <div className="aspect-video bg-slate-800 overflow-hidden cursor-pointer" onClick={() => setDetailsModalOpen(conference)}>
              <img src={conference.image} alt={conference.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-2xl font-serif font-bold text-white mb-3 cursor-pointer" onClick={() => setDetailsModalOpen(conference)}>{conference.title}</h3>
              <p className="text-slate-400 text-sm flex-1 mb-6">{conference.description}</p>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => setDetailsModalOpen(conference)} className="flex-1 bg-white/10 text-white font-bold py-3 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"><Info size={16} /> <EditableText tag="span" contentKey="conferences_details_btn" defaultValue="Détails" /></button>
                <button onClick={() => openBookingModal(conference.id)} className="flex-1 bg-gold text-midnight font-bold py-3 rounded-lg hover:bg-white transition-colors">
                  <EditableText tag="span" contentKey="conferences_book_btn" defaultValue="Demander une intervention" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {bookingModalOpen && selectedBookingConference && (
        <Modal onClose={() => setBookingModalOpen(null)}>
          {isSubmitted ? (
            <div className="text-center py-12">
              <EditableText tag="h2" contentKey="conferences_thanks_title" defaultValue="Merci !" className="text-3xl font-serif text-gold mb-4" />
              <EditableText tag="p" contentKey="conferences_thanks_msg" defaultValue="Ta demande d'intervention a bien été envoyée. Nous te contacterons sous peu." className="text-slate-300" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-3xl font-serif text-white mb-2">
                <EditableText tag="span" contentKey="conferences_form_title_prefix" defaultValue="Demande d'intervention:" />{' '}
                <span className="text-gold">{selectedBookingConference.title}</span>
              </h2>
              <EditableText tag="p" contentKey="conferences_form_intro" defaultValue="Remplis le formulaire ci-dessous pour engager Caroline." className="text-slate-400 pb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">...</div>
            </form>
          )}
        </Modal>
      )}

      {/* Liens internes contextuels (AEO) */}
      {conferences.filter(c => c.isPublished).length > 0 && (
        <div className="max-w-3xl mx-auto mt-16 text-center text-slate-400 text-sm leading-relaxed">
          <p>
            <EditableText tag="span" contentKey="conferences_links_intro" defaultValue="Pour rencontrer Caroline en personne, consultez aussi les " />
            <Link to="/evenements" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="conferences_links_evenements" defaultValue="événements à venir" />
            </Link>
            <EditableText tag="span" contentKey="conferences_links_seg2" defaultValue=". Pour découvrir le livre, visitez la " />
            <Link to="/boutique" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="conferences_links_boutique" defaultValue="boutique" />
            </Link>
            <EditableText tag="span" contentKey="conferences_links_seg3" defaultValue=". Pour toute demande personnalisée, écrivez via la " />
            <Link to="/contact" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="conferences_links_contact" defaultValue="page contact" />
            </Link>
            <EditableText tag="span" contentKey="conferences_links_outro" defaultValue="." />
          </p>
        </div>
      )}

      {detailsModalOpen && (
        <div className="fixed inset-0 z-[100] bg-midnight overflow-y-auto w-full h-full animate-fade-in">
          <div className="w-full max-w-screen-xl mx-auto px-4 md:px-12 pt-16 md:pt-32 pb-16 md:pb-24 relative">
            <button onClick={() => setDetailsModalOpen(null)} className="fixed top-4 right-4 md:top-6 md:right-6 z-10 p-2.5 text-slate-400 hover:text-white bg-black/40 rounded-full transition-colors"><X size={20} /></button>
            <img src={detailsModalOpen.image} alt={detailsModalOpen.title} className="w-full h-[25vh] md:h-[50vh] object-cover rounded-2xl mb-6 md:mb-8 shadow-lg" />
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-serif text-white mb-4">{detailsModalOpen.title}</h1>
            <div className="border-b border-white/10 pb-8 mb-12">
              <p className="text-slate-300 text-xl max-w-3xl">{detailsModalOpen.description}</p>
            </div>
            <BlockRenderer content={detailsModalOpen.content} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConferencesPage;
