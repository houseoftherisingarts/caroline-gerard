import React from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { CartItem } from '../types';
import { thumb } from '../lib/img';
import EditableText from './EditableText';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (bookId: string, delta: number) => void;
  onRemoveItem: (bookId: string) => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, 
  onClose, 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem 
}) => {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.book.price * item.quantity), 0);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-midnight/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShoppingCart className="text-gold w-6 h-6" />
              <EditableText tag="h2" contentKey="cart_title" defaultValue="Ton panier" className="text-xl font-serif text-white" />
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-500">
                  <ShoppingCart size={40} />
                </div>
                <EditableText tag="p" contentKey="cart_empty_msg" defaultValue="Ton panier est vide." className="text-slate-400 text-lg" />
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gold text-gold rounded-lg hover:bg-gold hover:text-midnight transition-colors font-bold"
                >
                  <EditableText tag="span" contentKey="cart_continue_btn" defaultValue="Continuer tes achats" />
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.book.id} className="flex gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="w-20 h-28 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.book.image} alt={item.book.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-white font-bold line-clamp-1">{item.book.title}</h3>
                      <p className="text-slate-400 text-sm">{item.book.price} $</p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1">
                        <button 
                          onClick={() => onUpdateQuantity(item.book.id, -1)}
                          className="p-1 hover:text-white text-slate-400 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold text-white w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.book.id, 1)}
                          className="p-1 hover:text-white text-slate-400 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => onRemoveItem(item.book.id)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-white/10 bg-black/20 space-y-4">
              <div className="flex justify-between items-center text-lg font-bold text-white">
                <EditableText tag="span" contentKey="cart_subtotal_label" defaultValue="Sous-total" />
                <span>{subtotal.toFixed(2)} $</span>
              </div>
              <EditableText tag="p" contentKey="cart_taxes_note" defaultValue="Taxes et frais de livraison calculés à l'étape suivante." className="text-xs text-slate-500 text-center" />
              <Link
                to="/checkout"
                onClick={onClose}
                className="block w-full py-4 bg-gold text-midnight font-bold text-center rounded-xl hover:bg-white transition-colors shadow-lg hover:shadow-gold/20"
              >
                <EditableText tag="span" contentKey="cart_checkout_btn" defaultValue="Passer à la caisse" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
