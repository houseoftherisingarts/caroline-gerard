import React, { useState } from 'react';
import { Conference, Lead } from '../types';
import { X, Info } from 'lucide-react';
import BlockRenderer from '../components/BlockRenderer';
import { saveLead } from '../lib/firestore';
import { trackConferenceBooking } from '../lib/analytics';
import EditableText from '../components/EditableText';

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
    <div className="bg-midnight/60 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl m-4 p-8 relative" onClick={e => e.stopPropagation()}>
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
    };
    saveLead(newLead);
    trackConferenceBooking(conference.title);
    setIsSubmitted(true);
    setTimeout(() => setBookingModalOpen(null), 2000);
  };

  const selectedBookingConference = conferences.find(c => c.id === bookingModalOpen);

  return (
    <div className="container mx-auto px-4 py-32">
      <div className="text-center mb-16">
        <EditableText tag="h1" contentKey="conferences_title" defaultValue="Engager Caroline" className="text-5xl font-serif font-bold text-white" />
        <EditableText tag="p" contentKey="conferences_description" defaultValue="Sollicitez une intervention de Caroline Gérard pour votre prochain événement, séminaire ou atelier d'entreprise. Partagez un thème et discutons des possibilités." className="text-slate-400 mt-4 max-w-2xl mx-auto" />
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
                <button onClick={() => setDetailsModalOpen(conference)} className="flex-1 bg-white/10 text-white font-bold py-3 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"><Info size={16} /> Détails</button>
                <button onClick={() => openBookingModal(conference.id)} className="flex-1 bg-gold text-midnight font-bold py-3 rounded-lg hover:bg-white transition-colors">Demander une intervention</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {bookingModalOpen && selectedBookingConference && (
        <Modal onClose={() => setBookingModalOpen(null)}>
          {isSubmitted ? (
            <div className="text-center py-12">
              <h2 className="text-3xl font-serif text-gold mb-4">Merci !</h2>
              <p className="text-slate-300">Votre demande d&apos;intervention a bien été envoyée. Nous vous contacterons sous peu.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-3xl font-serif text-white mb-2">Demande d&apos;intervention: <span className="text-gold">{selectedBookingConference.title}</span></h2>
              <p className="text-slate-400 pb-4">Veuillez remplir le formulaire ci-dessous pour engager Caroline.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">...</div>
            </form>
          )}
        </Modal>
      )}

      {detailsModalOpen && (
        <div className="fixed inset-0 z-[100] bg-midnight overflow-y-auto w-full h-full animate-fade-in">
          <div className="w-full max-w-screen-xl mx-auto px-6 md:px-12 pt-32 pb-24 relative">
            <button onClick={() => setDetailsModalOpen(null)} className="fixed top-6 right-6 z-10 p-2 text-slate-500 hover:text-white bg-black/20 rounded-full transition-colors"><X /></button>
            <img src={detailsModalOpen.image} alt={detailsModalOpen.title} className="w-full h-[50vh] object-cover rounded-2xl mb-8 shadow-lg" />
            <h1 className="text-5xl md:text-7xl font-serif text-white mb-4">{detailsModalOpen.title}</h1>
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
