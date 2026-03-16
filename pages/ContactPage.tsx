import React from 'react';
import { Mail } from 'lucide-react';

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-40 pb-20 w-full px-8 md:px-16 flex flex-col items-center">
        <div className="w-full mb-12 flex flex-col items-center text-center">
            <span className="text-gold uppercase tracking-widest text-sm font-bold mb-4">Restons connectés</span>
            <h1 className="font-serif text-5xl md:text-7xl text-white mb-6">Contactez-nous</h1>
            <p className="text-slate-400 max-w-2xl text-lg mb-12">
                Pour toute question, collaboration ou simplement pour dire bonjour.
            </p>
        </div>

        <div className="flex justify-center w-full max-w-4xl">
            <div className="bg-white/5 backdrop-blur-md p-10 rounded-2xl border border-white/10 text-center flex flex-col items-center hover:border-gold/30 transition-all w-full max-w-md">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-6 text-gold">
                    <Mail size={32} />
                </div>
                <h3 className="text-2xl font-serif text-white mb-2">Courriel</h3>
                <a href="mailto:caroline.gerard@live.ca" className="text-slate-300 hover:text-gold transition-colors text-lg">
                    caroline.gerard@live.ca
                </a>
            </div>
        </div>
    </div>
  );
};

export default ContactPage;
