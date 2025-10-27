import React, { useState, useEffect, useCallback } from 'react';
import type { Student, TujuanPembelajaran } from '../../types';
import { XIcon, WandIcon } from '../icons';
import { Loader } from '../Loader';
import { FloatingTooltip } from './AssessmentInputs';

interface QuickSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    skippedTps: TujuanPembelajaran[];
    onSave: (syncData: Record<number, Record<string, boolean>>) => Promise<void>;
    onSkip: () => void;
}

export const QuickSyncModal: React.FC<QuickSyncModalProps> = ({ isOpen, onClose, students, skippedTps, onSave, onSkip }) => {
    const [syncStatus, setSyncStatus] = useState<Record<number, Record<string, boolean>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [tooltip, setTooltip] = useState<{ content: React.ReactNode; top: number; left: number; position: 'top' | 'bottom'; widthClass?: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            const initialStatus: Record<number, Record<string, boolean>> = {};
            students.forEach(student => {
                initialStatus[student.id!] = {};
                skippedTps.forEach(tp => {
                    initialStatus[student.id!][tp.id] = true; // Default to Tuntas
                });
            });
            setSyncStatus(initialStatus);
        }
    }, [isOpen, students, skippedTps]);

    const handleCheckboxChange = (studentId: number, tpId: string) => {
        setSyncStatus(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [tpId]: !prev[studentId]?.[tpId],
            },
        }));
    };

    const handleBulkUntick = (tpId: string) => {
        setSyncStatus(prev => {
            const newStatus = { ...prev };
            students.forEach(student => {
                newStatus[student.id!] = {
                    ...newStatus[student.id!],
                    [tpId]: false, // Mark as Belum Tuntas
                };
            });
            return newStatus;
        });
    };
    
    const handleSaveClick = async () => {
        setIsSaving(true);
        await onSave(syncStatus);
        setIsSaving(false);
    };
    
    const handleShowTooltip = useCallback((content: React.ReactNode, rect: DOMRect, widthClass: string = 'w-72') => {
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const tooltipHeight = 100; // Estimate

        let position: 'top' | 'bottom' = 'bottom';
        let top = rect.bottom + 8;

        if (spaceBelow < tooltipHeight && rect.top > tooltipHeight) {
            position = 'top';
            top = rect.top - 8;
        }
        
        setTooltip({ content, top, left: rect.left + rect.width / 2, widthClass, position });
    }, []);

    const handleHideTooltip = useCallback(() => {
        setTooltip(null);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            {tooltip && <FloatingTooltip content={tooltip.content} top={tooltip.top} left={tooltip.left} position={tooltip.position} widthClass={tooltip.widthClass} />}
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Sinkronkan Progres Kelas Anda</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
                </header>

                {isSaving ? (
                     <div className="flex-grow flex items-center justify-center p-6">
                        <Loader text="Menyimpan progres & men-generate KKTP jika perlu..." />
                     </div>
                ) : (
                    <>
                        <main className="p-6 overflow-y-auto space-y-4">
                            <p className="text-sm text-slate-600">
                                Kami melihat Anda memulai dari TP yang lebih lanjut. Untuk membantu kami memberikan rekomendasi yang akurat, tandai status ketuntasan siswa pada TP sebelumnya.
                                <br/>
                                <strong className="font-semibold">Secara default, semua siswa dianggap 'Tuntas'.</strong> Cukup hilangkan centang bagi siswa yang masih perlu penguatan.
                            </p>
                            <div className="overflow-auto border rounded-lg max-h-96">
                                <table className="min-w-full text-sm text-left border-collapse">
                                    <thead className="bg-slate-100 sticky top-0">
                                        <tr>
                                            <th className="p-2 font-semibold text-slate-600 border-b border-r sticky left-0 bg-slate-100 z-10">Nama Siswa</th>
                                            {skippedTps.map(tp => (
                                                <th key={tp.id} className="p-2 font-semibold text-slate-600 border-b border-r text-center">
                                                    <span 
                                                        className="cursor-help underline decoration-dotted"
                                                        onMouseEnter={(e) => handleShowTooltip(tp.deskripsi, e.currentTarget.getBoundingClientRect())}
                                                        onMouseLeave={handleHideTooltip}
                                                    >
                                                        {tp.id}
                                                    </span>
                                                    <button onClick={() => handleBulkUntick(tp.id)} className="block mx-auto mt-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full hover:bg-red-200">
                                                        Tandai Semua Belum Tuntas
                                                    </button>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(student => (
                                            <tr key={student.id} className="group hover:bg-slate-50">
                                                <td className="p-2 border-b border-r font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50">{student.nama}</td>
                                                {skippedTps.map(tp => (
                                                    <td key={tp.id} className="p-2 border-b border-r text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={syncStatus[student.id!]?.[tp.id] || false}
                                                            onChange={() => handleCheckboxChange(student.id!, tp.id)}
                                                            className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                                            title={syncStatus[student.id!]?.[tp.id] ? 'Tuntas' : 'Belum Tuntas'}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </main>
                        <footer className="p-4 bg-slate-50 border-t flex justify-between items-center">
                            <button onClick={onSkip} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">
                                Lewati & Lanjutkan Saja
                            </button>
                            <button
                                onClick={handleSaveClick}
                                className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 flex items-center gap-2"
                            >
                                <WandIcon className="h-5 w-5" />
                                Simpan Progres & Lanjutkan
                            </button>
                        </footer>
                    </>
                )}
            </div>
        </div>
    );
};