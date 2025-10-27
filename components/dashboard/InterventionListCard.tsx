import React from 'react';
import type { Student, TujuanPembelajaran } from '../../types';
import { Card } from '../Card';
import { AlertTriangleIcon } from '../icons';

interface InterventionListCardProps {
    interventions: { student: Student; tp: TujuanPembelajaran }[];
    onOpenRemedialModal: (student: Student, tp: TujuanPembelajaran) => void;
}

export const InterventionListCard: React.FC<InterventionListCardProps> = ({ interventions, onOpenRemedialModal }) => {
    return (
        <Card className="flex flex-col xl:col-span-1">
            <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                <AlertTriangleIcon className="h-6 w-6 text-orange-500" />
                Daftar Intervensi Lanjutan
            </h3>
            <div className="flex-grow">
                {interventions.length > 0 ? (
                    <div className="space-y-2">
                        <p className="text-sm text-slate-500 mb-2">Siswa berikut belum tuntas pada TP sebelumnya sementara kelas sudah beralih ke TP baru.</p>
                        {interventions.map(({ student, tp }, index) => (
                            <div key={`${student.id}-${tp.id}-${index}`} className="flex justify-between items-center bg-orange-50 p-2 rounded-md border border-orange-200">
                                <div>
                                    <p className="font-bold text-slate-800">{student.nama}</p>
                                    <p className="text-xs text-slate-600">Perlu penguatan pada <strong className="font-semibold">{tp.id}</strong></p>
                                </div>
                                <button
                                    onClick={() => onOpenRemedialModal(student, tp)}
                                    className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-md px-3 py-1.5 transition-colors"
                                >
                                    Input Nilai Remedial
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-lg p-4">
                        <p className="font-semibold text-slate-700">Kerja Bagus!</p>
                        <p className="text-sm text-slate-500 mt-1">Semua siswa telah tuntas pada TP-TP sebelumnya.</p>
                    </div>
                )}
            </div>
        </Card>
    );
};