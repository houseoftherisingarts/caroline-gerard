import React, { useEffect, useMemo, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { X, ShoppingCart } from 'lucide-react';
import { Book } from '../types';

interface BookFlipModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (book: Book) => void;
}

type PageProps = { children?: React.ReactNode; className?: string; cover?: boolean };

const Page = React.forwardRef<HTMLDivElement, PageProps>(({ children, className = '', cover }, ref) => (
  <div
    ref={ref}
    className={`bg-[#fdfbf7] ${className}`}
    data-density={cover ? 'hard' : 'soft'}
    style={{ backfaceVisibility: 'visible', WebkitBackfaceVisibility: 'visible' } as React.CSSProperties}
  >
    {children}
  </div>
));
Page.displayName = 'FlipPage';

const computeDims = () => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const isPortrait = vw < 768;
  const aspect = 3 / 2;
  if (isPortrait) {
    const width = Math.min(vw * 0.88, 420);
    const height = Math.min(width * aspect, vh * 0.78);
    return { width: Math.floor(height / aspect), height: Math.floor(height) };
  }
  const maxSpread = Math.min(vw * 0.9, 1100);
  const heightCap = vh * 0.82;
  const widthFromHeight = heightCap / aspect;
  const widthFromSpread = maxSpread / 2;
  const pageWidth = Math.min(widthFromHeight, widthFromSpread);
  return { width: Math.floor(pageWidth), height: Math.floor(pageWidth * aspect) };
};

const BookFlipModal: React.FC<BookFlipModalProps> = ({ book, isOpen, onClose, onAddToCart }) => {
  const [dims, setDims] = useState(() => computeDims());

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => setDims(computeDims());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const interiorPages = useMemo<React.ReactNode[]>(() => {
    if (book.pageImages && book.pageImages.length > 0) {
      return book.pageImages.map((url, i) => (
        <Page key={`pg-${i}`}>
          <img src={url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
        </Page>
      ));
    }
    const pages: React.ReactNode[] = [];
    pages.push(
      <Page key="title">
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
          <span className="text-[10px] uppercase tracking-[0.35em] text-amber-700/80 mb-6">Caroline Gérard</span>
          <h1 className="font-serif text-2xl md:text-3xl text-slate-800 leading-tight mb-3">{book.title}</h1>
          {book.subtitle && <p className="font-serif text-slate-500 text-sm md:text-base">{book.subtitle}</p>}
          <div className="mt-8 w-12 h-px bg-amber-700/40" />
        </div>
      </Page>
    );
    pages.push(
      <Page key="excerpt">
        <div className="w-full h-full flex flex-col p-8 justify-center">
          <p className="font-serif text-slate-700 leading-relaxed text-[13px] md:text-[15px] text-justify first-letter:text-5xl first-letter:font-bold first-letter:text-amber-700 first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-serif">
            {book.description}
          </p>
        </div>
      </Page>
    );
    pages.push(
      <Page key="cta">
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
          <p className="font-serif text-slate-500 text-sm mb-2">Découvre la suite…</p>
          <p className="font-serif text-slate-700 text-base mb-8">Le livre complet t'attend.</p>
          {onAddToCart && !book.comingSoon && book.price > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart(book); onClose(); }}
              className="px-5 py-2.5 bg-amber-700 text-white font-bold rounded-full shadow-lg hover:bg-amber-800 transition-colors flex items-center gap-2 text-sm"
            >
              <ShoppingCart size={16} /> Ajouter — {book.price} $
            </button>
          )}
        </div>
      </Page>
    );
    return pages;
  }, [book, onAddToCart, onClose]);

  const paddedInteriorPages = useMemo(() => {
    const pages = [...interiorPages];
    if (pages.length % 2 !== 0) pages.push(<Page key="blank-pad" />);
    return pages;
  }, [interiorPages]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
        aria-label="Fermer"
      >
        <X size={22} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-5 left-1/2 -translate-x-1/2 text-center text-white/60 text-[10px] md:text-xs uppercase tracking-widest px-12 cursor-default select-none"
      >
        Tourne les pages — clique ou glisse les coins
      </div>

      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-5 md:gap-6">
        <HTMLFlipBook
          width={dims.width}
          height={dims.height}
          size="fixed"
          minWidth={240}
          maxWidth={550}
          minHeight={360}
          maxHeight={825}
          maxShadowOpacity={0.5}
          drawShadow
          showCover
          mobileScrollSupport={false}
          className="book-flip"
          style={{}}
          startPage={0}
          flippingTime={700}
          usePortrait
          startZIndex={0}
          autoSize={false}
          clickEventForward
          useMouseEvents
          swipeDistance={30}
          showPageCorners
          disableFlipByClick={false}
        >
          <Page cover className="rounded-r-md shadow-2xl">
            <img src={book.image} alt={book.title} className="w-full h-full object-cover" draggable={false} />
          </Page>

          {paddedInteriorPages}

          <Page cover className="rounded-l-md shadow-2xl">
            {book.backImage ? (
              <img src={book.backImage} alt="4e de couverture" className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <span className="text-white/60 text-sm font-serif">Fin</span>
              </div>
            )}
          </Page>
        </HTMLFlipBook>

        {onAddToCart && !book.comingSoon && book.price > 0 && (
          <button
            onClick={() => { onAddToCart(book); onClose(); }}
            className="px-6 py-3 bg-gold text-midnight font-bold rounded-full shadow-xl hover:bg-white transition-colors flex items-center gap-2 text-sm"
          >
            <ShoppingCart size={18} /> Ajouter au panier — {book.price} $
          </button>
        )}
      </div>
    </div>
  );
};

export default BookFlipModal;
