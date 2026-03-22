import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import {
  Feather,
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Layers,
  Camera,
  Edit3,
  Calendar,
  Image as ImageIcon,
  Package,
  Settings,
  Briefcase,
  CheckSquare,
  Mic,
  Globe,
  Users,
} from 'lucide-react';

const NavLink = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to));
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-gold text-midnight font-bold shadow-lg transform translate-x-2' 
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })}
      <span>{label}</span>
    </Link>
  );
}

const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const isEditor = location.pathname === '/admin/editeur';

  // In editor mode, render children full-screen without the sidebar
  if (isEditor) return <>{children}</>;

  return (
    <div className="min-h-screen text-slate-200 font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-72 bg-midnight/90 backdrop-blur-xl border-r border-white/5 text-white fixed md:h-full z-40 flex flex-col shadow-2xl overflow-y-auto">
        <div className="p-8 border-b border-white/10 flex items-center gap-3">
          <div className="bg-gold p-2 rounded-xl text-midnight">
            <Feather className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold tracking-wide">Espace Auteure</h2>
            <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Caroline Gérard</p>
          </div>
        </div>
        
        <nav className="flex-1 py-8 px-4 space-y-2">
          <NavLink to="/admin" icon={<LayoutDashboard />} label="Tableau de bord" />
          <NavLink to="/admin/commandes" icon={<ShoppingCart />} label="Commandes" />
          <NavLink to="/admin/factures" icon={<FileText />} label="Factures & Devis" />
          <NavLink to="/admin/echelle" icon={<Layers />} label="Échelle Produits" />
          <NavLink to="/admin/studio" icon={<Camera />} label="Studio Social" />
          <NavLink to="/admin/contenu" icon={<Edit3 />} label="Articles de Blog" />
          <NavLink to="/admin/evenements" icon={<Calendar />} label="Événements" />
          <NavLink to="/admin/conferences" icon={<Briefcase />} label="Conférences" />
          <NavLink to="/admin/interviews" icon={<Mic />} label="Interviews & Médias" />
          <NavLink to="/admin/medias" icon={<ImageIcon />} label="Médiathèque" />
          <NavLink to="/admin/produits" icon={<Package />} label="Inventaire Livres" />
          <NavLink to="/admin/kanban" icon={<CheckSquare />} label="Kanban" />
          <NavLink to="/admin/communaute" icon={<Users />} label="Communauté" />
          <div className="my-2 border-t border-white/5" />
          <NavLink to="/admin/editeur" icon={<Globe />} label="Modifier le site" />
        </nav>
        
        <div className="p-6 border-t border-white/10 bg-deep-blue/30">
          <Link to="/" className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors group">
            <div className="p-2 bg-white/10 rounded-xl group-hover:bg-gold group-hover:text-midnight transition-colors">
               <Settings className="w-4 h-4" />
            </div>
            Retour au site public
          </Link>
          <button onClick={() => signOut(auth)} className="flex items-center gap-3 text-sm text-slate-500 hover:text-red-400 transition-colors mt-2 w-full">
            <div className="p-2 bg-white/5 rounded-xl">
              <Settings className="w-4 h-4" />
            </div>
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-72 p-6 md:p-10 overflow-y-auto min-h-screen relative z-10">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
