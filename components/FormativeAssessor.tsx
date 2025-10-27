import React, { useState, useMemo } from 'react';
import type { Student, TujuanPembelajaran, AlurTujuanPembelajaran, LearningPlan, Session, DiagnosticRecommendation, DeepLearningLessonPlan, AdaptiveLessonStep } from '../types';
import { FormativeJournalView } from './formative/FormativeJournalView';
import { FormativeDetailView } from './formative/FormativeDetailView';
import { AiAssistantModal } from './formative/AiAssistantModal';
import { useAppData } from '../hooks/useAppData';

const initialAssistantState: { 
    tp: TujuanPembelajaran | null; 
    mode: 'create' | 'view';
    sessionForViewMode?: Session;
} = { tp: null, mode: 'create', sessionForViewMode: undefined };


export const FormativeAssessor: React.FC = () => {
    const { 
        assessingSession, 
        setAssessingSession,
        filteredStudents,
        filteredCurriculumData,
        handleFormativeStudentsChange,
        handleGenerateKktp,
        loadingKktpId,
        activePlan,
        isFormativeDirty,
        setIsFormativeDirty,
        handleDeleteLatestFormativeSession,
        handleQuickSyncAndSave,
        handleSaveDiagnosticData,
        handleSaveAdaptiveStep,
        handleResetTpData,
        handleSaveGeneratedHtml,
        handleCreatePlannedSession,
        showAlert,
        showConfirmation
    } = useAppData();

    const students = filteredStudents;
    const onStudentsChange = handleFormativeStudentsChange;
    const curriculumData = filteredCurriculumData ? {
        ...filteredCurriculumData,
        alurTujuanPembelajaran: filteredCurriculumData.alurTujuanPembelajaran || [],
    } : null;
    const tujuanPembelajaran = curriculumData?.tujuanPembelajaran || [];

    // The `orderedTps` now directly come from the `curriculumData`, which is pre-sorted in AppContext.
    const orderedTps = curriculumData?.tujuanPembelajaran || [];

    const alurTujuanPembelajaran = (filteredCurriculumData?.alurTujuanPembelajaran || []);

    const [assistantModalState, setAssistantModalState] = useState(initialAssistantState);
    
    const assessingTp = React.useMemo(() => curriculumData?.tujuanPembelajaran.find(tp => tp.id === assessingSession?.tpId), [curriculumData, assessingSession]);

    const journalEntries = useMemo(() => {
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
    }, [students, tujuanPembelajaran]);

    const isAssessingSessionLocked = useMemo(() => {
        if (!assessingSession || journalEntries.length < 2) {
            return false;
        }
        // The latest session is the first one in the sorted journalEntries array
        return assessingSession.pertemuan !== journalEntries[0].pertemuan;
    }, [assessingSession, journalEntries]);


    return (
        <div className={`
            ${assessingSession ? 'h-full flex flex-col' : ''}
        `}>
            {assessingSession && assessingTp ? (
                <FormativeDetailView
                    assessingSession={assessingSession}
                    setAssessingSession={setAssessingSession}
                    assessingTp={assessingTp}
                    students={students}
                    onStudentsChange={onStudentsChange}
                    onGenerateKktp={handleGenerateKktp}
                    loadingKktpId={loadingKktpId}
                    setAssistantModalState={setAssistantModalState}
                    activePlan={activePlan}
                    isDirty={isFormativeDirty}
                    setIsDirty={setIsFormativeDirty}
                    journalEntries={journalEntries}
                    isLocked={isAssessingSessionLocked}
                />
            ) : (
                <FormativeJournalView
                    students={students}
                    tujuanPembelajaran={tujuanPembelajaran}
                    orderedTps={orderedTps}
                    alurTujuanPembelajaran={alurTujuanPembelajaran}
                    setAssessingSession={setAssessingSession}
                    setAssistantModalState={setAssistantModalState}
                    isDirty={isFormativeDirty}
                    onDeleteLatestFormativeSession={handleDeleteLatestFormativeSession}
                    onQuickSyncAndSave={handleQuickSyncAndSave}
                    handleCreatePlannedSession={handleCreatePlannedSession}
                    journalEntries={journalEntries}
                    // FIX: Pass showAlert and showConfirmation props to FormativeJournalView
                    showAlert={showAlert}
                    showConfirmation={showConfirmation}
                />
            )}

            {assistantModalState.tp && (
                <AiAssistantModal
                    key={assistantModalState.tp.id}
                    isOpen={!!assistantModalState.tp}
                    onClose={() => setAssistantModalState(initialAssistantState)}
                    initialMode={assistantModalState.mode || 'create'}
                    sessionForViewMode={assessingSession || assistantModalState.sessionForViewMode}
                    tp={assistantModalState.tp}
                    students={students}
                    orderedTps={orderedTps}
                    activePlan={activePlan}
                    onSaveDiagnostic={handleSaveDiagnosticData}
                    onSaveAdaptive={handleSaveAdaptiveStep}
                    onGenerateKktp={handleGenerateKktp}
                    loadingKktpId={loadingKktpId}
                    onResetTpData={handleResetTpData}
                    onSaveGeneratedHtml={handleSaveGeneratedHtml}
                    // FIX: Pass showAlert and showConfirmation props to AiAssistantModal
                    showAlert={showAlert}
                    showConfirmation={showConfirmation}
                />
            )}
        </div>
    );
};