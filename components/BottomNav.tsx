import React from 'react';
import { ChartBarIcon, WandIcon, HomeIcon } from './icons';
import { useAppData } from '../hooks/useAppData';

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  const activeClasses = "text-teal-600";
  const inactiveClasses = "text-slate-500";

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full transition-colors ${
        isActive ? activeClasses : inactiveClasses
      }`}
    >
      {icon}
      <span className="text-xs font-medium mt-1">{label}</span>
    </button>
  );
};

export const BottomNav: React.FC = () => {
  const { activeView, setActiveView } = useAppData();
  
  const assessmentViews: (typeof activeView)[] = ['assessmentMenuView', 'absensi', 'assessor', 'summativeAssessor', 'reportView', 'hafalan'];
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 grid grid-cols-3 items-center z-10 shadow-[0_-2px_5px_-1px_rgba(0,0,0,0.05)]">
      <NavItem
        icon={<HomeIcon className="h-6 w-6 text-blue-500" />}
        label="Dashboard"
        isActive={activeView === 'dashboard'}
        onClick={() => setActiveView('dashboard')}
      />
      <NavItem
        icon={<WandIcon className="h-6 w-6 text-purple-500" />}
        label="Rancangan"
        isActive={activeView === 'rancanganPembelajaran'}
        onClick={() => setActiveView('rancanganPembelajaran')}
      />
       <NavItem
        icon={<ChartBarIcon className="h-6 w-6 text-green-500" />}
        label="Asesmen"
        isActive={assessmentViews.includes(activeView)}
        onClick={() => setActiveView('assessmentMenuView')}
      />
    </nav>
  );
};