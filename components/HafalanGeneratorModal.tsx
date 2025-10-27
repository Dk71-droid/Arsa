import React, { useState } from 'react';
import type { HafalanPackage } from '../types';
import { XIcon, WandIcon } from './icons';
import { Loader } from './Loader';
import * as geminiService from '../services/geminiService';

interface HafalanGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPackageCreated: (newPackage: HafalanPackage) => void;
}

export const HafalanGeneratorModal: React.FC<HafalanGeneratorModalProps> = ({ isOpen, onClose, onPackageCreated }) => {
    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [levels, setLevels] = useState(5);
    const [description, setDescription] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedPackage, setGeneratedPackage] = useState<HafalanPackage | null>(null);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setGeneratedPackage(null);

        try {
            const result = await geminiService.generateHafalanPackage(topic, levels, description, name);
            setGeneratedPackage(result);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Gagal membuat paket hafalan.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = () => {
        if (generatedPackage) {
            onPackageCreated(generatedPackage);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Buat Paket Hafalan (AI)</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
                </header>
                
                <main className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <Loader text="AI sedang memecah materi hafalan..." />
                    ) : generatedPackage ? (
                        <div className="space-y-4">
                            <h4 className="font-bold text-lg text-indigo-700">Hasil dari AI</h4>
                            <p className="text-sm text-slate-600">Tinjau item yang dibuat AI. Jika sudah sesuai, simpan paket ini.</p>
                            <div className="p-3 bg-slate-100 rounded-md border">
                                <p><strong>Nama Paket:</strong> {generatedPackage.name}</p>
                                <p><strong>Deskripsi:</strong> {generatedPackage.description}</p>
                            </div>
                            <ul className="list-decimal list-inside space-y-1 p-3 border rounded-md max-h-60 overflow-y-auto">
                                {generatedPackage.items.map(item => (
                                    <li key={item.id} className="text-slate-700">{item.name}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <form onSubmit={handleGenerate} className="space-y-4">
                             <div>
                                <label htmlFor="pkg-name" className="block text-sm font-medium text-slate-700 mb-1">Nama Paket Hafalan</label>
                                <input id="pkg-name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Contoh: Juz 'Amma, Tabel Perkalian" className="w-full p-2 border rounded-md" />
                            </div>
                            <div>
                                <label htmlFor="pkg-topic" className="block text-sm font-medium text-slate-700 mb-1">Topik/Materi Utama</label>
                                <input id="pkg-topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} required placeholder="Contoh: Surat An-Naba', Puisi 'Aku' karya Chairil Anwar" className="w-full p-2 border rounded-md" />
                            </div>
                             <div>
                                <label htmlFor="pkg-levels" className="block text-sm font-medium text-slate-700 mb-1">Jumlah Bagian/Level</label>
                                <input id="pkg-levels" type="number" min="1" max="50" value={levels} onChange={e => setLevels(parseInt(e.target.value, 10))} required className="w-full p-2 border rounded-md" />
                            </div>
                             <div>
                                <label htmlFor="pkg-desc" className="block text-sm font-medium text-slate-700 mb-1">Deskripsi Singkat</label>
                                <textarea id="pkg-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Contoh: Hafalan surat-surat pendek dari An-Naba' hingga An-Nas." className="w-full p-2 border rounded-md" />
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                        </form>
                    )}
                </main>
                
                <footer className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Batal</button>
                    {generatedPackage ? (
                        <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700">Simpan Paket</button>
                    ) : (
                        <button onClick={handleGenerate} disabled={!topic.trim() || !name.trim()} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-slate-400 flex items-center gap-2">
                            <WandIcon className="h-5 w-5"/>
                            Generate dengan AI
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};