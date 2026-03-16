import React, { useState } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { books } from '../../data';
import { Book } from '../../types';
import Modal from '../../components/Modal';

const AdminInventory = () => {
    const [inventory, setInventory] = useState<Book[]>(books);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBook, setNewBook] = useState({ title: '', subtitle: '', description: '', price: '', image: '' });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewBook(prev => ({ ...prev, [name]: value }));
    };

    const handleAddBook = (e: React.FormEvent) => {
        e.preventDefault();
        const bookToAdd: Book = {
            id: `book-${Date.now()}`,
            ...newBook,
            price: parseFloat(newBook.price),
        };
        setInventory([bookToAdd, ...inventory]);
        setIsModalOpen(false);
        setNewBook({ title: '', subtitle: '', description: '', price: '', image: '' });
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-white">Inventaire Livres</h1>
                    <p className="text-slate-400 mt-1">Gestion du catalogue boutique</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors flex items-center gap-2"
                >
                    <Plus size={18} /> Ajouter un livre
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventory.map(book => (
                    <div key={book.id} className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden group hover:border-gold/50 transition-all">
                        <div className="relative h-48 bg-slate-800">
                             <img src={book.image} alt={book.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                             <div className="absolute top-2 right-2 bg-midnight/80 px-2 py-1 rounded text-xs text-gold font-bold border border-gold/20">
                                 {book.price} $
                             </div>
                        </div>
                        <div className="p-4 space-y-2">
                            <h3 className="font-bold text-white text-lg leading-tight truncate">{book.title}</h3>
                            <p className="text-slate-400 text-xs line-clamp-2">{book.description}</p>
                            <div className="pt-4 flex justify-between items-center border-t border-white/5 mt-4">
                                <span className="text-xs text-slate-500">ID: {book.id}</span>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><Edit3 size={16} /></button>
                                    <button className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ajouter un nouveau livre">
                <form onSubmit={handleAddBook} className="space-y-4">
                    <input name="title" value={newBook.title} onChange={handleInputChange} placeholder="Titre" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" required />
                    <input name="subtitle" value={newBook.subtitle} onChange={handleInputChange} placeholder="Sous-titre" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" />
                    <textarea name="description" value={newBook.description} onChange={handleInputChange} placeholder="Description" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" required />
                    <input name="price" type="number" value={newBook.price} onChange={handleInputChange} placeholder="Prix" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" required />
                    <input name="image" value={newBook.image} onChange={handleInputChange} placeholder="URL de l'image" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" required />
                    <button type="submit" className="w-full bg-gold text-midnight font-bold py-3 rounded-xl hover:bg-white transition-colors">Ajouter le livre</button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminInventory;
