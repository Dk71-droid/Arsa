import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Student, TujuanPembelajaran, SummativePackage } from '../../types';
import { ScoreInput, LevelInput } from './SummativeInputs';
import { Card } from '../Card';
import { AlertTriangleIcon, CheckIcon, RefreshIcon } from '../icons';
import { FloatingTooltip } from '../formative/AssessmentInputs';
import { FORMATIVE_LEVEL_INFO } from '../../constants';


interface SummativeDetailViewProps {
    pkg: SummativePackage;
    students: Student[];
    allTps: TujuanPembelajaran[];
    onBack: () => void;
    onSave: (allStudentScores: { studentId: number; tpId: string; aspek: string; score: number | null }[]) => void;
}

export const SummativeDetailView: React.FC<SummativeDetailViewProps> = ({
    pkg, students, allTps, onBack, onSave
}) => {
    const [scores, setScores] = useState<Record<string, number | null>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [inputModes, setInputModes] = useState<Record<string, 'score' | 'level'>>({});
    const [tooltip, setTooltip] = useState<{ content: React.ReactNode; top: number; left: number; position: 'top' | 'bottom', widthClass?: string } | null>(null);


    const tpsInPackage = useMemo(() => {
        return allTps.filter(tp => pkg.tpIds.includes(tp.id));
    }, [allTps, pkg]);

    const allAspects = useMemo(() => {
        return tpsInPackage.flatMap(tp => 
            (tp.kktp?.rubrik || []).map(aspek => ({
                tpId: tp.id,
                aspek: aspek.aspek
            }))
        );
    }, [tpsInPackage]);
    
    const hasMissingKktp = useMemo(() => {
        return pkg.tpIds.some(tpId => {
            const tp = allTps.find(t => t.id === tpId);
            return !tp || !tp.kktp || tp.kktp.rubrik.length === 0;
        });
    }, [pkg.tpIds, allTps]);

    useEffect(() => {
        const initialScores: Record<string, number | null> = {};
        students.forEach(student => {
            allAspects.forEach(({ tpId, aspek }) => {
                const key = `${student.id}|${tpId}|${aspek}`;
                const savedScore = student.summativeAssessments.find(sa => sa.tpId === tpId && sa.aspek === aspek)?.score;
                initialScores[key] = savedScore ?? null;
            });
        });
        setScores(initialScores);
        setIsDirty(false);
    }, [students, allAspects, pkg]);

    const handleScoreChange = (studentId: number, tpId: string, aspek: string, score: number | null) => {
        setScores(prev => ({
            ...prev,
            [`${studentId}|${tpId}|${aspek}`]: score
        }));
        setIsDirty(true);
    };

    const handleSave = () => {
        const scoresToSave = Object.entries(scores).map(([key, score]) => {
            const [studentIdStr, tpId, ...aspekParts] = key.split('|');
            const aspek = aspekParts.join('|');
            return { studentId: parseInt(studentIdStr, 10), tpId, aspek, score };
        });
        onSave(scoresToSave);
        setIsDirty(false);
    };
    
    const toggleInputMode = (tpId: string, aspek: string) => {
        const key = `${tpId}|${aspek}`;
        setInputModes(prev => ({
            ...prev,
            [key]: prev[key] === 'level' ? 'score' : 'level'
        }));
    };
    
    const handleBulkFill = (tpId: string, aspek: string, score: number) => {
        const newScores = { ...scores };
        students.forEach(student => {
            const key = `${student.id}|${tpId}|${aspek}`;
            newScores[key] = score;
        });
        setScores(newScores);
        setIsDirty(true);
    };

    const handleShowTooltip = useCallback((content: React.ReactNode, rect: DOMRect, widthClass: string = 'w-64') => {
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const tooltipHeight = 100; // Estimated height for decision making
        
        let position: 'top' | 'bottom' = 'bottom';
        let top = rect.bottom + 8;

        if (spaceBelow < tooltipHeight && rect.top > tooltipHeight) {
            position = 'top';
            top = rect.top - 8;
        }

        setTooltip({ content, top, left: rect.left + rect.width / 2, position, widthClass });
    }, []);

    const handleHideTooltip = useCallback(() => setTooltip(null), []);

    if (hasMissingKktp) {
        return (
            <Card>
                <div className="text-center p-4">
                    <AlertTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto" />
                    <h3 className="text-xl font-bold text-slate-800 mt-4">KKTP Tidak Lengkap</h3>
                    <p className="text-slate-600 mt-2">
                        Satu atau lebih TP dalam paket ini belum memiliki Rubrik KKTP. Harap lengkapi KKTP di menu 'Rancangan Pembelajaran' untuk dapat melakukan penilaian.
                    </p>
                    <button onClick={onBack} className="mt-6 px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">
                        Kembali
                    </button>
                </div>
            </Card>
        );
    }

    return (
        <>
            {tooltip && <FloatingTooltip content={tooltip.content} top={tooltip.top} left={tooltip.left} position={tooltip.position} widthClass={tooltip.widthClass} />}
            <div className="space-y-4">
                 <div className="flex justify-between items-center">
                     <div>
                        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 mb-2">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 18l-6-6 6-6"/></svg>
                           Kembali ke Daftar Sumatif
                       </button>
                        <h2 className="text-2xl font-bold text-slate-800">{pkg.name}</h2>
                     </div>
                      <div className="flex items-center gap-2">
                          {isDirty && <span className="text-sm font-semibold text-yellow-600 flex items-center gap-1.5"><AlertTriangleIcon className="h-4 w-4" /> Perubahan belum disimpan</span>}
                          <button onClick={handleSave} disabled={!isDirty} className="flex items-center gap-2 font-semibold text-white bg-indigo-600 rounded-md px-4 py-2.5 hover:bg-indigo-700 transition-colors disabled:bg-slate-400">
                              <CheckIcon className="h-5 w-5" />
                              Simpan Nilai
                          </button>
                      </div>
                 </div>
                 
                 <div className="overflow-x-auto border rounded-lg">
                     <table className="min-w-full text-sm text-left bg-white border-collapse">
                         <thead className="bg-slate-100 sticky top-0 z-20">
                             <tr>
                                 <th className="p-3 font-semibold text-slate-600 border-b border-r border-slate-200 sticky left-0 bg-slate-100 z-30 w-48">Nama Siswa</th>
                                 {allAspects.map(({ tpId, aspek }) => {
                                      const key = `${tpId}|${aspek}`;
                                      const mode = inputModes[key] || 'score';
                                      const tp = tpsInPackage.find(t => t.id === tpId);
                                      const rubrikItem = tp?.kktp?.rubrik.find(r => r.aspek === aspek);
                                     return (
                                     <th key={`${tpId}-${aspek}`} className="p-2 font-semibold text-slate-600 border-b border-slate-200 text-center min-w-[150px]">
                                         <div className="flex items-center justify-center gap-2">
                                            <div>
                                                <div>{aspek}</div>
                                                <div className="text-xs font-normal text-slate-500">({tpId})</div>
                                            </div>
                                            <button
                                                onClick={() => toggleInputMode(tpId, aspek)}
                                                className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                                                title="Ubah mode input"
                                            >
                                                <RefreshIcon className="h-4 w-4" />
                                            </button>
                                         </div>
                                         {mode === 'level' && (
                                            <div className="flex items-center justify-center gap-1 mt-1.5">
                                                {[4, 3, 2, 1].map(level => {
                                                    const levelInfo = FORMATIVE_LEVEL_INFO[level as 1 | 2 | 3 | 4];
                                                    const kriteriaDeskripsi = rubrikItem?.kriteria.find(k => k.level === level)?.deskripsi || 'Deskripsi tidak ditemukan.';
                                                    const tooltipContent = (
                                                        <>
                                                            <h5 className="font-bold text-indigo-300 text-sm mb-1">{levelInfo.label} (Level {level})</h5>
                                                            <p className="text-slate-200">{kriteriaDeskripsi}</p>
                                                        </>
                                                    );
                                                    return (
                                                        <button
                                                            key={level}
                                                            onClick={() => handleBulkFill(tpId, aspek, levelInfo.score)}
                                                            onMouseEnter={(e) => handleShowTooltip(tooltipContent, e.currentTarget.getBoundingClientRect(), 'w-64')}
                                                            onMouseLeave={handleHideTooltip}
                                                            className="w-6 h-6 flex items-center justify-center font-bold text-xs rounded-md transition-all border bg-slate-200 text-slate-600 hover:bg-indigo-500 hover:text-white"
                                                        >
                                                            {levelInfo.predicate}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                     </th>
                                 )})}
                             </tr>
                         </thead>
                         <tbody>
                             {students.map(student => (
                                 <tr key={student.id} className="group hover:bg-slate-50">
                                     <td className="p-2 border-b border-r border-slate-200 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{student.nama}</td>
                                     {allAspects.map(({ tpId, aspek }) => {
                                         const key = `${student.id}|${tpId}|${aspek}`;
                                         const mode = inputModes[`${tpId}|${aspek}`] || 'score';
                                         const tp = tpsInPackage.find(t => t.id === tpId);
                                         const rubrikItem = tp?.kktp?.rubrik.find(r => r.aspek === aspek);
                                         
                                         return (
                                             <td key={key} className="p-1 border-b border-slate-200 text-center align-middle">
                                                 {mode === 'level' ? (
                                                    <LevelInput
                                                        value={scores[key]}
                                                        onChange={(score) => handleScoreChange(student.id, tpId, aspek, score)}
                                                        kriteria={rubrikItem?.kriteria}
                                                        onShowTooltip={handleShowTooltip}
                                                        onHideTooltip={handleHideTooltip}
                                                    />
                                                 ) : (
                                                    <ScoreInput 
                                                        value={scores[key]}
                                                        onChange={(score) => handleScoreChange(student.id, tpId, aspek, score)}
                                                    />
                                                 )}
                                             </td>
                                         );
                                     })}
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
            </div>
        </>
    );
};