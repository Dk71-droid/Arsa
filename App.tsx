import React from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Loader } from './components/Loader';
import { ViewRenderer } from './components/ViewRenderer';
import { AppModals } from './components/AppModals';
import { useAppData } from './hooks/useAppData';
import { WandIcon, UsersIcon } from './components/icons';
import { useAuth } from './contexts/AuthContext';
import { LoginView } from './components/LoginView';
import { OnboardingTutorial } from './components/OnboardingTutorial';

const App: React.FC = () => {
    const { user, loading: authLoading } = useAuth();

    const {
        isDbLoading,
        isImporting,
        isAtpRegenerating,
        isTpRegenerating,
        activeView,
        activePlanId,
        handleShowNewPlanGenerator,
        assessingSession,
        activeClassId,
        setActiveView,
        showOnboarding,
        handleCompleteOnboarding,
    } = useAppData();

    if (authLoading) {
        return <div className="h-screen flex items-center justify-center"><Loader text="Memverifikasi sesi..." /></div>;
    }

    if (!user) {
        return <LoginView />;
    }

    if (isDbLoading) {
        return <div className="h-screen flex items-center justify-center"><Loader text="Memuat basis data..." /></div>;
    }

    const renderMainContent = () => {
        if (isImporting) return <Loader text="Mengimpor data..." />;
        if (isAtpRegenerating) return <Loader text="AI sedang menyusun ulang ATP..." />;
        if (isTpRegenerating) return <Loader text="AI sedang menyusun ulang ATP & Unit Pembelajaran..." />;

        const isCoreView = !['rancanganPembelajaran', 'settings'].includes(activeView);

        if (isCoreView && !activePlanId) {
             return (
                <div className="space-y-6 text-center mt-10 flex flex-col items-center">
                    <WandIcon className="mx-auto h-16 w-16 text-indigo-500" />
                    <h2 className="text-2xl font-bold text-slate-700">Pilih Rencana Pembelajaran</h2>
                    <p className="text-slate-500 max-w-md">Untuk menggunakan fitur ini, Anda perlu membuat atau memilih Rencana Pembelajaran (Mata Pelajaran) terlebih dahulu.</p>
                    <button
                        onClick={handleShowNewPlanGenerator}
                        className="mt-4 flex items-center gap-2 text-lg font-semibold text-white bg-indigo-600 border border-indigo-600 rounded-md px-6 py-2.5 hover:bg-indigo-700 transition-colors"
                    >
                        <WandIcon className="h-5 w-5" />
                        <span>Buat Rencana Baru</span>
                    </button>
                </div>
            );
        }
        
        if (isCoreView && !activeClassId) {
             return (
                <div className="space-y-6 text-center mt-10 flex flex-col items-center">
                    <UsersIcon className="mx-auto h-16 w-16 text-indigo-500" />
                    <h2 className="text-2xl font-bold text-slate-700">Pilih Kelas Aktif</h2>
                    <p className="text-slate-500 max-w-md">Pilih kelas yang ingin Anda kelola dari menu dropdown di bagian atas, atau buat kelas baru di menu Pengaturan.</p>
                    <button
                        onClick={() => setActiveView('settings')}
                        className="mt-4 flex items-center gap-2 text-lg font-semibold text-white bg-indigo-600 border border-indigo-600 rounded-md px-6 py-2.5 hover:bg-indigo-700 transition-colors"
                    >
                        <UsersIcon className="h-5 w-5" />
                        <span>Buka Manajemen Kelas</span>
                    </button>
                </div>
            );
        }

        return <ViewRenderer />;
    };

    const { isContainedScrollView } = useAppData();

    return (
        <div className="h-screen bg-slate-50 flex">
            {activeView !== 'htmlPreview' && <Sidebar />}
            <main className="flex-1 flex flex-col overflow-hidden">
                {!isDbLoading && !(activeView === 'assessor' && assessingSession) && (
                    <Header />
                )}
                <div className={`
                    ${activeView === 'htmlPreview' ? '' : 'p-4 md:px-3 lg:px-4'}
                    flex-grow
                    ${activeView === 'assessor' && assessingSession ? 'min-h-0' : 'pb-20 md:pb-6'}
                    ${isContainedScrollView || activeView === 'htmlPreview' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}
                `}>
                    {renderMainContent()}
                </div>
            </main>
            <BottomNav />
            <AppModals />
            {showOnboarding && <OnboardingTutorial onComplete={handleCompleteOnboarding} onSkip={handleCompleteOnboarding} />}
        </div>
    );
};

export default App;