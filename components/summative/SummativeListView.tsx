import React, { useCallback } from 'react';
import type { Student, TujuanPembelajaran, SummativePackage } from '../../types';
import { Card } from '../Card';
import { PlusIcon, TrashIcon, WandIcon, DocumentReportIcon } from '../icons';
import { useAppData } from '../../hooks/useAppData';

const MINIMUM_PASSING_SCORE = 70;

interface SummativeListViewProps {
    packages: SummativePackage[];
    students: Student[];
    allTps: TujuanPembelajaran[];
    onSelectPackage: (packageId: string) => void;
    onCreatePackage: () => void;
    onDeletePackage: (packageId: string) => void;
    onGenerateInstrument: (pkg: SummativePackage) => void;
}

export const SummativeListView: React.FC<SummativeListViewProps> = ({
    packages,
    students,
    allTps,
    onSelectPackage,
    onCreatePackage,
    onDeletePackage,
    onGenerateInstrument
}) => {
    const { isOnline } = useAppData();
    const calculatePackageCompletion = useCallback((pkg: SummativePackage) => {
        const tpsInPackage = allTps.filter(tp => pkg.tpIds.includes(tp.id));
        const totalAspects = tpsInPackage.reduce((acc, tp) => acc + (tp.kktp?.rubrik.length || 0), 0);

        if (students.length === 0 || totalAspects === 0) {
            return { tuntasCount: 0, totalStudents: students.length, completionPercentage: 0 };
        }

        let tuntasCount = 0;
        students.forEach(student => {
            const allScoresForPackage = student.summativeAssessments.filter(sa => pkg.tpIds.includes(sa.tpId));
            
            // To be "tuntas", a student must have a passing score for EVERY aspect of EVERY TP in the package.
            let studentIsTuntas = true;
            for (const tp of tpsInPackage) {
                if (!tp.kktp) continue;
                for (const aspek of tp.kktp.rubrik) {
                    const score = allScoresForPackage.find(s => s.tpId === tp.id && s.aspek === aspek.aspek)?.score;
                    if (score === undefined || score < MINIMUM_PASSING_SCORE) {
                        studentIsTuntas = false;
                        break;
                    }
                }
                if (!studentIsTuntas) break;
            }

            if (studentIsTuntas) {
                tuntasCount++;
            }
        });

        return {
            tuntasCount,
            totalStudents: students.length,
            completionPercentage: students.length > 0 ? (tuntasCount / students.length) * 100 : 0,
        };
    }, [students, allTps]);

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-slate-800">Asesor Sumatif</h2>
                        <p className="text-slate-600 mt-1">Buat paket asesmen sumatif yang fleksibel atau input nilai pada paket yang sudah ada.</p>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch gap-2">
                        <button
                            onClick={onCreatePackage}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 font-semibold text-white bg-indigo-600 border border-indigo-600 rounded-md px-4 py-2.5 hover:bg-indigo-700 transition-colors shadow-lg text-base"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>Buat Sumatif Baru</span>
                        </button>
                    </div>
                </div>
            </Card>

            <div className="space-y-4">
                {packages.map(pkg => {
                    const { tuntasCount, totalStudents, completionPercentage } = calculatePackageCompletion(pkg);
                    return (
                        <Card key={pkg.id} className="p-0 overflow-hidden transition-all hover:shadow-lg hover:border-indigo-300 group">
                            <div className="flex flex-col md:flex-row relative">
                                <div className="p-4 bg-slate-50 md:w-48 flex-shrink-0 text-center md:text-left border-b md:border-b-0 md:border-r border-slate-200">
                                    <h3 className="text-lg font-bold text-indigo-700 truncate">{pkg.name}</h3>
                                    <div className="mt-2">
                                        <div className="w-full bg-slate-200 rounded-full h-2.5" title={`${completionPercentage.toFixed(0)}% Tuntas`}>
                                            <div className={`h-2.5 rounded-full transition-all duration-500 ${completionPercentage > 85 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${completionPercentage}%` }}></div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{tuntasCount} / {totalStudents} Siswa Tuntas</p>
                                    </div>
                                </div>
                                <div className="p-4 flex-grow flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-grow">
                                        <h4 className="font-semibold text-slate-700 text-sm">Mencakup TP:</h4>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {pkg.tpIds.map(tpId => (
                                                <span key={tpId} className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-700">
                                                    {tpId}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="w-full md:w-auto flex items-stretch gap-2 self-start flex-shrink-0">
                                        <button
                                            onClick={() => onSelectPackage(pkg.id)}
                                            className="flex-grow text-sm font-bold px-4 py-2 rounded-md transition-colors bg-white text-indigo-700 border border-indigo-500 hover:bg-indigo-50 shadow-sm"
                                        >
                                            Input/Lihat Nilai
                                        </button>
                                         <button
                                            onClick={() => onGenerateInstrument(pkg)}
                                            disabled={!isOnline}
                                            title={isOnline ? "Buat instrumen asesmen dengan AI" : "Fitur AI memerlukan koneksi internet"}
                                            className="text-sm font-bold px-4 py-2 rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform hover:-translate-y-px flex items-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                        >
                                            <WandIcon className="h-4 w-4" />
                                            <span>Generate Instrumen (AI)</span>
                                        </button>
                                    </div>
                                </div>
                                 <button
                                    onClick={(e) => { e.stopPropagation(); onDeletePackage(pkg.id); }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Hapus Paket"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </Card>
                    );
                })}
                {packages.length === 0 && (
                    <div className="text-center p-8 text-slate-500">
                        <p>Belum ada paket sumatif yang dibuat. Mulai dengan membuat yang baru.</p>
                    </div>
                )}
            </div>
        </div>
    );
};