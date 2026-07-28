import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, CreditCard as CreditCardIcon, Lock, Mail, MapPin, Phone, Truck, Download, Package, BookOpen, ChevronDown, ChevronUp, Tag, X } from 'lucide-react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { CartItem, PromoCode, Book } from '../types';
import { thumb } from '../lib/img';
import { printReceipt, ReceiptData } from '../lib/receipt';
import { saveAbandonedCheckout, getPromoCode } from '../lib/firestore';
import EditableText from './EditableText';
import { useEditableString } from './EditableField';

const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID as string;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID as string;

const DELIVERY_FEE = 6.00;
const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

const BookDetails: React.FC<{ cartItems: CartItem[] }> = ({ cartItems }) => {
  const [open, setOpen] = useState(false);

  // Build one combined metadata table from all books in cart
  const rows: [string, string][] = [];
  cartItems.forEach(({ book }) => {
    const b = book as Book;
    const hasMetadata = !!(b.format || b.redaction || b.isbnPrint);
    // Show title when: multiple books in cart, OR no other metadata to identify this book
    if (cartItems.length > 1 || !hasMetadata) rows.push(['Titre', b.title]);
    if (b.format)       rows.push(['Format',                b.format + (b.pageCount ? ` · ${b.pageCount} pages` : '')]);
    else if (b.pageCount) rows.push(['Pages',               String(b.pageCount)]);
    if (b.redaction)    rows.push(['Rédaction',             b.redaction]);
    if (b.direction)    rows.push(['Idéation et direction', b.direction]);
    if (b.coordination) rows.push(['Accompagnement',        b.coordination]);
    if (b.revision)     rows.push(['Révision',              b.revision]);
    if (b.coverDesign)  rows.push(['Couverture',            b.coverDesign]);
    if (b.layout)       rows.push(['Mise en page',          b.layout]);
    if (b.isbnPrint)    rows.push(['ISBN (imprimé)',         b.isbnPrint]);
    if (b.isbnPdf)      rows.push(['ISBN (PDF)',             b.isbnPdf]);
    if (b.isbnEpub)     rows.push(['ISBN (ePUB)',            b.isbnEpub]);
  });

  return (
    <div className="mt-6 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold" />
          <EditableText tag="span" contentKey="checkout_book_details_toggle" defaultValue="Détails du livre" className="font-bold" />
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/10 pt-4">
          {rows.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs mb-3">
              {rows.map(([label, value], i) => (
                <React.Fragment key={`${label}-${i}`}>
                  <dt className="text-slate-500 whitespace-nowrap">{label}</dt>
                  <dd className="text-slate-300">{value}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
          <div className="border-t border-white/10 pt-3 space-y-2 text-xs text-slate-400">
            <p>
              <EditableText tag="span" contentKey="checkout_returns_label" defaultValue="Retours :" className="text-slate-300 font-semibold" />{' '}
              <EditableText tag="span" contentKey="checkout_returns_text" defaultValue="Article défectueux ou incorrect remboursé ou échangé sous 10 jours de la livraison." />{' '}
              <Link to="/conditions#retours" className="text-gold hover:underline">
                <EditableText tag="span" contentKey="checkout_returns_link" defaultValue="Politique complète" />
              </Link>
            </p>
            <p>
              <EditableText tag="span" contentKey="checkout_shipping_label" defaultValue="Livraison :" className="text-slate-300 font-semibold" />{' '}
              <EditableText tag="span" contentKey="checkout_shipping_text" defaultValue="2 jours ouvrables de traitement + 1–3 jours au Québec (livraison standard)." />{' '}
              <Link to="/conditions#livraison" className="text-gold hover:underline">
                <EditableText tag="span" contentKey="checkout_shipping_link" defaultValue="Détails" />
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface CheckoutPageProps {
  cartItems: CartItem[];
  total: number;
  onOrderComplete: () => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItems, total, onOrderComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentErrorDetails, setPaymentErrorDetails] = useState<Record<string, unknown> | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<ReceiptData | null>(null);
  const [frozenCart, setFrozenCart] = useState<CartItem[]>([]);
  // Unique session ID used to track and later remove the abandoned checkout record
  const [sessionId] = useState(() => `acs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  // Promo code
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<PromoCode | null>(null);
  const [promoStatus, setPromoStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [promoError, setPromoError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
  });

  // Editable form strings (placeholders and dynamic error messages)
  const phEmail = useEditableString('checkout_form_email_placeholder', 'ton@courriel.com');
  const phFirstName = useEditableString('checkout_form_firstname_placeholder', 'Jean');
  const phLastName = useEditableString('checkout_form_lastname_placeholder', 'Dupont');
  const phPhone = useEditableString('checkout_form_phone_placeholder', '(514) 123-4567');
  const phAddress = useEditableString('checkout_form_address_placeholder', '123 Rue des Rêves');
  const phCity = useEditableString('checkout_form_city_placeholder', 'Montréal');
  const phPostal = useEditableString('checkout_form_postal_placeholder', 'H1A 1A1');
  const phPromo = useEditableString('checkout_promo_placeholder', 'Code promo');
  const errPromoNotFound = useEditableString('checkout_promo_err_notfound', 'Code introuvable.');
  const errPromoDisabled = useEditableString('checkout_promo_err_disabled', 'Ce code est désactivé.');
  const errPromoExpired = useEditableString('checkout_promo_err_expired', 'Ce code est expiré.');
  const errPromoMaxed = useEditableString('checkout_promo_err_maxed', "Ce code a atteint son nombre maximal d'utilisations.");
  const errPromoCheck = useEditableString('checkout_promo_err_check', 'Erreur lors de la vérification du code.');
  const errPaymentRead = useEditableString('checkout_payment_err_read', 'Erreur lors de la lecture de la carte.');

  // Live tax / total calculation (with optional promo discount on books subtotal)
  const totals = useMemo(() => {
    const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const deliveryFee = parseFloat((DELIVERY_FEE * totalQty).toFixed(2));
    const discountPct = promoApplied?.percentage ?? 0;
    const discount = parseFloat((total * discountPct / 100).toFixed(2));
    const discountedSubtotal = parseFloat((total - discount).toFixed(2));
    const tps = parseFloat(((discountedSubtotal + deliveryFee) * TPS_RATE).toFixed(2));
    const tvq = parseFloat((deliveryFee * TVQ_RATE).toFixed(2));
    const grandTotal = parseFloat((discountedSubtotal + deliveryFee + tps + tvq).toFixed(2));
    return { subtotal: total, discount, discountPct, discountedSubtotal, delivery: deliveryFee, tps, tvq, grandTotal };
  }, [total, promoApplied, cartItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    setPaymentError('');
    setPaymentErrorDetails(null);
    setShowErrorDetails(false);
    setStep(prev => prev + 1);
  };
  const prevStep = () => setStep(prev => prev - 1);

  const applyPromoCode = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoStatus('checking');
    setPromoError('');
    try {
      const snap = await getPromoCode(code);
      if (!snap.exists()) {
        setPromoStatus('error');
        setPromoError(errPromoNotFound);
        return;
      }
      const data = snap.data() as PromoCode;
      if (!data.isActive) { setPromoStatus('error'); setPromoError(errPromoDisabled); return; }
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) { setPromoStatus('error'); setPromoError(errPromoExpired); return; }
      if (data.maxUses > 0 && data.usedCount >= data.maxUses) { setPromoStatus('error'); setPromoError(errPromoMaxed); return; }
      setPromoApplied(data);
      setPromoStatus('ok');
    } catch {
      setPromoStatus('error');
      setPromoError(errPromoCheck);
    }
  };

  const removePromo = () => {
    setPromoApplied(null);
    setPromoInput('');
    setPromoStatus('idle');
    setPromoError('');
  };

  const handleCardTokenizeResponseReceived = async (tokenResult: any) => {
    if (tokenResult.status !== 'OK' || !tokenResult.token) {
      setPaymentError(
        tokenResult.errors?.[0]?.detail || errPaymentRead
      );
      return;
    }

    setIsProcessing(true);
    setPaymentError('');

    try {
      const fns = getFunctions(getApp(), 'northamerica-northeast1');
      const processCheckout = httpsCallable(fns, 'processCheckout');

      const result = await processCheckout({
        sourceId: tokenResult.token,
        sessionId,
        promoCode: promoApplied?.code ?? null,
        // Seulement les ids et quantités — le serveur recharge les prix
        // depuis le catalogue, jamais depuis le navigateur.
        cartItems: cartItems.map(item => ({
          id: item.book.id,
          quantity: item.quantity,
        })),
        customer: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        },
        shipping: {
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
        },
      });

      const data = result.data as {
        orderId: string;
        customerName: string;
        total: number;
        date: string;
        tps: number;
        tvq: number;
        subtotal: number;
        delivery: number;
        discount: number;
        discountPct: number;
      };

      const receipt: ReceiptData = {
        orderId: data.orderId,
        date: data.date,
        customerName: data.customerName,
        email: formData.email,
        address: `${formData.address}, ${formData.city} ${formData.postalCode}`,
        items: cartItems.map(item => ({
          title: item.book.title,
          price: item.book.price,
          quantity: item.quantity,
        })),
        subtotal: data.subtotal,
        discount: data.discount,
        discountPct: data.discountPct,
        delivery: data.delivery,
        tps: data.tps,
        tvq: data.tvq,
        total: data.total,
      };

      setFrozenCart([...cartItems]);
      setCompletedOrder(receipt);
      onOrderComplete();
      setStep(4);
    } catch (err: any) {
      const msg = err?.details?.message || err?.message || 'Erreur inconnue';
      setPaymentError(msg);
      setPaymentErrorDetails({
        code: err?.code ?? null,
        message: err?.message ?? null,
        details: err?.details ?? null,
        httpErrorCode: err?.httpErrorCode?.status ?? null,
        stack: err?.stack ?? null,
      });
      setShowErrorDetails(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Redirect to shop if cart is empty (and not on success screen)
  if (cartItems.length === 0 && step !== 4) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-white">
        <EditableText tag="p" contentKey="checkout_empty_msg" defaultValue="Ton panier est vide." className="text-slate-400 mb-6" />
        <Link to="/boutique" className="bg-gold text-midnight font-bold px-8 py-3 rounded-xl hover:bg-white transition-colors">
          <EditableText tag="span" contentKey="checkout_empty_btn" defaultValue="Aller à la boutique" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-8 md:px-16 lg:px-24 bg-midnight text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">

        {/* Left Column: Order Summary */}
        <div className="order-2 lg:order-1 space-y-8">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-xl">
            <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-3">
              <span className="bg-gold/20 p-2 rounded-full text-gold"><CheckCircle size={24} /></span>
              <EditableText tag="span" contentKey="checkout_summary_title" defaultValue="Résumé de la commande" />
            </h2>

            <div className="space-y-6 divide-y divide-white/5">
              {(step === 4 ? frozenCart : cartItems).map((item) => (
                <div key={item.book.id} className="flex gap-4 py-4">
                  <div className="w-20 h-28 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img src={thumb(item.book.image, 200)} alt={item.book.title} className="w-full h-full object-cover" />
                    <span className="absolute top-0 right-0 bg-gold text-midnight text-xs font-bold px-2 py-1 rounded-bl-lg">
                      x{item.quantity}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">{item.book.title}</h3>
                    <p className="text-slate-400 text-sm mb-2 line-clamp-2">{item.book.description}</p>
                    <p className="text-gold font-bold">{(item.book.price * item.quantity).toFixed(2)} $</p>
                  </div>
                </div>
              ))}
            </div>

            <BookDetails cartItems={cartItems} />

            {/* Promo Code */}
            <div className="mt-6 border-t border-white/10 pt-5">
              {promoApplied ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                    <Tag size={14} />
                    <span>{promoApplied.code}</span>
                    <span className="text-green-300">−{promoApplied.percentage}%</span>
                  </div>
                  <button onClick={removePromo} className="text-slate-500 hover:text-white transition-colors p-1"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus('idle'); setPromoError(''); }}
                    onKeyDown={e => e.key === 'Enter' && applyPromoCode()}
                    placeholder={phPromo}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-gold/40 transition-colors uppercase"
                  />
                  <button
                    onClick={applyPromoCode}
                    disabled={promoStatus === 'checking' || !promoInput.trim()}
                    className="px-4 py-2 bg-white/10 text-white text-sm font-bold rounded-xl hover:bg-gold hover:text-midnight transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    {promoStatus === 'checking' ? '...' : <EditableText tag="span" contentKey="checkout_promo_apply_btn" defaultValue="Appliquer" />}
                  </button>
                </div>
              )}
              {promoStatus === 'error' && <p className="text-red-400 text-xs mt-1.5 pl-1">{promoError}</p>}
            </div>

            {(() => {
              const dt = step === 4 && completedOrder ? {
                subtotal: completedOrder.subtotal,
                discount: completedOrder.discount ?? 0,
                discountPct: completedOrder.discountPct ?? 0,
                delivery: completedOrder.delivery,
                tps: completedOrder.tps,
                tvq: completedOrder.tvq,
                grandTotal: completedOrder.total,
              } : totals;
              return (
                <div className="mt-5 pt-4 border-t border-white/10 space-y-3 text-slate-300">
                  <div className="flex justify-between">
                    <EditableText tag="span" contentKey="checkout_summary_subtotal" defaultValue="Sous-total" />
                    <span>{dt.subtotal.toFixed(2)} $</span>
                  </div>
                  {dt.discount > 0 && (
                    <div className="flex justify-between text-green-400 font-semibold">
                      <span><EditableText tag="span" contentKey="checkout_summary_discount" defaultValue="Réduction" /> ({dt.discountPct}%)</span>
                      <span>−{dt.discount.toFixed(2)} $</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <EditableText tag="span" contentKey="checkout_summary_delivery" defaultValue="Livraison" />
                    <span>{dt.delivery.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <EditableText tag="span" contentKey="checkout_summary_tps" defaultValue="TPS (5%)" />
                    <span>{dt.tps.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <EditableText tag="span" contentKey="checkout_summary_tvq" defaultValue="TVQ (9,975% sur livraison)" />
                    <span>{dt.tvq.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-white pt-4 border-t border-white/10 mt-4">
                    <EditableText tag="span" contentKey="checkout_summary_total" defaultValue="Total" />
                    <span className="text-gold">{dt.grandTotal.toFixed(2)} $</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="5" fill="#3E4348"/>
              <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="#9ca3af"/>
              <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" fill="#3E4348"/>
            </svg>
            <span><EditableText tag="span" contentKey="checkout_secure_label" defaultValue="Paiement sécurisé par" /> <strong className="text-slate-400">Square</strong></span>
            <Lock size={13} />
          </div>
        </div>

        {/* Right Column: Checkout Form */}
        <div className="order-1 lg:order-2">
          {step < 4 && (
            <div className="mb-8">
              <Link to="/boutique" className="text-slate-400 hover:text-white flex items-center gap-2 mb-4 transition-colors">
                <ChevronLeft size={16} /> <EditableText tag="span" contentKey="checkout_back_to_shop" defaultValue="Retour à la boutique" />
              </Link>
              <EditableText tag="h1" contentKey="checkout_page_title" defaultValue="Caisse" className="text-4xl font-serif text-white mb-2" />
              <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider text-slate-500 mt-6">
                <EditableText tag="span" contentKey="checkout_step1_label" defaultValue="1. Informations" className={`pb-2 border-b-2 transition-colors ${step >= 1 ? 'text-gold border-gold' : 'border-transparent'}`} />
                <EditableText tag="span" contentKey="checkout_step2_label" defaultValue="2. Livraison" className={`pb-2 border-b-2 transition-colors ${step >= 2 ? 'text-gold border-gold' : 'border-transparent'}`} />
                <EditableText tag="span" contentKey="checkout_step3_label" defaultValue="3. Paiement" className={`pb-2 border-b-2 transition-colors ${step >= 3 ? 'text-gold border-gold' : 'border-transparent'}`} />
              </div>
            </div>
          )}

          <form className="space-y-6 animate-fade-in-up" onSubmit={(e) => e.preventDefault()}>

            {/* Step 1: Customer Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Mail className="text-gold" size={20} /> <EditableText tag="span" contentKey="checkout_step1_heading" defaultValue="Coordonnées" />
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2"><EditableText tag="span" contentKey="checkout_label_email" defaultValue="Adresse courriel *" /></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                      placeholder={phEmail}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2"><EditableText tag="span" contentKey="checkout_label_firstname" defaultValue="Prénom *" /></label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder={phFirstName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2"><EditableText tag="span" contentKey="checkout_label_lastname" defaultValue="Nom *" /></label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder={phLastName}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2"><EditableText tag="span" contentKey="checkout_label_phone" defaultValue="Téléphone" /></label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder={phPhone}
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.email || !formData.firstName || !formData.lastName) return;
                    nextStep();
                  }}
                  disabled={!formData.email || !formData.firstName || !formData.lastName}
                  className="w-full bg-gold text-midnight font-bold py-4 rounded-xl hover:bg-white transition-colors shadow-lg mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <EditableText tag="span" contentKey="checkout_step1_continue_btn" defaultValue="Continuer vers la livraison" />
                </button>
              </div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Truck className="text-gold" size={20} /> <EditableText tag="span" contentKey="checkout_step2_heading" defaultValue="Adresse de livraison" />
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2"><EditableText tag="span" contentKey="checkout_label_address" defaultValue="Adresse *" /></label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder={phAddress}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2"><EditableText tag="span" contentKey="checkout_label_city" defaultValue="Ville *" /></label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder={phCity}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2"><EditableText tag="span" contentKey="checkout_label_postal" defaultValue="Code Postal *" /></label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder={phPostal}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 bg-white/5 text-slate-300 font-bold py-4 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <EditableText tag="span" contentKey="checkout_back_btn" defaultValue="Retour" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.address || !formData.city || !formData.postalCode) return;
                      // Save abandoned checkout before showing payment form
                      saveAbandonedCheckout({
                        id: sessionId,
                        email: formData.email,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        phone: formData.phone,
                        address: formData.address,
                        city: formData.city,
                        postalCode: formData.postalCode,
                        cartItems: cartItems.map(i => ({ title: i.book.title, price: i.book.price, quantity: i.quantity })),
                        subtotal: total,
                        startedAt: new Date().toISOString(),
                      });
                      nextStep();
                    }}
                    disabled={!formData.address || !formData.city || !formData.postalCode}
                    className="flex-[2] bg-gold text-midnight font-bold py-4 rounded-xl hover:bg-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <EditableText tag="span" contentKey="checkout_step2_continue_btn" defaultValue="Continuer vers le paiement" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <CreditCardIcon className="text-gold" size={20} /> <EditableText tag="span" contentKey="checkout_step3_heading" defaultValue="Paiement" />
                </h3>

                {paymentError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl overflow-hidden text-sm">
                    <div className="px-4 py-3 text-red-300 flex items-start justify-between gap-3">
                      <span className="flex-1">{paymentError}</span>
                      {paymentErrorDetails && (
                        <button
                          type="button"
                          onClick={() => setShowErrorDetails(v => !v)}
                          className="text-red-400/60 hover:text-red-300 transition-colors whitespace-nowrap flex items-center gap-1 text-xs mt-0.5 shrink-0"
                        >
                          {showErrorDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          <EditableText tag="span" contentKey="checkout_payment_err_details_btn" defaultValue="Détails techniques" />
                        </button>
                      )}
                    </div>
                    {showErrorDetails && paymentErrorDetails && (
                      <div className="border-t border-red-500/30 px-4 py-3 bg-black/20">
                        <EditableText tag="p" contentKey="checkout_payment_err_section_label" defaultValue="Détails de l'erreur" className="text-red-400/60 text-xs mb-2 uppercase tracking-widest font-bold" />
                        <pre className="text-xs text-red-200/70 whitespace-pre-wrap break-all font-mono leading-relaxed overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(paymentErrorDetails, null, 2)}
                        </pre>
                        <EditableText tag="p" contentKey="checkout_payment_err_more_info" defaultValue="Pour plus d'infos: Firebase Console → Functions → Logs" className="text-red-400/40 text-xs mt-2" />
                      </div>
                    )}
                  </div>
                )}

                <PaymentForm
                  applicationId={SQUARE_APP_ID}
                  locationId={SQUARE_LOCATION_ID}
                  cardTokenizeResponseReceived={handleCardTokenizeResponseReceived}
                >
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                    <EditableText tag="p" contentKey="checkout_payment_intro" defaultValue="Entre tes informations de paiement ci-dessous." className="text-sm text-slate-400" />
                    <div className="square-payment-container">
                      <CreditCard
                        buttonProps={{
                          isLoading: isProcessing,
                          className: 'w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-500 transition-colors shadow-lg flex items-center justify-center gap-2 mt-6',
                        }}
                      >
                        <Lock size={16} />
                        {isProcessing
                          ? <EditableText tag="span" contentKey="checkout_payment_processing" defaultValue="Traitement en cours..." />
                          : <><EditableText tag="span" contentKey="checkout_payment_pay_btn_prefix" defaultValue="Payer" /> {`${totals.grandTotal.toFixed(2)} $`}</>}
                      </CreditCard>
                    </div>
                  </div>

                  {/* Square security badge */}
                  <div className="flex items-center justify-center gap-3 mt-5 py-3 px-4 bg-white/5 rounded-xl border border-white/10">
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="5" fill="#3E4348"/>
                      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="white"/>
                      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" fill="#3E4348"/>
                    </svg>
                    <span className="text-slate-400 text-sm">
                      <EditableText tag="span" contentKey="checkout_payment_secure_prefix" defaultValue="Paiement sécurisé par" />{' '}
                      <span className="text-white font-bold">Square</span>
                      {' '}<EditableText tag="span" contentKey="checkout_payment_secure_suffix" defaultValue="— tes données sont chiffrées" />
                    </span>
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>

                  <div className="flex gap-4 mt-4">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={isProcessing}
                      className="flex-1 bg-white/5 text-slate-300 font-bold py-4 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      <EditableText tag="span" contentKey="checkout_step3_back_btn" defaultValue="Retour" />
                    </button>
                  </div>
                </PaymentForm>
              </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && completedOrder && (
              <div className="space-y-8 animate-fade-in-up">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="text-green-400 w-10 h-10" />
                  </div>
                  <EditableText tag="h2" contentKey="checkout_success_title" defaultValue="Commande confirmée!" className="text-3xl font-serif text-white mb-3" />
                  <p className="text-slate-400 mb-2">
                    <EditableText tag="span" contentKey="checkout_success_thanks" defaultValue="Merci," /> <strong className="text-white">{completedOrder.customerName}</strong>!
                  </p>
                  <p className="text-slate-500 text-sm">
                    <EditableText tag="span" contentKey="checkout_success_receipt_text" defaultValue="Un reçu a été envoyé à" /> <span className="text-gold">{completedOrder.email}</span>
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <EditableText tag="span" contentKey="checkout_success_order_no" defaultValue="N° de commande" className="text-slate-500" />
                    <span className="font-mono font-bold text-white">{completedOrder.orderId}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <EditableText tag="span" contentKey="checkout_success_subtotal" defaultValue="Sous-total" className="text-slate-500" />
                    <span>{completedOrder.subtotal.toFixed(2)} $</span>
                  </div>
                  {(completedOrder.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-green-400 font-semibold">
                      <span><EditableText tag="span" contentKey="checkout_success_discount" defaultValue="Réduction" /> ({completedOrder.discountPct}%)</span>
                      <span>−{completedOrder.discount!.toFixed(2)} $</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300">
                    <EditableText tag="span" contentKey="checkout_success_delivery" defaultValue="Livraison" className="text-slate-500" />
                    <span>{completedOrder.delivery.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <EditableText tag="span" contentKey="checkout_success_tps" defaultValue="TPS (5%)" className="text-slate-500" />
                    <span>{completedOrder.tps.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <EditableText tag="span" contentKey="checkout_success_tvq" defaultValue="TVQ (9,975%)" className="text-slate-500" />
                    <span>{completedOrder.tvq.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gold border-t border-white/10 pt-4 mt-2">
                    <EditableText tag="span" contentKey="checkout_success_total_paid" defaultValue="Total payé" />
                    <span>{completedOrder.total.toFixed(2)} $</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => printReceipt(completedOrder)}
                    className="w-full bg-gold text-midnight font-bold py-4 rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download size={18} /> <EditableText tag="span" contentKey="checkout_success_download_btn" defaultValue="Télécharger le reçu (PDF)" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full bg-white/5 text-slate-300 font-bold py-4 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <EditableText tag="span" contentKey="checkout_success_home_btn" defaultValue="Retour à l'accueil" />
                  </button>
                </div>

                <EditableText tag="p" contentKey="checkout_success_shipping_eta" defaultValue="Expédition estimée: 3 à 5 jours ouvrables au Canada." className="text-center text-slate-500 text-xs" />
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
