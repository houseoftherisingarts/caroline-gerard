import React, { useState } from 'react';
import Book3D from '../components/Book3D';
import { books } from '../data';
import { Book } from '../types';
import EditableText from '../components/EditableText';

interface ShopPageProps {
  addToCart: (b: Book) => void;
}

const ShopPage: React.FC<ShopPageProps> = ({ addToCart }) => {
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  const toggleBook = (id: string) => setOpenBookId(prev => prev === id ? null : id);

  return (
    <div className="min-h-screen pt-24 md:pt-40 pb-20 w-full px-5 md:px-16" onClick={() => setOpenBookId(null)}>
      <div className="w-full mb-10 md:mb-16 flex flex-col items-center text-center">
        <EditableText tag="span" contentKey="shop_label" defaultValue="Librairie Magique" className="text-gold uppercase tracking-widest text-sm font-bold mb-4" />
        <EditableText tag="h1" contentKey="shop_title" defaultValue="La Boutique" className="font-serif text-5xl md:text-7xl text-white mb-6" />
        <EditableText tag="p" contentKey="shop_description" defaultValue="Découvrez nos livres et laissez-vous emporter par la magie des mots. Chaque achat soutient notre mission et les rêves de William." className="text-slate-400 max-w-2xl text-lg" />
      </div>

      {/* Books row: stacked on mobile, side-by-side on desktop, both locked to the same 380px height */}
      <div className="flex flex-col lg:flex-row items-end justify-center gap-12 lg:gap-16 w-full max-w-7xl mx-auto">
        {books.map(book => (
          <div key={book.id} className="flex flex-col items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>

            {book.comingSoon ? (
              <div className="mb-6 mt-4 flex justify-center w-full lg:w-auto">
                {/* Desktop: fixed 380px height so it matches Book3D. Mobile: full width, natural ratio. */}
                <img
                  src={book.image}
                  alt={book.title}
                  className="h-auto w-full lg:h-[380px] lg:w-auto object-contain drop-shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-3 hover:drop-shadow-[0_30px_60px_rgba(212,175,55,0.25)]"
                />
              </div>
            ) : (
              <div className={`mb-12 mt-4 relative transition-all duration-300 flex justify-center ${openBookId === book.id ? 'z-50' : 'z-10'}`}>
                <Book3D book={book} onAddToCart={addToCart} isOpen={openBookId === book.id} onToggle={() => toggleBook(book.id)} />
              </div>
            )}

            <div className={`text-center transition-opacity duration-500 ${openBookId === book.id ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <h3 className="text-3xl font-serif text-white mb-2">
                {book.title}{book.comingSoon && <span className="block text-xl text-gold mt-1">Tome 2</span>}
              </h3>
              <p className="text-slate-400 text-sm mb-4 italic">{book.subtitle}</p>
              {book.comingSoon ? (
                <span className="inline-block px-5 py-1.5 bg-gold text-midnight text-xs font-bold rounded-full uppercase tracking-widest">
                  À venir fin 2026
                </span>
              ) : (
                <div className="flex gap-4 justify-center items-center">
                  <span className="text-gold text-2xl font-bold">{book.price} $</span>
                  <button onClick={() => addToCart(book)} className="px-6 py-2 bg-white text-midnight font-bold rounded-xl hover:bg-gold transition-colors shadow-lg inline-block">Acheter</button>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopPage;
