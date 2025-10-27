import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppData } from '../hooks/useAppData';
import { Card } from './Card';
import type { HafalanPackage, HafalanStatus, HafalanItem } from '../types';
import { BookmarkIcon, PlusIcon, WandIcon, EyeIcon } from './icons';
import { HafalanGeneratorModal } from './HafalanGeneratorModal';
import { HafalanContentModal } from './HafalanContentModal';

const STATUS_MAP: Record<HafalanStatus, { label: string; color: string; hoverColor: string; }> = {
    'lancar': { label: 'Lancar', color: 'bg-green-100 text-green-800', hoverColor: 'hover:bg-green-200' },
    'mengulang': { label: 'Mengulang', color: 'bg-yellow-100 text-yellow-800', hoverColor: 'hover:bg-yellow-200' },
    'belum': { label: 'Belum', color: 'bg-red-100 text-red-800', hoverColor: 'hover:bg-red-200' },
};

const STATUS_OPTIONS: HafalanStatus[] = ['lancar', 'mengulang', 'belum'];

interface StatusPopoverProps {
    studentId: number;
    itemId: string;
    onSelect: (status: HafalanStatus) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

const StatusPopover: React.FC<StatusPopoverProps> = ({ onSelect, onClose, position }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={popoverRef}
            style={{ top: position.top, left: position.left }}
            className="absolute z-30 bg-white rounded-lg shadow-lg border p-1 flex flex-col gap-1"
        >
            {STATUS_OPTIONS.map(status => (
                <button
                    key={status}
                    onClick={() => onSelect(status)}
                    className={`w-full text-left px-3 py-1.5 text-sm font-semibold rounded-md ${STATUS_MAP[status].color} ${STATUS_MAP[status].hoverColor}`}
                >
                    {STATUS_MAP[status].label}
                </button>
            ))}
        </div>
    );
};

export const HafalanView: React.FC = () => {
    const { filteredStudents, activePlan, handleUpdateHafalanRecord, handleSaveHafalanPackage } = useAppData();
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [popoverState, setPopoverState] = useState<{ studentId: number; itemId: string; position: { top: number; left: number; }} | null>(null);
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState<HafalanItem | null>(null);

    const hafalanPackages = useMemo(() => {
        return activePlan?.curriculum.hafalanPackages || [];
    }, [activePlan]);

    useEffect(() => {
        if (!selectedPackageId && hafalanPackages.length > 0) {
            setSelectedPackageId(hafalanPackages[0].id);
        } else if (hafalanPackages.length === 0) {
            setSelectedPackageId(null);
        }
    }, [hafalanPackages, selectedPackageId]);

    const selectedPackage = useMemo(() => {
        return hafalanPackages.find(p => p.id === selectedPackageId) || null;
    }, [selectedPackageId, hafalanPackages]);

    const handleCellClick = (e: React.MouseEvent<HTMLButtonElement>, studentId: number, itemId: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPopoverState({
            studentId,
            itemId,
            position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX }
        });
    };
    
    const handleStatusSelect = (status: HafalanStatus) => {
        if (popoverState) {
            handleUpdateHafalanRecord(popoverState.studentId, popoverState.itemId, status);
            setPopoverState(null);
        }
    };

    const handlePackageCreated = (newPackage: HafalanPackage) => {
        handleSaveHafalanPackage(newPackage);
        setSelectedPackageId(newPackage.id);
        setIsGeneratorModalOpen(false);
    }

    if (hafalanPackages.length === 0) {
        return (
            <>
                <Card>
                    <div className="text-center p-8">
                        <BookmarkIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <h2 className="text-xl font-bold text-slate-700 mt-4">Mulai Lacak Hafalan Siswa</h2>
                        <p className="mt-2 text-slate-500 max-w-sm mx-auto">
                            Buat "Paket Hafalan" pertama Anda untuk memulai. AI dapat membantu Anda memecah materi hafalan (seperti surat, puisi, atau tabel perkalian) menjadi beberapa bagian.
                        </p>
                        <button 
                            onClick={() => setIsGeneratorModalOpen(true)}
                            className="mt-6 flex items-center gap-2 text-md font-semibold text-white bg-teal-600 rounded-md px-5 py-2 hover:bg-teal-700 transition-colors mx-auto"
                        >
                            <WandIcon className="h-5 w-5" />
                            <span>Buat Paket Hafalan (AI)</span>
                        </button>
                    </div>
                </Card>
                {isGeneratorModalOpen && (
                    <HafalanGeneratorModal
                        isOpen={isGeneratorModalOpen}
                        onClose={() => setIsGeneratorModalOpen(false)}
                        onPackageCreated={handlePackageCreated}
                    />
                )}
            </>
        );
    }
    
    return (
        <div className="space-y-4">
            {popoverState && (
                <StatusPopover
                    {...popoverState}
                    onSelect={handleStatusSelect}
                    onClose={() => setPopoverState(null)}
                />
            )}
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex-grow">
                        <h2 className="text-2xl font-bold text-slate-800">Setoran Hafalan</h2>
                        <p className="text-slate-600 mt-1">Pilih paket hafalan, lalu klik pada sel untuk mencatat progres setiap siswa.</p>
                    </div>
                    <div className="w-full sm:w-auto flex items-center gap-2">
                         <select
                            value={selectedPackageId || ''}
                            onChange={(e) => setSelectedPackageId(e.target.value)}
                            className="block w-full p-2 text-base border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="" disabled>Pilih Paket Hafalan...</option>
                            {hafalanPackages.map(pkg => (
                                <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                            ))}
                        </select>
                        <button onClick={() => setIsGeneratorModalOpen(true)} className="p-2.5 bg-teal-600 text-white rounded-md hover:bg-teal-700" title="Buat Paket Hafalan Baru">
                            <PlusIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </Card>

            {selectedPackage ? (
                 <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm text-left bg-white border-collapse">
                        <thead className="bg-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="p-3 font-semibold text-slate-600 border-b border-r border-slate-200 sticky left-0 bg-slate-100 z-20 w-48">Nama Siswa</th>
                                {selectedPackage.items.map(item => (
                                    <th key={item.id} className="p-3 font-semibold text-slate-600 border-b border-slate-200 text-center min-w-[150px]">
                                        <div className="flex items-center justify-center gap-2">
                                            <span>{item.name}</span>
                                            {item.content && (
                                                <button onClick={() => setViewingItem(item)} title="Lihat Konten Hafalan" className="p-1 rounded-full hover:bg-slate-200">
                                                    <EyeIcon className="h-4 w-4 text-slate-500" />
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id} className="group hover:bg-slate-50">
                                    <td className="p-2 border-b border-r border-slate-200 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{student.nama}</td>
                                    {selectedPackage.items.map(item => {
                                        const record = (student.hafalanRecords || []).find(r => r.itemId === item.id);
                                        const statusInfo = record ? STATUS_MAP[record.status] : null;
                                        return (
                                            <td key={item.id} className="p-1 border-b border-slate-200 text-center align-middle">
                                                 <button
                                                    onClick={(e) => handleCellClick(e, student.id, item.id)}
                                                    className={`w-24 h-8 rounded-md text-xs font-bold transition-colors ${statusInfo ? statusInfo.color : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    {statusInfo ? statusInfo.label : '-'}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center p-8 text-slate-500">
                    <p>Pilih salah satu paket hafalan di atas untuk melihat dan mencatat progres siswa.</p>
                </div>
            )}
            {viewingItem && (
                <HafalanContentModal
                    item={viewingItem}
                    onClose={() => setViewingItem(null)}
                />
            )}
            {isGeneratorModalOpen && (
                <HafalanGeneratorModal
                    isOpen={isGeneratorModalOpen}
                    onClose={() => setIsGeneratorModalOpen(false)}
                    onPackageCreated={handlePackageCreated}
                />
            )}
        </div>
    );
};