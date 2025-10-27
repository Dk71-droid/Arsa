import React from 'react';
import type { Student, TujuanPembelajaran } from '../../types';
import { Card } from '../Card';
import { AlertTriangleIcon } from '../icons';

export const AttentionCard: React.FC<{
    strugglingStudents: { student: Student; struggleScore: number }[];
    challengingTps: { tp: TujuanPembelajaran; completionRate: number }[];
}> = ({ strugglingStudents, challengingTps }) => {

    return (
        <Card className="flex flex-col xl:col-span-1">
            <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                <AlertTriangleIcon className="h-6 w-6 text-amber-500" />
                Perlu Perhatian
            </h3>
            <div className="flex-grow flex flex-col gap-6">
                <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Siswa Paling Tertinggal</h4>
                    {strugglingStudents.length > 0 ? (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
                            {strugglingStudents.map(({ student, struggleScore }) => (
                                <div key={student.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                    <span className="font-medium text-slate-700">{student.nama}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-red-600">Belum tuntas di {struggleScore} TP</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-slate-500">Tidak ada siswa yang teridentifikasi butuh perhatian khusus saat ini. Kerja bagus!</p>}
                </div>
                 <div>
                    <h4 className="font-semibold text-slate-800 mb-2">TP Paling Menantang</h4>
                    {challengingTps.length > 0 ? (
                        <div className="space-y-2">
                            {challengingTps.map(({ tp, completionRate }) => (
                                <div key={tp.id} className="bg-slate-50 p-2 rounded-md">
                                    <p className="font-medium text-slate-700 text-sm">{tp.id}: {tp.deskripsi}</p>
                                    <p className="text-xs text-red-600 font-semibold mt-1">Hanya {(completionRate*100).toFixed(0)}% siswa yang sudah tuntas</p>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-slate-500">Semua TP yang telah dinilai telah tuntas oleh semua siswa.</p>}
                </div>
            </div>
        </Card>
    );
};