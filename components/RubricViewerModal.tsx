
import React, { useEffect, useRef } from 'react';
import type { TujuanPembelajaran } from '../types';
import { StarIcon } from './icons';

interface RubricViewerModalProps {
  tp: TujuanPembelajaran;
  onClose: () => void;
}

const LEVEL_HEADERS = [
    { title: 'Mahir', level: 4, color: 'bg-green-50 text-green-800' },
    { title: 'Cakap', level: 3, color: 'bg-blue-50 text-blue-800' },
    { title: 'Layak', level: 2, color: 'bg-yellow-50 text-yellow-800' },
    { title: 'Baru Berkembang', level: 1, color: 'bg-red-50 text-red-800' },
];

export const RubricViewerModal: React.FC<RubricViewerModalProps> = ({ tp, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        
        modalRef.current?.focus();

        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!tp.kktp) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" 
            onClick={onClose}
            aria-modal="true"
            role="dialog"
            aria-labelledby="rubric-modal-title"
        >
            <div 
                ref={modalRef}
                tabIndex={-1}
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-200">
                    <h2 id="rubric-modal-title" className="text-xl font-bold text-slate-800">
                        Rincian KKTP untuk {tp.id}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">{tp.deskripsi}</p>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <p><span className="font-semibold text-slate-500">Elemen CP:</span> {tp.kktp.elemenCp}</p>
                            <p><span className="font-semibold text-slate-500">Asesmen untuk:</span> {tp.kktp.asesmenUntuk}</p>
                        </div>
                        {tp.kktp.batasKetercapaian && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <h5 className="font-semibold text-teal-800 flex items-center gap-2">
                                    <StarIcon className="h-5 w-5" />
                                    Batas Ketercapaian (KKTP)
                                </h5>
                                <p className="mt-1 text-slate-700">{tp.kktp.batasKetercapaian}</p>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="p-3 font-semibold text-slate-600 border-b border-r w-1/5 align-top">Aspek yang Dinilai</th>
                                    {LEVEL_HEADERS.map(header => (
                                        <th key={header.level} className={`p-3 font-bold border-b border-r w-1/5 align-top ${header.color}`}>
                                            {header.title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tp.kktp.rubrik.map(item => {
                                    const sortedKriteria = [...item.kriteria].sort((a,b) => b.level - a.level);
                                    return (
                                        <tr key={item.aspek} className="hover:bg-slate-50">
                                            <td className="p-3 border-b border-r border-slate-200 font-bold text-teal-800 align-top">
                                                <div>
                                                    <p>{item.aspek}</p>
                                                    <div className="mt-1 font-normal text-xs">
                                                        <span className="text-slate-500">Teknik: </span>
                                                        <span className="font-semibold text-slate-600">{item.teknikAsesmen}</span>
                                                    </div>
                                                    <div className="font-normal text-xs">
                                                        <span className="text-slate-500">Instrumen: </span>
                                                        <span className="font-semibold text-slate-600">{item.instrumenAsesmen}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            {sortedKriteria.map(k => (
                                                <td key={k.level} className="p-3 border-b border-r border-slate-200 text-slate-600 align-top">{k.deskripsi}</td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">Tutup</button>
                </div>
            </div>
        </div>
    );
};
