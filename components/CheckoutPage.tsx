import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, CreditCard as CreditCardIcon, Lock, Mail, MapPin, Phone, Truck, Download, Package, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { CartItem } from '../types';
import { printReceipt, ReceiptData } from '../lib/receipt';
import { saveAbandonedCheckout } from '../lib/firestore';

const DELIVERY_FEE = 6.00;
const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

const BookDetails: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold" />
          <span className="font-bold">Détails du livre</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/10 pt-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            {([
              ['Titre', 'William et les univers invisibles — Quand les rêves prennent vie'],
              ['Format', '6 × 9 pouces · 72 pages'],
              ['Rédaction', 'Caroline Gérard et William Lorrain'],
              ['Accompagnement', 'Julie L\'Archer — legardiendephare.com'],
              ['Édition', 'Jérémy Parent'],
              ['Révision', 'Charles DuBois'],
              ['Couverture', 'Sonia Lapointe — Bulle Design & Événement'],
              ['Mise en page', 'Alejandro Natan'],
              ['ISBN (imprimé)', '978-2-925574-26-2'],
              ['ISBN (PDF)', '978-2-925574-27-9'],
              ['ISBN (ePUB)', '978-2-925574-28-6'],
            ] as [string, string][]).map(([label, value]) => (
              <React.Fragment key={label}>
                <dt className="text-slate-500 whitespace-nowrap">{label}</dt>
                <dd className="text-slate-300">{value}</dd>
              </React.Fragment>
            ))}
          </dl>
          <div className="border-t border-white/10 pt-3 space-y-2 text-xs text-slate-400">
            <p>
              <span className="text-slate-300 font-semibold">Retours :</span>{' '}
              Article défectueux ou incorrect remboursé ou échangé sous 10 jours de la livraison.{' '}
              <Link to="/conditions#retours" className="text-gold hover:underline">Politique complète</Link>
            </p>
            <p>
              <span className="text-slate-300 font-semibold">Livraison :</span>{' '}
              2 jours ouvrables de traitement + 1–3 jours au Québec (livraison standard).{' '}
              <Link to="/conditions#livraison" className="text-gold hover:underline">Détails</Link>
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
  const [completedOrder, setCompletedOrder] = useState<ReceiptData | null>(null);
  // Unique session ID used to track and later remove the abandoned checkout record
  const [sessionId] = useState(() => `acs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
  });

  // Live tax / total calculation
  // Books are zero-rated for TVQ in Quebec; TPS applies to books + delivery.
  const totals = useMemo(() => {
    const tps = parseFloat(((total + DELIVERY_FEE) * TPS_RATE).toFixed(2));
    const tvq = parseFloat((DELIVERY_FEE * TVQ_RATE).toFixed(2));
    const grandTotal = parseFloat((total + DELIVERY_FEE + tps + tvq).toFixed(2));
    return { subtotal: total, delivery: DELIVERY_FEE, tps, tvq, grandTotal };
  }, [total]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    setPaymentError('');
    setStep(prev => prev + 1);
  };
  const prevStep = () => setStep(prev => prev - 1);

  const handleCardTokenizeResponseReceived = async (tokenResult: any) => {
    if (tokenResult.status !== 'OK' || !tokenResult.token) {
      setPaymentError(
        tokenResult.errors?.[0]?.detail || 'Erreur lors de la lecture de la carte.'
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
        cartItems: cartItems.map(item => ({
          title: item.book.title,
          price: item.book.price,
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
        delivery: data.delivery,
        tps: data.tps,
        tvq: data.tvq,
        total: data.total,
      };

      setCompletedOrder(receipt);
      onOrderComplete();
      setStep(4);
    } catch (err: any) {
      const msg = err?.details?.message || err?.message || 'Une erreur est survenue lors du paiement.';
      setPaymentError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Redirect to shop if cart is empty (and not on success screen)
  if (cartItems.length === 0 && step !== 4) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-white">
        <p className="text-slate-400 mb-6">Votre panier est vide.</p>
        <Link to="/boutique" className="bg-gold text-midnight font-bold px-8 py-3 rounded-xl hover:bg-white transition-colors">
          Aller à la boutique
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
              Résumé de la commande
            </h2>

            <div className="space-y-6 divide-y divide-white/5">
              {cartItems.map((item) => (
                <div key={item.book.id} className="flex gap-4 py-4">
                  <div className="w-20 h-28 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img src={item.book.image} alt={item.book.title} className="w-full h-full object-cover" />
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

            <BookDetails />

            <div className="mt-8 pt-6 border-t border-white/10 space-y-3 text-slate-300">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span>{totals.subtotal.toFixed(2)} $</span>
              </div>
              <div className="flex justify-between">
                <span>Livraison</span>
                <span>{totals.delivery.toFixed(2)} $</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TPS (5%)</span>
                <span>{totals.tps.toFixed(2)} $</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVQ (9,975% sur livraison)</span>
                <span>{totals.tvq.toFixed(2)} $</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-4 border-t border-white/10 mt-4">
                <span>Total</span>
                <span className="text-gold">{totals.grandTotal.toFixed(2)} $</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="5" fill="#3E4348"/>
              <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="#9ca3af"/>
              <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" fill="#3E4348"/>
            </svg>
            <span>Paiement sécurisé par <strong className="text-slate-400">Square</strong></span>
            <Lock size={13} />
          </div>
        </div>

        {/* Right Column: Checkout Form */}
        <div className="order-1 lg:order-2">
          {step < 4 && (
            <div className="mb-8">
              <Link to="/boutique" className="text-slate-400 hover:text-white flex items-center gap-2 mb-4 transition-colors">
                <ChevronLeft size={16} /> Retour à la boutique
              </Link>
              <h1 className="text-4xl font-serif text-white mb-2">Caisse</h1>
              <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider text-slate-500 mt-6">
                <span className={`pb-2 border-b-2 transition-colors ${step >= 1 ? 'text-gold border-gold' : 'border-transparent'}`}>1. Informations</span>
                <span className={`pb-2 border-b-2 transition-colors ${step >= 2 ? 'text-gold border-gold' : 'border-transparent'}`}>2. Livraison</span>
                <span className={`pb-2 border-b-2 transition-colors ${step >= 3 ? 'text-gold border-gold' : 'border-transparent'}`}>3. Paiement</span>
              </div>
            </div>
          )}

          <form className="space-y-6 animate-fade-in-up" onSubmit={(e) => e.preventDefault()}>

            {/* Step 1: Customer Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Mail className="text-gold" size={20} /> Coordonnées
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Adresse courriel *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                      placeholder="votre@email.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Prénom *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Nom *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="Dupont"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="(514) 123-4567"
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
                  Continuer vers la livraison
                </button>
              </div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Truck className="text-gold" size={20} /> Adresse de livraison
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Adresse *</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="123 Rue des Rêves"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Ville *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="Montréal"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Code Postal *</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="H1A 1A1"
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
                    Retour
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
                    Continuer vers le paiement
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <CreditCardIcon className="text-gold" size={20} /> Paiement
                </h3>

                {paymentError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 text-red-300 text-sm">
                    {paymentError}
                  </div>
                )}

                <PaymentForm
                  applicationId={process.env.REACT_APP_SQUARE_APP_ID || ''}
                  locationId={process.env.REACT_APP_SQUARE_LOCATION_ID || ''}
                  cardTokenizeResponseReceived={handleCardTokenizeResponseReceived}
                >
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                    <p className="text-sm text-slate-400">
                      Veuillez entrer vos informations de paiement ci-dessous.
                    </p>
                    <div className="square-payment-container">
                      <CreditCard
                        buttonProps={{
                          isLoading: isProcessing,
                          className: 'w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-500 transition-colors shadow-lg flex items-center justify-center gap-2 mt-6',
                        }}
                      >
                        <Lock size={16} />
                        {isProcessing ? 'Traitement en cours...' : `Payer ${totals.grandTotal.toFixed(2)} $`}
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
                      Paiement sécurisé par{' '}
                      <span className="text-white font-bold">Square</span>
                      {' '}— vos données sont chiffrées
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
                      Retour
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
                  <h2 className="text-3xl font-serif text-white mb-3">Commande confirmée!</h2>
                  <p className="text-slate-400 mb-2">
                    Merci, <strong className="text-white">{completedOrder.customerName}</strong>!
                  </p>
                  <p className="text-slate-500 text-sm">
                    Un reçu a été envoyé à <span className="text-gold">{completedOrder.email}</span>
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">N° de commande</span>
                    <span className="font-mono font-bold text-white">{completedOrder.orderId}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Sous-total</span>
                    <span>{completedOrder.subtotal.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Livraison</span>
                    <span>{completedOrder.delivery.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">TPS (5%)</span>
                    <span>{completedOrder.tps.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">TVQ (9,975%)</span>
                    <span>{completedOrder.tvq.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gold border-t border-white/10 pt-4 mt-2">
                    <span>Total payé</span>
                    <span>{completedOrder.total.toFixed(2)} $</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => printReceipt(completedOrder)}
                    className="w-full bg-gold text-midnight font-bold py-4 rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download size={18} /> Télécharger le reçu (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full bg-white/5 text-slate-300 font-bold py-4 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Retour à l'accueil
                  </button>
                </div>

                <p className="text-center text-slate-500 text-xs">
                  Expédition estimée: 3 à 5 jours ouvrables au Canada.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
