import React from 'react';
import { Mail } from 'lucide-react';
import { useSiteContent } from '../contexts/SiteContentContext';
import EditableText from '../components/EditableText';

const ContactPage: React.FC = () => {
  const { content } = useSiteContent();
  const email = content['contact_email'] ?? 'caroline.gerard@live.ca';

  return (
    <div className="min-h-screen pt-24 md:pt-40 pb-20 w-full px-5 md:px-16 flex flex-col items-center">
      <div className="w-full mb-8 md:mb-12 flex flex-col items-center text-center">
        <EditableText tag="span" contentKey="contact_label" defaultValue="Restons connectés" className="text-gold uppercase tracking-widest text-sm font-bold mb-4" />
        <EditableText tag="h1" contentKey="contact_title" defaultValue="Contactez-nous" className="font-serif text-4xl md:text-5xl lg:text-7xl text-white mb-4 md:mb-6" />
        <EditableText tag="p" contentKey="contact_description" defaultValue="Pour toute question, collaboration ou simplement pour dire bonjour." className="text-slate-400 max-w-2xl text-lg mb-12" />
      </div>

      <div className="flex justify-center w-full max-w-4xl">
        <div className="bg-white/5 backdrop-blur-md p-10 rounded-2xl border border-white/10 text-center flex flex-col items-center hover:border-gold/30 transition-all w-full max-w-md">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-6 text-gold">
            <Mail size={32} />
          </div>
          <h3 className="text-2xl font-serif text-white mb-2">Courriel</h3>
          <a href={`mailto:${email}`} className="text-slate-300 hover:text-gold transition-colors text-lg">
            <EditableText tag="span" contentKey="contact_email" defaultValue="caroline.gerard@live.ca" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
