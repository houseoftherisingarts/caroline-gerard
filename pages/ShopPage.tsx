// Boutique — premium editorial redesign, 2026-05-13
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import Book3D from '../components/Book3D';
import BookFlipModal from '../components/BookFlipModal';
import TestimonialsSection from '../components/TestimonialsSection';
import { Book } from '../types';
import EditableText from '../components/EditableText';
import { useEditableString } from '../components/EditableField';
import { useSiteContent } from '../contexts/SiteContentContext';

interface ShopPageProps {
  books: Book[];
  addToCart: (b: Book) => void;
}

// ── Notice banner ─────────────────────────────────────────────────────────────
const ShopNotice = () => {
  const { content, isEditMode } = useSiteContent();
  const text = (content['shop_delay_notice'] ?? '').trim();
  if (!isEditMode && !text) return null;
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3 mb-10 flex items-start gap-3 max-w-3xl mx-auto">
      <span className="text-amber-400 text-base mt-0.5 shrink-0">⚠️</span>
      <EditableText
        tag="p"
        contentKey="shop_delay_notice"
        defaultValue="Des délais supplémentaires sont à prévoir."
        className="text-amber-300 text-sm leading-relaxed"
      />
    </div>
  );
};

// ── Bibliographic info panel ──────────────────────────────────────────────────
const BookInfo: React.FC<{ book: Book }> = ({ book }) => {
  const [open, setOpen] = useState(false);

  const rows: [string, string][] = [
    book.format       ? ['Format',                book.format]               : null,
    book.pageCount    ? ['Pages',                 String(book.pageCount)]    : null,
    book.redaction    ? ['Rédaction',             book.redaction]            : null,
    book.direction    ? ['Idéation et direction', book.direction]            : null,
    book.coordination ? ['Coordination',          book.coordination]         : null,
    book.revision     ? ['Révision',              book.revision]             : null,
    book.coverDesign  ? ['Couverture',            book.coverDesign]          : null,
    book.layout       ? ['Mise en page',          book.layout]               : null,
    book.isbnPrint    ? ['ISBN (imprimé)',         book.isbnPrint]            : null,
    book.isbnPdf      ? ['ISBN (PDF)',             book.isbnPdf]              : null,
    book.isbnEpub     ? ['ISBN (ePUB)',            book.isbnEpub]             : null,
  ].filter(Boolean) as [string, string][];

  if (rows.length === 0) return null;

  return (
    <div style={{ marginTop: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: open ? '#C8A96E' : '#64748b',
          transition: 'color 0.2s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={13} color="currentColor" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Informations supplémentaires
          </span>
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 20px' }}>
            {rows.map(([label, value]) => (
              <React.Fragment key={label}>
                <dt style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap', fontWeight: 500 }}>{label}</dt>
                <dd style={{ fontSize: 11, color: '#cbd5e1' }}>{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};


// ── Book card ─────────────────────────────────────────────────────────────────
const BookCard: React.FC<{
  book: Book;
  addToCart: (b: Book) => void;
  onFlip: (id: string) => void;
  isSingle: boolean;
}> = ({ book, addToCart, onFlip, isSingle }) => {
  const [showBack, setShowBack] = useState(false);
  const [hovered, setHovered] = useState(false);
  const backCoverAlt = useEditableString('shop_back_cover_alt', '4e de couverture');

  return (
    <div
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.028)',
        backdropFilter: 'blur(12px)',
        border: hovered
          ? '1px solid rgba(200,169,110,0.35)'
          : '1px solid rgba(255,255,255,0.07)',
        borderTop: `2px solid ${hovered ? '#C8A96E' : 'rgba(200,169,110,0.5)'}`,
        borderRadius: 24,
        overflow: 'visible',   /* must NOT clip — 3D perspective extends beyond declared box */
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(200,169,110,0.08)'
          : '0 16px 48px rgba(0,0,0,0.35)',
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease, border-color 0.25s ease',
        cursor: 'default',
        height: '100%',
      }}
    >
      {/* ── Image zone — same fixed height for every card, no clipping ── */}
      {/* Book3D outer wrapper is H+40 = 340px; padding 40px top+bottom → 420px total */}
      <div style={{
        height: 420,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 28px',
        position: 'relative',
        flexShrink: 0,
        /* NO overflow:hidden — that was clipping the 3D book */
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(200,169,110,0.09) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(24px)',
          pointerEvents: 'none',
        }} />

        {book.wrapped ? (
          /*
           * Gift-wrapped visual — pixel-perfect same size as Book3D.
           * Measured via Playwright + canvas:
           *   PNG is 2816×1536, content bbox: x=1042,y=110, w=903,h=1317 (32.1%×85.7%)
           *   Book3D renders at 198×306px at this viewport.
           *   Display image at 654×357px → content appears 210×306px (≈ book size).
           *   Container 200×340 (= Book3D outer wrapper W×H+40), overflow visible.
           *   Image offset: left=−248px, top=−26px to center content.
           */
          <div
            style={{
              position: 'relative',
              width: 200,
              height: 340,
              flexShrink: 0,
            }}
          >
            <img
              src="/gift-wrap.png"
              alt="Cadeau mystère"
              draggable={false}
              style={{
                position: 'absolute',
                width: 654,
                height: 357,
                maxWidth: 'none',   /* override global img { max-width:100% } */
                left: -248,
                top: -26,
                filter: 'drop-shadow(0 20px 40px rgba(200,169,110,0.3)) drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                pointerEvents: 'none',
              }}
            />
          </div>
        ) : (
          /* Always Book3D — coming-soon books use their image as cover, same model */
          <Book3D book={book} onToggle={book.comingSoon ? undefined : () => onFlip(book.id)} />
        )}
      </div>

      {/* ── Gold hairline divider ── */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(200,169,110,0.25), transparent)',
        flexShrink: 0,
      }} />

      {/* ── Content zone ── */}
      <div style={{
        padding: '28px 28px 32px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: 0,
      }}>
        {/* Title */}
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: isSingle ? 26 : 22,
          color: '#fff',
          lineHeight: 1.25,
          marginBottom: 4,
          fontWeight: 700,
        }}>{book.title}</h3>

        {/* Tome label (coming soon) */}
        {book.comingSoon && (
          <EditableText
            tag="span"
            contentKey={`book_${book.id}_tome_label`}
            defaultValue="Tome 2"
            className="block text-gold text-sm font-bold mb-1"
          />
        )}

        {/* Subtitle */}
        {book.subtitle && (
          <p style={{
            fontSize: 13,
            color: '#94a3b8',
            fontStyle: 'italic',
            marginBottom: 12,
            lineHeight: 1.5,
          }}>{book.subtitle}</p>
        )}

        {/* Description */}
        {book.description && (
          <p style={{
            fontSize: 13,
            color: '#94a3b8',
            lineHeight: 1.7,
            marginBottom: 20,
          }}>{book.description}</p>
        )}

        {/* Spacer pushes CTA to bottom */}
        <div style={{ flex: 1 }} />

        {/* ── Back cover toggle ── */}
        {book.backImage && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setShowBack(s => !s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: showBack ? '#C8A96E' : 'rgba(200,169,110,0.55)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'color 0.2s',
                marginBottom: showBack ? 12 : 0,
              }}
            >
              {showBack ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <EditableText
                tag="span"
                contentKey={showBack ? 'shop_hide_back_short' : 'shop_show_back_short'}
                defaultValue={showBack ? 'Masquer le dos' : 'Voir le dos'}
              />
            </button>
            {showBack && (
              <img
                src={book.backImage}
                alt={backCoverAlt}
                style={{
                  width: '100%',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                  objectFit: 'contain',
                  maxHeight: '60vh',
                }}
              />
            )}
          </div>
        )}

        {/* ── Price + CTA ── */}
        {book.comingSoon ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 4 }}>
            {/* Elegant coming soon badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              border: '1px solid rgba(200,169,110,0.3)',
              borderRadius: 100,
              background: 'rgba(200,169,110,0.05)',
            }}>
              <span style={{ color: '#C8A96E', fontSize: 13 }}>✦</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C8A96E' }}>
                <EditableText tag="span" contentKey={`book_${book.id}_coming_soon_badge`} defaultValue="À venir fin 2026" />
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#475569' }}>
              <EditableText tag="span" contentKey={`book_${book.id}_coming_soon_sub`} defaultValue="Bientôt disponible" />
            </span>
          </div>
        ) : (
          <div>
            {/* Price row */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 32,
                fontWeight: 700,
                color: '#C8A96E',
                lineHeight: 1,
              }}>{book.price}</span>
              <span style={{ fontSize: 14, color: '#C8A96E', fontWeight: 600, opacity: 0.8 }}>$ CAD</span>
            </div>
            {/* Buy button — full width */}
            <button
              onClick={() => addToCart(book)}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: hovered
                  ? 'linear-gradient(135deg, #C8A96E 0%, #e2c27d 50%, #C8A96E 100%)'
                  : 'linear-gradient(135deg, #b8975e 0%, #C8A96E 100%)',
                color: '#0f0f23',
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'background 0.3s ease, transform 0.15s ease, box-shadow 0.3s ease',
                boxShadow: hovered
                  ? '0 8px 32px rgba(200,169,110,0.4)'
                  : '0 4px 16px rgba(200,169,110,0.2)',
                transform: hovered ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              <EditableText tag="span" contentKey="shop_buy_btn" defaultValue="Ajouter au panier" />
            </button>
          </div>
        )}

        {/* ── Bibliographic info ── */}
        <BookInfo book={book} />
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────
const ShopPage: React.FC<ShopPageProps> = ({ books, addToCart }) => {
  const visibleBooks = books.filter(b => !b.isHidden);
  const [flipBookId, setFlipBookId] = useState<string | null>(null);
  const flipBook = visibleBooks.find(b => b.id === flipBookId) ?? null;

  const canonicalUrl = 'https://carolinegerard.ca/boutique';

  const productJsonLd = visibleBooks
    .filter(b => !b.comingSoon && b.price > 0)
    .map(b => ({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${b.title}${b.subtitle ? ` — ${b.subtitle}` : ''}`.trim(),
      description: b.description,
      image: b.image,
      brand: { '@type': 'Brand', name: 'Un Million de Rêves' },
      author: [
        { '@type': 'Person', name: 'Caroline Gérard' },
        { '@type': 'Person', name: 'William Lorrain' },
      ],
      offers: {
        '@type': 'Offer',
        priceCurrency: 'CAD',
        price: b.price.toFixed(2),
        availability: 'https://schema.org/InStock',
        url: canonicalUrl,
        seller: { '@type': 'Organization', name: 'Caroline Gérard — Un Million de Rêves' },
      },
      ...(b.isbnPrint ? { gtin13: b.isbnPrint.replace(/-/g, '') } : {}),
    }));

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://carolinegerard.ca/' },
      { '@type': 'ListItem', position: 2, name: 'Boutique', item: canonicalUrl },
    ],
  };

  const count = visibleBooks.length;
  const isSingle = count === 1;

  // Grid: 1 → centred single | 2 → equal-width 2-col | 3+ → auto-fit
  const gridStyle: React.CSSProperties =
    count === 1
      ? { display: 'flex', justifyContent: 'center' }
      : count === 2
      ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          alignItems: 'stretch',
          gap: '2.5rem',
          maxWidth: 860,
          margin: '0 auto',
        }
      : {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          alignItems: 'stretch',
          gap: '2rem',
          maxWidth: 1100,
          margin: '0 auto',
        };

  return (
    <>
      {/* Sparkle animation keyframes */}
      <style>{`
        @keyframes shopSparkle {
          0%   { opacity: 0.2; transform: scale(0.8) rotate(-10deg); }
          100% { opacity: 0.7; transform: scale(1.2) rotate(10deg); }
        }
        @keyframes shopFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="min-h-screen pt-24 md:pt-40 pb-20 w-full px-5 md:px-16">
        <Helmet>
          <title>Boutique | Caroline Gérard — William et les univers invisibles</title>
          <meta name="description" content="Achetez « William et les univers invisibles — Quand les rêves prennent vie » de Caroline Gérard et William Lorrain. Livre jeunesse, paiement Square, livraison Canada." />
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:type" content="website" />
          <meta property="og:locale" content="fr_CA" />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:title" content="Boutique — William et les univers invisibles" />
          <meta property="og:description" content="Le livre jeunesse coécrit par Caroline Gérard et son fils William Lorrain. 24,95 $ CAD — livraison au Canada." />
          <meta property="og:image" content="https://storage.googleapis.com/salondesinconnus/Caroline/william%20cover.jpg" />
          {productJsonLd.map((p, i) => (
            <script key={i} type="application/ld+json">{JSON.stringify(p)}</script>
          ))}
          <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
        </Helmet>

        {/* ── Page header ── */}
        <div
          className="w-full flex flex-col items-center text-center"
          style={{ marginBottom: '5rem', animation: 'shopFadeUp 0.7s ease both' }}
        >
          {/* Gold overline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,169,110,0.6))' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A96E' }}>
              <EditableText tag="span" contentKey="shop_label" defaultValue="Librairie Magique" />
            </span>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, rgba(200,169,110,0.6), transparent)' }} />
          </div>

          <div style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1.05, marginBottom: '1.5rem', fontWeight: 700 }}>
            <EditableText
              tag="h1"
              contentKey="shop_title"
              defaultValue="La Boutique"
              className="font-serif text-white"
            />
          </div>

          <div style={{ color: '#94a3b8', maxWidth: 520, fontSize: 16, lineHeight: 1.7 }}>
            <EditableText
              tag="p"
              contentKey="shop_description"
              defaultValue="Découvre nos livres et laisse-toi emporter par la magie des mots."
            />
          </div>
        </div>

        <ShopNotice />

        {/* ── Book grid ── */}
        {visibleBooks.length === 0 ? (
          <p className="text-center text-slate-500 italic py-20">Aucun livre disponible pour l'instant.</p>
        ) : (
          <div style={gridStyle}>
            {visibleBooks.map((book, i) => (
              <div
                key={book.id}
                style={{
                  animation: `shopFadeUp 0.6s ease ${i * 0.12}s both`,
                  ...(isSingle ? { maxWidth: 480, width: '100%' } : {}),
                }}
              >
                <BookCard
                  book={book}
                  addToCart={addToCart}
                  onFlip={id => setFlipBookId(id)}
                  isSingle={isSingle}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Thin gold separator ── */}
        <div style={{
          maxWidth: 200,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(200,169,110,0.4), transparent)',
          margin: '5rem auto 0',
        }} />

        {/* ── Contextual internal links (AEO) ── */}
        <div className="max-w-3xl mx-auto mt-10 text-center text-slate-400 text-sm leading-relaxed">
          <p>
            <EditableText tag="span" contentKey="shop_links_intro" defaultValue="Pour en savoir plus sur les auteurs, visitez la page " />
            <Link to="/a-propos" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="shop_links_apropos" defaultValue="À Propos" />
            </Link>
            <EditableText tag="span" contentKey="shop_links_seg2" defaultValue=". Caroline Gérard est aussi présente lors de " />
            <Link to="/evenements" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="shop_links_evenements" defaultValue="salons du livre et lancements" />
            </Link>
            <EditableText tag="span" contentKey="shop_links_seg3" defaultValue=", et propose des " />
            <Link to="/conferences" className="text-gold hover:underline">
              <EditableText tag="span" contentKey="shop_links_conferences" defaultValue="conférences" />
            </Link>
            <EditableText tag="span" contentKey="shop_links_outro" defaultValue=" en milieu scolaire et corporatif." />
          </p>
        </div>

        {/* ── Social proof ── */}
        <TestimonialsSection page="boutique" />

        {/* ── Flip modal ── */}
        {flipBook && (
          <BookFlipModal
            book={flipBook}
            isOpen={true}
            onClose={() => setFlipBookId(null)}
            onAddToCart={addToCart}
          />
        )}
      </div>
    </>
  );
};

export default ShopPage;
