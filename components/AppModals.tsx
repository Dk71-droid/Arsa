import React from 'react';
import { DataTransferModal } from './DataTransferModal';
import { AppModal } from './AppModal';
import { useAppData } from '../hooks/useAppData';

export const AppModals: React.FC = () => {
    const {
        showExportModal,
        dataToExport,
        setShowExportModal,
        showImportModal,
        handleImportData,
        setShowImportModal,
        regeneratingPlanId,
        learningPlans,
        setRegeneratingPlanId,
        handleRegenerateCurriculum,
        appModal,
        hideAppModal,
    } = useAppData();

    return (
        <>
            {showExportModal && <DataTransferModal mode="export" data={dataToExport} onClose={() => setShowExportModal(false)} />}
            {showImportModal && <DataTransferModal mode="import" onImport={handleImportData} onClose={() => setShowImportModal(false)} />}
            
            {regeneratingPlanId && (() => {
                const planToRegenerate = learningPlans.find(p => p.id === regeneratingPlanId);
                return (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold text-slate-800">Konfirmasi Generate Ulang</h2>
                            <p className="mt-2 text-slate-600">
                                Anda akan membuat ulang TP, ATP, dan Unit Pembelajaran untuk rencana <strong className="font-semibold">"{planToRegenerate?.name}"</strong> menggunakan Capaian Pembelajaran yang sudah ada.
                            </p>
                            <p className="mt-4 p-3 text-sm bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                                Data TP, ATP, dan Unit Pembelajaran yang lama akan <strong className="font-semibold">dihapus dan diganti</strong>. Semua data penilaian siswa (formatif dan sumatif) yang terkait dengan rencana ini juga akan <strong className="font-semibold">dihapus secara permanen</strong>. Lanjutkan?
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setRegeneratingPlanId(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-semibold">
                                    Batal
                                </button>
                                <button onClick={handleRegenerateCurriculum} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold">
                                    Ya, Generate Ulang
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <AppModal 
                isOpen={appModal.isOpen}
                type={appModal.type}
                title={appModal.title}
                message={appModal.message}
                onConfirm={appModal.onConfirm}
                onClose={hideAppModal}
                confirmText={appModal.confirmText}
            />
        </>
    );
};