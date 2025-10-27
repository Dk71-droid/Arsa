import React from 'react';
import { BookOpenIcon, UsersIcon, ChartBarIcon, WandIcon, ClipboardListIcon, HomeIcon, FolderIcon, PlusCircleIcon, UserCheckIcon, DocumentReportIcon, BookmarkIcon } from './icons';
import { useAppData } from '../hooks/useAppData';

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  isSubItem?: boolean;
}> = ({ icon, label, isActive, onClick, disabled = false, isSubItem = false }) => {
  const baseClasses = "flex items-center w-full text-left p-3 rounded-lg transition-colors";
  const activeClasses = "bg-teal-600 text-white shadow-sm";
  const inactiveClasses = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const disabledClasses = "text-slate-400 cursor-not-allowed";
  const subItemClasses = isSubItem ? "pl-4" : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${subItemClasses} ${isActive ? activeClasses : disabled ? disabledClasses : inactiveClasses}`}
    >
      <span className="mr-3">{icon}</span>
      <span className="font-semibold">{label}</span>
    </button>
  );
};

const PlanItem: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => {
  const baseClasses = "flex items-center w-full text-left px-3 py-2 rounded-md transition-colors text-sm";
  const activeClasses = "bg-teal-600 text-white font-semibold";
  const inactiveClasses = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      <FolderIcon className="h-4 w-4 mr-2.5 flex-shrink-0" />
      <span className="truncate" title={label}>{label}</span>
    </button>
  );
};


export const Sidebar: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    learningPlans, 
    activePlanId, 
    setActivePlanId, 
    handleShowNewPlanGenerator 
  } = useAppData();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white p-4 flex-shrink-0 border-r border-slate-200">
      <div className="flex items-center gap-3 mb-8 px-2">
        <BookOpenIcon className="h-10 w-10 text-teal-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">Arsa</h1>
          <p className="text-xs text-slate-500">Asisten Cerdas Pendidik</p>
        </div>
      </div>
      <nav className="flex-1 flex flex-col space-y-2">
        <NavItem
          icon={<HomeIcon className="h-5 w-5 text-blue-500" />}
          label="Dashboard"
          isActive={activeView === 'dashboard'}
          onClick={() => setActiveView('dashboard')}
        />
        <NavItem
          icon={<WandIcon className="h-5 w-5 text-purple-500" />}
          label="Rancangan Pembelajaran"
          isActive={activeView === 'rancanganPembelajaran'}
          onClick={() => setActiveView('rancanganPembelajaran')}
        />
        
        {/* Assessment & Data Section */}
        <div className="pt-2">
            <h2 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asesmen & Data Siswa</h2>
            <div className="space-y-1 mt-1">
                 <NavItem
                  isSubItem
                  icon={<UserCheckIcon className="h-5 w-5 text-orange-500" />}
                  label="Absensi"
                  isActive={activeView === 'absensi'}
                  onClick={() => setActiveView('absensi')}
                />
                <NavItem
                  isSubItem
                  icon={<UsersIcon className="h-5 w-5 text-pink-500" />}
                  label="Asesor Formatif"
                  isActive={activeView === 'assessor'}
                  onClick={() => setActiveView('assessor')}
                />
                <NavItem
                  isSubItem
                  icon={<ClipboardListIcon className="h-5 w-5 text-indigo-500" />}
                  label="Asesor Sumatif"
                  isActive={activeView === 'summativeAssessor'}
                  onClick={() => setActiveView('summativeAssessor')}
                />
                <NavItem
                  isSubItem
                  icon={<BookmarkIcon className="h-5 w-5 text-cyan-500" />}
                  label="Hafalan"
                  isActive={activeView === 'hafalan'}
                  onClick={() => setActiveView('hafalan')}
                />
                 <NavItem
                  isSubItem
                  icon={<DocumentReportIcon className="h-5 w-5 text-green-500" />}
                  label="Cetak Rapor"
                  isActive={activeView === 'reportView'}
                  onClick={() => setActiveView('reportView')}
                />
            </div>
        </div>

        {/* Learning Plans Section */}
        <div className="pt-4 mt-auto border-t border-slate-200">
          <div className="flex justify-between items-center px-3 mb-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rencana Pembelajaran</h2>
            <button onClick={handleShowNewPlanGenerator} title="Buat Rencana Baru" className="p-1 rounded-full text-teal-600 hover:bg-teal-100 transition-colors">
              <PlusCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-1 pr-1 -mr-2 max-h-48 overflow-y-auto">
            {learningPlans.map(plan => (
              <PlanItem
                key={plan.id}
                label={plan.name}
                isActive={plan.id === activePlanId}
                onClick={() => setActivePlanId(plan.id)}
              />
            ))}
             {learningPlans.length === 0 && (
                <p className="px-3 text-xs text-slate-500">Belum ada rencana. Buat satu di 'Rancangan Pembelajaran' untuk memulai!</p>
             )}
          </div>
        </div>
      </nav>
    </aside>
  );
};