import React, { useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import { Loader } from './Loader';
import { SummativeListView } from './summative/SummativeListView';
import { SummativeDetailView } from './summative/SummativeDetailView';
import { CreateSummativeModal } from './summative/CreateSummativeModal';
import { SummativeGeneratorModal } from './summative/SummativeGeneratorModal';
import type { SummativePackage } from '../types';

export const SummativeAssessor: React.FC = () => {
    const {
        filteredStudents,
        activePlan,
        updatePlan,
        handleSaveSummativeScores,
        filteredCurriculumData,
        activeClassProfile,
        showConfirmation,
        showAlert,
    } = useAppData();

    const [assessingPackageId, setAssessingPackageId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [generatorState, setGeneratorState] = useState<{ pkg: SummativePackage | null; isOpen: boolean }>({ pkg: null, isOpen: false });

    if (!activePlan || !filteredCurriculumData) {
        return <Loader text="Memuat Rencana Pembelajaran..." />;
    }

    // Correctly get the ordered TPs from the filtered curriculum data, which is now pre-sorted by AppContext.
    const { 
        tujuanPembelajaran: orderedTps, 
        unitPembelajaran, 
        summativePackages = [] 
    } = filteredCurriculumData;

    const handleCreatePackage = (data: { name: string, tpIds: string[] }) => {
        const newPackage: SummativePackage = { id: `pkg_${Date.now()}`, name: data.name, tpIds: data.tpIds };
        const updatedPackages = [...summativePackages, newPackage];
        updatePlan(activePlan.id, { curriculum: { ...activePlan.curriculum, summativePackages: updatedPackages } });
        setIsCreateModalOpen(false);
    };

    const handleDeletePackage = (packageId: string) => {
        showConfirmation({
            title: 'Hapus Paket Sumatif',
            message: 'Apakah Anda yakin ingin menghapus paket sumatif ini? Nilai yang sudah diinput akan tetap tersimpan pada siswa, namun paket ini akan hilang dari daftar.',
            onConfirm: () => {
                const updatedPackages = summativePackages.filter(p => p.id !== packageId);
                updatePlan(activePlan.id, { curriculum: { ...activePlan.curriculum, summativePackages: updatedPackages } });
            }
        });
    };
    
    const handleSaveInstrument = (pkgId: string, instrumentHtml: string) => {
        const updatedPackages = summativePackages.map(p => p.id === pkgId ? { ...p, instrumentHtml } : p);
        updatePlan(activePlan.id, { curriculum: { ...activePlan.curriculum, summativePackages: updatedPackages } });
    };

    const assessingPackage = summativePackages.find(p => p.id === assessingPackageId);

    if (assessingPackage) {
        return <SummativeDetailView 
            pkg={assessingPackage} 
            students={filteredStudents} 
            allTps={orderedTps} 
            onBack={() => setAssessingPackageId(null)} 
            onSave={handleSaveSummativeScores} 
        />;
    }

    return (
        <>
            <SummativeListView
                packages={summativePackages}
                students={filteredStudents}
                allTps={orderedTps}
                onSelectPackage={setAssessingPackageId}
                onCreatePackage={() => setIsCreateModalOpen(true)}
                onDeletePackage={handleDeletePackage}
                onGenerateInstrument={(pkg) => setGeneratorState({ pkg, isOpen: true })}
            />
            {isCreateModalOpen && (
                <CreateSummativeModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreatePackage}
                    tpsInSemester={orderedTps}
                    unitsInSemester={unitPembelajaran}
                />
            )}
            {generatorState.isOpen && generatorState.pkg && (
                <SummativeGeneratorModal
                    isOpen={generatorState.isOpen}
                    onClose={() => setGeneratorState({ pkg: null, isOpen: false })}
                    pkg={generatorState.pkg}
                    allTps={orderedTps}
                    phase={activePlan.curriculum.phase}
                    kelas={activeClassProfile?.name}
                    onSaveInstrument={handleSaveInstrument}
                    // FIX: Pass showAlert prop to SummativeGeneratorModal
                    showAlert={showAlert}
                />
            )}
        </>
    );
};
