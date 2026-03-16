import React, { useState, useMemo } from 'react';
import { DollarSign, Plus, Trash2, BarChart2, Layers } from 'lucide-react';

// --- Types ---
type ProductStatus = 'actuel' | 'projeté';
type LadderItem = { id: string; name: string; price: number; status: ProductStatus };
type LadderCategory = { id: string; title: string; items: LadderItem[] };

// --- Initial Data with New Categories ---
const initialLadder: LadderCategory[] = [
  { id: 'freemium', title: 'Freemium', items: [{ id: 'item-1', name: 'Guide PDF Gratuit', price: 0, status: 'actuel' }] },
  { id: 'tier-1', title: '1$ - 10$', items: [] },
  { id: 'tier-2', title: '11$ - 100$', items: [{ id: 'item-2', name: 'Atelier Découverte', price: 47, status: 'actuel' }, { id: 'item-3', name: 'Ebook: 30 Jours', price: 27, status: 'projeté' }] },
  { id: 'tier-3', title: '101$ - 500$', items: [{ id: 'item-4', name: 'Formation En Ligne', price: 197, status: 'projeté' }] },
  { id: 'tier-4', title: '501$ - 1000$', items: [{ id: 'item-5', name: 'Coaching de Groupe', price: 997, status: 'actuel' }] },
  { id: 'tier-5', title: '1000$ - 5000$', items: [{ id: 'item-6', name: 'Mentorat Privé', price: 2500, status: 'actuel' }] },
  { id: 'tier-6', title: '5001$ +', items: [] },
];

// --- Helper Functions ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(value);
};

// --- Main Component ---
const AdminProductLadder = () => {
  const [ladder, setLadder] = useState<LadderCategory[]>(initialLadder);

  const financialSummary = useMemo(() => {
    let actuel = 0;
    let projeté = 0;
    ladder.forEach(category => {
      category.items.forEach(item => {
        if (item.status === 'actuel') {
          actuel += item.price;
        } else {
          projeté += item.price;
        }
      });
    });
    return { actuel, projeté, total: actuel + projeté };
  }, [ladder]);

  const handleItemChange = (categoryId: string, itemId: string, field: keyof LadderItem, value: string | number) => {
    setLadder(prevLadder => prevLadder.map(category => {
      if (category.id === categoryId) {
        return { ...category, items: category.items.map(item => item.id === itemId ? { ...item, [field]: value } : item) };
      }
      return category;
    }));
  };

  const addItem = (categoryId: string) => {
    const newItem: LadderItem = { id: `item-${Date.now()}`, name: 'Nouveau Produit', price: 0, status: 'projeté' };
    setLadder(prevLadder => prevLadder.map(category => category.id === categoryId ? { ...category, items: [...category.items, newItem] } : category));
  };

  const deleteItem = (categoryId: string, itemId: string) => {
    setLadder(prevLadder => prevLadder.map(category => category.id === categoryId ? { ...category, items: category.items.filter(item => item.id !== itemId) } : category));
  };

  return (
    <div className="space-y-8 animate-fade-in-up h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white">Échelle de Produits</h1>
        <p className="text-slate-400 mt-1">Structurez votre pipeline d&apos;offres pour visualiser le parcours client.</p>
      </div>

      {/* Financial Dashboard */}
      <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6 flex-shrink-0">
        <h2 className="text-xl font-bold text-gold mb-4 font-serif">Bilan Financier</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/20 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-3 text-slate-400 text-sm font-bold"><DollarSign size={16} /> Valeur Actuelle</div>
            <p className="text-3xl font-bold text-white mt-2">{formatCurrency(financialSummary.actuel)}</p>
          </div>
          <div className="bg-black/20 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-3 text-slate-400 text-sm font-bold"><BarChart2 size={16} /> Valeur Projetée</div>
            <p className="text-3xl font-bold text-white mt-2">{formatCurrency(financialSummary.projeté)}</p>
          </div>
          <div className="bg-black/20 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-3 text-slate-400 text-sm font-bold"><Layers size={16} /> Valeur Totale Globale</div>
            <p className="text-3xl font-bold text-gold mt-2">{formatCurrency(financialSummary.total)}</p>
          </div>
        </div>
      </div>

      {/* Product Ladder Pipeline */}
      <div className="flex-1 flex overflow-x-auto gap-6 pb-8 snap-x w-full custom-scrollbar">
        {ladder.map(category => (
          <div key={category.id} className="min-w-[320px] w-[320px] shrink-0 snap-start flex flex-col">
            <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-4 h-full flex flex-col">
              <h3 className="text-lg font-bold text-gold mb-4 text-center font-serif tracking-wider">{category.title}</h3>
              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {category.items.map(item => (
                  <div key={item.id} className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-2">
                    <input 
                      type="text" 
                      value={item.name}
                      onChange={e => handleItemChange(category.id, item.id, 'name', e.target.value)}
                      className="w-full bg-transparent text-white font-bold focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="number"
                          value={item.price}
                          onChange={e => handleItemChange(category.id, item.id, 'price', parseInt(e.target.value) || 0)}
                          className="w-full bg-white/5 rounded-md p-2 pl-7 text-white focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      </div>
                      <select 
                        value={item.status}
                        onChange={e => handleItemChange(category.id, item.id, 'status', e.target.value)}
                        className="flex-1 bg-white/5 text-white rounded-md p-2 border border-transparent focus:outline-none focus:ring-2 focus:ring-gold/50"
                      >
                        <option value="actuel">Actuel</option>
                        <option value="projeté">Projeté</option>
                      </select>
                      <button onClick={() => deleteItem(category.id, item.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => addItem(category.id)} className="mt-4 bg-white/5 text-gold font-bold py-2 px-4 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm w-full">
                <Plus size={16} /> Ajouter un produit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProductLadder;
