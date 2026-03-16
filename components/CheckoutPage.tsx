import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, CheckCircle, CreditCard as CreditCardIcon, Lock, Mail, MapPin, Phone, Truck } from 'lucide-react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { CartItem } from '../types';

interface CheckoutPageProps {
  cartItems: CartItem[];
  total: number;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItems, total }) => {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleCardTokenizeResponseReceived = (token: unknown) => {
    console.log(token);
    setIsProcessing(false);
    // Here you would typically send the token to your backend to complete the payment
  };

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
                    <p className="text-gold font-bold">{item.book.price} $</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 space-y-3 text-slate-300">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span>{total.toFixed(2)} $</span>
              </div>
              <div className="flex justify-between">
                <span>Livraison (Estimée)</span>
                <span>15.00 $</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Taxes (TPS/TVQ)</span>
                <span>Calculé à l&apos;étape suivante</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-4 border-t border-white/10 mt-4">
                <span>Total</span>
                <span className="text-gold">{(total + 15).toFixed(2)} $</span>
              </div>
            </div>
          </div>
          
          <div className="text-center text-slate-500 text-sm">
            <p className="flex items-center justify-center gap-2 mb-2">
              <Lock size={14} /> Paiement sécurisé par Square
            </p>
            <p>Vos informations sont chiffrées et protégées.</p>
          </div>
        </div>

        {/* Right Column: Checkout Form */}
        <div className="order-1 lg:order-2">
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

          <form className="space-y-6 animate-fade-in-up" onSubmit={(e) => e.preventDefault()}>
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Mail className="text-gold" size={20} /> Coordonnées
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Adresse courriel</label>
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                      placeholder="votre@email.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Prénom</label>
                      <input 
                        type="text" 
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Nom</label>
                      <input 
                        type="text" 
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
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
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={nextStep}
                  className="w-full bg-gold text-midnight font-bold py-4 rounded-xl hover:bg-white transition-colors shadow-lg mt-8"
                >
                  Continuer vers la livraison
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Truck className="text-gold" size={20} /> Adresse de livraison
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Adresse</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text" 
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="123 Rue des Rêves"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Ville</label>
                      <input 
                        type="text" 
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="Montréal"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Code Postal</label>
                      <input 
                        type="text" 
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                        placeholder="H1A 1A1"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={prevStep}
                    className="flex-1 bg-white/5 text-slate-300 font-bold py-4 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Retour
                  </button>
                  <button 
                    onClick={nextStep}
                    className="flex-[2] bg-gold text-midnight font-bold py-4 rounded-xl hover:bg-white transition-colors shadow-lg"
                  >
                    Continuer vers le paiement
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <CreditCardIcon className="text-gold" size={20} /> Paiement
                </h3>
                
                <PaymentForm
                  applicationId={process.env.REACT_APP_SQUARE_APP_ID || ''}
                  locationId={process.env.REACT_APP_SQUARE_LOCATION_ID || ''}
                  cardTokenizeResponseReceived={(token) => {
                    setIsProcessing(true);
                    handleCardTokenizeResponseReceived(token);
                  }}
                >
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
                    <p className="text-sm text-slate-400 mb-4">
                      Veuillez entrer vos informations de paiement ci-dessous.
                    </p>
                    
                    <div className="square-payment-container">
                      <CreditCard 
                        buttonProps={{
                          isLoading: isProcessing,
                          className: "w-full bg-green-500 text-white font-bold py-4 rounded-xl hover:bg-green-400 transition-colors shadow-lg flex items-center justify-center gap-2 mt-8",
                        }}
                      >
                        <Lock size={18} /> {isProcessing ? 'Traitement...' : `Payer ${(total + 15).toFixed(2)} $`}
                      </CreditCard>
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
                  </div>
                </PaymentForm>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
