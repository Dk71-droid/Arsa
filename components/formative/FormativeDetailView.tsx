import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Student, TujuanPembelajaran, Session, LearningPlan, AspekRubrik, AiSessionResult, FokusAsesmenFormatif } from '../../types';
import { XIcon, WandIcon, ListIcon, NoteIcon, CheckIcon, AlertTriangleIcon, LightbulbIcon, LockIcon } from '../icons';
import { PredicateSelector, FloatingTooltip } from './AssessmentInputs';
import { SessionNoteModal } from './SessionNoteModal';
import { RubricViewerModal } from '../RubricViewerModal';
import { calculateTpCompletion } from './utils';
import { AssessmentFocusGuideModal } from './AssessmentFocusGuideModal';
import { FORMATIVE_LEVEL_INFO } from '../../constants';


type JournalEntry = {
    pertemuan: number;
    tps: TujuanPembelajaran[];
    date: number;
};

interface FormativeDetailViewProps {
    assessingSession: Session;
    setAssessingSession: (session: Session) => void;
    assessingTp: TujuanPembelajaran;
    students: Student[];
    onStudentsChange: (updatedStudents: Student[]) => void;
    onGenerateKktp: (tpId: string) => Promise<void>;
    loadingKktpId: string | null;
    setAssistantModalState: (state: { tp: TujuanPembelajaran | null; mode: 'create' | 'view', sessionForViewMode?: Session }) => void;
    activePlan: LearningPlan | null;
    isDirty: boolean;
    setIsDirty: (isDirty: boolean) => void;
    journalEntries: JournalEntry[];
    isLocked: boolean;
}

export const FormativeDetailView: React.FC<FormativeDetailViewProps> = ({
    assessingSession, setAssessingSession, assessingTp, students, onStudentsChange,
    onGenerateKktp, loadingKktpId, setAssistantModalState, activePlan, isDirty, setIsDirty, journalEntries, isLocked
}) => {
    const [localAssessments, setLocalAssessments] = useState<Map<string, { level: 1 | 2 | 3 | 4 | 0, note?: string }>>(new Map());
    const [tooltip, setTooltip] = useState<{ content: React.ReactNode; top: number; left: number; widthClass: string; position: 'top' | 'bottom' } | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
    
    const [focusGuideState, setFocusGuideState] = useState<{
        isOpen: boolean;
        aspek: AspekRubrik | null;
    }>({ isOpen: false, aspek: null });
    
    const previousAssessments = useMemo(() => {
        const prevMap = new Map<string, { level: 1 | 2 | 3 | 4 | 0 }>();
        if (!assessingSession) return prevMap;

        const previousMeetingsForTp = new Set<number>();
        students.forEach(s => {
            s.assessments.forEach(a => {
                if (a.tpId === assessingSession.tpId && a.pertemuan < assessingSession.pertemuan) {
                    previousMeetingsForTp.add(a.pertemuan);
                }
            });
        });
        
        if (previousMeetingsForTp.size === 0) return prevMap;
        
        const latestPreviousMeeting = Math.max(...Array.from(previousMeetingsForTp));

        students.forEach(student => {
            student.assessments
                .filter(a => a.tpId === assessingSession.tpId && a.pertemuan === latestPreviousMeeting)
                .forEach(a => {
                    prevMap.set(`${student.id}-${a.aspek}`, { level: a.level });
                });
        });

        return prevMap;
    }, [assessingSession, students]);

    useEffect(() => {
        const assessmentMap = new Map<string, { level: 1 | 2 | 3 | 4 | 0, note?: string }>();
        if (assessingSession) {
            students.forEach(student => {
                student.assessments
                    .filter(a => a.tpId === assessingSession.tpId && a.pertemuan === assessingSession.pertemuan)
                    .forEach(a => {
                        assessmentMap.set(`${student.id}-${a.aspek}`, { level: a.level, note: a.catatan });
                    });
            });
        }
        setLocalAssessments(assessmentMap);
        setIsDirty(false);
    }, [assessingSession, students]);

    const handleLevelSelect = (studentId: number, aspek: string, level: 1 | 2 | 3 | 4 | 0) => {
        if (isLocked) return;
        const key = `${studentId}-${aspek}`;
        setLocalAssessments(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(key);
            newMap.set(key, Object.assign({}, existing, { level }));
            return newMap;
        });
        setIsDirty(true);
    };

    const handleBulkFill = (aspek: string, level: 1 | 2 | 3 | 4) => {
        if (isLocked) return;
        setLocalAssessments(prev => {
            const newAssessments = new Map(prev);
            students.forEach(student => {
                const key = `${student.id}-${aspek}`;
                const existing = newAssessments.get(key);
                newAssessments.set(key, Object.assign({}, existing, { level }));
            });
            return newAssessments;
        });
        setIsDirty(true);
    };

    const handleSave = () => {
        if (!assessingSession || isLocked) return;
        const { tpId, pertemuan } = assessingSession;
        const timestamp = Date.now();

        const updatedStudents = students.map(student => {
            let studentAssessments = [...(student.assessments || [])];
            let hasChanged = false;

            assessingTp.kktp?.rubrik.forEach(aspek => {
                const key = `${student.id}-${aspek.aspek}`;
                const localData = localAssessments.get(key);
                const existingIndex = studentAssessments.findIndex(a => a.tpId === tpId && a.pertemuan === pertemuan && a.aspek === aspek.aspek);

                if (localData && localData.level > 0) { // Add or update
                    const newAssessment = { tpId, aspek: aspek.aspek, level: localData.level as 1|2|3|4, timestamp, pertemuan, catatan: localData.note };
                    if (existingIndex > -1) {
                         if(JSON.stringify(studentAssessments[existingIndex]) !== JSON.stringify(newAssessment)) {
                           studentAssessments[existingIndex] = newAssessment;
                           hasChanged = true;
                        }
                    } else {
                        studentAssessments.push(newAssessment);
                        hasChanged = true;
                    }
                } else if (existingIndex > -1) { // Delete
                    studentAssessments.splice(existingIndex, 1);
                    hasChanged = true;
                }
            });

            return hasChanged ? Object.assign({}, student, { assessments: studentAssessments }) : student;
        });
        
        onStudentsChange(updatedStudents);
        setIsDirty(false);
    };
    
    const handleSaveNotes = (results: AiSessionResult[]) => {
        if (!assessingSession || isLocked) return;
        const { tpId, pertemuan } = assessingSession;
        const timestamp = Date.now();

        const updatedStudents = students.map(student => {
            const resultForStudent = results.find(r => r.studentId === student.id);
            if (!resultForStudent) return student;

            const studentAssessments = [...(student.assessments || [])];
            const studentDplObservations = (student.dplObservations || []).filter(obs => !(obs.tpId === tpId && obs.pertemuan === pertemuan));
            
            let hasChanged = false;

            if(resultForStudent.catatanUmum) {
                 const generalNoteAspect = 'Catatan Umum';
                 const noteIndex = studentAssessments.findIndex(a => a.tpId === tpId && a.pertemuan === pertemuan && a.aspek === generalNoteAspect);
                 const newNoteAssessment = { tpId, aspek: generalNoteAspect, level: 0 as 0, timestamp, pertemuan, catatan: resultForStudent.catatanUmum };
                 if (noteIndex > -1) studentAssessments[noteIndex] = newNoteAssessment;
                 else studentAssessments.push(newNoteAssessment);
                 hasChanged = true;
            }

            if (resultForStudent.observasiDpl) {
                resultForStudent.observasiDpl.forEach(obs => {
                    studentDplObservations.push({ ...obs, timestamp, tpId, aspek: 'DPL Observation', pertemuan });
                });
                hasChanged = true;
            }
            
            return hasChanged ? Object.assign({}, student, { assessments: studentAssessments, dplObservations: studentDplObservations }) : student;
        });

        onStudentsChange(updatedStudents);
    };
    
    const handleShowTooltip = useCallback((content: React.ReactNode, rect: DOMRect, widthClass: string) => {
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const tooltipHeight = 120; // Estimate a bit more for potentially longer text

        let position: 'top' | 'bottom' = 'bottom';
        let top = rect.bottom + 8;

        if (spaceBelow < tooltipHeight && rect.top > tooltipHeight) {
            position = 'top';
            top = rect.top - 8;
        }
        
        setTooltip({ content, top, left: rect.left + rect.width / 2, widthClass, position });
    }, []);

    const handleHideTooltip = useCallback(() => setTooltip(null), []);

    const planForSession = useMemo(() => {
        if (!assessingSession) return null;
        const { pertemuan } = assessingSession;
        return (
            assessingTp.diagnosticData?.plan?.pertemuanKe === pertemuan ? assessingTp.diagnosticData.plan :
            assessingTp.adaptiveSteps?.find(s => s.nextPlan?.pertemuanKe === pertemuan)?.nextPlan ||
            null
        );
    }, [assessingSession, assessingTp]);

    const focusGroupsForSession = useMemo(() => {
        if (!planForSession || !planForSession.asesmenFormatifKunci) return [];
        return planForSession.asesmenFormatifKunci.fokusPenilaian;
    }, [planForSession]);

    const focusGroupsForSelectedAspect = useMemo(() => {
        if (!focusGuideState.aspek) return [];
        return focusGroupsForSession.map(group => {
            const relevantFokus = group.fokusPenilaian.filter(f => f.aspek === focusGuideState.aspek!.aspek);
            if (relevantFokus.length > 0) {
                return { ...group, fokusPenilaian: relevantFokus };
            }
            return null;
        }).filter((g): g is FokusAsesmenFormatif => g !== null);
    }, [focusGuideState.aspek, focusGroupsForSession]);

    const handleShowFocusGuide = (aspek: AspekRubrik) => {
        setFocusGuideState({ isOpen: true, aspek });
    };

    if (!assessingSession || !assessingTp) return null;

    if (!assessingTp.kktp) {
        return (
             <div className="text-center p-8">
                 <h3 className="font-bold text-slate-700 text-lg">Rubrik KKTP Dibutuhkan</h3>
                 <p className="text-slate-600 mt-2 max-w-md mx-auto">Untuk memulai asesmen, AI perlu rubrik penilaian (KKTP) untuk <strong>{assessingTp.id}</strong>.</p>
                 <button
                     onClick={() => onGenerateKktp(assessingTp.id)}
                     disabled={loadingKktpId === assessingTp.id}
                     className="mt-6 flex items-center justify-center gap-2 bg-teal-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-teal-700 transition-all disabled:bg-slate-400 mx-auto"
                 >
                     <WandIcon className="h-5 w-5" />
                     {loadingKktpId === assessingTp.id ? 'Membuat...' : 'Buat Rubrik KKTP dengan AI'}
                 </button>
                 <button onClick={() => setAssessingSession(null)} className="mt-4 text-sm text-slate-600 hover:text-slate-800">Kembali</button>
             </div>
        );
    }
    
    const { tuntasCount } = calculateTpCompletion(assessingTp, students);
    const completionPercentage = students.length > 0 ? (tuntasCount / students.length) * 100 : 0;
    
    return (
        <div className="h-full flex flex-col">
            {tooltip && <FloatingTooltip content={tooltip.content} top={tooltip.top} left={tooltip.left} widthClass={tooltip.widthClass} position={tooltip.position} />}
            
            <AssessmentFocusGuideModal
                isOpen={focusGuideState.isOpen}
                onClose={() => setFocusGuideState({ isOpen: false, aspek: null })}
                focusGroups={focusGroupsForSelectedAspect}
                aspectName={focusGuideState.aspek?.aspek}
                pertemuan={assessingSession.pertemuan}
            />

            <header className="flex-shrink-0 p-4 border-b border-slate-200 space-y-3">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Asesor Formatif (Pertemuan ke-{assessingSession.pertemuan})</h2>
                        <p className="text-sm text-slate-500 mt-1">TP: <span className="font-semibold">{assessingTp.id}</span> - {assessingTp.deskripsi}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setAssessingSession(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" aria-label="Tutup"><XIcon className="h-6 w-6" /></button>
                    </div>
                </div>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                         <button onClick={() => setIsRubricModalOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded-md px-3 py-1.5 hover:bg-teal-100">
                           <ListIcon className="h-4 w-4" /> Lihat Rincian Rubrik
                         </button>
                         <button onClick={() => setIsNoteModalOpen(true)} disabled={isLocked} className="flex items-center gap-2 text-sm font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded-md px-3 py-1.5 hover:bg-teal-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                           <NoteIcon className="h-4 w-4" /> Catatan Sesi (AI)
                         </button>
                    </div>
                     <div className="flex items-center gap-2 self-end sm:self-center">
                         {isDirty && !isLocked && <span className="text-sm font-semibold text-yellow-600 flex items-center gap-1.5"><AlertTriangleIcon className="h-4 w-4" /> Perubahan belum disimpan</span>}
                         <button onClick={handleSave} disabled={!isDirty || isLocked} className="flex items-center gap-2 text-sm font-semibold rounded-md px-4 py-2 transition-colors bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                             <CheckIcon className="h-4 w-4" /> Simpan Perubahan
                         </button>
                     </div>
                 </div>
            </header>

            {isLocked && (
                <div className="p-3 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm flex items-center gap-3 flex-shrink-0">
                    <LockIcon className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold">Mode Lihat Saja</p>
                        <p>Pertemuan ini terkunci dan tidak dapat diubah karena sudah ada pertemuan yang lebih baru.</p>
                    </div>
                </div>
            )}

            <main className="flex-grow overflow-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-100 sticky top-0 z-20">
                        <tr>
                            <th className="p-3 font-semibold text-slate-600 border-b border-r border-slate-200 sticky left-0 bg-slate-100 z-30 w-48">Nama Siswa</th>
                            {assessingTp.kktp.rubrik.map(aspek => {
                                const hasFocusDataForAspek = focusGroupsForSession.some(group => group.fokusPenilaian.some(f => f.aspek === aspek.aspek));
                                return (
                                <th key={aspek.aspek} className="p-2 font-semibold text-slate-600 border-b border-slate-200 text-center min-w-[200px]">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>{aspek.aspek}</span>
                                        {hasFocusDataForAspek && (
                                            <button 
                                                onClick={() => handleShowFocusGuide(aspek)}
                                                className="text-yellow-400 hover:text-yellow-500 p-1 rounded-full hover:bg-yellow-100 transition-transform hover:scale-110"
                                                title={`Lihat panduan fokus AI untuk aspek '${aspek.aspek}'`}
                                            >
                                                <LightbulbIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                    {aspek.sifatAspek === 'PRASYARAT_KRITIS' && (
                                        <span className="mt-1 inline-block px-1.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">Prasyarat</span>
                                    )}
                                    <div className="flex items-center justify-center gap-1 mt-1.5">
                                        {[4, 3, 2, 1].map(level => {
                                            const levelInfo = FORMATIVE_LEVEL_INFO[level as 1 | 2 | 3 | 4];
                                            const kriteriaDeskripsi = aspek.kriteria.find(k => k.level === level)?.deskripsi || 'Deskripsi tidak ditemukan.';
                                            const tooltipContent = (
                                                <>
                                                    <h5 className="font-bold text-teal-300 text-sm mb-1">{levelInfo.label} (Level {level})</h5>
                                                    <p className="text-slate-200">{kriteriaDeskripsi}</p>
                                                </>
                                            );
                                            return (
                                                <button
                                                    key={level}
                                                    onClick={() => handleBulkFill(aspek.aspek, level as 1 | 2 | 3 | 4)}
                                                    onMouseEnter={(e) => handleShowTooltip(tooltipContent, e.currentTarget.getBoundingClientRect(), 'w-64')}
                                                    onMouseLeave={handleHideTooltip}
                                                    disabled={isLocked}
                                                    className="w-6 h-6 flex items-center justify-center font-bold text-xs rounded-md transition-all border bg-slate-200 text-slate-600 hover:bg-teal-500 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                >
                                                    {levelInfo.predicate}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </th>
                            )})}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => (
                            <tr key={student.id} className="group hover:bg-slate-50">
                                <td className="p-2 border-b border-r border-slate-200 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{student.nama}</td>
                                {assessingTp.kktp.rubrik.map(aspek => {
                                    const prefilledData = previousAssessments.get(`${student.id}-${aspek.aspek}`);
                                    const prefilledLevel = prefilledData ? prefilledData.level : 0;
                                    return (
                                    <td key={aspek.aspek} className="p-1 border-b border-slate-200 text-center align-middle">
                                        <PredicateSelector 
                                            studentId={student.id}
                                            rubrikItem={aspek}
                                            currentLevel={localAssessments.get(`${student.id}-${aspek.aspek}`)?.level || 0}
                                            prefilledLevel={prefilledLevel}
                                            onSelect={handleLevelSelect}
                                            onShowTooltip={handleShowTooltip}
                                            onHideTooltip={handleHideTooltip}
                                            disabled={isLocked}
                                        />
                                    </td>
                                )})}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
            <footer className="flex-shrink-0 p-3 bg-slate-50 border-t flex items-center gap-4">
                 <p className="text-sm font-semibold text-slate-600">Ringkasan Ketuntasan Kelas:</p>
                 <div className="w-40 bg-slate-200 rounded-full h-2.5">
                     <div className="bg-teal-600 h-2.5 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
                 </div>
                 <p className="text-sm font-bold text-teal-700">{completionPercentage.toFixed(0)}% Tuntas</p>
                 <span className="text-xs text-slate-500">({tuntasCount} dari {students.length} siswa)</span>
            </footer>

            {isNoteModalOpen && (
                <SessionNoteModal
                    tp={assessingTp}
                    students={students}
                    pertemuan={assessingSession.pertemuan}
                    onSave={handleSaveNotes}
                    onClose={() => setIsNoteModalOpen(false)}
                />
            )}
            {isRubricModalOpen && <RubricViewerModal tp={assessingTp} onClose={() => setIsRubricModalOpen(false)} />}
        </div>
    );
};
