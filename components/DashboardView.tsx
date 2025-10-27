import React, { useState, useMemo } from 'react';
import type { Student, CurriculumData, TujuanPembelajaran, Session, Assessment, ClassProfile } from '../types';
import { Card } from './Card';
import { WandIcon, UsersIcon } from './icons';
import { FocusCard } from './dashboard/FocusCard';
import { AttentionCard } from './dashboard/AttentionCard';
import { ProgressChartCard } from './dashboard/ProgressChartCard';
import { UtilityCard } from './dashboard/UtilityCard';
import { InterventionListCard } from './dashboard/InterventionListCard';
import { RemedialAssessorModal } from './dashboard/RemedialAssessorModal';
import { calculateTpCompletion } from './formative/utils';
import { useAppData } from '../hooks/useAppData';

// =================================================================
// CONSTANTS
// =================================================================
const KETUNTASAN_KELAS_THRESHOLD = 70; // in percent

// =================================================================
// MAIN DASHBOARD COMPONENT
// =================================================================
export const DashboardView: React.FC = () => {
    const { 
        filteredStudents, 
        activePlan,
        filteredCurriculumData,
        handleSaveRemedialAssessment,
        activeClassId,
        setActiveView,
        setAssessingSession,
    } = useAppData();

    const [remedialModalState, setRemedialModalState] = useState<{ student: Student; tp: TujuanPembelajaran } | null>(null);

    // Full, unfiltered list of TPs in their ATP order
    const fullOrderedTps = useMemo(() => {
        const curriculum = activePlan?.curriculum;
        if (!curriculum) return [];
        const atpOrder = curriculum.alurTujuanPembelajaran?.map(item => item.tpId) || [];
        const tpMap = new Map(curriculum.tujuanPembelajaran.map(tp => [tp.id, tp]));
        const ordered = atpOrder.map(id => tpMap.get(id)).filter((tp): tp is TujuanPembelajaran => !!tp);
        const unordered = curriculum.tujuanPembelajaran.filter(tp => !atpOrder.includes(tp.id));
        return [...ordered, ...unordered];
    }, [activePlan]);

    // All TPs, needed for journal entry calculation
    const allTps = useMemo(() => activePlan?.curriculum.tujuanPembelajaran || [], [activePlan]);

    // Calculate journal entries to find the latest session
    const journalEntries = useMemo(() => {
        const students = filteredStudents;
        const tujuanPembelajaran = allTps;
        if (!students || !tujuanPembelajaran) return [];
    
        const sessions = new Map<number, { tps: Set<string>; date: number }>();
    
        students.forEach(s => {
            [...(s.assessments || []), ...(s.dplObservations || [])].forEach(item => {
                if (item.pertemuan) {
                    if (!sessions.has(item.pertemuan)) {
                        sessions.set(item.pertemuan, { tps: new Set(), date: item.timestamp });
                    }
                    const sessionData = sessions.get(item.pertemuan)!;
                    sessionData.tps.add(item.tpId);
                    if (item.timestamp < sessionData.date) {
                        sessionData.date = item.timestamp;
                    }
                }
            });
        });
    
        tujuanPembelajaran.forEach(tp => {
            if (tp.diagnosticData?.plan) {
                const pertemuan = tp.diagnosticData.plan.pertemuanKe;
                if (!sessions.has(pertemuan)) sessions.set(pertemuan, { tps: new Set(), date: tp.diagnosticData.timestamp });
                const sessionEntry = sessions.get(pertemuan)!;
                sessionEntry.tps.add(tp.id);
                if (tp.diagnosticData.timestamp < sessionEntry.date) sessionEntry.date = tp.diagnosticData.timestamp;
            }
            tp.adaptiveSteps?.forEach(step => {
                if (step.nextPlan) {
                    const pertemuan = step.nextPlan.pertemuanKe;
                    if (!sessions.has(pertemuan)) sessions.set(pertemuan, { tps: new Set(), date: step.timestamp });
                    const sessionEntry = sessions.get(pertemuan)!;
                    sessionEntry.tps.add(tp.id);
                    if (step.timestamp < sessionEntry.date) sessionEntry.date = step.timestamp;
                }
            });
            tp.plannedSessions?.forEach(planned => {
                const { pertemuan, timestamp } = planned;
                if (!sessions.has(pertemuan)) {
                    sessions.set(pertemuan, { tps: new Set(), date: timestamp });
                }
                const sessionEntry = sessions.get(pertemuan)!;
                sessionEntry.tps.add(tp.id);
                if (timestamp < sessionEntry.date) {
                    sessionEntry.date = timestamp;
                }
            });
        });
    
        return Array.from(sessions.entries())
            .map(([pertemuan, data]) => {
                const tpDetails = Array.from(data.tps)
                    .map(tpId => tujuanPembelajaran.find(tp => tp.id === tpId))
                    .filter((tp): tp is TujuanPembelajaran => !!tp);
                return { pertemuan, tps: tpDetails, date: data.date };
            })
            .sort((a, b) => b.pertemuan - a.pertemuan);
    }, [filteredStudents, allTps]);
    
    const assessedPertemuanNumbers = useMemo(() => {
        return new Set(filteredStudents.flatMap(s => s.assessments.map(a => a.pertemuan)));
    }, [filteredStudents]);
    
    const assessedTpIds = useMemo(() => {
        return new Set(filteredStudents.flatMap(s => s.assessments.map(a => a.tpId)));
    }, [filteredStudents]);

    const lastSession = useMemo(() => journalEntries[0] || null, [journalEntries]);
    const isLastSessionAssessed = useMemo(() => lastSession ? assessedPertemuanNumbers.has(lastSession.pertemuan) : true, [lastSession, assessedPertemuanNumbers]);


    // Determine the recommended focus TP based on the latest journal entry and class completion
    const recommendedFocus = useMemo(() => {
        const alurTujuanPembelajaran = activePlan?.curriculum.alurTujuanPembelajaran || [];
    
        if (fullOrderedTps.length === 0 || alurTujuanPembelajaran.length === 0) {
            return { tp: fullOrderedTps[0] || null };
        }
    
        const lastAssessedSession = journalEntries.find(j => assessedPertemuanNumbers.has(j.pertemuan));

        if (!lastAssessedSession || lastAssessedSession.tps.length === 0) {
            const firstTp = fullOrderedTps.find(t => t.id === alurTujuanPembelajaran[0]?.tpId) || fullOrderedTps[0];
            return { tp: firstTp };
        }
    
        const tpSaatIni = lastAssessedSession.tps[0];
        const { tuntasCount } = calculateTpCompletion(tpSaatIni, filteredStudents);
        const persenTuntas = filteredStudents.length > 0 ? (tuntasCount / filteredStudents.length) * 100 : 100;
    
        const atpIndex = alurTujuanPembelajaran.findIndex(atp => atp.tpId === tpSaatIni.id);
        const atpBerikutnya = (atpIndex > -1 && atpIndex < alurTujuanPembelajaran.length - 1) ? alurTujuanPembelajaran[atpIndex + 1] : null;
    
        if (!atpBerikutnya) {
            return { tp: tpSaatIni };
        }
    
        const tpBerikutnya = fullOrderedTps.find(t => t.id === atpBerikutnya.tpId);
    
        if (persenTuntas >= KETUNTASAN_KELAS_THRESHOLD) {
            return { tp: tpBerikutnya };
        } else {
            return { tp: tpSaatIni };
        }
    }, [fullOrderedTps, filteredStudents, activePlan, journalEntries, assessedPertemuanNumbers]);

    const { focusTp, buttonText, onNavigate } = useMemo(() => {
        if (lastSession && !isLastSessionAssessed) {
            // Case 1: Latest session is created but not yet assessed.
            const tpForUnassessedSession = lastSession.tps[0];
            return {
                focusTp: tpForUnassessedSession,
                buttonText: `Input Nilai (Pertemuan ke-${lastSession.pertemuan})`,
                onNavigate: () => {
                    if (tpForUnassessedSession) {
                        setAssessingSession({ tpId: tpForUnassessedSession.id, pertemuan: lastSession.pertemuan });
                        setActiveView('assessor');
                    }
                },
            };
        } else {
            // Case 2: All sessions are assessed, or no sessions exist.
            const determinedFocusTp = recommendedFocus.tp;
            if (!determinedFocusTp) {
                return { focusTp: null, buttonText: 'Selesai!', onNavigate: () => setActiveView('assessor') };
            }

            const nextPertemuan = (lastSession?.pertemuan || 0) + 1;
            const nextSessionExists = journalEntries.some(entry => entry.pertemuan === nextPertemuan);
            const text = nextSessionExists 
                ? `Lanjutkan Asesmen (Pertemuan ke-${nextPertemuan})`
                : `Buat Asesmen (Pertemuan ke-${nextPertemuan})`;

            return {
                focusTp: determinedFocusTp,
                buttonText: text,
                onNavigate: () => setActiveView('assessor'),
            };
        }
    }, [lastSession, isLastSessionAssessed, recommendedFocus, journalEntries, setActiveView, setAssessingSession]);

    // Intervention list now uses the full history relative to the new, correct focusTp
    const interventionList = useMemo(() => {
        const interventions: { student: Student; tp: TujuanPembelajaran }[] = [];
        if (!focusTp || filteredStudents.length === 0) return interventions;

        const focusTpIndex = fullOrderedTps.findIndex(tp => tp.id === focusTp.id);
        if (focusTpIndex <= 0) return interventions;

        const potentialHistoricalTps = fullOrderedTps.slice(0, focusTpIndex);
        // CRITICAL FIX: Only consider TPs that have actually been taught/assessed.
        const actuallyAssessedHistoricalTps = potentialHistoricalTps.filter(tp => assessedTpIds.has(tp.id));
        
        for (const student of filteredStudents) {
            for (const tp of actuallyAssessedHistoricalTps) {
                 const { tuntasCount } = calculateTpCompletion(tp, [student]);
                 if (tuntasCount === 0) {
                    interventions.push({ student, tp });
                    break; 
                 }
            }
        }
        return interventions;
    }, [filteredStudents, fullOrderedTps, focusTp, assessedTpIds]);

    // TPs ordered correctly but only for the currently selected semester
    const semesterOrderedTps = useMemo(() => {
        const curriculum = filteredCurriculumData;
        if (!curriculum) return [];
        const atpOrder = curriculum.alurTujuanPembelajaran?.map(item => item.tpId) || [];
        const tpMap = new Map(curriculum.tujuanPembelajaran.map(tp => [tp.id, tp]));
        return atpOrder.map(id => tpMap.get(id)).filter((tp): tp is TujuanPembelajaran => !!tp);
    }, [filteredCurriculumData]);

    const chartData = useMemo(() => {
        if (filteredStudents.length === 0 || semesterOrderedTps.length === 0) return [];
        
        const assessedTpsInOrder = semesterOrderedTps.filter(tp => assessedTpIds.has(tp.id));
        
        if (assessedTpsInOrder.length === 0) return [];
    
        return assessedTpsInOrder.map(tp => {
            const { tuntasCount, totalStudents } = calculateTpCompletion(tp, filteredStudents);
            const completion = totalStudents > 0 ? (tuntasCount / totalStudents) * 100 : 0;
            return { tpId: tp.id, completion };
        });
    }, [semesterOrderedTps, filteredStudents, assessedTpIds]);

    // Struggling students should be based on their entire history
    const strugglingStudents = useMemo(() => {
        if (filteredStudents.length === 0 || fullOrderedTps.length === 0) return [];
        return filteredStudents.map(student => {
            let notTuntasCount = 0;
            const studentAssessedTpIds = new Set(student.assessments.map(a => a.tpId));
            const relevantTps = fullOrderedTps.filter(tp => studentAssessedTpIds.has(tp.id));

            relevantTps.forEach(tp => {
                const { tuntasCount } = calculateTpCompletion(tp, [student]);
                if (tuntasCount === 0) notTuntasCount++;
            });
            return { student, struggleScore: notTuntasCount };
        })
        .filter(item => item.struggleScore > 0)
        .sort((a, b) => b.struggleScore - a.struggleScore);
    }, [filteredStudents, fullOrderedTps]);

    // Challenging TPs should be contextual to the current semester
    const challengingTps = useMemo(() => {
        if (filteredStudents.length === 0 || semesterOrderedTps.length === 0) return [];
        return semesterOrderedTps.map(tp => {
            // A TP is a candidate for "challenging" if it has *any* assessment data,
            // including data from Quick Sync (pertemuan: 0), making it sync with user expectations.
            if (!assessedTpIds.has(tp.id)) {
                return null;
            }
            
            const { tuntasCount, totalStudents } = calculateTpCompletion(tp, filteredStudents);
            const completionRate = totalStudents > 0 ? (tuntasCount / totalStudents) : 1;
            return { tp, completionRate };
        })
        .filter((item): item is { tp: TujuanPembelajaran, completionRate: number } => item !== null && item.completionRate < 1)
        .sort((a, b) => a.completionRate - b.completionRate)
        .slice(0, 3);
    }, [filteredStudents, semesterOrderedTps, assessedTpIds]);

    if (!activeClassId) {
        return (
          <div className="flex h-full items-center justify-center">
            <Card>
                <div className="text-center p-8">
                <UsersIcon className="mx-auto h-12 w-12 text-slate-400" />
                <h2 className="text-xl font-bold text-slate-700 mt-4">Pilih Kelas Terlebih Dahulu</h2>
                <p className="mt-2 text-slate-500 max-w-sm">Untuk melihat dashboard, silakan pilih kelas aktif dari menu di atas, atau buat kelas baru di menu Pengaturan.</p>
                 <button
                    onClick={() => setActiveView('settings')}
                    className="mt-4 flex items-center gap-2 text-md font-semibold text-white bg-indigo-600 border border-indigo-600 rounded-md px-5 py-2 hover:bg-indigo-700 transition-colors mx-auto"
                >
                    <UsersIcon className="h-5 w-5" />
                    <span>Buka Manajemen Kelas</span>
                </button>
                </div>
            </Card>
          </div>
        );
    }

    const handleOpenRemedialModal = (student: Student, tp: TujuanPembelajaran) => {
        setRemedialModalState({ student, tp });
    };
  
    const handleSaveRemedial = (assessments: { aspek: string; level: 1 | 2 | 3 | 4 }[]) => {
        if (!remedialModalState) return;
        handleSaveRemedialAssessment(remedialModalState.student.id, remedialModalState.tp.id, assessments);
        setRemedialModalState(null);
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <FocusCard 
                    tp={focusTp} 
                    students={filteredStudents}
                    onNavigate={onNavigate}
                    buttonText={buttonText}
                />
                <InterventionListCard
                    interventions={interventionList}
                    onOpenRemedialModal={handleOpenRemedialModal}
                />
                <AttentionCard 
                    strugglingStudents={strugglingStudents}
                    challengingTps={challengingTps}
                />
                <div className="md:col-span-2 xl:col-span-3">
                    <ProgressChartCard data={chartData} totalStudents={filteredStudents.length} />
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                    <UtilityCard />
                </div>
            </div>
        
            {remedialModalState && (
                <RemedialAssessorModal
                    student={remedialModalState.student}
                    tp={remedialModalState.tp}
                    onClose={() => setRemedialModalState(null)}
                    onSave={handleSaveRemedial}
                />
            )}
        </>
    );
};