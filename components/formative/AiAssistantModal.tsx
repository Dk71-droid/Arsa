import React, { useState, useEffect, useMemo } from 'react';
import type { Student, TujuanPembelajaran, LearningPlan, Session, DiagnosticRecommendation, DeepLearningLessonPlan, AdaptiveLessonStep, PhaseKegiatan, ContohRubrik, FokusAsesmenFormatif, AsesmenFormatifKunci } from '../../types';
import { ListIcon, NoteIcon, WandIcon, CheckCircleIcon, ClipboardListIcon, MilestoneIcon, XIcon, TrashIcon, DocumentReportIcon, DownloadIcon, RefreshIcon, LightbulbIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from '../icons';
import * as geminiService from '../../services/geminiService';
import { Card } from '../Card';
import { Loader } from '../Loader';
import { calculateTpCompletion } from './utils';
import { PredicateSelector, FloatingTooltip } from './AssessmentInputs';
import { DiagnosticLevelSelector } from './DiagnosticInputs';
import { AssessmentFocusGuideModal } from './AssessmentFocusGuideModal';
import { useAppData } from '../../hooks/useAppData';

type AiAssistantStage = 
    | 'kktp-missing' 
    | 'loading-diagnostic' 
    | 'show-diagnostic'
    | 'configure-plan' // New stage for when diagnostic data exists
    | 'loading-plan' 
    | 'show-plan'
    // New stages for next_step mode
    | 'ask-time-for-next-step'
    | 'loading-next-step'
    | 'show-intervention-plan'
    | 'show-diagnostic-for-next-tp';


const RenderContohRubrik: React.FC<{rubrik: ContohRubrik}> = ({rubrik}) => (
    <div className="p-4 rounded-lg border bg-white shadow-sm">
        <h3 className="text-lg font-bold text-teal-700">{rubrik.nama}</h3>
        <p className="text-sm text-slate-600 mt-1"><strong>Tujuan:</strong> {rubrik.tujuan}</p>
        <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100">
                    <tr>
                        <th className="p-2 font-semibold text-slate-600 border border-slate-300">Indikator</th>
                        <th className="p-2 font-semibold text-red-700 border border-slate-300">Baru Memulai</th>
                        <th className="p-2 font-semibold text-yellow-700 border border-slate-300">Berkembang</th>
                        <th className="p-2 font-semibold text-blue-700 border border-slate-300">Cakap</th>
                        <th className="p-2 font-semibold text-green-700 border border-slate-300">Mahir</th>
                    </tr>
                </thead>
                <tbody>
                    {rubrik.indikator.map((ind, i) => (
                        <tr key={i}>
                            <td className="p-2 border border-slate-300 font-medium text-slate-800">{ind.nama}</td>
                            <td className="p-2 border border-slate-300 text-slate-600">{ind.baruMemulai}</td>
                            <td className="p-2 border border-slate-300 text-slate-600">{ind.berkembang}</td>
                            <td className="p-2 border border-slate-300 text-slate-600">{ind.cakap}</td>
                            <td className="p-2 border border-slate-300 text-slate-600">{ind.mahir}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const RenderPhaseKegiatan: React.FC<{ phase: PhaseKegiatan; title: string }> = ({ phase, title }) => (
    <div>
        <h5 className="font-semibold text-lg text-slate-700">{title}: <span className="font-normal">{phase.judul}</span></h5>
        <div className="pl-4 mt-3 space-y-4">
            {phase.kelompokAktivitas && phase.kelompokAktivitas.map((kelompok, k_index) => (
                <div key={k_index} className="p-3 border-l-4 border-blue-300 bg-blue-50 text-sm rounded-r-md">
                    <p className="font-bold text-blue-800">{kelompok.namaKelompok}</p>
                    <p className="text-xs text-blue-900 opacity-80 mt-1">{kelompok.deskripsiKelompok}</p>
                    {kelompok.siswaDiKelompok && kelompok.siswaDiKelompok.length > 0 && (
                        <p className="text-xs text-slate-600 font-medium mt-1 mb-2">
                            <strong>Siswa:</strong> {kelompok.siswaDiKelompok.join(', ')}
                        </p>
                    )}
                    <div className="mt-2 pt-2 border-t border-blue-200">
                        <ul className="list-disc list-inside space-y-1 text-slate-800">
                            {kelompok.tugasLengkap.map((tugas, t_index) => (
                                <li key={t_index}>{tugas}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
            {phase.pengecekanPemahamanCepat && phase.pengecekanPemahamanCepat.length > 0 && (
                 <div className="p-3 border-l-4 border-orange-300 bg-orange-50 text-sm">
                    <p className="font-bold text-orange-800 flex items-center gap-2 mb-2">
                        <CheckCircleIcon className="h-4 w-4" />
                        Pengecekan Pemahaman Cepat
                    </p>
                    <ul className="list-disc list-inside text-slate-700">
                        {phase.pengecekanPemahamanCepat.map((cek, c_index) => (
                            <li key={c_index}>{cek}</li>
                        ))}
                    </ul>
                </div>
            )}
            {phase.contohRubrik && (
                <details className="p-3 border-l-4 border-purple-300 bg-purple-50 text-sm group">
                    <summary className="font-bold text-purple-800 flex items-center gap-2 cursor-pointer">
                        <ListIcon className="h-4 w-4" />
                        Lihat Contoh Rubrik untuk Fase Ini
                    </summary>
                    <div className="mt-2 pt-2 border-t border-purple-200">
                        <RenderContohRubrik rubrik={phase.contohRubrik} />
                    </div>
                </details>
            )}
        </div>
    </div>
);


const RenderDeepLearningPlan: React.FC<{ plan: DeepLearningLessonPlan, onShowFocusGuide: () => void }> = ({ plan, onShowFocusGuide }) => {
    const hasFocusData = plan.asesmenFormatifKunci && plan.asesmenFormatifKunci.fokusPenilaian.length > 0;
    
    return (
        <div className="space-y-6">
            {plan.catatanKontekstual && (
                <div className="p-3 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-md">
                    <p><strong className="font-semibold">📝 Catatan Kontekstual AI:</strong> {plan.catatanKontekstual}</p>
                </div>
            )}
            <blockquote className="p-3 text-sm text-slate-700 bg-yellow-50 border-l-4 border-yellow-400">
                {plan.disclaimer}
            </blockquote>

            {/* Pengalaman Belajar */}
            <div className="p-4 rounded-lg border bg-white shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-teal-700">PENGALAMAN BELAJAR (Pertemuan ke-{plan.pertemuanKe})</h3>
                        <span className="text-sm font-semibold text-slate-500">Alokasi Waktu: {plan.alokasiWaktuMenit} menit</span>
                    </div>
                     {hasFocusData && (
                        <button onClick={onShowFocusGuide} className="flex items-center gap-2 text-sm font-semibold text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-md px-3 py-1.5 hover:bg-yellow-200">
                            <LightbulbIcon className="h-4 w-4" />
                            Lihat Panduan Fokus Asesmen
                        </button>
                    )}
                </div>
                
                {/* Awal */}
                <div className="mt-4">
                    <h4 className="font-bold text-slate-800">AWAL</h4>
                    <p className="text-xs text-slate-500 mb-2">Prinsip: {plan.pengalamanBelajar.awal.prinsip}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 pl-2">
                        {plan.pengalamanBelajar.awal.kegiatan.map((k, i) => <li key={`awal-${i}`}>{k}</li>)}
                    </ul>
                </div>

                {/* Inti */}
                <div className="mt-4 pt-4 border-t">
                     <h4 className="font-bold text-slate-800">INTI</h4>
                     <div className="pl-4 mt-2 space-y-6">
                        <RenderPhaseKegiatan phase={plan.pengalamanBelajar.inti.memahami} title="Memahami" />
                        <RenderPhaseKegiatan phase={plan.pengalamanBelajar.inti.mengaplikasi} title="Mengaplikasi" />
                        <RenderPhaseKegiatan phase={plan.pengalamanBelajar.inti.merefleksi} title="Merefleksi" />
                     </div>
                </div>

                 {/* Penutup */}
                <div className="mt-4 pt-4 border-t">
                    <h4 className="font-bold text-slate-800">PENUTUP</h4>
                    <p className="text-xs text-slate-500 mb-2">Prinsip: {plan.pengalamanBelajar.penutup.prinsip}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 pl-2">
                        {plan.pengalamanBelajar.penutup.kegiatan.map((k, i) => <li key={`penutup-${i}`}>{k}</li>)}
                    </ul>
                </div>
            </div>

            {/* Asesmen */}
             <div className="p-4 rounded-lg border bg-white shadow-sm">
                <h3 className="text-xl font-bold text-teal-700">ASESMEN PEMBELAJARAN</h3>
                
                {plan.asesmenFormatifKunci && (
                    <div className="mt-4 p-3 border-l-4 border-cyan-300 bg-cyan-50 text-sm">
                        <p className="font-bold text-cyan-800 flex items-center gap-2 mb-2">
                            <ClipboardListIcon className="h-5 w-5" />
                            Asesmen Formatif Kunci (Fokus Utama)
                        </p>
                         <p className="text-xs text-slate-600 mb-2">Dilakukan selama fase <strong className="font-semibold">{plan.asesmenFormatifKunci.faseFokus}</strong> melalui aktivitas: "{plan.asesmenFormatifKunci.deskripsiAktivitasAsesmen}"</p>
                        <div className="space-y-2">
                            {plan.asesmenFormatifKunci.fokusPenilaian.map((fokusGroup, f_index) => (
                                <div key={f_index} className="bg-white/50 p-2 rounded border border-cyan-200">
                                    <p className="font-semibold text-slate-800">{fokusGroup.deskripsiKelompok}</p>
                                    <p className="text-xs text-slate-600 mb-1"><strong>Siswa:</strong> {fokusGroup.kelompokSiswa.join(', ')}</p>
                                    
                                    {fokusGroup.fokusPenilaian.map((fokus, fp_index) => (
                                        <div key={fp_index} className="mt-2 pt-2 border-t border-cyan-100">
                                            <p className="font-semibold text-slate-800">{fokus.aspek}</p>
                                            <p className="text-xs text-slate-600 mt-1 italic">"{fokus.deskripsiSingkat}"</p>
                                            <div className="mt-1.5 flex items-center gap-3 text-xs">
                                                <span className="text-slate-500"><strong>Teknik:</strong> {fokus.teknikAsesmen}</span>
                                                <span className="text-slate-500"><strong>Instrumen:</strong> {fokus.instrumenAsesmen}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-3 space-y-4 text-sm">
                    <div>
                      <p><strong className="font-semibold text-slate-600">Pada Awal Pembelajaran:</strong> {plan.asesmenPembelajaran.awal}</p>
                    </div>
                    <div className="pt-3 border-t">
                      <p><strong className="font-semibold text-slate-600">Pada Akhir Pembelajaran:</strong> {plan.asesmenPembelajaran.akhir}</p>
                    </div>
                </div>
             </div>
        </div>
    );
};

const RenderAdaptiveStep: React.FC<{step: AdaptiveLessonStep}> = ({ step }) => (
    <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200 shadow-sm">
        <h3 className="font-bold text-yellow-800 text-xl flex items-center gap-2">
            <MilestoneIcon className="h-5 w-5"/>
            Langkah Berikutnya (Adaptif)
            <span className="text-xs font-normal text-slate-500 ml-auto">{new Date(step.timestamp).toLocaleDateString()}</span>
        </h3>
        <p className="text-sm text-slate-700 mt-2 italic">"{step.summaryNarrative}"</p>
        {step.recommendationType === 'PROCEED' ? (
            <p className="mt-3 text-sm font-semibold text-green-700 text-center p-2 bg-green-100 rounded">REKOMENDASI: KELAS SIAP MELANJUTKAN KE TP BERIKUTNYA.</p>
        ) : step.nextPlan ? (
            <div className="mt-3 pt-3 border-t border-yellow-200">
                <RenderDeepLearningPlan plan={step.nextPlan} onShowFocusGuide={() => {}}/>
            </div>
        ) : null}
    </div>
);

interface MaterialItemProps {
    title: string;
    isLoading: boolean;
    htmlContent?: string;
    onGenerate: () => void;
    onView: () => void;
    showConfirmation: (options: { title: string; message: string; onConfirm: () => void; }) => void;
}

const MaterialItem: React.FC<MaterialItemProps> = ({ title, isLoading, htmlContent, onGenerate, onView, showConfirmation }) => (
    <div className="flex justify-between items-center bg-white p-3 rounded-md border">
        <p className="font-semibold text-sm text-slate-700" title={title}>{title}</p>
        <div className="flex items-center gap-2">
            {isLoading ? (
                <span className="text-sm font-semibold text-slate-500 animate-pulse">Membuat...</span>
            ) : htmlContent ? (
                <>
                    <button
                        onClick={() => {
                            showConfirmation({
                                title: "Generate Ulang Materi",
                                message: "Apakah Anda yakin ingin membuat ulang materi ini? Versi yang ada saat ini akan diganti.",
                                onConfirm: onGenerate,
                            })
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full"
                        title="Generate Ulang"
                    >
                        <RefreshIcon className="h-4 w-4" />
                    </button>
                    <button onClick={onView} className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700">
                        Lihat HTML
                    </button>
                </>
            ) : (
                <button onClick={onGenerate} className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-md hover:bg-teal-700">
                    Generate
                </button>
            )}
        </div>
    </div>
);

export const AiAssistantModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tp: TujuanPembelajaran;
    students: Student[];
    orderedTps: TujuanPembelajaran[];
    activePlan: LearningPlan | null;
    initialMode: 'create' | 'view';
    sessionForViewMode?: Session;
    onSaveDiagnostic: (tpId: string, data: Partial<Omit<NonNullable<TujuanPembelajaran['diagnosticData']>, 'timestamp'>>) => void;
    onSaveAdaptive: (tpId: string, step: AdaptiveLessonStep) => void;
    onGenerateKktp: (tpId: string) => Promise<void>;
    loadingKktpId: string | null;
    onResetTpData: (tpId: string) => Promise<void>;
    onSaveGeneratedHtml: (tpId: string, data: { pertemuan: number; materialType: 'bahanAjar' | 'bahanBacaanSiswa' | 'lkpd' | 'infographicQuiz' | 'rppLengkap' | 'game'; htmlContent: any; lkpdKey?: string; }) => void;
    showAlert: (options: { title: string; message: string; }) => void;
    showConfirmation: (options: { title: string; message: string; onConfirm: () => void; }) => void;
}> = ({ isOpen, onClose, tp, students, orderedTps, activePlan, initialMode, sessionForViewMode, onSaveDiagnostic, onSaveAdaptive, onGenerateKktp, loadingKktpId, onResetTpData, onSaveGeneratedHtml, showAlert, showConfirmation }) => {
    const { showHtmlPreview, activeClassProfile, settings } = useAppData();
    const [stage, setStage] = useState<AiAssistantStage>('loading-diagnostic');
    const [currentTp, setCurrentTp] = useState<TujuanPembelajaran>(tp);
    const [adaptiveResult, setAdaptiveResult] = useState<AdaptiveLessonStep | null>(null);
    const [diagnosticRec, setDiagnosticRec] = useState<DiagnosticRecommendation | null>(null);
    const [diagnosticResults, setDiagnosticResults] = useState<Record<number, 3 | 2 | 1 | 0>>({});
    const [waktuAwal, setWaktuAwal] = useState('10');
    const [waktuInti, setWaktuInti] = useState('50');
    const [waktuPenutup, setWaktuPenutup] = useState('10');
    const [deepLearningPlan, setDeepLearningPlan] = useState<DeepLearningLessonPlan | null>(null);
    const [error, setError] = useState('');
    const [tooltip, setTooltip] = useState<{ content: React.ReactNode; top: number; left: number; widthClass: string; position: 'top' | 'bottom' } | null>(null);
    const [generatingMaterial, setGeneratingMaterial] = useState<string | null>(null);
    const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
    const [isSyncingView, setIsSyncingView] = useState(false);
    const [showMaterials, setShowMaterials] = useState(false);
    
    // New state for teacher inputs
    const [fokusAspek, setFokusAspek] = useState<string[]>([]);
    const [catatanGuru, setCatatanGuru] = useState('');

    const isLoadingAnyMaterial = !!generatingMaterial || isSyncingView;

    const totalAlokasiWaktu = useMemo(() => {
        return (parseInt(waktuAwal) || 0) + (parseInt(waktuInti) || 0) + (parseInt(waktuPenutup) || 0);
    }, [waktuAwal, waktuInti, waktuPenutup]);
    
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    useEffect(() => {
        if (activePlan && currentTp) {
            const updatedTpFromPlan = activePlan.curriculum.tujuanPembelajaran.find(t => t.id === currentTp.id);
            if (updatedTpFromPlan && JSON.stringify(updatedTpFromPlan) !== JSON.stringify(currentTp)) {
                setCurrentTp(updatedTpFromPlan);

                const planBeingShown = 
                    activeStepIndex === 0 ? updatedTpFromPlan.diagnosticData?.plan :
                    updatedTpFromPlan.adaptiveSteps?.[activeStepIndex - 1]?.nextPlan;

                if (planBeingShown && JSON.stringify(planBeingShown) !== JSON.stringify(deepLearningPlan)) {
                    setDeepLearningPlan(planBeingShown);
                } else if (!planBeingShown && deepLearningPlan) {
                    setDeepLearningPlan(null);
                }
                
                if (isSyncingView) {
                    setIsSyncingView(false);
                }
            } else if (isSyncingView) {
                // If the data is already the same, it means we are in sync.
                setIsSyncingView(false);
            }
        }
    }, [activePlan, currentTp, activeStepIndex, deepLearningPlan, isSyncingView]);

    const runCreateModeLogic = (targetTp: TujuanPembelajaran) => {
        // Case 1: RPP and summary already exist. Teacher wants to create the *next* adaptive step.
        if (targetTp.diagnosticData?.plan) {
            const total = targetTp.diagnosticData.plan.alokasiWaktuMenit;
            const awal = Math.round(total * 0.15);
            const penutup = Math.round(total * 0.15);
            const inti = total - awal - penutup;
            setWaktuAwal(String(awal));
            setWaktuInti(String(inti));
            setWaktuPenutup(String(penutup));
            setStage('ask-time-for-next-step');
            return;
        }

        // Case 2: Diagnostic summary exists, but no RPP. Teacher is returning to configure the plan.
        if (targetTp.diagnosticData?.summary) {
            setDiagnosticRec(targetTp.diagnosticData.recommendation);
            try {
                const savedResults = JSON.parse(targetTp.diagnosticData.summary);
                setDiagnosticResults(savedResults);
            } catch (e) {
                setDiagnosticResults({});
            }
            setStage('configure-plan');
            return;
        }

        // Case 3: Only a diagnostic recommendation (draft) exists. Teacher is returning to input results.
        if (targetTp.diagnosticData?.recommendation) {
            setDiagnosticRec(targetTp.diagnosticData.recommendation);
            setDiagnosticResults({}); // Start with empty results for input
            setStage('show-diagnostic');
            return;
        }

        // Case 4: Nothing exists. Start from scratch.
        generateInitialRecommendation(targetTp);
    };


    useEffect(() => {
        if (isOpen) {
            // Reset teacher inputs when modal opens
            setFokusAspek([]);
            setCatatanGuru('');
        }
        if (isOpen && tp) {
            setCurrentTp(tp);
            if (!tp.kktp) {
                setStage('kktp-missing');
                return;
            }
    
            if (initialMode === 'view' && sessionForViewMode) {
                const { pertemuan } = sessionForViewMode;
                const planForSession = 
                    tp.diagnosticData?.plan?.pertemuanKe === pertemuan ? tp.diagnosticData.plan :
                    tp.adaptiveSteps?.find(s => s.nextPlan?.pertemuanKe === pertemuan)?.nextPlan ||
                    null;
    
                if (planForSession) {
                    setDeepLearningPlan(planForSession);
                    setStage('show-plan');
                    let stepIndex = 0;
                    if (planForSession.pertemuanKe > 1 && tp.adaptiveSteps) {
                        const adaptiveIndex = tp.adaptiveSteps.findIndex(step => step.nextPlan?.pertemuanKe === pertemuan);
                        if (adaptiveIndex !== -1) {
                            stepIndex = adaptiveIndex + 1;
                        }
                    }
                    setActiveStepIndex(stepIndex);
                } else {
                    console.warn(`View mode opened for session ${pertemuan}, but no plan found. Falling back to create mode.`);
                    runCreateModeLogic(tp);
                }
            } else { // 'create' mode
                runCreateModeLogic(tp);
            }
        }
    }, [isOpen, tp, initialMode, sessionForViewMode]);
    
    const initializeForTp = (targetTp: TujuanPembelajaran) => {
        if (!targetTp.kktp) {
            setStage('kktp-missing');
            return;
        }
        if (targetTp.diagnosticData) {
            const total = targetTp.diagnosticData.plan.alokasiWaktuMenit;
            const awal = Math.round(total * 0.15);
            const penutup = Math.round(total * 0.15);
            const inti = total - awal - penutup;

            setWaktuAwal(String(awal));
            setWaktuInti(String(inti));
            setWaktuPenutup(String(penutup));

            setDiagnosticRec(targetTp.diagnosticData.recommendation);
            setDeepLearningPlan(targetTp.diagnosticData.plan || null);
            
            try {
                const savedResults = JSON.parse(targetTp.diagnosticData.summary || '{}');
                if (typeof savedResults === 'object' && savedResults !== null) {
                    setDiagnosticResults(savedResults);
                }
            } catch (e) {
                 setDiagnosticResults({}); // fallback to empty if parsing fails
            }
            setStage('show-plan');
            setActiveStepIndex((targetTp.adaptiveSteps?.length || 0));
        } else {
            generateInitialRecommendation(targetTp);
        }
    };

    const handleContinueFromTimeInput = () => {
        if (totalAlokasiWaktu <= 0) {
            setError("Harap masukkan alokasi waktu yang valid.");
            return;
        }
        handleGenerateNextStep({
            awal: parseInt(waktuAwal) || 0,
            inti: parseInt(waktuInti) || 0,
            penutup: parseInt(waktuPenutup) || 0,
        });
    };

    const handleGenerateNextStep = async (waktu: { awal: number, inti: number, penutup: number }) => {
        setStage('loading-next-step');
        setError('');
    
        if (!tp || !sessionForViewMode) {
            setError("Konteks sesi tidak ditemukan.");
            setStage('kktp-missing');
            return;
        }
    
        const latestPlanForTp = tp.adaptiveSteps?.[tp.adaptiveSteps.length - 1]?.nextPlan || tp.diagnosticData?.plan;
    
        if (!latestPlanForTp) {
            setError(`Rencana pembelajaran terakhir untuk TP ${tp.id} tidak ditemukan. Tidak dapat membuat langkah adaptif.`);
            setStage('kktp-missing');
            return;
        }
    
        try {
            const currentTpIndex = orderedTps.findIndex(t => t.id === tp.id);
            const nextTpInLine = currentTpIndex > -1 && currentTpIndex < orderedTps.length - 1 ? orderedTps[currentTpIndex + 1] : null;
    
            const resultFromAi = await geminiService.generateAdaptiveLessonStep(tp, students, latestPlanForTp, waktu, nextTpInLine, sessionForViewMode.pertemuan);
            
            const result: AdaptiveLessonStep = { ...resultFromAi, timestamp: Date.now() };
            
            if (result.nextPlan) {
                result.nextPlan.pertemuanKe = sessionForViewMode.pertemuan;
            }

            setAdaptiveResult(result);
    
            if (result.recommendationType === 'INTERVENTION') {
                setDeepLearningPlan(result.nextPlan || null);
                setCurrentTp(tp); 
                setStage('show-intervention-plan');
            } else if (result.recommendationType === 'PROCEED') {
                const nextTpToDiagnose = orderedTps.find(t => t.id === result.nextTpId);
                if (nextTpToDiagnose) {
                    setCurrentTp(nextTpToDiagnose);
                     if (!nextTpToDiagnose.kktp) {
                        setStage('kktp-missing');
                        return;
                    }
                    setDiagnosticRec(result.diagnosticForNextTp || null);
                    setStage('show-diagnostic-for-next-tp');
                } else {
                    setError("TP berikutnya tidak ditemukan.");
                }
            }
        } catch (e) {
            console.error(e);
            setError("Gagal merencanakan langkah berikutnya. Silakan coba lagi.");
            initializeForTp(tp); 
        }
    };
    
    const generateInitialRecommendation = async (targetTp: TujuanPembelajaran) => {
        setStage('loading-diagnostic');
        setError('');
        try {
            const currentIndex = orderedTps.findIndex(t => t.id === targetTp.id);
            const previousTp = currentIndex > 0 ? orderedTps[currentIndex - 1] : null;
            let previousTpData: { tp: TujuanPembelajaran; tuntasCount: number; totalStudents: number; } | null = null;
            if (previousTp) {
                const { tuntasCount, totalStudents } = calculateTpCompletion(previousTp, students);
                previousTpData = { tp: previousTp, tuntasCount, totalStudents };
            }
            const result = await geminiService.generateDiagnosticRecommendation(targetTp, students, previousTpData);
            setDiagnosticRec(result);
            setStage('show-diagnostic');
        } catch (e) {
            console.error(e);
            setError('Gagal membuat rekomendasi asesmen diagnostik. Coba lagi.');
            setStage('show-diagnostic');
        }
    };

    const handleDiagnosticResultChange = (studentId: number, level: 3 | 2 | 1 | 0) => {
        setDiagnosticResults(prev => ({ ...prev, [studentId]: level }));
    };
    
    const handleBulkFillDiagnostic = (level: 3 | 2 | 1) => {
        setDiagnosticResults(prev => {
            const newResults: Record<number, 3 | 2 | 1 | 0> = {};
            students.forEach(student => {
                newResults[student.id] = level;
            });
            return newResults;
        });
    };

    const handleSaveDraft = () => {
        if (!diagnosticRec) return;
        onSaveDiagnostic(currentTp.id, {
            recommendation: diagnosticRec,
        });
        showAlert({ title: "Draf Tersimpan!", message: "Draf asesmen diagnostik telah disimpan. Anda bisa kembali lagi nanti untuk mengisi hasil pengelompokan siswa." });
        onClose();
    };

    const handleContinueToPlan = () => {
        if (!diagnosticRec) return;
        onSaveDiagnostic(currentTp.id, {
            recommendation: diagnosticRec,
            summary: JSON.stringify(diagnosticResults),
        });
        setStage('configure-plan');
    };

    const handleGeneratePlan = async () => {
        if (!currentTp || totalAlokasiWaktu <= 0 || !sessionForViewMode) {
            setError("Harap isi alokasi waktu yang valid dan pastikan konteks sesi ada."); return;
        }
        
        const studentDiagnosticData = {
            'Mahir': students.filter(s => diagnosticResults[s.id] === 3).map(s => s.nama),
            'Cakap': students.filter(s => diagnosticResults[s.id] === 2).map(s => s.nama),
            'Baru Berkembang': students.filter(s => diagnosticResults[s.id] === 1).map(s => s.nama),
        };

        setStage('loading-plan'); setError('');

        try {
            const currentIndex = orderedTps.findIndex(t => t.id === currentTp.id);
            const previousTp = currentIndex > 0 ? orderedTps[currentIndex - 1] : null;
            let previousTpData: { tp: TujuanPembelajaran; tuntasCount: number; totalStudents: number; } | null = null;
            if (previousTp) {
                const { tuntasCount, totalStudents } = calculateTpCompletion(previousTp, students);
                previousTpData = { tp: previousTp, tuntasCount, totalStudents };
            }
            const waktu = {
                awal: parseInt(waktuAwal) || 0,
                inti: parseInt(waktuInti) || 0,
                penutup: parseInt(waktuPenutup) || 0,
            };
            const result = await geminiService.generateDeepLearningPlan(
                currentTp, 
                students, 
                JSON.stringify(studentDiagnosticData), 
                waktu, 
                previousTpData, 
                activePlan!.curriculum.phase, 
                sessionForViewMode.pertemuan,
                fokusAspek,
                catatanGuru
            );
            
            result.pertemuanKe = sessionForViewMode.pertemuan;

            setDeepLearningPlan(result);
            onSaveDiagnostic(currentTp.id, { plan: result });

            if (stage === 'show-diagnostic-for-next-tp') {
                onClose();
            } else {
                setStage('show-plan');
                setActiveStepIndex(0);
            }
        } catch (e) {
            console.error(e);
            setError('Gagal membuat rencana pembelajaran. Silakan coba lagi.');
            setStage('configure-plan');
        }
    };
    
    const confirmReset = () => {
        showConfirmation({
            title: 'Konfirmasi Reset',
            message: `Anda akan mereset semua data untuk TP "${currentTp.id}", termasuk rencana pembelajaran dan semua data asesmen formatif siswa.`,
            onConfirm: () => {
                onResetTpData(currentTp.id).then(() => {
                    onClose();
                });
            }
        });
    };

    const handleShowTooltip = (content: React.ReactNode, rect: DOMRect, widthClass: string) => {
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
    };
    const handleHideTooltip = () => { setTooltip(null); };
    
    const canGeneratePlan = useMemo(() => {
        if (totalAlokasiWaktu <= 0) return false;
        // In configure-plan stage, results are already saved, so we just check time.
        return true;
    }, [totalAlokasiWaktu]);

    const handleGenerateMaterial = async (materialType: 'bahanAjar' | 'bahanBacaanSiswa' | 'lkpd' | 'infographicQuiz' | 'rppLengkap' | 'game') => {
        const key = materialType === 'lkpd' ? 'comprehensive_lkpd' : materialType;
        setGeneratingMaterial(key);
        setError('');
        
        try {
            const planToShow = activeStepIndex === 0 ? deepLearningPlan : currentTp?.adaptiveSteps?.[activeStepIndex - 1]?.nextPlan;
            if (!currentTp || !planToShow || !activePlan) throw new Error("Konteks tidak lengkap untuk membuat materi.");

            let htmlContent: string | undefined;

            if (materialType === 'lkpd') {
                const { studentHtml, observationHtml } = await geminiService.generateComprehensiveLkpdHtml(currentTp, planToShow, activePlan.curriculum.phase, students);
                if (studentHtml && observationHtml) {
                    onSaveGeneratedHtml(currentTp.id, { pertemuan: planToShow.pertemuanKe, materialType: 'lkpd', htmlContent: studentHtml, lkpdKey: 'comprehensive_student' });
                    onSaveGeneratedHtml(currentTp.id, { pertemuan: planToShow.pertemuanKe, materialType: 'lkpd', htmlContent: observationHtml, lkpdKey: 'comprehensive_observation' });
                    setIsSyncingView(true);
                }
            } else if (materialType === 'game') {
                htmlContent = await geminiService.generateGameHtml(currentTp, planToShow, activePlan, activeClassProfile?.name);
            } else if (materialType === 'bahanAjar') {
                htmlContent = await geminiService.generateBahanAjarHtml(currentTp, planToShow, activePlan.curriculum.phase, 'presentation');
            } else if (materialType === 'bahanBacaanSiswa') {
                htmlContent = await geminiService.generateBahanBacaanSiswaHtml(currentTp, planToShow, activePlan.curriculum.phase);
            } else if (materialType === 'infographicQuiz') {
                htmlContent = await geminiService.generateInfographicQuizHtml(currentTp, planToShow, activePlan.curriculum.phase);
            } else if (materialType === 'rppLengkap') {
                htmlContent = await geminiService.generateCompleteRppHtml(currentTp, planToShow, activePlan, activeClassProfile?.name || '', settings.schoolName || 'Nama Sekolah');
            }

            if (htmlContent) {
                onSaveGeneratedHtml(currentTp.id, { pertemuan: planToShow.pertemuanKe, materialType, htmlContent });
                setIsSyncingView(true);
            }
        } catch (e) {
            console.error(e);
            setError("Gagal membuat materi HTML. Silakan coba lagi.");
        } finally {
            setGeneratingMaterial(null);
        }
    };

    if (!isOpen || !currentTp) return null;

    const planToShow = useMemo(() => {
        if (stage !== 'show-plan' && stage !== 'show-intervention-plan') return null;
        if (stage === 'show-intervention-plan') return deepLearningPlan;
        
        const plan = activeStepIndex === 0 ? deepLearningPlan : currentTp.adaptiveSteps?.[activeStepIndex - 1]?.nextPlan;
        return plan || null;
    }, [stage, activeStepIndex, deepLearningPlan, currentTp, adaptiveResult]);
    
    const allFocusGroupsInPlan = useMemo(() => {
        if (!planToShow || !planToShow.asesmenFormatifKunci) return [];
        return planToShow.asesmenFormatifKunci.fokusPenilaian;
    }, [planToShow]);

    const handleFokusAspekChange = (aspek: string) => {
        setFokusAspek(prev => 
            prev.includes(aspek) ? prev.filter(a => a !== aspek) : [...prev, aspek]
        );
    };

    const renderGenerationConfig = () => {
        return (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Alokasi Waktu Pertemuan <span className="text-red-500">*</span></label>
                    <div className="w-full max-w-lg mx-auto">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label htmlFor="waktu-awal" className="block text-xs font-medium text-slate-600 mb-1">Keg. Awal (menit)</label>
                                <input id="waktu-awal" type="number" value={waktuAwal} onChange={(e) => setWaktuAwal(e.target.value)} placeholder="10" className="w-full p-2 border border-slate-300 rounded-md shadow-sm text-center" />
                            </div>
                            <div>
                                <label htmlFor="waktu-inti" className="block text-xs font-medium text-slate-600 mb-1">Keg. Inti (menit)</label>
                                <input id="waktu-inti" type="number" value={waktuInti} onChange={(e) => setWaktuInti(e.target.value)} placeholder="50" className="w-full p-2 border border-slate-300 rounded-md shadow-sm text-center" />
                            </div>
                            <div>
                                <label htmlFor="waktu-penutup" className="block text-xs font-medium text-slate-600 mb-1">Keg. Penutup (menit)</label>
                                <input id="waktu-penutup" type="number" value={waktuPenutup} onChange={(e) => setWaktuPenutup(e.target.value)} placeholder="10" className="w-full p-2 border border-slate-300 rounded-md shadow-sm text-center" />
                            </div>
                        </div>
                        <div className="mt-3 text-center">
                            <p className="text-sm text-slate-500">Total Waktu: <span className="font-bold text-lg text-slate-800">{totalAlokasiWaktu}</span> menit</p>
                            <p className="text-xs text-slate-500 mt-1">Untuk SD (Fase A-C), 1 JP = 35 menit. Contoh: 2 JP = 70 menit.</p>
                        </div>
                    </div>
                </div>
                <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fokus Aspek Pembelajaran (Opsional)</label>
                    <p className="text-xs text-slate-500 mb-2">Pilih 1-3 aspek dari KKTP untuk menjadi fokus utama RPP ini. Jika kosong, AI akan menentukan prioritasnya.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {currentTp.kktp?.rubrik.map(aspek => (
                            <label key={aspek.aspek} className="flex items-center p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" checked={fokusAspek.includes(aspek.aspek)} onChange={() => handleFokusAspekChange(aspek.aspek)} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                                <span className="ml-2 text-sm text-slate-800">{aspek.aspek}</span>
                            </label>
                        ))}
                    </div>
                </div>
                 <div className="pt-4 border-t">
                    <label htmlFor="catatan-guru" className="block text-sm font-medium text-slate-700 mb-1">Catatan atau Materi Inti dari Guru (Opsional)</label>
                    <p className="text-xs text-slate-500 mb-2">Berikan instruksi spesifik pada AI, misalnya terkait metode, contoh kasus, atau batasan.</p>
                    <textarea 
                        id="catatan-guru"
                        value={catatanGuru}
                        onChange={(e) => setCatatanGuru(e.target.value)}
                        rows={3}
                        className="w-full p-2 border rounded-md"
                        placeholder="Contoh: Fokus pada metode bersusun, hindari penggunaan kalkulator, gunakan contoh yang relevan dengan lingkungan sekolah."
                    />
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch(stage) {
            case 'ask-time-for-next-step':
                return (
                    <div className="p-6 overflow-y-auto">
                        <div className="w-full text-center mb-4">
                            <h4 className="font-bold text-slate-700 text-lg">Buat RPP Adaptif untuk Pertemuan Berikutnya</h4>
                            <p className="text-sm text-slate-500">AI akan menganalisis data pertemuan sebelumnya dan membuat RPP intervensi atau pengayaan. Tentukan alokasi waktu dan fokus untuk sesi berikutnya.</p>
                        </div>
                        {renderGenerationConfig()}
                        {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                    </div>
                );
            case 'loading-next-step':
                return <Loader text="AI sedang menganalisis & merencanakan langkah berikutnya..." />;
            
            case 'show-intervention-plan':
                return (
                    <div className="p-6 overflow-y-auto">
                        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 mb-4">
                            <h4 className="font-bold text-yellow-800">Rekomendasi: Intervensi</h4>
                            <p className="text-sm text-yellow-900 mt-1">{adaptiveResult?.summaryNarrative}</p>
                        </div>
                        {deepLearningPlan && <RenderDeepLearningPlan plan={deepLearningPlan} onShowFocusGuide={() => setIsFocusModalOpen(true)} />}
                    </div>
                );

            case 'kktp-missing':
                return (
                    <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                        <ListIcon className="h-12 w-12 text-slate-400 mb-4" />
                        <h4 className="font-bold text-slate-700 text-lg">Rubrik KKTP Dibutuhkan</h4>
                        <p className="text-slate-600 mt-2 max-w-md mx-auto">Untuk melanjutkan, AI perlu rubrik penilaian (KKTP) untuk <strong>{currentTp.id}</strong>. Silakan buat terlebih dahulu.</p>
                        <button
                            onClick={async () => { await onGenerateKktp(currentTp.id); onClose(); }}
                            disabled={loadingKktpId === currentTp.id}
                            className="mt-6 flex items-center justify-center gap-2 bg-teal-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-teal-700 transition-all disabled:bg-slate-400"
                        >
                            <WandIcon className="h-5 w-5" />
                            {loadingKktpId === currentTp.id ? 'Membuat...' : 'Buat Rubrik KKTP'}
                        </button>
                    </div>
                );
            
            case 'show-diagnostic-for-next-tp':
            case 'show-diagnostic':
                 return (
                     <div className="p-6 overflow-y-auto">
                        {tooltip && <FloatingTooltip content={tooltip.content} top={tooltip.top} left={tooltip.left} widthClass={tooltip.widthClass} position={tooltip.position} />}
                        <div className="space-y-6">
                            {stage === 'show-diagnostic-for-next-tp' && (
                                <div className="p-4 bg-green-50 border-l-4 border-green-400">
                                    <h4 className="font-bold text-green-800">Rekomendasi: Lanjut ke TP Berikutnya!</h4>
                                    <p className="text-sm text-green-900 mt-1">{adaptiveResult?.summaryNarrative}</p>
                                </div>
                            )}
                            <div>
                                <h4 className="font-bold text-slate-700 text-md mb-2">Tahap 1: Lakukan Asesmen Diagnostik Awal</h4>
                                <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                                    <p className="font-semibold text-sm text-slate-800">Aktivitas yang Disarankan:</p>
                                    <p className="text-sm text-slate-600">{diagnosticRec?.saranAktivitas}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 text-md">Tahap 2: Input Hasil Diagnostik</h4>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full bg-white border-separate border-spacing-0">
                                        <thead className="bg-slate-100 text-sm sticky top-0 z-10">
                                            <tr>
                                                <th className="p-2 font-semibold text-slate-600 border-b border-r sticky left-0 bg-slate-100 z-20">Nama Siswa</th>
                                                <th className="p-2 font-semibold text-slate-600 border-b border-r text-center">
                                                    Kelompok Pemahaman Awal
                                                    <div className="flex items-center justify-center gap-1 mt-1.5">
                                                        {([3, 2, 1] as const).map(level => (
                                                            <button
                                                                key={level}
                                                                onClick={() => handleBulkFillDiagnostic(level)}
                                                                className="w-20 h-6 flex items-center justify-center font-bold text-xs rounded-md transition-all border bg-slate-200 text-slate-600 hover:bg-teal-500 hover:text-white"
                                                            >
                                                                {level === 3 ? 'Mahir' : level === 2 ? 'Cakap' : 'Berkembang'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map(student => (
                                                <tr key={student.id} className="group/row">
                                                    <td className="p-2 border-b border-r font-medium text-slate-800 sticky left-0 bg-white group-hover/row:bg-slate-50 z-10">{student.nama}</td>
                                                    <td className="p-1 border-b border-r text-center bg-white group-hover/row:bg-slate-50">
                                                        <DiagnosticLevelSelector
                                                            studentId={student.id}
                                                            kriteria={diagnosticRec?.kriteriaPengelompokan || []}
                                                            currentLevel={diagnosticResults[student.id] || 0}
                                                            onSelect={(studId, level) => handleDiagnosticResultChange(studId, level as any)}
                                                            onShowTooltip={handleShowTooltip}
                                                            onHideTooltip={handleHideTooltip}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                 );
            
            case 'configure-plan':
                return (
                    <div className="p-6 overflow-y-auto">
                        <div className="w-full text-center mb-4">
                            <h4 className="font-bold text-slate-700 text-lg">Buat RPP Terdiferensiasi</h4>
                            <p className="text-sm text-slate-500">Hasil asesmen diagnostik yang sudah disimpan akan digunakan untuk menyusun RPP ini. Silakan atur konfigurasi di bawah ini.</p>
                        </div>
                        {renderGenerationConfig()}
                        {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                    </div>
                );

            case 'show-plan':
                const lkpdStudentHtml = planToShow?.generatedHtml?.lkpd?.['comprehensive_student'];
                const lkpdObservationHtml = planToShow?.generatedHtml?.lkpd?.['comprehensive_observation'];

                return (
                     <div className="p-6 overflow-y-auto">
                        <div className="flex items-center mb-6">
                            {Array.from({ length: 1 + (currentTp.adaptiveSteps?.length || 0) }).map((_, index) => (
                                <React.Fragment key={index}>
                                    <div className="flex flex-col items-center text-center px-1">
                                        <button onClick={() => setActiveStepIndex(index)} className={`w-8 h-8 flex items-center justify-center font-bold rounded-full border-2 ${index === activeStepIndex ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-300 hover:border-teal-500'}`}>
                                            {index + 1}
                                        </button>
                                        <span className={`mt-1 text-xs font-semibold ${index === activeStepIndex ? 'text-teal-700' : 'text-slate-500'}`}>{index === 0 ? 'Rencana Awal' : `Adaptif ${index}`}</span>
                                    </div>
                                    {index < (currentTp.adaptiveSteps?.length || 0) && <div className="flex-1 h-0.5 bg-slate-300 mx-2"></div>}
                                </React.Fragment>
                            ))}
                        </div>
                        {error && <p className="text-red-600 text-center mb-4">{error}</p>}
                        {planToShow ? (
                            <>
                                <RenderDeepLearningPlan plan={planToShow} onShowFocusGuide={() => setIsFocusModalOpen(true)} />
                                <div className="mt-6 bg-slate-100 rounded-lg border border-slate-200">
                                    <button 
                                        onClick={() => setShowMaterials(!showMaterials)} 
                                        className="w-full flex justify-between items-center p-4 text-left"
                                        aria-expanded={showMaterials}
                                        aria-controls="supporting-materials-section"
                                    >
                                        <h4 className="font-bold text-slate-800">Materi Pendukung</h4>
                                        {showMaterials ? <ChevronUpIcon className="h-5 w-5 text-slate-600" /> : <ChevronDownIcon className="h-5 w-5 text-slate-600" />}
                                    </button>
                                    {showMaterials && (
                                        <div id="supporting-materials-section" className="p-4 pt-0">
                                            <div className="space-y-3">
                                                <MaterialItem
                                                    title="RPP Lengkap (Versi Cetak)"
                                                    isLoading={isLoadingAnyMaterial && generatingMaterial === 'rppLengkap'}
                                                    htmlContent={planToShow.generatedHtml?.rppLengkap}
                                                    onGenerate={() => handleGenerateMaterial('rppLengkap')}
                                                    onView={() => planToShow.generatedHtml?.rppLengkap && showHtmlPreview(planToShow.generatedHtml.rppLengkap)}
                                                    showConfirmation={showConfirmation}
                                                />
                                                <MaterialItem
                                                    title="Infografis & Kuis Interaktif"
                                                    isLoading={isLoadingAnyMaterial && generatingMaterial === 'infographicQuiz'}
                                                    htmlContent={planToShow.generatedHtml?.infographicQuiz}
                                                    onGenerate={() => handleGenerateMaterial('infographicQuiz')}
                                                    onView={() => planToShow.generatedHtml?.infographicQuiz && showHtmlPreview(planToShow.generatedHtml.infographicQuiz)}
                                                    showConfirmation={showConfirmation}
                                                />
                                                <MaterialItem
                                                    title="Bahan Ajar Guru (Presentasi)"
                                                    isLoading={isLoadingAnyMaterial && generatingMaterial === 'bahanAjar'}
                                                    htmlContent={planToShow.generatedHtml?.bahanAjar}
                                                    onGenerate={() => handleGenerateMaterial('bahanAjar')}
                                                    onView={() => planToShow.generatedHtml?.bahanAjar && showHtmlPreview(planToShow.generatedHtml.bahanAjar)}
                                                    showConfirmation={showConfirmation}
                                                />
                                                <MaterialItem
                                                    title="Bahan Bacaan Siswa"
                                                    isLoading={isLoadingAnyMaterial && generatingMaterial === 'bahanBacaanSiswa'}
                                                    htmlContent={planToShow.generatedHtml?.bahanBacaanSiswa}
                                                    onGenerate={() => handleGenerateMaterial('bahanBacaanSiswa')}
                                                    onView={() => planToShow.generatedHtml?.bahanBacaanSiswa && showHtmlPreview(planToShow.generatedHtml.bahanBacaanSiswa)}
                                                    showConfirmation={showConfirmation}
                                                />
                                                <MaterialItem
                                                    title="Game Edukatif Interaktif"
                                                    isLoading={isLoadingAnyMaterial && generatingMaterial === 'game'}
                                                    htmlContent={planToShow.generatedHtml?.game}
                                                    onGenerate={() => handleGenerateMaterial('game')}
                                                    onView={() => planToShow.generatedHtml?.game && showHtmlPreview(planToShow.generatedHtml.game)}
                                                    showConfirmation={showConfirmation}
                                                />
                                                <h5 className="font-semibold text-slate-700 pt-2 border-t mt-4">Lembar Kerja Peserta Didik (LKPD)</h5>
                                                <MaterialItem
                                                    title="LKPD Siswa (untuk dibagikan)"
                                                    isLoading={isLoadingAnyMaterial && generatingMaterial === 'comprehensive_lkpd'}
                                                    htmlContent={lkpdStudentHtml}
                                                    onGenerate={() => handleGenerateMaterial('lkpd')}
                                                    onView={() => {
                                                        if (lkpdStudentHtml && lkpdObservationHtml) {
                                                            showHtmlPreview([
                                                                { title: 'LKPD Siswa', html: lkpdStudentHtml },
                                                                { title: 'Lembar Observasi', html: lkpdObservationHtml }
                                                            ], 0);
                                                        } else if (lkpdStudentHtml) {
                                                            showHtmlPreview(lkpdStudentHtml);
                                                        }
                                                    }}
                                                    showConfirmation={showConfirmation}
                                                />
                                                <MaterialItem
                                                    title="Lembar Observasi Guru"
                                                    isLoading={isLoadingAnyMaterial && generatingMaterial === 'comprehensive_lkpd'}
                                                    htmlContent={lkpdObservationHtml}
                                                    onGenerate={() => handleGenerateMaterial('lkpd')}
                                                    onView={() => {
                                                        if (lkpdStudentHtml && lkpdObservationHtml) {
                                                            showHtmlPreview([
                                                                { title: 'LKPD Siswa', html: lkpdStudentHtml },
                                                                { title: 'Lembar Observasi', html: lkpdObservationHtml }
                                                            ], 1);
                                                        } else if (lkpdObservationHtml) {
                                                            showHtmlPreview(lkpdObservationHtml);
                                                        }
                                                    }}
                                                    showConfirmation={showConfirmation}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : <p>Rencana tidak ditemukan.</p>}
                     </div>
                );

            default:
                return <Loader text="Mempersiapkan asisten AI..." />;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex-shrink-0 relative">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <WandIcon className="h-6 w-6 text-teal-600" />
                        Asisten Perancangan Pembelajaran
                    </h3>
                    <p className="text-sm text-slate-500 pr-10">TP: <span className="font-semibold">{currentTp.id}</span> - {currentTp.deskripsi}</p>
                    <button onClick={onClose} className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-700 rounded-full" aria-label="Tutup"><XIcon className="h-6 w-6" /></button>
                </header>

                {renderContent()}

                <footer className="p-4 bg-slate-100 border-t flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2">
                        {(stage === 'show-plan' || stage === 'ask-time-for-next-step') && (
                            <button onClick={confirmReset} className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:bg-red-50 p-2 rounded-md"><TrashIcon className="h-4 w-4" /> Reset</button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                    {stage === 'ask-time-for-next-step' ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-semibold">Batal</button>
                            <button 
                                onClick={handleContinueFromTimeInput} 
                                disabled={totalAlokasiWaktu <= 0}
                                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold disabled:bg-slate-400"
                            >
                                Lanjutkan & Buat Rencana Adaptif
                            </button>
                        </>
                    ) : stage === 'show-intervention-plan' && adaptiveResult ? (
                        <button onClick={() => { if(currentTp) onSaveAdaptive(currentTp.id, adaptiveResult); onClose(); }} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold">Simpan Rencana Adaptif</button>
                    ) : (stage === 'show-diagnostic' || stage === 'show-diagnostic-for-next-tp') ? (
                        <>
                            <button onClick={handleSaveDraft} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-semibold">Simpan Draft Asesmen</button>
                            <button onClick={handleContinueToPlan} disabled={Object.keys(diagnosticResults).length < students.length} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:bg-slate-400">Lanjut Membuat RPP</button>
                        </>
                    ) : stage === 'configure-plan' ? (
                        <button onClick={handleGeneratePlan} disabled={!canGeneratePlan} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold disabled:bg-slate-400">Buat RPP Terdiferensiasi</button>
                    ) : stage === 'show-plan' ? (
                        <>
                         <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-semibold">Tutup</button>
                        </>
                     ) : null}
                     </div>
                </footer>
                 {isFocusModalOpen && planToShow && (
                    <AssessmentFocusGuideModal
                        isOpen={isFocusModalOpen}
                        onClose={() => setIsFocusModalOpen(false)}
                        focusGroups={allFocusGroupsInPlan}
                        pertemuan={planToShow.pertemuanKe}
                    />
                )}
            </div>
        </div>
    );
}