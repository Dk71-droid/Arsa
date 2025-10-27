import React from 'react';
import type { Student } from '../../types';
import { XIcon, DocumentReportIcon } from '../icons';
import { Loader } from '../Loader';

interface ReportGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    onGenerate: () => void;
    isGenerating: boolean;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
    isOpen, onClose, students, onGenerate, isGenerating
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Cetak Rapor Sumatif Semester</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
                </header>

                {isGenerating ? (
                    <div className="p-6">
                        <Loader text="AI sedang membuat narasi dan menyusun rapor..." />
                    </div>
                ) : (
                    <>
                        <main className="p-6 overflow-y-auto space-y-4">
                            <p className="text-sm text-slate-600">
                                Fitur ini akan menghasilkan rapor untuk semua siswa di kelas aktif berdasarkan data sumatif yang telah diinput pada semester ini. Proses ini akan menggunakan AI untuk membuat narasi individual dan mungkin memerlukan beberapa saat.
                            </p>
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-2">Siswa yang akan disertakan ({students.length}):</h4>
                                <div className="max-h-60 overflow-y-auto border rounded-md p-2 bg-slate-50 text-sm text-slate-700">
                                    {students.map(s => s.nama).join(', ')}
                                </div>
                            </div>
                        </main>
                        <footer className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Batal</button>
                            <button
                                onClick={onGenerate}
                                disabled={students.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2"
                            >
                                <DocumentReportIcon className="h-5 w-5" />
                                Generate & Siapkan Cetak
                            </button>
                        </footer>
                    </>
                )}
            </div>
        </div>
    );
};