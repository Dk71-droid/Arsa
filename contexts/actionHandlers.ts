import type { Dispatch, SetStateAction } from 'react';
import * as geminiService from '../services/geminiService';
import * as dbService from '../services/dbService';
import type { LearningPlan, Student, CurriculumData, TujuanPembelajaran, Assessment, AdaptiveLessonStep, DeepLearningLessonPlan, Kktp, ClassProfile, DiagnosticRecommendation } from '../types';

interface AppSettings {
    schoolName?: string;
    principalName?: string;
    principalNIP?: string;
    academicYear?: string;
}

type Setters = {
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    setError: Dispatch<SetStateAction<string | null>>;
    setLearningPlans: Dispatch<SetStateAction<LearningPlan[]>>;
    setActivePlanId: (id: string | null) => void;
    setIsGeneratingNewPlan: Dispatch<SetStateAction<boolean>>;
    setMasterStudents: Dispatch<SetStateAction<Student[]>>;
    updatePlan: (planId: string, updates: Partial<LearningPlan>) => void;
    setIsAtpRegenerating: Dispatch<SetStateAction<boolean>>;
    setIsTpRegenerating: Dispatch<SetStateAction<boolean>>;
    setLoadingKktpId: Dispatch<SetStateAction<string | null>>;
};

type State = {
    learningPlans: LearningPlan[];
    activePlanId: string | null;
    masterStudents: Student[];
    activePlan: LearningPlan | null;
    settings: AppSettings;
    activeClassProfile: ClassProfile | null;
};

type HandlerDependencies = {
    setters: Setters;
    state: State;
};

export const handleGenerateCurriculum = async (
    params: { subject: string; cp: string; phase: string; },
    { setters, state }: HandlerDependencies
) => {
    if (!params.subject || !params.phase) return;
    setters.setIsLoading(true); setters.setError(null);
    try {
        const { capaianPembelajaran, tujuanPembelajaran, alurTujuanPembelajaran, unitPembelajaran } = await geminiService.generateTpsFromCp(params.cp, params.phase, params.subject);
        
        const newCurriculumData: CurriculumData = { 
            phase: params.phase, 
            subject: params.subject, 
            capaianPembelajaran, 
            tujuanPembelajaran, 
            alurTujuanPembelajaran, 
            unitPembelajaran 
        };

        const newPlan: LearningPlan = { id: `plan_${Date.now()}`, name: `${params.subject} Fase ${params.phase}`, curriculum: newCurriculumData };
        setters.setLearningPlans(prev => [...prev, newPlan]);
        
        await dbService.savePlan(newPlan);
        setters.setActivePlanId(newPlan.id);
        setters.setIsGeneratingNewPlan(false);
    } catch (e) {
        console.error(e);
        const message = e instanceof Error ? e.message : "Gagal membuat rancangan pembelajaran.";
        setters.setError(message);
    } finally {
        setters.setIsLoading(false);
    }
};

export const handleRegenerateCurriculum = async (
    regeneratingPlanId: string | null,
    { setters, state }: HandlerDependencies
) => {
    if (!regeneratingPlanId) return;
    const planToRegenerate = state.learningPlans.find(p => p.id === regeneratingPlanId);
    if (!planToRegenerate) return;
    setters.setIsLoading(true); setters.setError(null);
    try {
        const oldTpIds = new Set(planToRegenerate.curriculum.tujuanPembelajaran.map(tp => tp.id));
        const { capaianPembelajaran, phase, subject } = planToRegenerate.curriculum;
        
        const { tujuanPembelajaran, alurTujuanPembelajaran, unitPembelajaran } = await geminiService.generateTpsFromCp(capaianPembelajaran, phase, subject);
        
        const newCurriculumData: CurriculumData = { ...planToRegenerate.curriculum, tujuanPembelajaran, alurTujuanPembelajaran, unitPembelajaran };
        setters.updatePlan(planToRegenerate.id, { curriculum: newCurriculumData });

        const studentsToUpdate: Student[] = [];
        const newMasterStudents = state.masterStudents.map(student => {
            const assessments = student.assessments.filter(a => !oldTpIds.has(a.tpId));
            const summativeAssessments = student.summativeAssessments.filter(sa => !oldTpIds.has(sa.tpId));
            const dplObservations = (student.dplObservations || []).filter(obs => !oldTpIds.has(obs.tpId));
            if (assessments.length !== student.assessments.length || summativeAssessments.length !== student.summativeAssessments.length || dplObservations.length !== (student.dplObservations || []).length) {
                const updatedStudent = { ...student, assessments, summativeAssessments, dplObservations };
                studentsToUpdate.push(updatedStudent); return updatedStudent;
            }
            return student;
        });
        setters.setMasterStudents(newMasterStudents);
        if (studentsToUpdate.length > 0) await dbService.saveAllStudents(studentsToUpdate);
    } catch (e) {
        console.error("Failed to regenerate curriculum", e);
        const message = e instanceof Error ? e.message : "Gagal membuat ulang rancangan.";
        setters.setError(message);
    } finally {
        setters.setIsLoading(false);
    }
};

export const handleTpsUpdated = async (
    planId: string, newTpsRaw: TujuanPembelajaran[], { setters, state }: HandlerDependencies
) => {
    const plan = state.learningPlans.find(p => p.id === planId);
    if (!plan) return;
    setters.setIsTpRegenerating(true); setters.setError(null);
    try {
        const newTps = newTpsRaw.map((tp, index) => ({ ...tp, id: `TP-${index + 1}` }));
        const oldTpIds = new Set(plan.curriculum.tujuanPembelajaran.map(tp => tp.id));
        const newTpIds = new Set(newTps.map(tp => tp.id));
        const deletedTpIds = new Set([...oldTpIds].filter(id => !newTpIds.has(id)));
        const { phase, subject, capaianPembelajaran } = plan.curriculum;
        const { alurTujuanPembelajaran, unitPembelajaran } = await geminiService.regenerateAtpAndUnits(newTps, phase, subject, capaianPembelajaran);
        const newCurriculumData: CurriculumData = { ...plan.curriculum, tujuanPembelajaran: newTps, alurTujuanPembelajaran, unitPembelajaran };
        setters.updatePlan(planId, { curriculum: newCurriculumData });
        if (deletedTpIds.size > 0) {
            const studentsToUpdate: Student[] = [];
            const newMasterStudents = state.masterStudents.map(student => {
                const assessments = student.assessments.filter(a => !deletedTpIds.has(a.tpId));
                const summativeAssessments = student.summativeAssessments.filter(sa => !deletedTpIds.has(sa.tpId));
                const dplObservations = (student.dplObservations || []).filter(obs => !deletedTpIds.has(obs.tpId));
                if (assessments.length !== student.assessments.length || summativeAssessments.length !== student.summativeAssessments.length || dplObservations.length !== (student.dplObservations || []).length) {
                    const updatedStudent = { ...student, assessments, summativeAssessments, dplObservations };
                    studentsToUpdate.push(updatedStudent); return updatedStudent;
                }
                return student;
            });
            setters.setMasterStudents(newMasterStudents);
            if (studentsToUpdate.length > 0) await dbService.saveAllStudents(studentsToUpdate);
        }
    } catch (e) {
        console.error("Failed to update TPs and regenerate curriculum", e);
        const message = e instanceof Error ? e.message : "Gagal memperbarui TP dan menyusun ulang rancangan.";
        setters.setError(message);
    } finally {
        setters.setIsTpRegenerating(false);
    }
};

export const handleRegenerateAtp = async (
    planId: string, tpAllocation: Record<string, string[]>, { setters, state }: HandlerDependencies
) => {
    const plan = state.learningPlans.find(p => p.id === planId);
    if (!plan) return; setters.setIsAtpRegenerating(true);
    try {
        const { phase, subject, tujuanPembelajaran } = plan.curriculum;
        const newAtp = await geminiService.regenerateAtpBasedOnOrder(tpAllocation, tujuanPembelajaran, phase, subject);
        setters.updatePlan(planId, { curriculum: { ...plan.curriculum, alurTujuanPembelajaran: newAtp } });
    } catch (e) {
        console.error("Failed to regenerate ATP with AI", e);
        const message = e instanceof Error ? e.message : "Gagal menyusun ulang ATP.";
        setters.setError(message);
    } finally {
        setters.setIsAtpRegenerating(false);
    }
};

export const handleFullRegenerateAtp = async (
    planId: string, { setters, state }: HandlerDependencies
) => {
    const plan = state.learningPlans.find(p => p.id === planId);
    if (!plan) return; setters.setIsAtpRegenerating(true);
    try {
        const { phase, subject, tujuanPembelajaran } = plan.curriculum;
        const newAtp = await geminiService.generateAtp(tujuanPembelajaran, phase, subject);
        setters.updatePlan(planId, { curriculum: { ...plan.curriculum, alurTujuanPembelajaran: newAtp } });
    } catch (e) {
        console.error("Failed to fully regenerate ATP with AI", e);
        const message = e instanceof Error ? e.message : "Gagal menyusun ulang ATP.";
        setters.setError(message);
    } finally {
        setters.setIsAtpRegenerating(false);
    }
};

export const handleGenerateKktp = async (
    tpId: string, viewingPlanId: string | null, { setters, state }: HandlerDependencies
) => {
    const planToView = state.learningPlans.find(p => p.id === viewingPlanId || p.id === state.activePlanId);
    if (!planToView) return; 
    setters.setLoadingKktpId(tpId);
    try {
        const tp = planToView.curriculum.tujuanPembelajaran.find(t => t.id === tpId);
        if (!tp) throw new Error("TP not found");
        const kelas = state.activeClassProfile?.name || '';
        const { capaianPembelajaran, tujuanPembelajaran, phase } = planToView.curriculum;
        const kktp = await geminiService.generateKktpForTp(tp, capaianPembelajaran, tujuanPembelajaran, phase, kelas);
        const updatedTps = planToView.curriculum.tujuanPembelajaran.map(t => t.id === tpId ? { ...t, kktp } : t);
        setters.updatePlan(planToView.id, { curriculum: { ...planToView.curriculum, tujuanPembelajaran: updatedTps } });
    } catch (e) {
        console.error(e);
        const message = e instanceof Error ? e.message : `Gagal membuat KKTP untuk ${tpId}.`;
        setters.setError(message);
    } finally {
        setters.setLoadingKktpId(null);
    }
};

export const handleSaveDiagnosticData = (
    tpId: string,
    data: Partial<Omit<NonNullable<TujuanPembelajaran['diagnosticData']>, 'timestamp'>>,
    { state, setters }: HandlerDependencies
) => {
    if (!state.activePlan) return;

    const updatedTps = state.activePlan.curriculum.tujuanPembelajaran.map(tp => {
        if (tp.id === tpId) {
            const existingData = tp.diagnosticData;
            
            const newDiagnosticData: NonNullable<TujuanPembelajaran['diagnosticData']> = {
                recommendation: data.recommendation ?? existingData?.recommendation!,
                summary: data.summary ?? existingData?.summary,
                plan: data.plan ?? existingData?.plan,
                timestamp: Date.now(),
            };

            if (!newDiagnosticData.recommendation) {
                 console.error("Attempted to save diagnostic data without a recommendation");
                 return tp;
            }

            return { ...tp, diagnosticData: newDiagnosticData };
        }
        return tp;
    });

    setters.updatePlan(state.activePlan.id, { curriculum: { ...state.activePlan.curriculum, tujuanPembelajaran: updatedTps } });
};


export const handleSaveAdaptiveStep = (
    tpId: string, step: AdaptiveLessonStep, { state, setters }: HandlerDependencies
) => {
    if (!state.activePlan) return;
    const updatedTps = state.activePlan.curriculum.tujuanPembelajaran.map(tp => tp.id === tpId ? { ...tp, adaptiveSteps: [...(tp.adaptiveSteps || []), step] } : tp);
    setters.updatePlan(state.activePlan.id, { curriculum: { ...state.activePlan.curriculum, tujuanPembelajaran: updatedTps } });
};

export const handleSaveGeneratedHtml = (
    tpId: string, data: { pertemuan: number; materialType: 'bahanAjar' | 'bahanBacaanSiswa' | 'lkpd' | 'infographicQuiz' | 'rppLengkap' | 'game'; htmlContent: any; lkpdKey?: string; }, { state, setters }: HandlerDependencies
) => {
    if (!state.activePlan) return;
    const { pertemuan, materialType, htmlContent, lkpdKey } = data;
    const updatedTps = state.activePlan.curriculum.tujuanPembelajaran.map(tp => {
        if (tp.id !== tpId) return tp;
        let updatedTp = { ...tp };
        const updateGeneratedHtml = (plan: DeepLearningLessonPlan) => {
            const newPlan = { ...plan, generatedHtml: { ...(plan.generatedHtml || {}) } };
            if (materialType === 'lkpd' && lkpdKey) {
                if (!newPlan.generatedHtml.lkpd) newPlan.generatedHtml.lkpd = {};
                newPlan.generatedHtml.lkpd[lkpdKey] = htmlContent;
            } else if (materialType === 'game') {
                newPlan.generatedHtml.game = htmlContent;
            } else if (materialType !== 'lkpd') {
                (newPlan.generatedHtml as any)[materialType] = htmlContent;
            }
            return newPlan;
        };
        
        let planFound = false;
        // Check diagnostic plan first
        if (tp.diagnosticData?.plan?.pertemuanKe === pertemuan) {
            updatedTp.diagnosticData = { ...tp.diagnosticData, plan: updateGeneratedHtml(tp.diagnosticData.plan) };
            planFound = true;
        } 
        
        // Then check adaptive steps if not found
        if (!planFound && tp.adaptiveSteps) {
            const stepIndex = tp.adaptiveSteps.findIndex(step => step.nextPlan?.pertemuanKe === pertemuan);
            if (stepIndex > -1 && tp.adaptiveSteps[stepIndex].nextPlan) {
                const newSteps = [...tp.adaptiveSteps];
                newSteps[stepIndex] = { ...newSteps[stepIndex], nextPlan: updateGeneratedHtml(tp.adaptiveSteps[stepIndex].nextPlan!) };
                updatedTp.adaptiveSteps = newSteps;
                planFound = true;
            }
        }

        return updatedTp;
    });
    setters.updatePlan(state.activePlan.id, { curriculum: { ...state.activePlan.curriculum, tujuanPembelajaran: updatedTps } });
};

export const handleResetTpData = async (
    tpId: string, { state, setters }: HandlerDependencies
) => {
    if (!state.activePlan) return;
    const updatedTps = state.activePlan.curriculum.tujuanPembelajaran.map(tp => tp.id === tpId ? { ...tp, diagnosticData: undefined, adaptiveSteps: undefined } : tp);
    setters.updatePlan(state.activePlan.id, { curriculum: { ...state.activePlan.curriculum, tujuanPembelajaran: updatedTps } });
    const studentsToUpdate: Student[] = [];
    const newMasterStudents = state.masterStudents.map(student => {
        const assessments = student.assessments.filter(a => a.tpId !== tpId);
        const dplObservations = (student.dplObservations || []).filter(obs => obs.tpId !== tpId);
        if (assessments.length !== student.assessments.length || dplObservations.length !== (student.dplObservations || []).length) {
            const updatedStudent = { ...student, assessments, dplObservations };
            studentsToUpdate.push(updatedStudent); return updatedStudent;
        }
        return student;
    });
    setters.setMasterStudents(newMasterStudents);
    if (studentsToUpdate.length > 0) await dbService.saveAllStudents(studentsToUpdate);
};

export const handleDeleteLatestFormativeSession = async (
    pertemuanToDelete: number, { state, setters }: HandlerDependencies
) => {
    if (!state.activePlan) return;

    // --- Part 1: Clean up Plan data (planned sessions, RPPs, etc.) ---
    const updatedTps = state.activePlan.curriculum.tujuanPembelajaran.map(tp => {
        const newTp = { ...tp };
        let planModified = false;
        
        if (newTp.diagnosticData?.plan?.pertemuanKe === pertemuanToDelete) {
            delete newTp.diagnosticData;
            planModified = true;
        }
        if (newTp.adaptiveSteps) {
            const originalLength = newTp.adaptiveSteps.length;
            newTp.adaptiveSteps = newTp.adaptiveSteps.filter(step => step.nextPlan?.pertemuanKe !== pertemuanToDelete);
            if (newTp.adaptiveSteps.length < originalLength) planModified = true;
        }
        if (newTp.plannedSessions) {
            const originalLength = newTp.plannedSessions.length;
            newTp.plannedSessions = newTp.plannedSessions.filter(p => p.pertemuan !== pertemuanToDelete);
            if (newTp.plannedSessions.length < originalLength) planModified = true;
        }
        
        return planModified ? newTp : tp;
    });

    if (JSON.stringify(updatedTps) !== JSON.stringify(state.activePlan.curriculum.tujuanPembelajaran)) {
        const updatedCurriculum = { ...state.activePlan.curriculum, tujuanPembelajaran: updatedTps };
        setters.updatePlan(state.activePlan.id, { curriculum: updatedCurriculum });
    }

    // --- Part 2: Clean up Student assessment data ---
    const studentsToUpdate: Student[] = [];
    
    const newMasterStudents = state.masterStudents.map(student => {
        const originalAssessments = student.assessments || [];
        const originalDplObservations = student.dplObservations || [];

        const newAssessments = originalAssessments.filter(a => a.pertemuan !== pertemuanToDelete);
        const newDplObservations = originalDplObservations.filter(obs => obs.pertemuan !== pertemuanToDelete);

        const hasChanged = newAssessments.length < originalAssessments.length || newDplObservations.length < originalDplObservations.length;

        if (hasChanged) {
            const updatedStudent = { ...student, assessments: newAssessments, dplObservations: newDplObservations };
            studentsToUpdate.push(updatedStudent);
            return updatedStudent;
        }
        
        return student;
    });

    setters.setMasterStudents(newMasterStudents);
    
    if (studentsToUpdate.length > 0) {
        await dbService.saveAllStudents(studentsToUpdate);
    }
};

export const handleQuickSyncAndSave = async (
    syncData: Record<number, Record<string, boolean>>,
    skippedTps: TujuanPembelajaran[],
    { state, setters }: HandlerDependencies
) => {
    if (!state.activePlan) return;
    setters.setIsLoading(true);
    setters.setError(null);
    try {
        const newLearningPlans = JSON.parse(JSON.stringify(state.learningPlans)) as LearningPlan[];
        const newMasterStudents = JSON.parse(JSON.stringify(state.masterStudents)) as Student[];

        const planMap = new Map(newLearningPlans.map(p => [p.id, p]));
        const studentMap = new Map(newMasterStudents.map(s => [s.id!, s]));
        const activePlanInCopy = planMap.get(state.activePlan.id)!;

        // Step 1: Generate missing KKTPs
        const kktpPromises: Promise<void>[] = [];
        const tpsToUpdate = new Map<string, TujuanPembelajaran>();

        skippedTps.forEach(tp => tpsToUpdate.set(tp.id, tp));

        for (const tp of tpsToUpdate.values()) {
            if (!tp.kktp) {
                const promise = (async () => {
                    try {
                        const { capaianPembelajaran, phase } = activePlanInCopy.curriculum;
                        const kelas = state.activeClassProfile?.name || '';
                        const kktp = await geminiService.generateKktpForTp(tp, capaianPembelajaran, activePlanInCopy.curriculum.tujuanPembelajaran, phase, kelas);
                        
                        const tpInPlan = activePlanInCopy.curriculum.tujuanPembelajaran.find(t => t.id === tp.id);
                        if(tpInPlan) tpInPlan.kktp = kktp;
                        
                        // also update the local copy for student data processing
                        tpsToUpdate.get(tp.id)!.kktp = kktp;
                    } catch (e) {
                        console.error(`Failed to generate KKTP for ${tp.id}`, e);
                        // We can decide to throw or continue. For now, we'll let it fail loudly.
                        throw new Error(`Gagal membuat KKTP untuk ${tp.id} saat sinkronisasi.`);
                    }
                })();
                kktpPromises.push(promise);
            }
        }
        await Promise.all(kktpPromises);
        
        // Step 2: Update student assessments
        const timestamp = Date.now();
        for (const studentIdStr in syncData) {
            const studentId = parseInt(studentIdStr, 10);
            const student = studentMap.get(studentId);
            if (!student) continue;

            const tpStatuses = syncData[studentId];
            for (const tpId in tpStatuses) {
                const isTuntas = tpStatuses[tpId];
                const tp = tpsToUpdate.get(tpId);
                if (!tp?.kktp) continue;

                // Remove any existing assessments for this TP with pertemuan 0
                student.assessments = student.assessments.filter(a => !(a.tpId === tpId && a.pertemuan === 0));

                const level = isTuntas ? 3 : 1;
                const note = isTuntas ? "Ditandai 'Tuntas' melalui Sinkronisasi Cepat." : "Ditandai 'Belum Tuntas' melalui Sinkronisasi Cepat.";

                for (const aspek of tp.kktp.rubrik) {
                    student.assessments.push({
                        tpId: tp.id,
                        aspek: aspek.aspek,
                        level,
                        timestamp,
                        pertemuan: 0, // Special value for synced data
                        catatan: note,
                    });
                }
            }
        }

        // Step 3: Commit state changes
        setters.setLearningPlans(newLearningPlans);
        setters.setMasterStudents(Array.from(studentMap.values()));
        
        // Step 4: Persist to DB
        await dbService.saveAllPlans(newLearningPlans);
        await dbService.saveAllStudents(Array.from(studentMap.values()));

    } catch (e) {
        console.error("Quick Sync failed:", e);
        if (e instanceof Error) setters.setError(`Sinkronisasi Cepat Gagal: ${e.message}`);
        else setters.setError("Sinkronisasi Cepat Gagal. Silakan coba lagi.");
    } finally {
        setters.setIsLoading(false);
    }
};

export const handleSaveRemedialAssessment = async (
    studentId: number | undefined,
    tpId: string,
    newAssessments: { aspek: string; level: 1 | 2 | 3 | 4 }[],
    { state, setters }: HandlerDependencies
) => {
    if (studentId === undefined) return;

    let studentToUpdate: Student | undefined;
    const newMasterStudents = state.masterStudents.map(s => {
        if (s.id === studentId) {
            // Deep copy the student to avoid direct state mutation
            studentToUpdate = JSON.parse(JSON.stringify(s));
            
            newAssessments.forEach(({ aspek, level }) => {
                // Find the latest assessment for this student, TP, and aspect
                const assessmentsForAspect = studentToUpdate!.assessments
                    .map((a, index) => ({ ...a, originalIndex: index })) // Keep track of original index
                    .filter(a => a.tpId === tpId && a.aspek === aspek)
                    .sort((a, b) => b.pertemuan - a.pertemuan); // Sort descending by meeting number

                if (assessmentsForAspect.length > 0) {
                    // Get the latest one
                    const latestAssessment = assessmentsForAspect[0];
                    const originalIndex = latestAssessment.originalIndex;

                    // Update the assessment directly in the array
                    studentToUpdate!.assessments[originalIndex] = {
                        ...studentToUpdate!.assessments[originalIndex],
                        level: level,
                        timestamp: Date.now(),
                        catatan: "Nilai diperbarui via remedial."
                    };
                } else {
                    // This case is unlikely if the intervention list is correct, but as a fallback,
                    // we could add a new record. However, the user wants to avoid new sessions.
                    // For now, we only update existing records.
                    console.warn(`No existing assessment found for student ${studentId}, TP ${tpId}, aspect ${aspek} to update remedially.`);
                }
            });
            return studentToUpdate;
        }
        return s;
    });

    // Only update state and DB if a student was actually modified
    if (studentToUpdate) {
        setters.setMasterStudents(newMasterStudents);
        await dbService.saveStudent(studentToUpdate);
    }
};