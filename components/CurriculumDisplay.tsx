import React, { useState } from 'react';
import type { CurriculumData, AlurTujuanPembelajaran, TujuanPembelajaran, Kktp } from '../types';
import { Card } from './Card';
import { CheckCircleIcon, ListIcon, MilestoneIcon, TargetIcon, CollectionIcon } from './icons';
import { CpTab } from './curriculum/CpTab';
import { UnitPembelajaranTab } from './curriculum/UnitPembelajaranTab';
import { TpTab } from './curriculum/TpTab';
import { AtpTab } from './curriculum/AtpTab';
import { KktpTab } from './curriculum/KktpTab';
import { useAppData } from '../hooks/useAppData';

type Tab = 'cp' | 'unit' | 'tp' | 'atp' | 'kktp';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({ active, onClick, children, disabled = false }) => {
    const baseClasses = "px-4 py-2 text-sm md:text-base font-semibold rounded-lg transition-colors flex items-center gap-2";
    const activeClasses = "bg-teal-600 text-white shadow-md";
    const inactiveClasses = "bg-white text-slate-600 hover:bg-slate-100 border border-slate-300";
    const disabledClasses = "opacity-50 cursor-not-allowed bg-slate-100";
    
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${active ? activeClasses : inactiveClasses} ${disabled ? disabledClasses : ''}`}
      >
        {children}
      </button>
    );
};

export const CurriculumDisplay: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('cp');
  const { 
    learningPlans,
    viewingPlanIdInDataKurikulum,
    handleGenerateKktp,
    loadingKktpId,
    handleUpdateKktp,
    handleCreateManualKktp,
    handleRegenerateAtp,
    handleFullRegenerateAtp,
    handleTpsUpdated,
    updatePlan,
    handleDeleteKktp,
    showConfirmation,
    showAlert
  } = useAppData();

  const planToView = learningPlans.find(p => p.id === viewingPlanIdInDataKurikulum);

  if (!planToView) {
    return <Card><p>Rencana pembelajaran tidak ditemukan.</p></Card>;
  }

  const handleUpdateAtp = (newAtp: AlurTujuanPembelajaran[]) => {
    if (!planToView) return;
    updatePlan(planToView.id, { curriculum: { ...planToView.curriculum, alurTujuanPembelajaran: newAtp } });
  };

  const data = planToView.curriculum;
  const planId = planToView.id;

  return (
    <Card>
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-4">
        <TabButton active={activeTab === 'cp'} onClick={() => setActiveTab('cp')}>
            <TargetIcon className="h-5 w-5" /> CP
        </TabButton>
        <TabButton active={activeTab === 'unit'} onClick={() => setActiveTab('unit')} disabled={!data.unitPembelajaran || data.unitPembelajaran.length === 0}>
            <CollectionIcon className="h-5 w-5" /> Unit Pembelajaran
        </TabButton>
        <TabButton active={activeTab === 'tp'} onClick={() => setActiveTab('tp')}>
            <CheckCircleIcon className="h-5 w-5" /> TP
        </TabButton>
        <TabButton active={activeTab === 'atp'} onClick={() => setActiveTab('atp')} disabled={!data.alurTujuanPembelajaran}>
            <MilestoneIcon className="h-5 w-5" /> ATP
        </TabButton>
        <TabButton active={activeTab === 'kktp'} onClick={() => setActiveTab('kktp')}>
            <ListIcon className="h-5 w-5" /> Rubrik KKTP
        </TabButton>
      </div>

      <div>
        {activeTab === 'cp' && <CpTab data={data} />}
        {activeTab === 'unit' && <UnitPembelajaranTab data={data} />}
        {activeTab === 'tp' && <TpTab planId={planId} data={data} onTpsUpdated={handleTpsUpdated} showConfirmation={showConfirmation} />}
        {activeTab === 'atp' && (
          <AtpTab
            planId={planId}
            data={data}
            onUpdateAtp={handleUpdateAtp}
            onRegenerateAtp={handleRegenerateAtp}
            onFullRegenerateAtp={handleFullRegenerateAtp}
            showConfirmation={showConfirmation}
          />
        )}
        {activeTab === 'kktp' && (
          <KktpTab
            planId={planId}
            data={data}
            onGenerateKktp={handleGenerateKktp}
            loadingKktpId={loadingKktpId}
            onUpdateKktp={(tpId, newKktp) => handleUpdateKktp(planId, tpId, newKktp)}
            onCreateManualKktp={handleCreateManualKktp}
            onDeleteKktp={(tpId) => handleDeleteKktp(planId, tpId)}
            showConfirmation={showConfirmation}
          />
        )}
      </div>
    </Card>
  );
};
