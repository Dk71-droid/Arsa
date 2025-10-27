import React from 'react';
import type { HafalanItem } from '../types';
import { XIcon } from './icons';

interface HafalanContentModalProps {
    item: HafalanItem;
    onClose: () => void;
}

export const HafalanContentModal: React.FC<HafalanContentModalProps> = ({ item, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Konten Hafalan: {item.name}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
                </header>
                <main className="p-6 overflow-y-auto">
                    <pre className="text-slate-700 whitespace-pre-wrap font-sans text-base leading-relaxed">
                        {item.content}
                    </pre>
                </main>
                <footer className="p-4 bg-slate-50 border-t flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Tutup</button>
                </footer>
            </div>
        </div>
    );
};
