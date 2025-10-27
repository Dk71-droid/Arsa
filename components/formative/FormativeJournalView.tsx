import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Student, TujuanPembelajaran, Session, AlurTujuanPembelajaran, UnitPembelajaran } from '../../types';
import { PlusIcon, CalendarIcon, LockIcon, AlertTriangleIcon, TrashIcon, XIcon, LightbulbIcon, WandIcon, EyeIcon, CheckIconSolid, ChevronDownIcon, ChevronUpIcon, EllipsisVerticalIcon, DocumentReportIcon } from '../icons';
import { Card } from '../Card';
import { calculateTpCompletion, findLingeringWeakness } from './utils';
import { useAppData } from '../../hooks/useAppData';
import { QuickSyncModal } from './QuickSyncModal';

type JournalEntry = {
    pertemuan: number;
    tps: TujuanPembelajaran[];
    date: number;
};

const AssistantButton: React.FC<{
    tp: TujuanPembelajaran;
    pertemuan: number;
    journalEntries: JournalEntry[];
    onClick: (mode: 'create' | 'view') => void;
}> = ({ tp, pertemuan, journalEntries, onClick }) => {
    const hasSavedDiagnosticResults = !!tp.diagnosticData?.summary;
    const hasGeneratedPlan = hasSavedDiagnosticResults && !!tp.diagnosticData.plan;

    const planExistsForThisMeeting = hasGeneratedPlan && (
        (tp.diagnosticData!.plan!.pertemuanKe === pertemuan) || 
        (tp.adaptiveSteps?.some(step => step.nextPlan?.pertemuanKe === pertemuan))
    );

    if (planExistsForThisMeeting) {
        return (
            <button
                onClick={() => onClick('view')}
                className="text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 px-4 py-2 rounded-md transition-colors hover:bg-slate-200 flex items-center gap-2"
            >
                <EyeIcon className="h-4 w-4" />
                Lihat RPP
            </button>
        );
    }

    if (hasSavedDiagnosticResults && !hasGeneratedPlan) {
        return (
            <button
                onClick={() => onClick('create')}
                className="text-sm font-semibold text-white bg-blue-600 px-4 py-2 rounded-md transition-colors hover:bg-blue-700 shadow-sm flex items-center gap-2"
            >
                <WandIcon className="h-4 w-4" />
                Buat RPP Terdiferensiasi
            </button>
        );
    }
    
    const isFirstMeetingForTp = !journalEntries.some(entry => 
        entry.pertemuan < pertemuan && entry.pertemuan > 0 && entry.tps.some(t => t.id === tp.id)
    );

    if (isFirstMeetingForTp) {
        return (
            <button
                onClick={() => onClick('create')}
                className="text-sm font-semibold text-white bg-indigo-600 px-4 py-2 rounded-md transition-colors hover:bg-indigo-700 shadow-sm flex items-center gap-2"
            >
                <WandIcon className="h-4 w-4" />
                Buat RPP
            </button>
        );
    }

    return (
        <button
            onClick={() => onClick('create')}
            className="text-sm font-semibold text-white bg-blue-600 px-4 py-2 rounded-md transition-colors hover:bg-blue-700 shadow-sm flex items-center gap-2"
        >
            <WandIcon className="h-4 w-4" />
            Buat RPP Adaptif
        </button>
    );
};


interface FormativeJournalViewProps {
    students: Student[];
    tujuanPembelajaran: TujuanPembelajaran[];
    orderedTps: TujuanPembelajaran[];
    alurTujuanPembelajaran: AlurTujuanPembelajaran[];
    journalEntries: JournalEntry[];
    setAssessingSession: (session: Session) => void;
    setAssistantModalState: (state: { tp: TujuanPembelajaran | null; mode: 'create' | 'view', sessionForViewMode?: Session }) => void;
    isDirty: boolean;
    onDeleteLatestFormativeSession: (pertemuan: number) => void;
    onQuickSyncAndSave: (syncData: Record<number, Record<string, boolean>>, skippedTps: TujuanPembelajaran[]) => Promise<void>;
    handleCreatePlannedSession: (tpId: string, pertemuan: number) => void;
    showAlert: (options: { title: string, message: string }) => void;
    showConfirmation: (options: { title: string, message: string, onConfirm: () => void }) => void;
}

const KETUNTASAN_KELAS_THRESHOLD = 70; // in percent

export const FormativeJournalView: React.FC<FormativeJournalViewProps> = ({ students, tujuanPembelajaran, orderedTps, alurTujuanPembelajaran, journalEntries, setAssessingSession, setAssistantModalState, isDirty, onDeleteLatestFormativeSession, onQuickSyncAndSave, handleCreatePlannedSession, showAlert, showConfirmation }) => {
    const { activePlan, showHtmlPreview } = useAppData();
    const [isTpSelectionModalOpen, setIsTpSelectionModalOpen] = useState(false);
    const [selectedTpIdForNewSession, setSelectedTpIdForNewSession] = useState('');
    const [deletingSession, setDeletingSession] = useState<number | null>(null);
    const [quickSyncState, setQuickSyncState] = useState<{isOpen: boolean, skippedTps: TujuanPembelajaran[], targetTpId: string | null}>({isOpen: false, skippedTps: [], targetTpId: null});
    const [openMenuForPertemuan, setOpenMenuForPertemuan] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const allUnits = useMemo(() => activePlan?.curriculum.unitPembelajaran || [], [activePlan]);

    const assessedPertemuanNumbers = useMemo(() => {
        return new Set(students.flatMap(s => s.assessments.map(a => a.pertemuan)));
    }, [students]);

    const nextPertemuanNumber = useMemo(() => {
        return journalEntries.length > 0 ? Math.max(...journalEntries.map(e => e.pertemuan)) + 1 : 1;
    }, [journalEntries]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuForPertemuan(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const recommendation = useMemo(() => {
        if (orderedTps.length === 0 || alurTujuanPembelajaran.length === 0) {
            return { tp: orderedTps[0] || null, justification: "Mulai dari TP pertama dalam alur." };
        }

        const lastSession = journalEntries[0];
        if (!lastSession || lastSession.tps.length === 0) {
            const firstTp = orderedTps.find(t => t.id === alurTujuanPembelajaran[0]?.tpId) || orderedTps[0];
            return { tp: firstTp, justification: "Direkomendasikan untuk memulai dari TP pertama dalam alur pembelajaran." };
        }

        const tpSaatIni = lastSession.tps[0];
        const { tuntasCount, totalStudents } = calculateTpCompletion(tpSaatIni, students);
        const persenTuntas = totalStudents > 0 ? (tuntasCount / totalStudents) * 100 : 100;
        
        const atpIndex = alurTujuanPembelajaran.findIndex(atp => atp.tpId === tpSaatIni.id);
        const atpBerikutnya = (atpIndex > -1 && atpIndex < alurTujuanPembelajaran.length - 1) ? alurTujuanPembelajaran[atpIndex + 1] : null;

        if (!atpBerikutnya) {
            return { tp: tpSaatIni, justification: "Selamat! Alur pembelajaran telah selesai. Lakukan penguatan terakhir pada TP ini jika perlu." };
        }

        const tpBerikutnya = orderedTps.find(t => t.id === atpBerikutnya.tpId);

        if (persenTuntas >= KETUNTASAN_KELAS_THRESHOLD) {
            const lingeringWeakness = findLingeringWeakness(tpSaatIni, students);
            if (lingeringWeakness) {
                return {
                    tp: tpBerikutnya,
                    justification: `Kelas sudah mencapai ketuntasan (${persenTuntas.toFixed(0)}%) dan siap lanjut. Namun, ditemukan ${lingeringWeakness.nonTuntasCount} siswa masih perlu penguatan pada aspek '${lingeringWeakness.aspectName}'. Disarankan melakukan pemanasan singkat terkait aspek ini di awal pertemuan berikutnya.`
                };
            }
            return { 
                tp: tpBerikutnya, 
                justification: `Kerja bagus! Kelas telah mencapai ketuntasan (${persenTuntas.toFixed(0)}%). Siswa yang mungkin tertinggal akan otomatis masuk ke 'Daftar Intervensi' di Dashboard.` 
            };
        } else {
            const isPrerequisite = atpBerikutnya.prasyaratTpIds?.includes(tpSaatIni.id) ?? false;
            if (isPrerequisite) {
                return { 
                    tp: tpSaatIni, 
                    justification: `Ketuntasan kelas baru ${persenTuntas.toFixed(0)}%. Karena TP ini adalah prasyarat PENTING untuk TP berikutnya, sangat disarankan untuk melakukan sesi penguatan sebelum melanjutkan.` 
                };
            }
            return { 
                tp: tpSaatIni, 
                justification: `Ketuntasan kelas baru ${persenTuntas.toFixed(0)}%. Disarankan untuk melakukan sesi penguatan pada TP ini untuk memastikan semua siswa menguasai materi.` 
            };
        }
    }, [orderedTps, students, alurTujuanPembelajaran, journalEntries]);
    
    const tpsGroupedByUnit = useMemo(() => {
        const unitsInSemester = allUnits.filter(unit => unit.tpIds.some(tpId => orderedTps.some(tp => tp.id === tpId)));
        
        const unitOrder = unitsInSemester.sort((a, b) => {
            const firstTpA = orderedTps.find(tp => a.tpIds.includes(tp.id));
            const firstTpB = orderedTps.find(tp => b.tpIds.includes(tp.id));
            const indexA = firstTpA ? orderedTps.indexOf(firstTpA) : -1;
            const indexB = firstTpB ? orderedTps.indexOf(firstTpB) : -1;
            return indexA - indexB;
        });
        
        return unitOrder.map(unit => ({
            unit,
            tps: orderedTps.filter(tp => unit.tpIds.includes(tp.id))
        })).filter(group => group.tps.length > 0);
    }, [orderedTps, allUnits]);

    useEffect(() => {
        if (isTpSelectionModalOpen) {
            const recommendedTpId = recommendation?.tp?.id || (orderedTps.length > 0 ? orderedTps[0].id : '');
            setSelectedTpIdForNewSession(recommendedTpId);
        }
    }, [isTpSelectionModalOpen, recommendation, orderedTps]);

    const handleTpSelectionChange = (tpId: string) => {
        setSelectedTpIdForNewSession(tpId);
    };

    const handleConfirmNewSession = async () => {
        if (!selectedTpIdForNewSession) {
            showAlert({ title: "TP Belum Dipilih", message: "Silakan pilih Tujuan Pembelajaran terlebih dahulu." });
            return;
        }

        // Get a set of TP IDs for the current semester for quick lookups
        const currentSemesterTpIds = new Set(orderedTps.map(tp => tp.id));

        // Find the last session that was BOTH assessed AND is for a TP in the current semester.
        const lastAssessedEntryInSemester = journalEntries.find(j => 
            assessedPertemuanNumbers.has(j.pertemuan) && 
            j.tps.some(tp => currentSemesterTpIds.has(tp.id))
        );
        // Find the actual TP object from that entry
        const lastAssessedTpInSemester = lastAssessedEntryInSemester?.tps.find(tp => currentSemesterTpIds.has(tp.id));
        
        const selectedTpIndex = orderedTps.findIndex(tp => tp.id === selectedTpIdForNewSession);
        let skippedTps: TujuanPembelajaran[] = [];

        if (lastAssessedTpInSemester) {
            // Case 1: Assessments exist *within this semester*. Check for a gap since the last one.
            const lastAssessedTpIndex = orderedTps.findIndex(tp => tp.id === lastAssessedTpInSemester.id);
            if (lastAssessedTpIndex > -1 && selectedTpIndex > lastAssessedTpIndex + 1) {
                skippedTps = orderedTps.slice(lastAssessedTpIndex + 1, selectedTpIndex);
            }
        } else {
            // Case 2: No assessments in this semester yet. Check if user is skipping TPs from the start of the semester's list.
            // This covers both "first assessment ever" and "first assessment for this semester".
            if (selectedTpIndex > 0) {
                skippedTps = orderedTps.slice(0, selectedTpIndex);
            }
        }
        
        if (skippedTps.length > 0) {
            setQuickSyncState({ isOpen: true, skippedTps, targetTpId: selectedTpIdForNewSession });
            setIsTpSelectionModalOpen(false);
            return; 
        }
        
        handleCreatePlannedSession(selectedTpIdForNewSession, nextPertemuanNumber);
        setIsTpSelectionModalOpen(false);
    };
    
    const handleQuickSyncSave = async (syncData: Record<number, Record<string, boolean>>) => {
        await onQuickSyncAndSave(syncData, quickSyncState.skippedTps);
        if (quickSyncState.targetTpId) {
            handleCreatePlannedSession(quickSyncState.targetTpId, nextPertemuanNumber);
        }
        setQuickSyncState({ isOpen: false, skippedTps: [], targetTpId: null });
    };

    const handleQuickSyncSkip = () => {
        if (quickSyncState.targetTpId) {
            handleCreatePlannedSession(quickSyncState.targetTpId, nextPertemuanNumber);
        }
        setQuickSyncState({ isOpen: false, skippedTps: [], targetTpId: null });
    };
    
    const latestSession = journalEntries.length > 0 ? journalEntries[0] : null;
    const isLatestSessionUnassessed = latestSession ? !assessedPertemuanNumbers.has(latestSession.pertemuan) : false;
    const isButtonDisabled = isDirty || (!!latestSession && isLatestSessionUnassessed);
    
    const buttonTitle = isDirty
        ? "Simpan perubahan pada pertemuan terakhir untuk melanjutkan."
        : isLatestSessionUnassessed
        ? "Input nilai pada pertemuan terakhir sebelum membuat pertemuan baru."
        : "Buat pertemuan asesmen formatif baru";

    const handleDeleteConfirm = () => {
        if (deletingSession !== null) {
            onDeleteLatestFormativeSession(deletingSession);
        }
        setDeletingSession(null);
    };

    return (
        <div className="space-y-6">
            <Card className="bg-indigo-50 border-indigo-200">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-indigo-800">Jurnal Pertemuan Formatif</h2>
                        <p className="text-slate-600 mt-1">Buat pertemuan baru untuk TP tertentu atau lihat riwayat pertemuan yang sudah tercatat.</p>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch gap-2">
                         <button
                            onClick={() => setIsTpSelectionModalOpen(true)}
                            disabled={isButtonDisabled}
                            title={buttonTitle}
                            className="flex items-center justify-center gap-2 font-semibold text-white bg-indigo-600 border border-indigo-600 rounded-md px-4 py-2.5 hover:bg-indigo-700 transition-colors shadow-lg text-base disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>Buat Pertemuan Baru</span>
                        </button>
                    </div>
                </div>
            </Card>

            <div className="space-y-4">
                {journalEntries.map(entry => {
                    const isLatestSession = journalEntries.length > 0 && entry.pertemuan === journalEntries[0].pertemuan;
                    const isSessionLocked = journalEntries.length > 1 && !isLatestSession;
                    const hasAssessments = assessedPertemuanNumbers.has(entry.pertemuan);
                    const tpForSession = entry.tps[0];

                    const planForSession = tpForSession ? 
                        (tpForSession.diagnosticData?.plan?.pertemuanKe === entry.pertemuan ? tpForSession.diagnosticData.plan :
                        tpForSession.adaptiveSteps?.find(s => s.nextPlan?.pertemuanKe === entry.pertemuan)?.nextPlan ||
                        null) : null;
                    
                    const lkpdStudent = planForSession?.generatedHtml?.lkpd?.['comprehensive_student'];
                    const lkpdObservation = planForSession?.generatedHtml?.lkpd?.['comprehensive_observation'];

                    const materials = planForSession?.generatedHtml ? [
                        { name: 'Infografis & Kuis', content: planForSession.generatedHtml.infographicQuiz, type: 'single' },
                        { name: 'Bahan Ajar Guru', content: planForSession.generatedHtml.bahanAjar, type: 'single' },
                        { name: 'Bahan Bacaan Siswa', content: planForSession.generatedHtml.bahanBacaanSiswa, type: 'single' },
                        { name: 'LKPD Siswa', studentContent: lkpdStudent, observationContent: lkpdObservation, type: 'lkpd_student' },
                        { name: 'Lembar Observasi', studentContent: lkpdStudent, observationContent: lkpdObservation, type: 'lkpd_observation' },
                    ].filter(m => m.content || m.studentContent || m.observationContent) : [];


                    let buttonLabel: string;
                    let buttonClasses = "text-sm font-bold px-4 py-2 rounded-md transition-colors ";

                    if (isSessionLocked) {
                        buttonLabel = 'Lihat Nilai';
                        buttonClasses += 'bg-slate-200 text-slate-600 hover:bg-slate-300';
                    } else if (hasAssessments) {
                        buttonLabel = 'Edit Nilai';
                        buttonClasses += 'bg-white text-indigo-700 border border-indigo-500 hover:bg-indigo-50 shadow-sm';
                    } else {
                        buttonLabel = 'Input Nilai';
                        buttonClasses += 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform hover:-translate-y-px';
                    }

                    return (
                        <Card key={entry.pertemuan} className="group p-0 transition-all hover:shadow-lg hover:border-indigo-300">
                            <div className="flex flex-col md:flex-row">
                                <div className="p-4 bg-slate-50 md:w-48 flex-shrink-0 text-left border-b md:border-b-0 md:border-r border-slate-200">
                                    <h3 className="text-lg font-bold text-indigo-700">Pertemuan ke-{entry.pertemuan}</h3>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                        <CalendarIcon className="h-3 w-3" />
                                        {new Date(entry.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                    {isSessionLocked && (
                                        <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-1 rounded-full w-fit">
                                            <LockIcon className="h-3 w-3"/>
                                            Terkunci
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex-grow flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-grow">
                                        <h4 className="font-semibold text-slate-700">Fokus Tujuan Pembelajaran</h4>
                                         {!hasAssessments && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                                                    <AlertTriangleIcon className="h-3 w-3" />
                                                    Nilai belum diinput
                                                </span>
                                            </div>
                                        )}
                                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-slate-600">
                                            {entry.tps.map((tp: TujuanPembelajaran) => (
                                                <li key={tp.id}>
                                                    <strong className="text-slate-800">{tp.id}:</strong> {tp.deskripsi}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="w-full md:w-auto flex items-center gap-2 self-start flex-shrink-0">
                                        <button
                                            onClick={() => {
                                                setAssessingSession({ tpId: entry.tps[0]?.id, pertemuan: entry.pertemuan });
                                            }}
                                            className={buttonClasses}
                                        >
                                            {buttonLabel}
                                        </button>
                                        
                                        {tpForSession && (
                                            <AssistantButton
                                                tp={tpForSession}
                                                pertemuan={entry.pertemuan}
                                                journalEntries={journalEntries}
                                                onClick={(mode) => setAssistantModalState({ 
                                                    tp: tpForSession, 
                                                    mode, 
                                                    sessionForViewMode: { tpId: tpForSession.id, pertemuan: entry.pertemuan } 
                                                })}
                                            />
                                        )}

                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuForPertemuan(openMenuForPertemuan === entry.pertemuan ? null : entry.pertemuan); }}
                                                className="p-2.5 text-slate-500 hover:bg-slate-200 rounded-md"
                                                title="Opsi Pertemuan"
                                            >
                                                <EllipsisVerticalIcon className="h-5 w-5" />
                                            </button>
                                            {openMenuForPertemuan === entry.pertemuan && (
                                                <div ref={menuRef} className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-md shadow-lg border z-30 p-1">
                                                    {materials.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-500 px-2 pt-1 pb-0.5">Materi Pendukung</p>
                                                            {materials.map(material => (
                                                                <button
                                                                    key={material.name}
                                                                    onClick={() => {
                                                                        if (material.type === 'single' && material.content) {
                                                                            showHtmlPreview(material.content);
                                                                        } else if (material.type === 'lkpd_student' && material.studentContent) {
                                                                             showHtmlPreview([
                                                                                { title: 'LKPD Siswa', html: material.studentContent },
                                                                                { title: 'Lembar Observasi', html: material.observationContent || '' }
                                                                            ], 0);
                                                                        } else if (material.type === 'lkpd_observation' && material.observationContent) {
                                                                             showHtmlPreview([
                                                                                { title: 'LKPD Siswa', html: material.studentContent || '' },
                                                                                { title: 'Lembar Observasi', html: material.observationContent }
                                                                            ], 1);
                                                                        }
                                                                        setOpenMenuForPertemuan(null);
                                                                    }}
                                                                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-slate-700 hover:bg-slate-100"
                                                                >
                                                                    <DocumentReportIcon className="h-4 w-4 flex-shrink-0" />
                                                                    <span className="truncate">{material.name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {isLatestSession && (
                                                        <>
                                                            {materials.length > 0 && <div className="my-1 h-px bg-slate-200"></div>}
                                                            <button
                                                                onClick={() => { setDeletingSession(entry.pertemuan); setOpenMenuForPertemuan(null); }}
                                                                className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-red-600 hover:bg-red-50"
                                                            >
                                                                <TrashIcon className="h-4 w-4 flex-shrink-0" />
                                                                <span>Hapus Pertemuan</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
                {journalEntries.length === 0 && (
                    <div className="text-center p-8 text-slate-500">
                        <p>Belum ada pertemuan yang tercatat. Mulai dengan membuat pertemuan baru.</p>
                    </div>
                )}
            </div>
            {isTpSelectionModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setIsTpSelectionModalOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <header className="p-4 border-b">
                            <h3 className="text-lg font-bold text-slate-800">Pilih Fokus TP untuk Pertemuan Baru (ke-{nextPertemuanNumber})</h3>
                        </header>
                        <main className="p-6 space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">Rekomendasi Cerdas (AI)</p>
                                <button 
                                    onClick={() => recommendation.tp && handleTpSelectionChange(recommendation.tp.id)}
                                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${selectedTpIdForNewSession === recommendation.tp?.id ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'}`}
                                >
                                    {recommendation.tp ? (
                                        <>
                                            <p className="font-bold text-indigo-800">{recommendation.tp.id}</p>
                                            <p className="text-sm text-slate-600 line-clamp-2">{recommendation.tp.deskripsi}</p>
                                            <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 flex items-start gap-2">
                                                <LightbulbIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                <p><strong className="font-semibold text-slate-600">Alasan:</strong> {recommendation.justification}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-slate-500">Semua TP tampaknya sudah tuntas.</p>
                                    )}
                                </button>
                            </div>
                            <div>
                                <label htmlFor="tp-manual-select" className="text-sm font-semibold text-slate-700 mb-2 block">Atau Pilih Manual dari Alur Pembelajaran</label>
                                <select
                                    id="tp-manual-select"
                                    value={selectedTpIdForNewSession}
                                    onChange={(e) => handleTpSelectionChange(e.target.value)}
                                    className="w-full text-left p-3 border border-slate-300 rounded-lg bg-white"
                                >
                                    <option value="" disabled>Pilih Tujuan Pembelajaran...</option>
                                    {tpsGroupedByUnit.map(({ unit, tps }) => (
                                        <optgroup key={unit.id} label={unit.nama}>
                                            {tps.map(tp => (
                                                <option key={tp.id} value={tp.id}>
                                                    {tp.id}: {tp.deskripsi}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        </main>
                        <footer className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                            <button onClick={() => setIsTpSelectionModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Batal</button>
                            <button onClick={handleConfirmNewSession} disabled={!selectedTpIdForNewSession} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-slate-400">
                                Lanjutkan
                            </button>
                        </footer>
                    </div>
                </div>
            )}
            {deletingSession !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setDeletingSession(null)}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <header className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                                <AlertTriangleIcon className="h-5 w-5"/>
                                Konfirmasi Hapus
                            </h3>
                            <button onClick={() => setDeletingSession(null)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
                        </header>
                        <main className="p-6">
                            <p className="text-slate-600">
                                Apakah Anda yakin ingin menghapus semua data untuk <strong>Pertemuan ke-{deletingSession}</strong>?
                            </p>
                            <p className="mt-2 text-sm text-red-600">
                                Tindakan ini tidak dapat dibatalkan dan akan menghapus semua nilai yang telah diinput pada pertemuan ini.
                            </p>
                        </main>
                        <footer className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                            <button onClick={() => setDeletingSession(null)} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">
                                Batal
                            </button>
                            <button onClick={handleDeleteConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">
                                Ya, Hapus
                            </button>
                        </footer>
                    </div>
                </div>
            )}
             {quickSyncState.isOpen && (
                <QuickSyncModal
                    isOpen={quickSyncState.isOpen}
                    students={students}
                    skippedTps={quickSyncState.skippedTps}
                    onSave={handleQuickSyncSave}
                    onSkip={handleQuickSyncSkip}
                    onClose={() => setQuickSyncState({ ...quickSyncState, isOpen: false })}
                />
            )}
        </div>
    );
};