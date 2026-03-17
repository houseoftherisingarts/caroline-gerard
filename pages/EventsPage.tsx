import React, { useState } from 'react';
import { MapPin, ExternalLink, X } from 'lucide-react';
import { AppEvent } from '../types';
import BlockRenderer from '../components/BlockRenderer';
import EditableText from '../components/EditableText';

const EventsPage = ({ events }: { events: AppEvent[] }) => {
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  const getMonthName = (dateStr: string) => {
    const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC'];
    return months[new Date(dateStr).getMonth()];
  };
  const getYear = (dateStr: string) => dateStr.split('-')[0];
  const getDay = (dateStr: string) => dateStr.split('-')[2];

  const publishedEvents = events.filter(e => e.isPublished);

  return (
    <>
      <div className="min-h-screen pt-40 pb-20 w-full px-8 md:px-16">
        <div className="w-full mb-16 flex flex-col items-center text-center">
          <EditableText tag="span" contentKey="events_label" defaultValue="Agenda" className="text-gold uppercase tracking-widest text-sm font-bold mb-4" />
          <EditableText tag="h1" contentKey="events_title" defaultValue="Événements à venir" className="font-serif text-5xl md:text-7xl text-white mb-6" />
          <EditableText tag="p" contentKey="events_description" defaultValue="Venez nous rencontrer et partager un moment magique." className="text-slate-400 max-w-2xl text-lg" />
        </div>

        <div className="grid gap-6 max-w-4xl mx-auto">
          {publishedEvents.length > 0 ? publishedEvents.map(event => (
            <div key={event.id} className="bg-midnight/60 backdrop-blur-md p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-8 items-center hover:border-gold/30 transition-all cursor-pointer" onClick={() => setSelectedEvent(event)}>
              <div className="bg-white/5 p-6 rounded-2xl text-center min-w-[120px] border border-white/5">
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
            </div>
          )) : (
            <p className="text-center text-slate-500 italic">Aucun événement prévu pour le moment.</p>
          )}
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-[100] bg-midnight overflow-y-auto w-full h-full animate-fade-in">
          <div className="w-full max-w-screen-xl mx-auto px-6 md:px-12 pt-32 pb-24 relative">
            <button onClick={() => setSelectedEvent(null)} className="fixed top-6 right-6 z-10 p-2 text-slate-500 hover:text-white bg-black/20 rounded-full transition-colors"><X /></button>
            <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-[50vh] object-cover rounded-2xl mb-8 shadow-lg" />
            <h1 className="text-5xl md:text-7xl font-serif text-white mb-4">{selectedEvent.title}</h1>
            <div className="flex items-center justify-between border-b border-white/10 pb-8 mb-12">
              <div className="flex items-center gap-4 text-sm text-gold">
                <span className="font-bold uppercase tracking-wider flex items-center gap-2"><MapPin size={16} /> {selectedEvent.location}</span>
              </div>
              {selectedEvent.link && (
                <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white hover:text-gold transition-colors font-bold">
                  En savoir plus <ExternalLink size={16} />
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
