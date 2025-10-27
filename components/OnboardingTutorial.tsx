import React, { useState, useEffect, useMemo } from 'react';
import { useAppData } from '../hooks/useAppData';
import { BookOpenIcon, LockIcon, WandIcon, UsersIcon, ChartBarIcon, HomeIcon, CheckCircleIcon, CheckIcon } from './icons';
import { FASE_OPTIONS, FASE_TO_GRADES_MAP } from '../constants';
import { StudentManager } from './settings/StudentManager';
import type { ClassProfile } from '../types';

interface TutorialStep {
    icon: React.ReactNode;
    title: string;
    content: string;
}

const steps: TutorialStep[] = [
    {
        icon: <BookOpenIcon className="h-12 w-12 text-teal-500" />,
        title: "Selamat Datang di Asisten Guru!",
        content: "Mari kita ikuti tur singkat untuk mengenal fitur-fitur utama yang akan membantu Anda merancang pembelajaran yang lebih efektif dan efisien."
    },
    {
        icon: <LockIcon className="h-12 w-12 text-yellow-500" />,
        title: "Langkah 1: Hubungkan AI Gemini",
        content: "Sebagian besar fitur cerdas di aplikasi ini ditenagai oleh Google Gemini. Anda perlu memasukkan Kunci API (API Key) Anda di bawah ini untuk mengaktifkannya. Anda dapat melewatinya sekarang dan mengaturnya nanti di menu Pengaturan."
    },
    {
        icon: <WandIcon className="h-12 w-12 text-blue-500" />,
        title: "Langkah 2: Rancang Pembelajaran",
        content: "Di menu 'Rancangan Pembelajaran', cukup masukkan Capaian Pembelajaran (CP), dan biarkan AI menyusun Tujuan Pembelajaran (TP), Alur (ATP), hingga Unit Pembelajaran untuk Anda."
    },
    {
        icon: <UsersIcon className="h-12 w-12 text-purple-500" />,
        title: "Langkah 3: Buat Kelas Pertama Anda",
        content: "Untuk mulai mengelola siswa dan penilaian, buatlah kelas pertama Anda. Anda dapat menambahkan lebih banyak kelas nanti di menu Pengaturan."
    },
    {
        icon: <UsersIcon className="h-12 w-12 text-green-500" />,
        title: "Langkah 4: Tambahkan Siswa",
        content: "Sekarang, tambahkan beberapa siswa ke kelas yang baru Anda buat. Anda bisa menyalin daftar nama dari spreadsheet. Langkah ini opsional, Anda bisa melanjutkannya nanti."
    },
    {
        icon: <ChartBarIcon className="h-12 w-12 text-pink-500" />,
        title: "Langkah 5: Lakukan Asesmen",
        content: "Gunakan 'Asesor Formatif' dan 'Sumatif' untuk mencatat kemajuan belajar siswa dengan mudah. Data ini akan secara otomatis diolah untuk memberikan Anda wawasan."
    },
    {
        icon: <HomeIcon className="h-12 w-12 text-red-500" />,
        title: "Langkah 6: Pantau Lewat Dashboard",
        content: "Dashboard adalah pusat komando Anda. Lihat progres kelas, identifikasi siswa yang perlu perhatian, dan dapatkan rekomendasi pembelajaran selanjutnya dari AI."
    },
    {
        icon: <CheckCircleIcon className="h-12 w-12 text-teal-500" />,
        title: "Anda Siap Memulai!",
        content: "Sekarang Anda sudah mengenal dasar-dasarnya. Jelajahi semua fitur dan selamat merancang pembelajaran yang lebih bermakna!"
    }
];

interface OnboardingTutorialProps {
    onComplete: () => void;
    onSkip: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const { 
        handleSaveApiKey, 
        userApiKey, 
        showAlert, 
        addClassProfile,
        setActiveClassId,
        masterStudents,
        handleBulkAddStudents,
        handleUpdateStudent,
        handleDeleteStudent
    } = useAppData();
    
    // State for API Key step
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isKeySavedThisSession, setIsKeySavedThisSession] = useState(false);
    const [isSavingKey, setIsSavingKey] = useState(false);
    
    // State for Class creation step
    const [className, setClassName] = useState('');
    const [phase, setPhase] = useState('');
    const [grade, setGrade] = useState('');
    const [isClassCreatedThisSession, setIsClassCreatedThisSession] = useState(false);
    const [isCreatingClass, setIsCreatingClass] = useState(false);
    const [createdClassProfile, setCreatedClassProfile] = useState<ClassProfile | null>(null);

    const availableGrades = useMemo(() => FASE_TO_GRADES_MAP[phase] || [], [phase]);

    useEffect(() => {
        if (phase && !FASE_TO_GRADES_MAP[phase]?.includes(grade)) {
            setGrade('');
        }
    }, [phase]);


    const isKeyConfigured = userApiKey || isKeySavedThisSession;
    const isLastStep = currentStep === steps.length - 1;

    const handleNext = () => {
        if (!isLastStep) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSaveKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKeyInput.trim()) return;
        setIsSavingKey(true);
        await handleSaveApiKey(apiKeyInput.trim());
        setIsSavingKey(false);
        setIsKeySavedThisSession(true);
        setApiKeyInput('');
        showAlert({ title: "Berhasil", message: "Kunci API Gemini berhasil disimpan." });
    };
    
    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!className.trim() || !phase || !grade) return;
        setIsCreatingClass(true);
        const newProfile = await addClassProfile({ name: className.trim(), phase, grade });
        if (newProfile) {
            setActiveClassId(newProfile.id);
            setCreatedClassProfile(newProfile);
        }
        setIsCreatingClass(false);
        setIsClassCreatedThisSession(true);
        showAlert({ title: "Berhasil!", message: `Kelas "${className.trim()}" telah dibuat.` });
    };

    const currentStepData = steps[currentStep];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100" onClick={e => e.stopPropagation()}>
                <div className="p-8 text-center">
                    <div className="mx-auto h-20 w-20 flex items-center justify-center">
                        {currentStepData.icon}
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-slate-800">{currentStepData.title}</h2>
                    <p className="mt-2 text-slate-600">{currentStepData.content}</p>

                    {currentStep === 1 && (
                        <div className="mt-4 max-w-sm mx-auto">
                            {isKeyConfigured ? (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 flex items-center justify-center gap-2">
                                    <CheckIcon className="h-5 w-5"/>
                                    <p><strong>Berhasil!</strong> Kunci API Anda sudah disimpan.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveKey} className="space-y-2">
                                    <input type="password" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="Tempel Kunci API Gemini Anda di sini" className="w-full p-2 border border-slate-300 rounded-md shadow-sm" />
                                    <button type="submit" disabled={!apiKeyInput.trim() || isSavingKey} className="w-full bg-teal-600 text-white font-semibold py-2 rounded-md hover:bg-teal-700 disabled:bg-slate-400">
                                        {isSavingKey ? 'Menyimpan...' : 'Simpan Kunci API'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                    
                    {currentStep === 3 && (
                        <div className="mt-4 max-w-sm mx-auto">
                            {isClassCreatedThisSession ? (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 flex items-center justify-center gap-2">
                                    <CheckIcon className="h-5 w-5"/>
                                    <p><strong>Berhasil!</strong> Kelas telah dibuat.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateClass} className="space-y-3 text-left">
                                     <div>
                                        <label htmlFor="class-name" className="block text-sm font-medium text-slate-700 mb-1">Nama Kelas</label>
                                        <input id="class-name" type="text" value={className} onChange={e => setClassName(e.target.value)} required placeholder="Contoh: 5A IPA" className="w-full p-2 border border-slate-300 rounded-md"/>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="class-phase" className="block text-sm font-medium text-slate-700 mb-1">Fase</label>
                                            <select id="class-phase" value={phase} onChange={e => setPhase(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md">
                                                <option value="">Pilih Fase</option>
                                                {FASE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="class-grade" className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                                            <select id="class-grade" value={grade} onChange={e => setGrade(e.target.value)} required disabled={availableGrades.length === 0} className="w-full p-2 border border-slate-300 rounded-md disabled:bg-slate-100">
                                                <option value="">Pilih Kelas</option>
                                                {availableGrades.map(g => <option key={g} value={g}>Kelas {g}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={!className.trim() || !phase || !grade || isCreatingClass} className="w-full bg-teal-600 text-white font-semibold py-2 rounded-md hover:bg-teal-700 disabled:bg-slate-400">
                                        {isCreatingClass ? 'Membuat...' : 'Buat Kelas'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                    
                    {currentStep === 4 && (
                         <div className="mt-4 max-w-sm mx-auto">
                            {createdClassProfile ? (
                                <StudentManager
                                    classProfile={createdClassProfile}
                                    students={masterStudents.filter(s => s.kelas === createdClassProfile.name)}
                                    onAdd={(newStudents) => handleBulkAddStudents(newStudents, createdClassProfile.name)}
                                    onUpdate={handleUpdateStudent}
                                    onDelete={handleDeleteStudent}
                                />
                            ) : (
                                <p className="text-sm text-slate-500">Silakan kembali ke langkah sebelumnya untuk membuat kelas terlebih dahulu.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-8 pb-8">
                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 w-2 rounded-full transition-all ${
                                    index === currentStep ? 'w-6 bg-teal-500' : 'bg-slate-300'
                                }`}
                            />
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={onSkip}
                            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
                        >
                            Lewati Tur
                        </button>
                        
                        <div className="flex items-center gap-3">
                             {currentStep > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300"
                                >
                                    Kembali
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                disabled={(currentStep === 1 && !isKeyConfigured) || (currentStep === 3 && !isClassCreatedThisSession)}
                                className="px-6 py-2 font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700 shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed"
                                title={
                                    (currentStep === 1 && !isKeyConfigured) ? 'Harap simpan Kunci API untuk melanjutkan' : 
                                    (currentStep === 3 && !isClassCreatedThisSession) ? 'Harap buat kelas pertama Anda untuk melanjutkan' : ''
                                }
                            >
                                {isLastStep ? 'Selesai' : 'Lanjut'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
