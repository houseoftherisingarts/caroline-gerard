import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

const AdminLogin = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'banane') {
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight text-white px-4">
      <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-md w-full max-w-md shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="bg-gold/20 p-3 rounded-full text-gold">
            <Lock size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-serif text-center mb-6">Espace Auteure</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
              placeholder="••••••••"
              autoFocus
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">Mot de passe incorrect</p>}
          <button type="submit" className="w-full bg-gold text-midnight font-bold py-3 rounded-xl hover:bg-white transition-colors">
            Accéder
          </button>
        </form>
        <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-white transition-colors">Retour au site</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
