import React, { useState } from 'react';
import Book3D from '../components/Book3D';
import { books } from '../data';
import { Book } from '../types';

interface ShopPageProps {
  addToCart: (b: Book) => void;
}

const ShopPage: React.FC<ShopPageProps> = ({ addToCart }) => {
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  const toggleBook = (id: string) => {
    setOpenBookId(prev => prev === id ? null : id);
  };

  return (
    <div 
      className="min-h-screen pt-40 pb-20 w-full px-8 md:px-16" 
      onClick={() => setOpenBookId(null)}
    >
      <div className="w-full mb-16 flex flex-col items-center text-center">
        <span className="text-gold uppercase tracking-widest text-sm font-bold mb-4">Librairie Magique</span>
        <h1 className="font-serif text-5xl md:text-7xl text-white mb-6">La Boutique</h1>
        <p className="text-slate-400 max-w-2xl text-lg">
          Découvrez nos livres et laissez-vous emporter par la magie des mots. 
          Chaque achat soutient notre mission et les rêves de William.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-16 gap-y-32 w-full max-w-7xl mx-auto">
        {books.map(book => (
          <div key={book.id} className="flex flex-col items-center w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className={`mb-12 mt-4 relative transition-all duration-300 w-full flex justify-center ${openBookId === book.id ? 'z-50' : 'z-10'}`}>
              <Book3D 
                book={book} 
                onAddToCart={addToCart} 
                isOpen={openBookId === book.id} 
                onToggle={() => toggleBook(book.id)}
              />
            </div>
            <div className={`text-center w-full transition-opacity duration-500 ${openBookId === book.id ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <h3 className="text-3xl font-serif text-white mb-2">{book.title}</h3>
              <p className="text-slate-400 text-sm mb-4 italic">{book.subtitle}</p>
              <div className="flex gap-4 justify-center items-center">
                 <span className="text-gold text-2xl font-bold">{book.price} $</span>
                 <button 
                  onClick={() => addToCart(book)}
                  className="px-6 py-2 bg-white text-midnight font-bold rounded-xl hover:bg-gold transition-colors shadow-lg inline-block"
                 >
                   Acheter
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopPage;
