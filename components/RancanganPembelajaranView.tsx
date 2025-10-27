import React, { useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import { Loader } from './Loader';
import { PhaseSelector } from './PhaseSelector';
import { CurriculumDisplay } from './CurriculumDisplay';
import { WandIcon, UploadIcon, DownloadIcon, FolderIcon, EllipsisVerticalIcon, TrashIcon, XIcon } from './icons';

const NewPlanModal: React.FC<{
    onClose: () => void;
    onGenerate: (params: { subject: string; cp: string; phase: string; }) => void;
    isLoading: boolean;
}> = ({ onClose, onGenerate, isLoading }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                 <header className="p-4 border-b flex-shrink-0 relative">
                    <h3 className="text-lg font-bold text-slate-800">Buat Rencana Pembelajaran Baru</h3>
                    <button onClick={onClose} className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-700 rounded-full" aria-label="Tutup"><XIcon className="h-6 w-6" /></button>
                </header>
                <main className="flex-grow overflow-y-auto">
                    {isLoading 
                        ? <Loader text="AI sedang merancang pembelajaran..." /> 
                        : <PhaseSelector onGenerate={onGenerate} isLoading={isLoading} />
                    }
                </main>
            </div>
        </div>
    );
};


export const RancanganPembelajaranView: React.FC = () => {
    const {
        learningPlans,
        viewingPlanIdInDataKurikulum,
        setViewingPlanIdInDataKurikulum,
        isGeneratingNewPlan,
        setIsGeneratingNewPlan,
        isLoading,
        handleGenerateCurriculum,
        error,
        deletingPlanId,
        setDeletingPlanId,
        confirmDeletePlan,
        openMenuPlanId,
        setOpenMenuPlanId,
        setRegeneratingPlanId,
        setShowImportModal,
        handleExportData,
    } = useAppData();
    
    const handleShowNewPlanGenerator = () => setIsGeneratingNewPlan(true);

    if (viewingPlanIdInDataKurikulum) {
        return (
           <div className="overflow-y-auto h-full">
                <button onClick={() => setViewingPlanIdInDataKurikulum(null)} className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 18l-6-6 6-6"/></svg>
                   Kembali ke Daftar Rancangan
               </button>
                <CurriculumDisplay />
           </div>
        )
    }

    return (
       <>
           {isGeneratingNewPlan && (
               <NewPlanModal 
                    onClose={() => setIsGeneratingNewPlan(false)}
                    onGenerate={handleGenerateCurriculum}
                    isLoading={isLoading}
               />
           )}
           <div className="flex flex-col h-full overflow-y-auto">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                   <h2 className="text-2xl font-bold text-slate-800">Rencana Tersimpan</h2>
                   <div className="flex items-center gap-2 self-end sm:self-center">
                        <button onClick={handleShowNewPlanGenerator} className="flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 border border-indigo-600 rounded-md px-3 py-1.5 hover:bg-indigo-700 transition-colors">
                           <WandIcon className="h-4 w-4" /><span>Buat Rencana Baru</span>
                       </button>
                       <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50 transition-colors">
                           <UploadIcon className="h-4 w-4" /><span>Impor Data</span>
                       </button>
                       <button onClick={handleExportData} className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50 transition-colors" disabled={learningPlans.length === 0}>
                           <DownloadIcon className="h-4 w-4" /><span>Ekspor Data</span>
                       </button>
                   </div>
               </div>
               {error && <p className="text-red-600 text-center my-4 p-2 bg-red-50 rounded-md">{error}</p>}
               {isLoading && <Loader text="Memproses..." />}
               {!isLoading && learningPlans.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                       {learningPlans.map(plan => (
                           <div key={plan.id} className={`group relative bg-white rounded-xl border shadow-lg text-left transition-all transform hover:-translate-y-1 ${deletingPlanId === plan.id ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 hover:border-indigo-500'}`}>
                               {deletingPlanId === plan.id ? (
                                   <div className="p-4 w-full text-center bg-red-50">
                                       <h4 className="font-bold text-red-800">Yakin ingin hapus?</h4>
                                       <p className="text-xs text-red-700 mt-1 mb-3">"{plan.name}" akan dihapus permanen.</p>
                                       <div className="flex justify-center gap-2">
                                           <button onClick={() => setDeletingPlanId(null)} className="px-3 py-1 bg-slate-200 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-300">Batal</button>
                                           <button onClick={confirmDeletePlan} className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700">Hapus</button>
                                       </div>
                                   </div>
                               ) : (
                                   <>
                                       <div onClick={() => setViewingPlanIdInDataKurikulum(plan.id)} className="p-4 w-full text-left cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewingPlanIdInDataKurikulum(plan.id); }}}>
                                           <div className="flex items-center gap-3">
                                               <FolderIcon className="h-8 w-8 text-indigo-500" />
                                               <div>
                                                   <h3 className="font-bold text-slate-800">{plan.name}</h3>
                                                   <p className="text-xs text-slate-500">Fase {plan.curriculum.phase}</p>
                                               </div>
                                           </div>
                                       </div>
                                       <div className="absolute top-2 right-2">
                                           <button onClick={(e) => { e.stopPropagation(); setOpenMenuPlanId(openMenuPlanId === plan.id ? null : plan.id); }} className="p-1.5 text-slate-500 rounded-full hover:bg-slate-200" aria-label={`Opsi untuk ${plan.name}`} title={`Opsi untuk ${plan.name}`}>
                                               <EllipsisVerticalIcon className="h-5 w-5" />
                                           </button>
                                           {openMenuPlanId === plan.id && (
                                               <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-20">
                                                   <button onClick={(e) => { e.stopPropagation(); setRegeneratingPlanId(plan.id); setOpenMenuPlanId(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><WandIcon className="h-4 w-4" /><span>Generate Ulang</span></button>
                                                   <button onClick={(e) => { e.stopPropagation(); setDeletingPlanId(plan.id); setOpenMenuPlanId(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><TrashIcon className="h-4 w-4" /><span>Hapus</span></button>
                                               </div>
                                           )}
                                       </div>
                                   </>
                               )}
                           </div>
                       ))}
                   </div>
               ) : !isLoading && (
                   <div className="text-center p-8 text-slate-500">
                       <p>Belum ada Rencana Pembelajaran yang dibuat.</p>
                   </div>
               )}
           </div>
       </>
   );
};