import React, { useState, useEffect, useMemo, useCallback, createContext } from 'react';
import type { LearningPlan, Student, CurriculumData, ClassProfile, Session, DeepLearningLessonPlan, DiagnosticRecommendation, AdaptiveLessonStep, Kktp, AttendanceRecord, HolidayRecord, Assessment, TujuanPembelajaran, HafalanPackage, HafalanRecord, HafalanStatus } from '../types';
import * as dbService from '../services/dbService';
import * as actions from './actionHandlers';
import { useAuth } from './AuthContext';

type View = 'dashboard' | 'rancanganPembelajaran' | 'absensi' | 'assessor' | 'summativeAssessor' | 'settings' | 'reportView' | 'assessmentMenuView' | 'htmlPreview' | 'hafalan';

interface AppSettings {
    schoolName?: string;
    principalName?: string;
    principalNIP?: string;
    academicYear?: string;
}

interface AppModalState {
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: React.ReactNode;
    onConfirm?: () => void;
    confirmText?: string;
}

type AppContextType = ReturnType<typeof useAppDataLogic>;
export const AppContext = createContext<AppContextType | null>(null);

const useAppDataLogic = () => {
    const { user } = useAuth();
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
    const [classProfiles, setClassProfiles] = useState<ClassProfile[]>([]);
    const [masterStudents, setMasterStudents] = useState<Student[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
    
    const [activePlanId, setActivePlanIdState] = useState<string | null>(null);
    const [activeClassId, setActiveClassIdState] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<AppSettings>({});
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    const [viewingPlanIdInDataKurikulum, setViewingPlanIdInDataKurikulum] = useState<string | null>(null);
    const [isGeneratingNewPlan, setIsGeneratingNewPlan] = useState(false);
    const [assessingSession, setAssessingSession] = useState<Session>(null);
    const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
    const [openMenuPlanId, setOpenMenuPlanId] = useState<string | null>(null);
    const [regeneratingPlanId, setRegeneratingPlanId] = useState<string | null>(null);
    const [isAtpRegenerating, setIsAtpRegenerating] = useState(false);
    const [isTpRegenerating, setIsTpRegenerating] = useState(false);
    const [isFormativeDirty, setIsFormativeDirty] = useState(false);

    const [activeView, _setActiveView] = useState<View>('dashboard');
    const [previousView, setPreviousView] = useState<View | null>(null);
    const [loadingKktpId, setLoadingKktpId] = useState<string | null>(null);
    const [activeSemester, setActiveSemester] = useState<string>('Semester 1');
    
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [dataToExport, setDataToExport] = useState('');
    const [userApiKey, setUserApiKey] = useState<string | null>(null);

    const [appModal, setAppModal] = useState<AppModalState>({ isOpen: false, type: 'alert', title: '', message: '' });
    const [htmlPreviewState, setHtmlPreviewState] = useState<{ content: string | { title: string; html: string; }[]; activeIndex: number } | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);

    const hideAppModal = () => {
        setAppModal(prev => ({ ...prev, isOpen: false }));
        if (error) setError(null);
    };

    const showAlert = useCallback(({ title, message }: Omit<AppModalState, 'isOpen' | 'type' | 'onConfirm'>) => {
        setAppModal({ isOpen: true, type: 'alert', title, message, onConfirm: undefined });
    }, []);

    const showConfirmation = useCallback(({ title, message, onConfirm, confirmText }: Omit<AppModalState, 'isOpen' | 'type'>) => {
        setAppModal({ isOpen: true, type: 'confirm', title, message, onConfirm, confirmText });
    }, []);
    
    const showHtmlPreview = (content: string | { title: string; html: string; }[], activeIndex: number = 0) => {
        setPreviousView(activeView);
        setHtmlPreviewState({ content, activeIndex });
        setActiveView('htmlPreview');
    };
    
    const hideHtmlPreview = () => {
        setActiveView(previousView || 'dashboard');
        setHtmlPreviewState(null);
        setPreviousView(null);
    };

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    
    useEffect(() => {
        if (error) {
            showAlert({ title: "Terjadi Kesalahan", message: error });
        }
    }, [error, showAlert]);

    const setActiveView = (view: View) => { _setActiveView(view); dbService.setAppState('activeView', view); };
    const setActivePlanId = (id: string | null) => { setActivePlanIdState(id); dbService.setAppState('activePlanId', id); };
    const setActiveClassId = (id: string | null) => { setActiveClassIdState(id); dbService.setAppState('activeClassId', id); };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [plans, profiles, students, attendance, holidaysData, activePlan, activeClass, settingsJson, activeView] = await Promise.all([
                    dbService.getAllPlans(), dbService.getAllClassProfiles(), dbService.getAllStudents(), dbService.getAllAttendance(), dbService.getAllHolidays(),
                    dbService.getAppState('activePlanId'), dbService.getAppState('activeClassId'), dbService.getAppState('appSettings'), dbService.getAppState('activeView'),
                ]);
                
                if (user) {
                    const keyData = await dbService.getApiKey(user.uid);
                    setUserApiKey(keyData ? keyData.apiKey : null);
                    const tutorialStatus = await dbService.getAppState(`tutorialCompleted_${user.uid}`);
                    if (tutorialStatus !== 'true') {
                        setShowOnboarding(true);
                    }
                }

                setLearningPlans(plans); setClassProfiles(profiles); setMasterStudents(students); setAttendanceRecords(attendance); setHolidays(holidaysData);
                setSettings(settingsJson ? JSON.parse(settingsJson) : {});
                if (activePlan && plans.some(p => p.id === activePlan)) setActivePlanIdState(activePlan);
                if (activeClass && profiles.some(p => p.id === activeClass)) setActiveClassIdState(activeClass);
                _setActiveView((activeView as View) || 'dashboard');
            } catch (e) { console.error("Failed to load data from IndexedDB", e); setError("Gagal memuat data dari database lokal.");
            } finally { setIsDbLoading(false); }
        };
        loadData();
    }, [user]);
    
    const handleCompleteOnboarding = useCallback(async () => {
        if (user) {
            await dbService.setAppState(`tutorialCompleted_${user.uid}`, 'true');
        }
        setShowOnboarding(false);
    }, [user]);

    useEffect(() => { if (!isDbLoading && learningPlans.length === 0) setIsGeneratingNewPlan(true); }, [isDbLoading, learningPlans.length]);
    useEffect(() => { const handleClickOutside = () => { if (openMenuPlanId) setOpenMenuPlanId(null); }; document.addEventListener('click', handleClickOutside); return () => document.removeEventListener('click', handleClickOutside); }, [openMenuPlanId]);
    useEffect(() => { if (activeView !== 'assessor') setAssessingSession(null); if (activeView !== 'rancanganPembelajaran') setViewingPlanIdInDataKurikulum(null); }, [activeView]);

    const activePlan = useMemo(() => learningPlans.find(p => p.id === activePlanId) || null, [activePlanId, learningPlans]);
    const activeClassProfile = useMemo(() => classProfiles.find(p => p.id === activeClassId) || null, [activeClassId, classProfiles]);

    const updatePlan = useCallback((planId: string, updates: Partial<LearningPlan>) => {
        let updatedPlan: LearningPlan | undefined;
        const newPlans = learningPlans.map(p => {
            if (p.id === planId) { updatedPlan = { ...p, ...updates }; return updatedPlan; } return p;
        });
        setLearningPlans(newPlans);
        if (updatedPlan) dbService.savePlan(updatedPlan);
    }, [learningPlans]);
    
    const addClassProfile = async (profile: Omit<ClassProfile, 'id'>): Promise<ClassProfile> => {
        const newProfile: ClassProfile = { ...profile, id: `class_${Date.now()}` };
        setClassProfiles(prev => [...prev, newProfile]);
        await dbService.saveClassProfile(newProfile);
        return newProfile;
    };

    const updateClassProfile = async (id: string, updates: Partial<ClassProfile>) => {
        let updatedProfile: ClassProfile | undefined;
        const oldProfile = classProfiles.find(p => p.id === id);
        if (!oldProfile) return;

        const newProfiles = classProfiles.map(p => {
            if (p.id === id) { updatedProfile = { ...p, ...updates }; return updatedProfile; }
            return p;
        });
        setClassProfiles(newProfiles);
        if (updatedProfile) await dbService.saveClassProfile(updatedProfile);

        // Update student records if class name changed
        if (updates.name && oldProfile.name !== updates.name) {
            const studentsToUpdate = masterStudents.filter(s => s.kelas === oldProfile.name);
            if (studentsToUpdate.length > 0) {
                const updatedStudents = studentsToUpdate.map(s => ({ ...s, kelas: updates.name! }));
                const newMasterStudents = masterStudents.map(s => {
                    const found = updatedStudents.find(us => us.id === s.id);
                    return found || s;
                });
                setMasterStudents(newMasterStudents);
                await dbService.saveAllStudents(updatedStudents);
            }
        }
    };
    
    const deleteClassProfile = async (id: string) => {
        const profileToDelete = classProfiles.find(p => p.id === id);
        if (!profileToDelete) return;

        showConfirmation({
            title: 'Konfirmasi Hapus Kelas',
            message: `Yakin ingin menghapus kelas "${profileToDelete.name}"? Semua data siswa di kelas ini juga akan dihapus secara permanen.`,
            onConfirm: async () => {
                setClassProfiles(prev => prev.filter(p => p.id !== id));
                await dbService.deleteClassProfile(id);
                
                const studentsToDelete = masterStudents.filter(s => s.kelas === profileToDelete.name);
                if (studentsToDelete.length > 0) {
                    setMasterStudents(prev => prev.filter(s => s.kelas !== profileToDelete.name));
                    for (const student of studentsToDelete) {
                        if(student.id) await dbService.deleteStudent(student.id);
                    }
                }
                
                if (activeClassId === id) setActiveClassId(null);
            }
        });
    };

    const handleBulkAddStudents = async (studentsData: Omit<Student, 'id'>[], className: string) => {
        const newStudentsToSave = studentsData.map(data => ({ ...data, kelas: className }));
        const addedStudents = await dbService.addStudents(newStudentsToSave);
        setMasterStudents(prev => [...prev, ...addedStudents].sort((a, b) => a.nama.localeCompare(b.nama)));
    };
    
    const handleUpdateStudent = useCallback(async (studentId: number, updates: Partial<Student>) => {
        const studentToUpdate = masterStudents.find(s => s.id === studentId);
        if (!studentToUpdate) return;
        const updatedStudent = { ...studentToUpdate, ...updates };
        setMasterStudents(prev => prev.map(s => s.id === studentId ? updatedStudent : s));
        await dbService.saveStudent(updatedStudent);
    }, [masterStudents]);
    
    const handleDeleteStudent = async (studentId: number) => {
        setMasterStudents(prev => prev.filter(s => s.id !== studentId));
        await dbService.deleteStudent(studentId);
    };
    
    const handleFormativeStudentsChange = async (updatedStudents: Student[]) => {
        const studentsToSave = updatedStudents.filter(updatedStudent => {
            const originalStudent = masterStudents.find(s => s.id === updatedStudent.id);
            return !originalStudent || JSON.stringify(originalStudent) !== JSON.stringify(updatedStudent);
        });
        setMasterStudents(updatedStudents);
        if (studentsToSave.length > 0) await dbService.saveAllStudents(studentsToSave);
    };
    
    const handleCreatePlannedSession = useCallback((tpId: string, pertemuan: number) => {
        if (!activePlan) return;
        const updatedTps = activePlan.curriculum.tujuanPembelajaran.map(tp => {
            if (tp.id === tpId) {
                const newPlannedSession = { pertemuan, timestamp: Date.now() };
                const plannedSessions = [...(tp.plannedSessions || []), newPlannedSession];
                return { ...tp, plannedSessions };
            }
            return tp;
        });
        updatePlan(activePlan.id, { curriculum: { ...activePlan.curriculum, tujuanPembelajaran: updatedTps } });
    }, [activePlan, updatePlan]);
    
    const handleShowNewPlanGenerator = () => { setActiveView('rancanganPembelajaran'); setViewingPlanIdInDataKurikulum(null); setIsGeneratingNewPlan(true); };

    const handlerDependencies = {
        state: { learningPlans, activePlanId, masterStudents, activePlan, settings, activeClassProfile },
        setters: { setIsLoading, setError, setLearningPlans, setActivePlanId, setIsGeneratingNewPlan, setMasterStudents, updatePlan, setIsAtpRegenerating, setIsTpRegenerating, setLoadingKktpId }
    };
    
    const handleGenerateCurriculum = useCallback((params: { subject: string; cp: string; phase: string; }) => actions.handleGenerateCurriculum(params, handlerDependencies), [handlerDependencies]);
    const handleRegenerateCurriculum = useCallback(() => actions.handleRegenerateCurriculum(regeneratingPlanId, handlerDependencies), [regeneratingPlanId, handlerDependencies]);
    const handleTpsUpdated = useCallback((planId: string, newTpsRaw: TujuanPembelajaran[]) => actions.handleTpsUpdated(planId, newTpsRaw, handlerDependencies), [handlerDependencies]);
    const handleRegenerateAtp = useCallback((planId: string, tpAllocation: Record<string, string[]>) => actions.handleRegenerateAtp(planId, tpAllocation, handlerDependencies), [handlerDependencies]);
    const handleFullRegenerateAtp = useCallback((planId: string) => actions.handleFullRegenerateAtp(planId, handlerDependencies), [handlerDependencies]);
    const handleGenerateKktp = useCallback((tpId: string) => actions.handleGenerateKktp(tpId, viewingPlanIdInDataKurikulum, handlerDependencies), [viewingPlanIdInDataKurikulum, handlerDependencies]);
    
    const handleUpdateKktp = useCallback((planId: string, tpId: string, newKktp: Kktp) => {
        const planToUpdate = learningPlans.find(p => p.id === planId);
        if (!planToUpdate) return;
        const updatedTps = planToUpdate.curriculum.tujuanPembelajaran.map(tp => tp.id === tpId ? { ...tp, kktp: newKktp } : tp);
        updatePlan(planId, { curriculum: { ...planToUpdate.curriculum, tujuanPembelajaran: updatedTps } });
    }, [learningPlans, updatePlan]);

    const handleDeleteKktp = useCallback((planId: string, tpId: string) => {
        const planToUpdate = learningPlans.find(p => p.id === planId);
        if (!planToUpdate) return;
        const updatedTps = planToUpdate.curriculum.tujuanPembelajaran.map(tp => {
            if (tp.id === tpId) {
                const { kktp, ...restOfTp } = tp;
                return restOfTp;
            }
            return tp;
        });
        updatePlan(planId, { curriculum: { ...planToUpdate.curriculum, tujuanPembelajaran: updatedTps } });
    }, [learningPlans, updatePlan]);
    
    const handleCreateManualKktp = (planId: string, tpId: string) => {
        const planToUpdate = learningPlans.find(p => p.id === planId);
        if (!planToUpdate) return;
        const tp = planToUpdate.curriculum.tujuanPembelajaran.find(t => t.id === tpId);
        if (!tp) return;
        const templateKktp: Kktp = { tpTerkait: tp.deskripsi, elemenCp: 'Isi elemen CP...', asesmenUntuk: 'Sumatif', batasKetercapaian: 'Peserta didik dianggap tuntas jika semua aspek mencapai minimal level \'Cakap\' (3).', rubrik: [{ aspek: 'Aspek Penilaian 1', sifatAspek: 'LEPAS', dplTerkait: [], teknikAsesmen: 'Kinerja', instrumenAsesmen: 'Rubrik Kinerja', kriteria: [{ level: 4, deskripsi: 'Deskripsi untuk level Mahir...' }, { level: 3, deskripsi: 'Deskripsi untuk level Cakap...' }, { level: 2, deskripsi: 'Deskripsi untuk level Layak...' }, { level: 1, deskripsi: 'Deskripsi untuk level Baru Berkembang...' }] }] };
        handleUpdateKktp(planId, tpId, templateKktp);
    };

    const handleDeleteLatestFormativeSession = useCallback((pertemuan: number) => actions.handleDeleteLatestFormativeSession(pertemuan, handlerDependencies), [handlerDependencies]);
    const handleSaveDiagnosticData = useCallback((tpId: string, data: Partial<Omit<NonNullable<TujuanPembelajaran['diagnosticData']>, 'timestamp'>>) => actions.handleSaveDiagnosticData(tpId, data, handlerDependencies), [handlerDependencies]);
    const handleSaveAdaptiveStep = useCallback((tpId: string, step: AdaptiveLessonStep) => actions.handleSaveAdaptiveStep(tpId, step, handlerDependencies), [handlerDependencies]);
    const handleSaveGeneratedHtml = useCallback((tpId: string, data: { pertemuan: number; materialType: 'bahanAjar' | 'bahanBacaanSiswa' | 'lkpd' | 'infographicQuiz' | 'rppLengkap' | 'game'; htmlContent: any; lkpdKey?: string; }) => actions.handleSaveGeneratedHtml(tpId, data, handlerDependencies), [handlerDependencies]);
    const handleResetTpData = useCallback((tpId: string) => actions.handleResetTpData(tpId, handlerDependencies), [handlerDependencies]);
    const handleQuickSyncAndSave = useCallback((syncData: Record<number, Record<string, boolean>>, skippedTps: TujuanPembelajaran[]) => actions.handleQuickSyncAndSave(syncData, skippedTps, handlerDependencies), [handlerDependencies]);
    
    const handleSaveSummativeScores = async (allStudentScores: { studentId: number; tpId: string; aspek: string; score: number | null }[]) => {
        const studentMap: Map<number, Student> = new Map(masterStudents.map(s => [s.id!, { ...s, summativeAssessments: [...s.summativeAssessments] }]));
        const updatedStudentIds = new Set<number>();
        allStudentScores.forEach(({ studentId, tpId, aspek, score }) => {
            const student = studentMap.get(studentId);
            if (!student) return;
            updatedStudentIds.add(studentId);
            student.summativeAssessments = student.summativeAssessments.filter(a => !(a.tpId === tpId && a.aspek === aspek));
            if (score !== null) student.summativeAssessments.push({ tpId, aspek, score });
        });
        const updatedStudents = Array.from(studentMap.values());
        const studentsToSave = Array.from(updatedStudentIds).map(id => studentMap.get(id)!);
        setMasterStudents(updatedStudents);
        if (studentsToSave.length > 0) await dbService.saveAllStudents(studentsToSave);
    };

    const handleSaveAttendanceBatch = async (records: AttendanceRecord[]) => {
        const newRecordIds = new Set(records.map(r => r.id));
        const updatedRecords = [...attendanceRecords.filter(r => !newRecordIds.has(r.id)), ...records];
        setAttendanceRecords(updatedRecords);
        await dbService.saveAttendanceBatch(records);
    };

    const handleSaveHoliday = async (holiday: HolidayRecord) => { setHolidays(prev => [...prev.filter(h => h.id !== holiday.id), holiday]); await dbService.saveHoliday(holiday); };
    const handleDeleteHoliday = async (date: string) => { setHolidays(prev => prev.filter(h => h.date !== date)); await dbService.deleteHoliday(date); };
    const handleSaveSettings = async (newSettings: AppSettings) => { setSettings(newSettings); await dbService.setAppState('appSettings', JSON.stringify(newSettings)); };
    const onNavigateToAssessor = (session: Session) => { setAssessingSession(session); setActiveView('assessor'); };
    const handleSaveRemedialAssessment = useCallback((studentId: number | undefined, tpId: string, newAssessments: { aspek: string; level: 1 | 2 | 3 | 4 }[]) => actions.handleSaveRemedialAssessment(studentId, tpId, newAssessments, handlerDependencies), [handlerDependencies]);
    
    const handleSaveApiKey = async (apiKey: string) => {
        if (!user) {
            showAlert({ title: "Error", message: "Anda harus login untuk menyimpan kunci API." });
            return;
        }
        await dbService.saveApiKey(user.uid, apiKey);
        setUserApiKey(apiKey);
    };

    const handleExportData = async () => { 
        const userApiKeys = user ? await dbService.getApiKey(user.uid) : null;
        const data = { 
            version: 3, 
            exportedAt: new Date().toISOString(), 
            data: { 
                learningPlans, classProfiles, masterStudents, attendanceRecords, holidays, settings, activePlanId, activeClassId,
                apiKeys: userApiKeys ? [userApiKeys] : [] // Export as array for potential future multi-key support
            } 
        }; 
        setDataToExport(JSON.stringify(data, null, 2)); 
        setShowExportModal(true); 
    };
    
    const handleImportData = async (jsonString: string): Promise<{success: boolean; message: string}> => {
        try {
            if (!jsonString) throw new Error("Data impor tidak boleh kosong.");
            const parsedData = JSON.parse(jsonString);
            if (typeof parsedData !== 'object' || parsedData === null || !parsedData.data) throw new Error("Format file tidak valid.");
            
            const { learningPlans, classProfiles, masterStudents, attendanceRecords, holidays, settings, activePlanId, activeClassId, apiKeys } = parsedData.data;
            
            if (!Array.isArray(learningPlans) || !Array.isArray(masterStudents) || !Array.isArray(classProfiles)) throw new Error("Format file tidak valid: data inti tidak ditemukan.");
            
            setIsImporting(true);
            await Promise.all([dbService.clearPlans(), dbService.clearClassProfiles(), dbService.clearStudents(), dbService.clearAttendance(), dbService.clearHolidays(), dbService.clearAppState(), dbService.clearApiKeys()]);
            
            const dbPromises = [
                dbService.saveAllPlans(learningPlans), 
                dbService.saveAllClassProfiles(classProfiles), 
                dbService.saveAllStudents(masterStudents),
                dbService.saveAllAttendance(attendanceRecords || []), 
                dbService.saveAllHolidays(holidays || []),
                dbService.setAppState('appSettings', JSON.stringify(settings || {})),
                dbService.setAppState('activePlanId', activePlanId || null),
                dbService.setAppState('activeClassId', activeClassId || null)
            ];

            if (apiKeys && Array.isArray(apiKeys)) {
                apiKeys.forEach((keyData: { userId: string, apiKey: string }) => {
                    dbPromises.push(dbService.saveApiKey(keyData.userId, keyData.apiKey));
                });
            }

            await Promise.all(dbPromises);
            
            setLearningPlans(learningPlans); setClassProfiles(classProfiles); setMasterStudents(masterStudents); setAttendanceRecords(attendanceRecords || []); setHolidays(holidays || []); setSettings(settings || {});
            setActivePlanIdState(activePlanId || null); setActiveClassIdState(activeClassId || null); setViewingPlanIdInDataKurikulum(null); setActiveView('rancanganPembelajaran');
            
            if (user && apiKeys && Array.isArray(apiKeys)) {
                const userKey = apiKeys.find((k: any) => k.userId === user.uid);
                setUserApiKey(userKey ? userKey.apiKey : null);
            }

            setIsImporting(false); return { success: true, message: 'Data berhasil diimpor.' };
        } catch (err) {
            console.error("Gagal mengimpor data:", err); setIsImporting(false);
            const message = err instanceof Error ? err.message : String(err);
            return { success: false, message: `Gagal mengimpor data: ${message}` };
        }
    };
    
    const confirmDeletePlan = async () => {
        if (!deletingPlanId) return;
        const planId = deletingPlanId;
        await dbService.deletePlan(planId);
        const newPlans = learningPlans.filter(p => p.id !== planId);
        setLearningPlans(newPlans);
        if (activePlanId === planId) setActivePlanId(newPlans.length > 0 ? newPlans[0].id : null);
        if (viewingPlanIdInDataKurikulum === planId) setViewingPlanIdInDataKurikulum(null);
        setDeletingPlanId(null);
    };
    
    const filteredStudents = useMemo(() => masterStudents.filter(s => s.kelas === activeClassProfile?.name).sort((a,b) => a.nama.localeCompare(b.nama)), [masterStudents, activeClassProfile]);

    
    const filteredCurriculumData = useMemo(() => {
        if (!activePlan || !activeClassProfile || !activeSemester) return activePlan?.curriculum;

        const parseMingguKe = (mingguKe: string) => {
            const weekMatch = mingguKe.match(/Minggu (\d+)/);
            return { weekNum: weekMatch ? parseInt(weekMatch[1], 10) : 0 };
        };

        const atp = activePlan.curriculum.alurTujuanPembelajaran || [];
        const classNumber = activeClassProfile.name.match(/\d+/)?.[0];
        if (!classNumber) return activePlan.curriculum;

        const relevantTpIds = new Set(atp.filter(item => item.mingguKe.includes(`Kelas ${classNumber}`) && item.mingguKe.includes(activeSemester)).map(item => item.tpId));
        
        const filteredAndSortedAtp = atp
            .filter(item => relevantTpIds.has(item.tpId))
            .sort((a, b) => {
                const parsedA = parseMingguKe(a.mingguKe);
                const parsedB = parseMingguKe(b.mingguKe);
                if (parsedA.weekNum !== parsedB.weekNum) return parsedA.weekNum - parsedB.weekNum;
                return a.tpId.localeCompare(b.tpId); // Fallback sort
            });

        const tpMap = new Map(activePlan.curriculum.tujuanPembelajaran.map(tp => [tp.id, tp]));
        const orderedTps = filteredAndSortedAtp.map(item => tpMap.get(item.tpId)).filter((tp): tp is TujuanPembelajaran => !!tp);

        return { ...activePlan.curriculum, tujuanPembelajaran: orderedTps, alurTujuanPembelajaran: filteredAndSortedAtp };
    }, [activePlan, activeClassProfile, activeSemester]);
    
    const handleSaveHafalanPackage = useCallback((newPackage: HafalanPackage) => {
        if (!activePlan) return;
        const currentPackages = activePlan.curriculum.hafalanPackages || [];
        const updatedPackages = [...currentPackages, newPackage];
        updatePlan(activePlan.id, { curriculum: { ...activePlan.curriculum, hafalanPackages: updatedPackages } });
    }, [activePlan, updatePlan]);

    const handleUpdateHafalanRecord = useCallback(async (studentId: number, itemId: string, status: HafalanStatus) => {
        const student = masterStudents.find(s => s.id === studentId);
        if (!student) return;

        const newRecord: HafalanRecord = { studentId, itemId, status, timestamp: Date.now() };
        const otherRecords = (student.hafalanRecords || []).filter(r => !(r.itemId === itemId));
        const updatedRecords = [...otherRecords, newRecord];
        
        await handleUpdateStudent(studentId, { hafalanRecords: updatedRecords });

    }, [masterStudents, handleUpdateStudent]);

    const assessingTp = useMemo(() => activePlan?.curriculum.tujuanPembelajaran.find(t => t.id === assessingSession?.tpId), [activePlan, assessingSession]);
    const headerTitle = useMemo(() => {
        const assessmentViews: View[] = ['assessor', 'summativeAssessor', 'absensi', 'reportView', 'assessmentMenuView', 'hafalan'];
        if (assessmentViews.includes(activeView)) return 'Asesmen & Data Siswa';
        switch(activeView) {
            case 'dashboard': return 'Dashboard';
            case 'rancanganPembelajaran': return 'Rancangan Pembelajaran';
            case 'settings': return 'Pengaturan & Manajemen Kelas';
            case 'htmlPreview': return 'Pratinjau Dokumen';
            default: return 'Asisten Pembelajaran';
        }
    }, [activeView]);

    const viewsWithContextSelectors: View[] = ['dashboard', 'assessor', 'summativeAssessor', 'absensi', 'reportView', 'assessmentMenuView', 'hafalan'];
    const isContainedScrollView = ['settings', 'absensi', 'rancanganPembelajaran'].includes(activeView);

    return {
        isDbLoading, learningPlans, classProfiles, masterStudents, attendanceRecords, holidays, activePlanId, activeClassId, isLoading, isImporting, error, settings,
        viewingPlanIdInDataKurikulum, isGeneratingNewPlan, assessingSession,
        deletingPlanId, openMenuPlanId, regeneratingPlanId, isAtpRegenerating, isTpRegenerating, activePlan, activeView,
        loadingKktpId, activeSemester, showExportModal, showImportModal, dataToExport, isFormativeDirty, isOnline, activeClassProfile,
        appModal, htmlPreviewState, userApiKey,
        showOnboarding,

        setLearningPlans, setAttendanceRecords, setHolidays, setActivePlanId, setActiveClassId, setIsLoading, setIsImporting, setError, setSettings,
        setViewingPlanIdInDataKurikulum, setIsGeneratingNewPlan, setAssessingSession, 
        setDeletingPlanId, setOpenMenuPlanId, setRegeneratingPlanId, setIsAtpRegenerating, setIsTpRegenerating,
        _setActiveView, setActiveView, setLoadingKktpId, setMasterStudents, setActiveSemester, setShowExportModal, setShowImportModal,
        setDataToExport, setIsFormativeDirty,

        updatePlan, addClassProfile, updateClassProfile, deleteClassProfile,
        handleShowNewPlanGenerator, handleGenerateCurriculum, handleRegenerateCurriculum, handleTpsUpdated,
        handleRegenerateAtp, handleFullRegenerateAtp, handleGenerateKktp, handleUpdateKktp, handleCreateManualKktp, handleDeleteKktp,
        handleBulkAddStudents, handleDeleteStudent, handleUpdateStudent, handleFormativeStudentsChange,
        handleSaveDiagnosticData, handleSaveAdaptiveStep, handleSaveGeneratedHtml, handleResetTpData, handleSaveSummativeScores,
// FIX: Export `handleDeleteHoliday` from the `useAppDataLogic` hook
        handleSaveAttendanceBatch, handleSaveHoliday, handleDeleteHoliday, handleSaveSettings, handleExportData, handleImportData,
        confirmDeletePlan,
        handleDeleteLatestFormativeSession,
        handleQuickSyncAndSave,
        handleSaveRemedialAssessment,
        handleCreatePlannedSession,
        handleSaveApiKey,
        handleSaveHafalanPackage, handleUpdateHafalanRecord,
        onNavigateToAssessor,

        filteredStudents, filteredCurriculumData, assessingTp, headerTitle, viewsWithContextSelectors, isContainedScrollView,
        
        showConfirmation, showAlert, hideAppModal,
        showHtmlPreview, hideHtmlPreview,
        handleCompleteOnboarding
    };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const data = useAppDataLogic();
    return <AppContext.Provider value={data}>{children}</AppContext.Provider>;
};

export type { AppContextType };