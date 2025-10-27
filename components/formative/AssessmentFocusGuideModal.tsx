import React from 'react';
import { XIcon, LightbulbIcon } from '../icons';
import type { FokusAsesmenFormatif } from '../../types';

interface AssessmentFocusGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    focusGroups: FokusAsesmenFormatif[];
    aspectName?: string;
    pertemuan: number;
}

export const AssessmentFocusGuideModal: React.FC<AssessmentFocusGuideModalProps> = ({ isOpen, onClose, focusGroups, aspectName, pertemuan }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <LightbulbIcon className="h-6 w-6 text-yellow-500" />
                        Panduan Fokus Asesmen {aspectName ? `(Aspek: ${aspectName})` : ''}
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
                </header>
                <main className="p-6 overflow-y-auto bg-slate-50">
                    <p className="text-sm text-slate-600 mb-4">Berikut adalah rekomendasi dari RPP untuk kelompok siswa dan aspek yang perlu menjadi fokus observasi Anda selama pertemuan ke-{pertemuan}.</p>
                    {focusGroups.length > 0 ? (
                        <div className="space-y-4">
                            {focusGroups.map((fokusGroup, f_index) => (
                                <div key={f_index} className="p-3 border-l-4 border-cyan-300 bg-white shadow-sm rounded-r-md">
                                    <p className="font-bold text-cyan-800">{fokusGroup.deskripsiKelompok}</p>
                                    <p className="text-xs text-slate-600 mt-1 mb-2"><strong>Siswa:</strong> {fokusGroup.kelompokSiswa.join(', ')}</p>
                                    
                                    {fokusGroup.fokusPenilaian.map((fokus, fp_index) => (
                                        <div key={fp_index} className="mt-2 pt-2 border-t border-cyan-100">
                                            <p className="font-semibold text-slate-800">{fokus.aspek}</p>
                                            <p className="text-xs text-slate-600 mt-1 italic">"{fokus.deskripsiSingkat}"</p>
                                            <div className="mt-1.5 flex items-center gap-3 text-xs">
                                                <span className="text-slate-500"><strong>Teknik:</strong> {fokus.teknikAsesmen}</span>
                                                <span className="text-slate-500"><strong>Instrumen:</strong> {fokus.instrumenAsesmen}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 py-8">Tidak ada panduan fokus asesmen dari RPP untuk aspek ini.</p>
                    )}
                </main>
                <footer className="p-4 bg-slate-100 border-t flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Tutup</button>
                </footer>
            </div>
        </div>
    );
};