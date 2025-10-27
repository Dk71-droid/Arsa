import React, { useMemo } from 'react';
import type { Student, TujuanPembelajaran } from '../../types';
import { Card } from '../Card';
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
        <Card className="flex flex-col xl:col-span-1">
            <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                <TargetIcon className="h-6 w-6 text-indigo-600" />
                Fokus Saat Ini
            </h3>
            {tp ? (
                <div className="space-y-4 flex flex-col flex-grow">
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-sm font-semibold text-indigo-800">{tp.id}</p>
                        <p className="text-slate-700 mt-1">{tp.deskripsi}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative h-20 w-20">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path className="text-slate-200" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="text-indigo-500" strokeWidth="3" fill="none" strokeDasharray={`${completionPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-indigo-600">{completionPercentage.toFixed(0)}<span className="text-base">%</span></span>
                            </div>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">Ketuntasan Formatif</p>
                            <p className="text-sm text-slate-500">{status.tuntasCount} dari {status.totalStudents} siswa tuntas</p>
                        </div>
                    </div>
                    <button onClick={onNavigate} className="w-full mt-auto bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
                        {buttonText}
                    </button>
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-slate-500 text-center py-8">Semua TP telah tuntas atau belum ada ATP yang dibuat.</p>
                </div>
            )}
        </Card>
    );
}