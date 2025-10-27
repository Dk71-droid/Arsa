import React, { useMemo } from 'react';
import type { Student, TujuanPembelajaran, AspekRubrik } from '../types';
import { FORMATIVE_LEVEL_INFO } from '../constants';

interface FormativeAnalysisViewProps {
    students: Student[];
    tujuanPembelajaran: TujuanPembelajaran[];
    selectedTpId: string;
}

export const FormativeAnalysisView: React.FC<FormativeAnalysisViewProps> = ({ students, tujuanPembelajaran, selectedTpId }) => {
  
  const selectedTp = useMemo(() => tujuanPembelajaran.find(tp => tp.id === selectedTpId), [tujuanPembelajaran, selectedTpId]);
  const allAspects = useMemo(() => selectedTp?.kktp?.rubrik || [], [selectedTp]);

  const classSummary = useMemo(() => {
    return allAspects.map(aspek => {
        if (students.length === 0) {
            return {
                aspek: aspek.aspek,
                notTuntasPercentage: 0
            };
        }
        const assessmentsForAspek = students.map(s => s.assessments.find(a => a.tpId === selectedTpId && a.aspek === aspek.aspek)).filter(Boolean);
        const notTuntasCount = assessmentsForAspek.filter(a => a!.level < 3).length;
        const assessedCount = assessmentsForAspek.length;
        const unassessedCount = students.length - assessedCount;

        return {
            aspek: aspek.aspek,
            notTuntasPercentage: ((notTuntasCount + unassessedCount) / students.length) * 100
        };
    });
  }, [students, selectedTpId, allAspects]);


  if (allAspects.length === 0) {
    return (
        <div className="text-center p-4 text-slate-500">
            <p>KKTP untuk TP ini belum dibuat. Buat KKTP untuk memulai analisis.</p>
        </div>
    )
  }

  return (
    <table className="min-w-full text-sm text-left bg-white border-collapse">
        <thead className="bg-slate-100 sticky top-0 z-20">
            <tr>
                <th className="p-3 font-semibold text-slate-600 border-b border-r border-slate-200 sticky left-0 bg-slate-100 z-30 w-48">Nama Siswa</th>
                {allAspects.map(aspek => (
                    <th key={aspek.aspek} className="p-3 font-semibold text-slate-600 border-b border-slate-200 text-center min-w-[120px]">
                        {aspek.aspek}
                        {aspek.sifatAspek === 'PRASYARAT_KRITIS' && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">Prasyarat</span>
                        )}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody>
            {students.map(student => {
                const assessmentsForTp = student.assessments.filter(a => a.tpId === selectedTpId);
                return (
                    <tr key={student.id} className="group hover:bg-slate-50">
                        <td className="p-2 border-b border-r border-slate-200 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{student.nama}</td>
                        {allAspects.map(aspek => {
                            const assessment = assessmentsForTp.find(a => a.aspek === aspek.aspek);
                            const levelInfo = assessment ? FORMATIVE_LEVEL_INFO[assessment.level] : null;
                            return (
                                <td key={aspek.aspek} className="p-1 border-b border-slate-200 text-center align-middle">
                                    {levelInfo ? (
                                        <span className={`inline-block w-20 text-center px-2 py-1 text-xs font-bold rounded ${levelInfo.color}`}>
                                            {levelInfo.label}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                );
            })}
        </tbody>
        <tfoot className="bg-slate-50 border-t-2 border-slate-300 sticky bottom-0 z-20">
            <tr>
                <td className="p-3 border-r border-slate-200 font-bold text-slate-700 sticky left-0 bg-slate-50 z-30">Ringkasan Kelas</td>
                {classSummary.map(summary => (
                    <td key={summary.aspek} className="p-2 border-b border-slate-200 text-center">
                        <div className="text-xs text-slate-600">% Belum Tuntas</div>
                        <div className="font-bold text-lg text-red-600">{summary.notTuntasPercentage.toFixed(0)}%</div>
                    </td>
                ))}
            </tr>
        </tfoot>
    </table>
  );
};