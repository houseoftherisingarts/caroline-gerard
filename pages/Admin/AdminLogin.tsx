// SETUP: In Firebase Console → Authentication → Sign-in method → enable Email/Password
// Then go to Users → Add user → enter Caroline's email and a secure password.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App.tsx onAuthStateChanged handles the rest
    } catch {
      setError('Courriel ou mot de passe incorrect.');
    } finally {
      setLoading(false);
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
            <label className="block text-sm font-bold text-slate-400 mb-2">Courriel</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                placeholder="votre@courriel.com"
                autoFocus
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-midnight font-bold py-3 rounded-xl hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Accéder'}
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
