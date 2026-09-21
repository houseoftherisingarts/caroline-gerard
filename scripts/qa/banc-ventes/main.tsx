import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminVentes from '../../../pages/Admin/AdminVentes';
import AdminConsignations from '../../../pages/Admin/AdminConsignations';
import type { Book } from '../../../types';
import '../../../index.css';

const BOOKS: Book[] = [{
  id: 'b1', title: 'William et les univers invisibles', subtitle: 'Tome 1', description: '', price: 25, color: '#d4af37',
  image: 'https://storage.googleapis.com/salondesinconnus/Caroline/Gemini_Generated_Image_8wrovw8wrovw8wro.png',
}];

const page = new URLSearchParams(location.search).get('page') ?? 'ventes';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen bg-midnight text-paper">
    <aside className="hidden lg:block fixed top-0 left-0 w-72 h-screen bg-deep-blue/40 border-r border-white/10" />
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-midnight/95 border-b border-white/10 px-4 py-3 h-14 flex items-center text-white font-serif font-bold">Espace Auteure</div>
    <main className="lg:ml-72 min-h-screen relative z-10">
      <div className="lg:hidden h-14" />
      <div className="p-4 md:p-6 lg:p-10">
        {page === 'depositaires' ? <AdminConsignations books={BOOKS} /> : <AdminVentes books={BOOKS} />}
      </div>
    </main>
  </div>
);
