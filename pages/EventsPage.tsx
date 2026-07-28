// AEO updated 2026-05-06
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink, X } from 'lucide-react';
import { AppEvent } from '../types';
import BlockRenderer from '../components/BlockRenderer';
import EditableText from '../components/EditableText';

const getFirstImage = (image: string | undefined, content: string): string => {
  if (image) return image;
  try {
    const rows = JSON.parse(content || '[]');
    for (const row of rows) {
      for (const col of row.columns) {
        if (col.type === 'image' && col.value) return col.value;
      }
    }
  } catch {}
  return '';
};

const EventsPage = ({ events }: { events: AppEvent[] }) => {
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  const getMonthName = (dateStr: string) => {
    const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC'];
    return months[new Date(dateStr).getMonth()];
  };
  const getYear = (dateStr: string) => dateStr.split('-')[0];
  const getDay = (dateStr: string) => dateStr.split('-')[2];

  const publishedEvents = events
    .filter(e => e.isPublished)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const canonicalUrl = 'https://carolinegerard.ca/evenements';
  const eventJsonLdBlocks = publishedEvents.map(e => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    startDate: e.date,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: e.location,
      address: { '@type': 'PostalAddress', addressLocality: e.location, addressRegion: 'QC', addressCountry: 'CA' },
    },
    description: e.description,
    image: getFirstImage(e.image, e.content) || undefined,
    organizer: { '@type': 'Person', name: 'Caroline Gérard', url: 'https://carolinegerard.ca/' },
    performer: { '@type': 'Person', name: 'Caroline Gérard' },
    url: e.link || canonicalUrl,
    offers: {
      '@type': 'Offer',
      url: e.link || canonicalUrl,
      availability: 'https://schema.org/InStock',
      price: '0',
      priceCurrency: 'CAD',
      validFrom: new Date().toISOString(),
    },
  }));

  return (
    <>
      <Helmet>
        <title>Événements | Caroline Gérard — Salons du livre, dédicaces, lancements</title>
        <meta name="description" content="Rencontrez Caroline Gérard et William Lorrain en personne lors des prochains salons du livre, dédicaces et lancements au Québec." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_CA" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Événements à venir — Caroline Gérard" />
        <meta property="og:description" content="Salons, dédicaces et lancements à venir." />
        {eventJsonLdBlocks.map((e, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(e)}</script>
        ))}
      </Helmet>
      <div className="min-h-screen pt-24 md:pt-40 pb-20 w-full px-4 md:px-16">
        <div className="w-full mb-10 md:mb-16 flex flex-col items-center text-center">
          <EditableText tag="span" contentKey="events_label" defaultValue="Agenda" className="text-gold uppercase tracking-widest text-sm font-bold mb-4" />
          <EditableText tag="h1" contentKey="events_title" defaultValue="Événements à venir" className="font-serif text-4xl md:text-5xl lg:text-7xl text-white mb-4 md:mb-6" />
          <EditableText tag="p" contentKey="events_description" defaultValue="Venez nous rencontrer et partager un moment magique." className="text-slate-400 max-w-2xl text-lg" />
        </div>

        <div className="grid gap-6 max-w-4xl mx-auto">
          {publishedEvents.length > 0 ? publishedEvents.map(event => (
            <div key={event.id} className="bg-midnight/60 backdrop-blur-md p-5 md:p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 md:gap-8 items-center hover:border-gold/30 transition-all cursor-pointer" onClick={() => setSelectedEvent(event)}>
              <div className="bg-white/5 p-4 md:p-6 rounded-2xl text-center min-w-[100px] md:min-w-[120px] border border-white/5 self-start md:self-auto">
                <span className="block text-4xl font-serif font-bold text-gold">{getDay(event.date)}</span>
                <span className="block text-sm uppercase text-slate-300 tracking-widest mt-1">{getMonthName(event.date)} {getYear(event.date)}</span>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-serif text-white mb-3">{event.title}</h3>
                <p className="text-slate-400 mb-4 whitespace-pre-wrap">{event.description}</p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-gold font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-2"><MapPin size={16} /> {event.location}</span>
                </div>
              </div>
              {getFirstImage(event.image, event.content) && (
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={getFirstImage(event.image, event.content)} alt={event.title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )) : (
            <EditableText tag="p" contentKey="events_empty_msg" defaultValue="Aucun événement prévu pour le moment." className="text-center text-slate-500" />
          )}
        </div>

        {/* Liens internes contextuels (AEO) */}
        <div className="max-w-3xl mx-auto mt-16 text-center text-slate-400 text-sm leading-relaxed">
          <p>
            <EditableText tag="span" contentKey="events_links_intro" defaultValue="Pour réserver le livre avant un salon, visite la " />
            <Link to="/boutique" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="events_links_boutique" defaultValue="boutique" />
            </Link>
            <EditableText tag="span" contentKey="events_links_seg2" defaultValue=". Pour organiser une rencontre en milieu scolaire ou corporatif, vois nos " />
            <Link to="/conferences" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="events_links_conferences" defaultValue="conférences" />
            </Link>
            <EditableText tag="span" contentKey="events_links_seg3" defaultValue=". Tu peux aussi nous écrire via la " />
            <Link to="/contact" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="events_links_contact" defaultValue="page contact" />
            </Link>
            <EditableText tag="span" contentKey="events_links_outro" defaultValue="." />
          </p>
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-[100] bg-midnight overflow-y-auto w-full h-full animate-fade-in">
          <div className="w-full max-w-screen-xl mx-auto px-4 md:px-12 pt-16 md:pt-32 pb-16 md:pb-24 relative">
            <button onClick={() => setSelectedEvent(null)} className="fixed top-4 right-4 md:top-6 md:right-6 z-10 p-2.5 text-slate-400 hover:text-white bg-black/40 rounded-full transition-colors"><X size={20} /></button>
            {getFirstImage(selectedEvent.image, selectedEvent.content) && <img src={getFirstImage(selectedEvent.image, selectedEvent.content)} alt={selectedEvent.title} className="w-full h-[25vh] md:h-[50vh] object-cover rounded-2xl mb-6 md:mb-8 shadow-lg" />}
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-serif text-white mb-4">{selectedEvent.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between border-b border-white/10 pb-6 md:pb-8 mb-8 md:mb-12">
              <div className="flex items-center gap-4 text-sm text-gold">
                <span className="font-bold uppercase tracking-wider flex items-center gap-2"><MapPin size={16} /> {selectedEvent.location}</span>
              </div>
              {selectedEvent.link && (
                <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white hover:text-gold transition-colors font-bold">
                  <EditableText tag="span" contentKey="events_more_info_link" defaultValue="En savoir plus" /> <ExternalLink size={16} />
                </a>
              )}
            </div>
            <BlockRenderer content={selectedEvent.content} />
          </div>
        </div>
      )}
    </>
  );
};

export default EventsPage;
