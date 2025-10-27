import React, { useState, useMemo, useEffect } from 'react';
import type { SummativePackage, TujuanPembelajaran } from '../../types';
import * as geminiService from '../../services/geminiService';
import { XIcon, WandIcon, DownloadIcon } from '../icons';
import { Loader } from '../Loader';

const openHtmlInNewTab = (htmlContent: string, showAlert: (options: { title: string, message: string }) => void) => {
    const newTab = window.open();
    if (newTab) {
        newTab.document.write(htmlContent);
        newTab.document.close();
    } else {
        showAlert({
            title: "Pop-up Diblokir",
            message: "Gagal membuka tab baru. Mohon izinkan pop-up untuk situs ini di pengaturan peramban Anda."
        });
    }
};

interface SummativeGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    pkg: SummativePackage;
    allTps: TujuanPembelajaran[];
    phase: string;
    kelas?: string;
    onSaveInstrument: (pkgId: string, instrumentHtml: string) => void;
    showAlert: (options: { title: string, message: string }) => void;
}

type GeneratorStage = 'loading' | 'result';

export const SummativeGeneratorModal: React.FC<SummativeGeneratorModalProps> = ({
    isOpen, onClose, pkg, allTps, phase, kelas, onSaveInstrument, showAlert
}) => {
    const [stage, setStage] = useState<GeneratorStage>('loading');
    const [error, setError] = useState('');
    const [generatedHtml, setGeneratedHtml] = useState<string | null>(pkg.instrumentHtml || null);

    const tpsInPackage = useMemo(() => {
        return allTps.filter(tp => pkg.tpIds.includes(tp.id) && tp.kktp);
    }, [allTps, pkg.tpIds]);

    const handleGenerate = async () => {
        if (tpsInPackage.length === 0) {
            setError("Tidak ada TP dengan KKTP yang valid dalam paket ini untuk membuat instrumen.");
            setStage('result'); // End loading
            return;
        }
        setStage('loading');
        setError('');
        try {
            const result = await geminiService.generateSummativeInstrumentHtml(tpsInPackage, phase, kelas);
            setGeneratedHtml(result);
            setStage('result');
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Gagal membuat instrumen. Silakan coba lagi.");
            setStage('result'); // Go to result stage to show error
        }
    };

    useEffect(() => {
        if (isOpen && !pkg.instrumentHtml) {
            handleGenerate();
        } else if (isOpen && pkg.instrumentHtml) {
            setGeneratedHtml(pkg.instrumentHtml);
            setStage('result');
        }
    }, [isOpen, pkg.instrumentHtml]);
    
    const handleSave = () => {
        if (generatedHtml) {
            onSaveInstrument(pkg.id, generatedHtml);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Generate Instrumen Sumatif (AI)</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
                </header>

                <main className="p-6 overflow-y-auto bg-slate-50 flex-grow">
                    {stage === 'loading' && <Loader text="AI sedang menganalisis KKTP dan merancang instrumen multi-modal..." />}
                    
                    {stage === 'result' && (
                        error ? (
                            <div className="text-center p-8 text-red-600">
                                <p className="font-bold">Terjadi Kesalahan</p>
                                <p>{error}</p>
                            </div>
                        ) : generatedHtml ? (
                            <div className="w-full h-full bg-white shadow-md">
                               <iframe srcDoc={generatedHtml} className="w-full h-full border-0" title="Pratinjau Instrumen" />
                            </div>
                        ) : (
                            <div className="text-center p-8 text-slate-500">
                                <p>Tidak ada instrumen untuk ditampilkan.</p>
                            </div>
                        )
                    )}
                </main>
                
                <footer className="p-4 bg-slate-100 border-t flex justify-between items-center">
                    {stage === 'result' && (
                        <button onClick={handleGenerate} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 p-2 rounded-md">
                            <WandIcon className="h-4 w-4" />
                            Generate Ulang
                        </button>
                    )}
                     <div className="flex-grow"></div>
                    <div className="flex items-center gap-2">
                        {stage !== 'loading' && <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Batal</button>}
                        {stage === 'result' && generatedHtml && (
                            <>
                                <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700">Simpan Hasil HTML</button>
                                <button onClick={() => generatedHtml && openHtmlInNewTab(generatedHtml, showAlert)} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 flex items-center gap-2">
                                    <DownloadIcon className="h-5 w-5"/>
                                    Cetak / Simpan PDF
                                </button>
                            </>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};