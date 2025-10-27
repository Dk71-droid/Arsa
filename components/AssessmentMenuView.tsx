import React from 'react';
import { useAppData } from '../hooks/useAppData';
import { Card } from './Card';
import { UserCheckIcon, UsersIcon, ClipboardListIcon, DocumentReportIcon, BookmarkIcon } from './icons';

interface MenuItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, description, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className="text-left p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-400 hover:-translate-y-1 transition-all flex items-start gap-4"
        >
            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-teal-100 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-slate-800">{title}</h3>
                <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>
        </button>
    );
};

export const AssessmentMenuView: React.FC = () => {
    const { setActiveView } = useAppData();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MenuItem 
                    icon={<UserCheckIcon className="h-6 w-6 text-teal-600" />}
                    title="Absensi"
                    description="Catat kehadiran, sakit, izin, atau alpha harian siswa."
                    onClick={() => setActiveView('absensi')}
                />
                 <MenuItem 
                    icon={<UsersIcon className="h-6 w-6 text-teal-600" />}
                    title="Asesor Formatif"
                    description="Lakukan penilaian formatif berbasis rubrik KKTP per pertemuan."
                    onClick={() => setActiveView('assessor')}
                />
                 <MenuItem 
                    icon={<ClipboardListIcon className="h-6 w-6 text-teal-600" />}
                    title="Asesor Sumatif"
                    description="Input nilai sumatif untuk ulangan harian atau ujian semester."
                    onClick={() => setActiveView('summativeAssessor')}
                />
                 <MenuItem 
                    icon={<BookmarkIcon className="h-6 w-6 text-teal-600" />}
                    title="Setoran Hafalan"
                    description="Lacak progres hafalan siswa untuk berbagai materi (surat, puisi, dll)."
                    onClick={() => setActiveView('hafalan')}
                />
                 <MenuItem 
                    icon={<DocumentReportIcon className="h-6 w-6 text-teal-600" />}
                    title="Cetak Rapor"
                    description="Buat dan cetak rapor semester dengan narasi dari AI."
                    onClick={() => setActiveView('reportView')}
                />
            </div>
        </div>
    );
};