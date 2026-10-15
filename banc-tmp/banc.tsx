import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ImportFacebook from '../pages/Admin/ImportFacebook';
import { NewsItem } from '../types';
declare global { interface Window { __resultats: NewsItem[]; __photos: string[] } }
window.__resultats = []; window.__photos = [];
const deja: NewsItem[] = [{ id: 'n1', slug: 'deja', title: 'Déjà', body: '', image: '', date: '2025-06-15', isPublished: true, createdAt: '', source: 'facebook:1750000000' }];
createRoot(document.getElementById('root')!).render(
  <MemoryRouter>
    <ImportFacebook
      news={deja}
      onClose={() => { document.title = 'ferme'; }}
      televerser={async (f) => { window.__photos.push(f.name); return 'https://photos.test/' + f.name; }}
      enregistrer={async (item) => { window.__resultats.push(item); }}
    />
  </MemoryRouter>,
);
