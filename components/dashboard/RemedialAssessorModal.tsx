import React, { useState, useCallback, useMemo } from 'react';
import type { Student, TujuanPembelajaran } from '../../types';
import { PredicateSelector, FloatingTooltip } from '../formative/AssessmentInputs';
import { XIcon } from '../icons';

interface RemedialAssessorModalProps {
    student: Student;
    tp: TujuanPembelajaran;
    onClose: () => void;
    onSave: (assessments: { aspek: string; level: 1 | 2 | 3 | 4 }[]) => void;
}

export const RemedialAssessorModal: React.FC<RemedialAssessorModalProps> = ({ student, tp, onClose, onSave }) => {
    const [scores, setScores] = useState<Record<string, 1 | 2 | 3 | 4 | 0>>({});
    const [tooltip, setTooltip] = useState<{ content: React.ReactNode; top: number; left: number; widthClass: string; position: 'top' | 'bottom' } | null>(null);

    const historicalScores = useMemo(() => {
        const scoreMap = new Map<string, number>();
        if (!tp.kktp) return scoreMap;

        tp.kktp.rubrik.forEach(aspek => {
            const latestAssessment = student.assessments
                .filter(a => a.tpId === tp.id && a.aspek === aspek.aspek)
                .sort((a, b) => b.pertemuan - a.pertemuan)[0]; // Get the latest one

            if (latestAssessment) {
                scoreMap.set(aspek.aspek, latestAssessment.level);
            }
        });
        return scoreMap;
    }, [student, tp]);


    const handleLevelSelect = (studentId: number, aspek: string, level: 1 | 2 | 3 | 4 | 0) => {
        setScores(prev => ({ ...prev, [aspek]: level }));
    };

    const handleSave = () => {
        const assessmentsToSave = Object.entries(scores)
            .filter(([, level]) => level !== 0)
            .map(([aspek, level]) => ({ aspek, level: level as (1 | 2 | 3 | 4) }));
        
        if (assessmentsToSave.length > 0) {
            onSave(assessmentsToSave);
        }
    };
    
    const handleShowTooltip = useCallback((content: React.ReactNode, rect: DOMRect, widthClass: string) => {
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const tooltipHeight = 120; // Estimate

      let position: 'top' | 'bottom' = 'bottom';
      let top = rect.bottom + 8;

      if (spaceBelow < tooltipHeight && rect.top > tooltipHeight) {
          position = 'top';
          top = rect.top - 8;
      }
      
      setTooltip({ content, top, left: rect.left + rect.width / 2, widthClass, position });
    }, []);

    const handleHideTooltip = useCallback(() => setTooltip(null), []);

    if (!tp.kktp) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-red-700">Error</h3>
                    <p className="text-slate-600 mt-2">KKTP untuk TP ini tidak ditemukan. Tidak dapat melakukan penilaian remedial.</p>
                     <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-semibold">Tutup</button>
                </div>
            </div>
        )
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            {tooltip && <FloatingTooltip content={tooltip.content} top={tooltip.top} left={tooltip.left} position={tooltip.position} widthClass={tooltip.widthClass}/>}
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Asesor Remedial Cepat</h3>
                        <p className="text-sm text-slate-500">
                            Untuk <strong className="font-semibold">{student.nama}</strong> pada <strong className="font-semibold">{tp.id}</strong>
                        </p>
                    </div>
                     <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
                </header>
                <main className="p-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-slate-600 mb-3">{tp.deskripsi}</p>
                    <div className="space-y-2">
                        {tp.kktp.rubrik.map(aspek => (
                             <div key={aspek.aspek} className="p-2 bg-slate-50 rounded-md flex justify-between items-center border border-slate-200">
                                <span className="font-medium text-slate-700 text-sm">{aspek.aspek}</span>
                                <PredicateSelector
                                    studentId={student.id!}
                                    rubrikItem={aspek}
                                    currentLevel={scores[aspek.aspek] || 0}
                                    prefilledLevel={historicalScores.get(aspek.aspek) || 0}
                                    onSelect={handleLevelSelect}
                                    onShowTooltip={handleShowTooltip}
                                    onHideTooltip={handleHideTooltip}
                                />
                             </div>
                        ))}
                    </div>
                </main>
                <footer className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Batal</button>
                    <button
                        onClick={handleSave}
                        disabled={Object.values(scores).every(level => level === 0)}
                        className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 disabled:bg-slate-400"
                    >
                        Simpan Nilai Remedial
                    </button>
                </footer>
            </div>
        </div>
    );
};