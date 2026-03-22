import React, { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';

const NavLink = ({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 lg:py-4 rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-gold text-midnight font-bold shadow-lg translate-x-1 lg:translate-x-2'
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 18 })}
      <span className="text-sm lg:text-base">{label}</span>
    </Link>
  );
};

const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const isEditor = location.pathname === '/admin/editeur';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isEditor) return <>{children}</>;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen text-slate-200 font-sans">

      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-midnight/95 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-xl">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-gold p-1.5 rounded-lg text-midnight">
            <Feather className="w-4 h-4" />
          </div>
          <span className="font-serif text-sm font-bold text-white">Espace Auteure</span>
        </div>
        <Link to="/" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
          <Globe size={18} />
        </Link>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 w-72
        bg-midnight/95 backdrop-blur-xl border-r border-white/5 text-white
        flex flex-col shadow-2xl overflow-y-auto
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gold p-2 rounded-xl text-midnight">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold tracking-wide">Espace Auteure</h2>
              <p className="text-slate-400 text-xs mt-0.5 uppercase tracking-widest">Caroline Gérard</p>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <NavLink to="/admin" icon={<LayoutDashboard />} label="Tableau de bord" onClick={closeSidebar} />
          <NavLink to="/admin/commandes" icon={<ShoppingCart />} label="Commandes" onClick={closeSidebar} />
          <NavLink to="/admin/factures" icon={<FileText />} label="Factures & Devis" onClick={closeSidebar} />
          <NavLink to="/admin/echelle" icon={<Layers />} label="Échelle Produits" onClick={closeSidebar} />
          <NavLink to="/admin/studio" icon={<Camera />} label="Studio Social" onClick={closeSidebar} />
          <NavLink to="/admin/contenu" icon={<Edit3 />} label="Articles de Blog" onClick={closeSidebar} />
          <NavLink to="/admin/evenements" icon={<Calendar />} label="Événements" onClick={closeSidebar} />
          <NavLink to="/admin/conferences" icon={<Briefcase />} label="Conférences" onClick={closeSidebar} />
          <NavLink to="/admin/interviews" icon={<Mic />} label="Interviews & Médias" onClick={closeSidebar} />
          <NavLink to="/admin/medias" icon={<ImageIcon />} label="Médiathèque" onClick={closeSidebar} />
          <NavLink to="/admin/produits" icon={<Package />} label="Inventaire Livres" onClick={closeSidebar} />
          <NavLink to="/admin/kanban" icon={<CheckSquare />} label="Kanban" onClick={closeSidebar} />
          <NavLink to="/admin/communaute" icon={<Users />} label="Communauté" onClick={closeSidebar} />
          <div className="my-2 border-t border-white/5" />
          <NavLink to="/admin/editeur" icon={<Globe />} label="Modifier le site" onClick={closeSidebar} />
        </nav>

        <div className="p-4 border-t border-white/10 bg-deep-blue/30 space-y-1">
          <Link
            to="/"
            onClick={closeSidebar}
            className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors group px-3 py-2 rounded-xl hover:bg-white/5"
          >
            <div className="p-2 bg-white/10 rounded-xl group-hover:bg-gold group-hover:text-midnight transition-colors">
              <Settings className="w-4 h-4" />
            </div>
            Retour au site public
          </Link>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 text-sm text-slate-500 hover:text-red-400 transition-colors w-full px-3 py-2 rounded-xl hover:bg-white/5"
          >
            <div className="p-2 bg-white/5 rounded-xl">
              <Settings className="w-4 h-4" />
            </div>
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-72 min-h-screen relative z-10">
        {/* Spacer for mobile header */}
        <div className="lg:hidden h-14" />
        <div className="p-4 md:p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
