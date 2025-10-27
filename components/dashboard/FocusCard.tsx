import React, { useMemo } from 'react';
import type { Student, TujuanPembelajaran } from '../../types';
import { TargetIcon } from '../icons';
import { calculateTpCompletion } from '../formative/utils';

export const FocusCard: React.FC<{
    tp: TujuanPembelajaran | null;
    students: Student[];
    onNavigate: () => void;
    buttonText: string;
}> = ({ tp, students, onNavigate, buttonText }) => {
    const status = useMemo(() => {
        if (!tp) return { tuntasCount: 0, totalStudents: students.length };
        return calculateTpCompletion(tp, students);
    }, [tp, students]);

    const completionPercentage = status.totalStudents > 0 ? (status.tuntasCount / status.totalStudents) * 100 : 0;

    return (
        <div className="flex flex-col xl:col-span-1 bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-6 rounded-xl shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                <TargetIcon className="h-6 w-6" />
                Fokus Saat Ini
            </h3>
            {tp ? (
                <div className="space-y-4 flex flex-col flex-grow">
                    <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                        <p className="text-sm font-semibold text-white">{tp.id}</p>
                        <p className="text-indigo-100 mt-1">{tp.deskripsi}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative h-20 w-20">
                            <svg className="w-full h-full" viewBox="0 0 36 36" transform="rotate(-90 18 18)">
                                <path className="text-white/20" strokeWidth="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="text-white" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={`${completionPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center" style={{transform: 'rotate(90deg)'}}>
                                <span className="text-2xl font-bold text-white">{completionPercentage.toFixed(0)}<span className="text-base">%</span></span>
                            </div>
                        </div>
                        <div>
                            <p className="font-bold text-white">Ketuntasan Formatif</p>
                            <p className="text-sm text-indigo-100">{status.tuntasCount} dari {status.totalStudents} siswa tuntas</p>
                        </div>
                    </div>
                    <button onClick={onNavigate} className="w-full mt-auto bg-white text-indigo-700 font-bold py-2.5 px-6 rounded-lg shadow-md hover:bg-indigo-50 transition-colors">
                        {buttonText}
                    </button>
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-indigo-100 text-center py-8">Semua TP telah tuntas atau belum ada ATP yang dibuat.</p>
                </div>
            )}
        </div>
    );
}