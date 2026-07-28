import React from 'react';
import { thumb } from '../lib/img';

// --- Types ---
type Alignment = 'left' | 'center' | 'right' | 'justify';
type FontFamily = 'sans' | 'serif';
type FontSize = 'p' | 'h2' | 'h1';
type BlockColumn = { id: string; type: 'text' | 'image'; value: string; align?: Alignment; fontFamily?: FontFamily; fontSize?: FontSize };
type BlockRow = { id: string; columns: BlockColumn[] };

// --- Helper to Render Content ---
const parseRichText = (text: string) => {
    if (!text) return '';
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
    html = html.replace(/_(.*?)_/g, '<em class="text-gold not-italic font-semibold">$1</em>');
    return html;
};

const getPublicTextStyle = (col: BlockColumn) => {
    const baseClasses = 'prose prose-xl prose-invert prose-gold max-w-none leading-relaxed whitespace-pre-wrap text-slate-200';
    const sizeClass = { p: 'text-lg', h2: 'text-3xl', h1: 'text-5xl font-bold' }[col.fontSize || 'p'];
    const fontClass = { sans: 'font-sans', serif: 'font-serif' }[col.fontFamily || 'sans'];
    const alignClass = `text-${col.align || 'left'}`;
    return `${baseClasses} ${sizeClass} ${fontClass} ${alignClass}`;
};

const BlockRenderer = ({ content }: { content: string }) => {
    try {
        const rows = JSON.parse(content) as BlockRow[];
        if (!Array.isArray(rows)) throw new Error("Not an array");

        return (
            <>
                {rows.map(row => (
                    <div key={row.id} className="flex flex-col md:flex-row gap-8 mb-12 w-full">
                        {row.columns.map(col => (
                            <div key={col.id} className="flex-1 w-full min-w-0">
                                {col.type === 'text' && (
                                    <div className={getPublicTextStyle(col)} dangerouslySetInnerHTML={{ __html: parseRichText(col.value) }} />
                                )}
                                {col.type === 'image' && (
                                    <img src={col.value} alt="Contenu du blog" className="w-full h-auto object-cover rounded-2xl shadow-xl" />
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </>
        );
    } catch {
        return <div className="prose prose-xl prose-invert prose-gold max-w-none leading-relaxed whitespace-pre-wrap text-slate-200">{content}</div>;
    }
};

export default BlockRenderer;
