import React from 'react';
import { Book } from '../types';

interface Book3DProps {
  book: Book;
  isOpen?: boolean;
  onToggle?: () => void;
  onAddToCart?: (book: Book) => void;
}

const Book3D: React.FC<Book3DProps> = ({ book, isOpen, onToggle, onAddToCart }) => {
  return (
    <div
      className={`relative transition-all duration-500 ease-in-out ${onToggle ? (isOpen ? 'scale-105 -translate-y-2' : 'hover:scale-105 hover:-translate-y-2 cursor-pointer') : 'opacity-80 grayscale-[20%]'}`}
      onClick={onToggle}
      style={{ perspective: '1500px' }}
    >
        {/* Centering Wrapper */}
        <div className="relative w-[260px] h-[380px] mx-auto">
            {/* BOOK CONTAINER */}
            <div
                className="absolute inset-0 transform-style-3d"
                style={{ transform: 'rotateY(-15deg)' }}
            >
                {/* === LEAF B (Back Group) === 
                    Acts as the back half of the book block 
                */}
                <div 
                    className="absolute inset-0 transform-style-3d" 
                    style={{ zIndex: 0 }}
                >
                    {/* Back Cover Image (Visible if rotated fully around, adding for completeness of 3D model) */}
                    <div
                        className="absolute inset-0 bg-slate-800 rounded-l-md overflow-hidden shadow-xl"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                        }}
                    >
                        <img 
                            src={book.backImage || book.image} 
                            alt="Back Cover" 
                            className="w-full h-full object-cover" 
                            style={{ transform: 'scaleX(-1)' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>
                    </div>

                    {/* Thickness / Pages Effect (Right side of the block) */}
                    <div className="absolute top-1 bottom-1 right-0 w-2 bg-[#fdfbf7] border-l border-slate-200 transform rotate-y-90 translate-x-[1px] origin-right shadow-sm" />
                </div>


                {/* === LEAF A (Front Group) === 
                    The front cover 
                */}
                <div
                    className="absolute inset-0 transform-style-3d origin-left"
                    style={{ 
                        transform: 'rotateY(0deg)', 
                        zIndex: 10 
                    }}
                >
                    {/* FRONT FACE: Front Cover */}
                    <div
                        className="absolute inset-0 bg-slate-800 rounded-r-md overflow-hidden shadow-2xl"
                        style={{ backfaceVisibility: 'hidden', zIndex: 2 }}
                    >
                        <img src={book.image} alt="Front Cover" className="w-full h-full object-cover" />
                        
                        {/* Lighting / Sheen Effects */}
                        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/40 to-transparent pointer-events-none"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-30 pointer-events-none"></div>
                        <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>
                    </div>
                </div>

                {/* SPINE */}
                <div className="absolute left-0 top-0 bottom-0 w-8 -translate-x-full origin-right rotate-y-[-90deg] bg-slate-900 rounded-l-sm flex items-center justify-center overflow-hidden shadow-lg">
                    <div className="w-full h-full bg-gradient-to-r from-white/10 via-transparent to-black/20" />
                </div>

            {/* Add to Cart Button for 3D Book */} 
            {isOpen && onAddToCart && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onAddToCart(book); if (onToggle) onToggle(); }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-gold text-midnight font-bold rounded-full shadow-xl hover:bg-white transition-all z-50"
                >
                    Ajouter au panier
                </button>
            )}
            </div> {/* End Book Container */}
        </div>
    </div>
  );
};

export default Book3D;