import React, { useState, useEffect, useRef } from 'react';
import { uploadMediaFile } from '../lib/storage';
import { UploadCloud, Image as ImageIcon, Type, ArrowUp, ArrowDown, MoveLeft, MoveRight, AlignLeft, AlignCenter, AlignRight, AlignJustify, Library, X, Heading, Bold, Italic, Trash2 } from 'lucide-react';

// --- Types ---
type Alignment = 'left' | 'center' | 'right' | 'justify';
type FontFamily = 'sans' | 'serif';
type FontSize = 'p' | 'h2' | 'h1';
type BlockColumn = { id: string; type: 'text' | 'image'; value: string; align?: Alignment; fontFamily?: FontFamily; fontSize?: FontSize };
type BlockRow = { id: string; columns: BlockColumn[] };

// --- Helper Components ---
const ImageUpload = ({ value, onUpload, mediaLibrary }: { value: string, onUpload: (url: string) => void, mediaLibrary: string[] }) => {
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setIsUploading(true);
        const url = await uploadMediaFile(file);
        onUpload(url);
        setIsUploading(false);
      }
    };
    return (
      <>
        <div className="w-full h-full bg-black/20 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center relative min-h-[150px]">
          {value && <img src={value} alt="Uploaded preview" className="w-full h-full object-cover rounded-lg absolute opacity-80" />}
          <div className="text-center z-10 p-4 bg-midnight/60 rounded-xl flex items-center gap-4">
            <div>
              <UploadCloud className="mx-auto text-slate-500 mb-1" />
              <label className="text-gold font-bold cursor-pointer hover:text-white text-sm">
                {isUploading ? 'Téléversement...' : 'Choisir un fichier'}
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
              </label>
              <p className="text-xs text-slate-500 mt-1">ou glisser-déposer</p>
            </div>
            <div className="border-l border-white/10 h-16 mx-2"></div>
            <div>
              <Library className="mx-auto text-slate-500 mb-1" />
              <button onClick={() => setIsLibraryOpen(true)} className="text-gold font-bold cursor-pointer hover:text-white text-sm">Parcourir</button>
              <p className="text-xs text-slate-500 mt-1">la médiathèque</p>
            </div>
          </div>
        </div>
        {isLibraryOpen && (
            <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
                <div className="bg-midnight/80 border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-serif text-white">Sélectionner une image</h3><button onClick={() => setIsLibraryOpen(false)} className="p-2 text-slate-400 hover:text-white"><X /></button></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2"><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{mediaLibrary.map((imgUrl, index) => (<div key={index} className="aspect-square rounded-lg overflow-hidden cursor-pointer group" onClick={() => { onUpload(imgUrl); setIsLibraryOpen(false); }}><img src={imgUrl} alt={`Media ${index}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>))}</div></div>
                </div>
            </div>
        )}
      </>
    );
  };

// --- Main Component ---
const BlockEditor = ({ value, onChange, mediaLibrary }: { value: string, onChange: (val: string) => void, mediaLibrary: string[] }) => {
    const [rows, setRows] = useState<BlockRow[]>([]);
    const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const isInitialMount = useRef(true);

    // Initialize rows from value on mount only.
    // Must NOT re-run when value changes — that would create a loop:
    // user types → onChange → parent updates value prop → this effect fires →
    // setRows with new object references → second effect fires → onChange again → ∞
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        try {
            const parsedRows = JSON.parse(value);
            if (Array.isArray(parsedRows) && parsedRows.length > 0) {
                setRows(parsedRows);
            } else {
                throw new Error('Empty or invalid content');
            }
        } catch {
            setRows([{ id: 'default-row', columns: [{ id: 'default-col', type: 'text', value: value || '', align: 'left', fontFamily: 'sans', fontSize: 'p' }] }]);
        }
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        onChangeRef.current(JSON.stringify(rows));
    }, [rows]);

    // Row and Column Handlers
    const addRow = () => setRows([...rows, { id: `row-${Date.now()}`, columns: [{ id: `col-${Date.now()}`, type: 'text', value: '', align: 'left', fontFamily: 'sans', fontSize: 'p' }] }]);
    const deleteRow = (rowId: string) => setRows(rows.filter(r => r.id !== rowId));
    const moveRow = (index: number, direction: 'up' | 'down') => { const newRows = [...rows]; const newIndex = direction === 'up' ? index - 1 : index + 1; if (newIndex < 0 || newIndex >= newRows.length) return; [newRows[index], newRows[newIndex]] = [newRows[newIndex], newRows[index]]; setRows(newRows); };
    const addColumn = (rowId: string, type: 'text' | 'image') => { const newCol: BlockColumn = type === 'text' ? { id: `col-${Date.now()}`, type, value: '', align: 'left', fontFamily: 'sans', fontSize: 'p' } : { id: `col-${Date.now()}`, type, value: '' }; setRows(rows.map(r => r.id === rowId && r.columns.length < 3 ? { ...r, columns: [...r.columns, newCol] } : r)); };
    const deleteColumn = (rowId: string, colId: string) => setRows(rows.map(r => r.id === rowId ? { ...r, columns: r.columns.filter(c => c.id !== colId) } : r));
    const moveColumn = (rowId: string, colIndex: number, direction: 'left' | 'right') => { setRows(rows.map(r => { if (r.id !== rowId) return r; const newCols = [...r.columns]; const newIndex = direction === 'left' ? colIndex - 1 : colIndex + 1; if (newIndex < 0 || newIndex >= newCols.length) return r; [newCols[colIndex], newCols[newIndex]] = [newCols[newIndex], newCols[colIndex]]; return { ...r, columns: newCols }; })); };
    const updateColumn = (rowId: string, colId: string, value: string) => setRows(rows.map(r => r.id === rowId ? { ...r, columns: r.columns.map(c => c.id === colId ? { ...c, value } : c) } : r));
    const updateColumnAlign = (rowId: string, colId: string, align: Alignment) => setRows(rows.map(r => r.id === rowId ? { ...r, columns: r.columns.map(c => c.id === colId ? { ...c, align } : c) } : r));
    const toggleFontFamily = (rowId: string, colId: string) => setRows(rows.map(r => r.id === rowId ? { ...r, columns: r.columns.map(c => c.id === colId ? { ...c, fontFamily: c.fontFamily === 'serif' ? 'sans' : 'serif' } : c) } : r));
    const cycleFontSize = (rowId: string, colId: string) => { const sizes: FontSize[] = ['p', 'h2', 'h1']; setRows(rows.map(r => r.id === rowId ? { ...r, columns: r.columns.map(c => { if (c.id !== colId) return c; const currentSizeIndex = sizes.indexOf(c.fontSize || 'p'); const nextSizeIndex = (currentSizeIndex + 1) % sizes.length; return { ...c, fontSize: sizes[nextSizeIndex] }; }) } : r)); };
    const handleTextWrap = (rowId: string, colId: string, wrapper: string) => { const textarea = textareaRefs.current[colId]; if (!textarea) return; const { selectionStart, selectionEnd, value } = textarea; const selectedText = value.substring(selectionStart, selectionEnd); const newValue = `${value.substring(0, selectionStart)}${wrapper}${selectedText}${wrapper}${value.substring(selectionEnd)}`; updateColumn(rowId, colId, newValue); };

    const getTextStyle = (col: BlockColumn) => {
        const sizeClass = { p: 'text-base', h2: 'text-2xl', h1: 'text-4xl' }[col.fontSize || 'p'];
        const fontClass = { sans: 'font-sans', serif: 'font-serif' }[col.fontFamily || 'sans'];
        return `${sizeClass} ${fontClass} text-${col.align || 'left'}`;
    };

    return (
        <div className="space-y-4 pt-4 border-t border-white/10">
            {rows.map((row, rowIndex) => (
                <div key={row.id} className="bg-black/20 border border-white/5 rounded-xl p-4 relative group">
                    <div className={`grid grid-cols-1 md:grid-cols-${row.columns.length || 1} gap-4`}>
                        {row.columns.map((col, colIndex) => (
                            <div key={col.id} className="relative group/col">
                                {col.type === 'text' && (
                                    <div>
                                        <div className="flex items-center gap-1 p-1 bg-slate-900/50 border border-white/10 rounded-full mb-2 w-fit">
                                            <button onClick={() => updateColumnAlign(row.id, col.id, 'left')} className={`p-1 rounded-full ${col.align === 'left' ? 'text-gold' : 'hover:text-gold'}`}><AlignLeft size={14}/></button>
                                            <button onClick={() => updateColumnAlign(row.id, col.id, 'center')} className={`p-1 rounded-full ${col.align === 'center' ? 'text-gold' : 'hover:text-gold'}`}><AlignCenter size={14}/></button>
                                            <button onClick={() => updateColumnAlign(row.id, col.id, 'right')} className={`p-1 rounded-full ${col.align === 'right' ? 'text-gold' : 'hover:text-gold'}`}><AlignRight size={14}/></button>
                                            <button onClick={() => updateColumnAlign(row.id, col.id, 'justify')} className={`p-1 rounded-full ${col.align === 'justify' ? 'text-gold' : 'hover:text-gold'}`}><AlignJustify size={14}/></button>
                                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                                            <button onClick={() => toggleFontFamily(row.id, col.id)} className={`p-1 rounded-full hover:text-gold`}><Type size={14}/></button>
                                            <button onClick={() => cycleFontSize(row.id, col.id)} className={`p-1 rounded-full hover:text-gold`}><Heading size={14}/></button>
                                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                                            <button onClick={() => handleTextWrap(row.id, col.id, '**')} className={`p-1 rounded-full hover:text-gold`}><Bold size={14}/></button>
                                            <button onClick={() => handleTextWrap(row.id, col.id, '_')} className={`p-1 rounded-full hover:text-gold`}><Italic size={14}/></button>
                                        </div>
                                        <textarea ref={el => (textareaRefs.current[col.id] = el)} placeholder="Écrivez ici..." value={col.value} onChange={(e) => updateColumn(row.id, col.id, e.target.value)} className={`w-full min-h-[150px] bg-transparent text-slate-300 focus:outline-none resize-y ${getTextStyle(col)}`} />
                                    </div>
                                )}
                                {col.type === 'image' && <ImageUpload value={col.value} onUpload={(url) => updateColumn(row.id, col.id, url)} mediaLibrary={mediaLibrary} />}
                                <div className="absolute top-1 right-1 z-10 flex items-center gap-1 p-1 bg-slate-900/50 border border-white/10 rounded-full opacity-0 group-hover/col:opacity-100 transition-opacity"><button onClick={() => moveColumn(row.id, colIndex, 'left')} className="p-1 hover:text-gold"><MoveLeft size={14}/></button><button onClick={() => moveColumn(row.id, colIndex, 'right')} className="p-1 hover:text-gold"><MoveRight size={14}/></button><button onClick={() => deleteColumn(row.id, col.id)} className="p-1 hover:text-red-500"><Trash2 size={14}/></button></div>
                            </div>
                        ))}
                    </div>
                    <div className="absolute top-2 -right-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => moveRow(rowIndex, 'up')} className="p-1 bg-slate-800/50 rounded-full hover:text-gold"><ArrowUp size={14}/></button><button onClick={() => moveRow(rowIndex, 'down')} className="p-1 bg-slate-800/50 rounded-full hover:text-gold"><ArrowDown size={14}/></button></div>
                    <div className="flex items-center gap-2 pt-3 mt-3 border-t border-white/10"><button onClick={() => addColumn(row.id, 'text')} disabled={row.columns.length >= 3} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-50"><Type size={14}/> Ajouter Texte</button><button onClick={() => addColumn(row.id, 'image')} disabled={row.columns.length >= 3} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-50"><ImageIcon size={14}/> Ajouter Image</button><button onClick={() => deleteRow(row.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 ml-auto"><Trash2 size={14}/> Supprimer la ligne</button></div>
                </div>
            ))}
            <button onClick={addRow} className="w-full bg-white/5 border border-dashed border-white/10 rounded-lg py-4 text-slate-400 hover:bg-white/10 hover:border-gold/50 transition-colors">Ajouter une nouvelle ligne</button>
        </div>
    );
};

export default BlockEditor;
