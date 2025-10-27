import React, { useState } from 'react';
import { UsersIcon, SettingsIcon, FolderIcon, CalendarIcon, ChevronDownIcon } from './icons';
import type { LearningPlan, ClassProfile } from '../types';
import { useAppData } from '../hooks/useAppData';

interface PlanSelectorProps {
  learningPlans: LearningPlan[];
  activePlanId: string | null;
  onPlanChange: (id: string) => void;
  disabled?: boolean;
  id: string;
}

const PlanSelector: React.FC<PlanSelectorProps> = ({ learningPlans, activePlanId, onPlanChange, id, disabled }) => {
  return (
    <div className="flex items-center gap-2 w-full">
      <FolderIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
      <select
        id={id}
        value={activePlanId || ''}
        onChange={(e) => onPlanChange(e.target.value)}
        className="block w-full pl-2 pr-8 py-1.5 text-sm border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md truncate bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
        aria-label="Pilih Rencana Pembelajaran"
        disabled={disabled}
      >
        <option value="" disabled>Pilih Rencana...</option>
        {learningPlans.map(plan => (
          <option key={plan.id} value={plan.id}>{plan.name}</option>
        ))}
      </select>
    </div>
  );
};

interface ClassSelectorProps {
  classProfiles: ClassProfile[];
  activeClassId: string | null;
  onClassChange: (id: string) => void;
  disabled?: boolean;
  id: string;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ classProfiles, activeClassId, onClassChange, id, disabled }) => {
  return (
    <div className="flex items-center gap-2 w-full">
      <UsersIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
      <select
        id={id}
        value={activeClassId || ''}
        onChange={(e) => onClassChange(e.target.value)}
        className="block w-full pl-2 pr-8 py-1.5 text-sm border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md truncate bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
        aria-label="Pilih Kelas Aktif"
        disabled={disabled}
      >
        <option value="" disabled>Pilih Kelas...</option>
        {classProfiles.map(profile => (
          <option key={profile.id} value={profile.id}>{profile.name}</option>
        ))}
      </select>
    </div>
  );
};


interface SemesterSelectorProps {
  activeSemester: string;
  onSemesterChange: (semester: string) => void;
  disabled?: boolean;
  id: string;
}

const SemesterSelector: React.FC<SemesterSelectorProps> = ({ activeSemester, onSemesterChange, id, disabled }) => {
  return (
    <div className="flex items-center gap-2 w-full">
      <CalendarIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
      <select
        id={id}
        value={activeSemester}
        onChange={(e) => onSemesterChange(e.target.value)}
        className="block w-full pl-2 pr-8 py-1.5 text-sm border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md truncate bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
        disabled={disabled}
        aria-label="Pilih Semester Aktif"
      >
        <option value="Semester 1">Semester 1</option>
        <option value="Semester 2">Semester 2</option>
      </select>
    </div>
  );
};

export const Header: React.FC = () => {
  const {
    headerTitle,
    assessingSession,
    assessingTp,
    activeSemester,
    setActiveSemester,
    activePlanId,
    viewsWithContextSelectors,
    activeView,
    setActiveView,
    learningPlans,
    setActivePlanId,
    isOnline,
    classProfiles,
    activeClassId,
    setActiveClassId,
    activeClassProfile,
  } = useAppData();
  
  const showContextSelectors = viewsWithContextSelectors.includes(activeView);
  
  const [isMobileSelectorOpen, setIsMobileSelectorOpen] = useState(false);
  const activePlan = learningPlans.find(p => p.id === activePlanId);

  const OnlineStatusIndicator: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
    <div className={`flex items-center gap-1.5 rounded-full text-xs font-semibold ${
        isMobile 
        ? 'px-2 py-0.5' 
        : 'px-2.5 py-1'
    } ${isOnline ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
        <div className={`rounded-full ${isMobile ? 'h-1.5 w-1.5' : 'h-2 w-2'} ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}></div>
        <span>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );

  return (
    <header className="flex-shrink-0">
      {/* --- Desktop Header --- */}
      <div className="hidden md:flex items-start justify-between gap-4 bg-white border-b border-slate-200 px-4 md:px-3 lg:px-4 py-4">
        <div className="flex-grow min-w-0">
            <h1 className="font-bold text-slate-800 truncate text-2xl" title={headerTitle}>
                {headerTitle}
            </h1>
            {assessingTp && (
                <p 
                    className="text-sm text-slate-600 truncate mt-1" 
                    title={`${assessingTp.id}: ${assessingTp.deskripsi}`}
                >
                    <strong className="text-slate-800">{assessingTp.id}:</strong> {assessingTp.deskripsi}
                </p>
            )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-4">
            <OnlineStatusIndicator />
            {showContextSelectors && (
              <>
                <div className="w-52">
                    <PlanSelector
                        id="plan-selector-header-desktop"
                        learningPlans={learningPlans}
                        activePlanId={activePlanId}
                        onPlanChange={setActivePlanId}
                        disabled={!!assessingSession}
                    />
                </div>
                <div className="w-40">
                    <ClassSelector
                      id="class-selector-header-desktop"
                      classProfiles={classProfiles}
                      activeClassId={activeClassId}
                      onClassChange={setActiveClassId}
                      disabled={!!assessingSession}
                    />
                </div>
                <div className="w-40">
                    <SemesterSelector
                        id="semester-selector-header-desktop"
                        activeSemester={activeSemester}
                        onSemesterChange={setActiveSemester}
                        disabled={!!assessingSession || !activeClassId}
                    />
                </div>
              </>
            )}
            <div className="flex items-center gap-1">
                 <button 
                  onClick={() => setActiveView('settings')}
                  className="p-2 rounded-full hover:bg-slate-200 transition-colors"
                  aria-label="Buka Pengaturan"
                  title="Pengaturan"
                >
                  <SettingsIcon className="h-6 w-6 text-sky-500" />
                </button>
            </div>
        </div>
      </div>

      {/* --- Mobile Header (Refactored) --- */}
      <div className="md:hidden space-y-3 bg-white border-b border-slate-200 p-4">
        <div>
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg font-bold text-slate-800 truncate">{headerTitle}</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                     <OnlineStatusIndicator isMobile />
                     {activeClassProfile && (
                        <div className="text-xs font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            F:{activeClassProfile.phase} | {activeClassProfile.name}
                        </div>
                    )}
                     <button 
                      onClick={() => setActiveView('settings')}
                      className="p-1.5 rounded-full hover:bg-slate-200"
                      aria-label="Buka Pengaturan"
                    >
                      <SettingsIcon className="h-5 w-5 text-sky-500" />
                    </button>
                </div>
            </div>
             {assessingTp && (
                <p 
                    className="text-xs text-slate-600 truncate mt-1" 
                    title={`${assessingTp.id}: ${assessingTp.deskripsi}`}
                >
                    <strong className="text-slate-800">{assessingTp.id}:</strong> {assessingTp.deskripsi}
                </p>
             )}
        </div>

        {showContextSelectors && (
          <div className="pt-3 border-t border-slate-200">
            {isMobileSelectorOpen ? (
              <div className="space-y-3">
                  <div>
                    <label htmlFor="plan-selector-header-mobile" className="text-xs font-medium text-slate-500 mb-1 block">Rencana Pembelajaran</label>
                    <PlanSelector 
                        id="plan-selector-header-mobile"
                        learningPlans={learningPlans}
                        activePlanId={activePlanId}
                        onPlanChange={setActivePlanId}
                        disabled={!!assessingSession}
                    />
                  </div>
                  <div>
                    <label htmlFor="class-selector-header-mobile" className="text-xs font-medium text-slate-500 mb-1 block">Kelas Aktif</label>
                    <ClassSelector 
                        id="class-selector-header-mobile"
                        classProfiles={classProfiles}
                        activeClassId={activeClassId}
                        onClassChange={setActiveClassId}
                        disabled={!!assessingSession}
                    />
                  </div>
                  <div>
                      <label htmlFor="semester-selector-header-mobile" className="text-xs font-medium text-slate-500 mb-1 block">Semester Aktif</label>
                      <SemesterSelector
                          id="semester-selector-header-mobile"
                          activeSemester={activeSemester}
                          onSemesterChange={setActiveSemester}
                          disabled={!!assessingSession || !activeClassId}
                      />
                  </div>
                <button 
                  onClick={() => setIsMobileSelectorOpen(false)} 
                  className="w-full text-sm font-semibold text-teal-600 bg-teal-100 py-1.5 rounded-md hover:bg-teal-200"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-600 truncate pr-2">
                  {activePlan && (<span className="truncate"><strong>Rencana:</strong> {activePlan.name} </span>)}
                  <span className="mx-1 text-slate-300">|</span>
                  {activeClassProfile && (<span><strong>{activeClassProfile.name}</strong> / {activeSemester}</span>)}
                </div>
                <button 
                  onClick={() => setIsMobileSelectorOpen(true)}
                  className="text-sm font-semibold text-teal-600 hover:text-teal-800 flex-shrink-0 ml-2 bg-slate-100 px-3 py-1 rounded-md disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center gap-1"
                  disabled={!!assessingSession}
                >
                  {!!assessingSession ? 'Sesi Aktif' : 'Ubah Konteks'}
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};