import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CurriculumData, AlurTujuanPembelajaran, TujuanPembelajaran } from '../../types';
import { PencilIcon, EyeIcon, EyeOffIcon, WandIcon, ChevronDownIcon, ChevronUpIcon, XIcon, TrashIcon, ClockIcon, EllipsisVerticalIcon } from '../icons';
import { Loader } from '../Loader';

interface AtpTabProps {
    planId: string;
    data: CurriculumData;
    onUpdateAtp: (newAtp: AlurTujuanPembelajaran[]) => void;
    onRegenerateAtp: (planId: string, tpAllocation: Record<string, string[]>) => Promise<void>;
    onFullRegenerateAtp: (planId: string) => Promise<void>;
    showConfirmation: (options: { title: string; message: string; onConfirm: () => void; }) => void;
}

type AtpEditStage = 'none' | 'allocating';

const getSemestersForPhase = (phase: string): string[] => {
    switch (phase) {
        case 'A': return ['Kelas 1, Semester 1', 'Kelas 1, Semester 2', 'Kelas 2, Semester 1', 'Kelas 2, Semester 2'];
        case 'B': return ['Kelas 3, Semester 1', 'Kelas 3, Semester 2', 'Kelas 4, Semester 1', 'Kelas 4, Semester 2'];
        case 'C': return ['Kelas 5, Semester 1', 'Kelas 5, Semester 2', 'Kelas 6, Semester 1', 'Kelas 6, Semester 2'];
        case 'D': return ['Kelas 7, Semester 1', 'Kelas 7, Semester 2', 'Kelas 8, Semester 1', 'Kelas 8, Semester 2', 'Kelas 9, Semester 1', 'Kelas 9, Semester 2'];
        case 'E': return ['Kelas 10, Semester 1', 'Kelas 10, Semester 2'];
        case 'F': return ['Kelas 11, Semester 1', 'Kelas 11, Semester 2', 'Kelas 12, Semester 1', 'Kelas 12, Semester 2'];
        default: return [];
    }
};

export const AtpTab: React.FC<AtpTabProps> = ({ planId, data, onUpdateAtp, onRegenerateAtp, onFullRegenerateAtp, showConfirmation }) => {
    const [editStage, setEditStage] = useState<AtpEditStage>('none');
    const [showEditChoiceModal, setShowEditChoiceModal] = useState(false);
    const [tpAllocation, setTpAllocation] = useState<Record<string, string[]>>({});
    const [activeDropdown, setActiveDropdown] = useState<{ semester: string; position: 'up' | 'down' } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showJustification, setShowJustification] = useState(false);
    const [openSemesters, setOpenSemesters] = useState<Record<string, boolean>>({});
    const [openMenuForTp, setOpenMenuForTp] = useState<string | null>(null);

    const dropdownMenuRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const atpWithTpDetails = useMemo(() => {
        return data.alurTujuanPembelajaran.map(atpItem => {
            const tp = data.tujuanPembelajaran.find(t => t.id === atpItem.tpId);
            return { ...atpItem, tp, semester: atpItem.mingguKe.match(/(Kelas \d+, Semester \d+)/)?.[0] || 'Lainnya' };
        });
    }, [data.alurTujuanPembelajaran, data.tujuanPembelajaran]);

    const atpGroupedBySemester = useMemo(() => {
        const groups: Record<string, (typeof atpWithTpDetails)> = {};
        const semesterOrder: string[] = [];

        atpWithTpDetails.forEach(item => {
            if (!item.semester) return;
            if (!groups[item.semester]) {
                groups[item.semester] = [];
                semesterOrder.push(item.semester);
            }
            groups[item.semester].push(item);
        });

        semesterOrder.sort((a, b) => {
            const matchA = a.match(/Kelas (\d+), Semester (\d+)/);
            const matchB = b.match(/Kelas (\d+), Semester (\d+)/);
            if (matchA && matchB) {
                const classA = parseInt(matchA[1], 10);
                const semA = parseInt(matchA[2], 10);
                const classB = parseInt(matchB[1], 10);
                const semB = parseInt(matchB[2], 10);
                if (classA !== classB) return classA - classB;
                return semA - semB;
            }
            return a.localeCompare(b);
        });
        
        // Initialize all semesters to be open by default
        const initialOpenState: Record<string, boolean> = {};
        semesterOrder.forEach(s => initialOpenState[s] = true);
        setOpenSemesters(initialOpenState);

        return { groups, semesterOrder };
    }, [atpWithTpDetails]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (activeDropdown && dropdownMenuRef.current && !dropdownMenuRef.current.contains(target) && !(target instanceof Element && target.closest('button[data-dropdown-trigger]'))) {
                setActiveDropdown(null);
            }
            if (openMenuForTp && menuRef.current && !menuRef.current.contains(target)) {
                setOpenMenuForTp(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown, openMenuForTp]);

    const handleStartMinorEdit = () => {
        const semesters = getSemestersForPhase(data.phase);
        const initialAllocation: Record<string, string[]> = {};
        semesters.forEach(s => initialAllocation[s] = []);

        data.alurTujuanPembelajaran.forEach(atpItem => {
            const semesterMatch = atpItem.mingguKe.match(/(Kelas \d+, Semester \d+)/);
            if (semesterMatch) {
                const semesterKey = semesterMatch[0];
                if (initialAllocation[semesterKey] && !initialAllocation[semesterKey].includes(atpItem.tpId)) {
                    initialAllocation[semesterKey].push(atpItem.tpId);
                }
            }
        });

        setTpAllocation(initialAllocation);
        setEditStage('allocating');
        setShowEditChoiceModal(false);
    };

    const handleStartAllocationFromScratch = () => {
        const semesters = getSemestersForPhase(data.phase);
        const initialAllocation: Record<string, string[]> = {};
        semesters.forEach(s => initialAllocation[s] = []);
        setTpAllocation(initialAllocation);
        setEditStage('allocating');
        setShowEditChoiceModal(false);
    };
    
    const handleCancelEdit = () => {
        setEditStage('none');
        setTpAllocation({});
        setActiveDropdown(null);
    };
    
    const handleFullAiRegenFromModal = async () => {
        showConfirmation({
            title: "Generate Ulang ATP",
            message: "Apakah Anda yakin ingin AI menyusun ulang seluruh ATP dari awal? Ini akan menimpa ATP yang ada.",
            onConfirm: async () => {
                setShowEditChoiceModal(false);
                await onFullRegenerateAtp(planId);
            }
        });
    };

    const handleGenerateWithAi = async () => {
        setIsProcessing(true);
        await onRegenerateAtp(planId, tpAllocation);
        setIsProcessing(false);
        setEditStage('none');
    };
        
    const handleTpSelectionChange = (semester: string, tpId: string) => {
        setTpAllocation(prev => {
            const newAllocation = JSON.parse(JSON.stringify(prev));
            const isChecked = newAllocation[semester]?.includes(tpId);
            if (isChecked) {
                newAllocation[semester] = newAllocation[semester].filter(id => id !== tpId);
            } else {
                Object.keys(newAllocation).forEach(s => {
                    newAllocation[s] = newAllocation[s].filter(id => id !== tpId);
                });
                newAllocation[semester] = [...(newAllocation[semester] || []), tpId];
            }
            return newAllocation;
        });
    };
    
    const handleToggleDropdown = (event: React.MouseEvent<HTMLButtonElement>, semester: string) => {
        if (activeDropdown?.semester === semester) {
            setActiveDropdown(null);
        } else {
            const buttonRect = event.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const requiredSpace = 400; 
            const position = (spaceBelow < requiredSpace && buttonRect.top > spaceBelow) ? 'up' : 'down';
            setActiveDropdown({ semester, position });
        }
    };

    const allAllocatedTpIds = useMemo(() => new Set(Object.values(tpAllocation).flat()), [tpAllocation]);
    const isAllocationComplete = useMemo(() => allAllocatedTpIds.size === data.tujuanPembelajaran.length, [allAllocatedTpIds, data.tujuanPembelajaran]);

    const toggleSemester = (semester: string) => {
        setOpenSemesters(prev => ({...prev, [semester]: !prev[semester]}));
    };

    if (editStage === 'allocating') {
         return (
             // EDITING VIEW
             <div>
                 {isProcessing ? <Loader text="AI sedang menyusun ulang ATP..." /> : (
                     <div className="space-y-4">
                        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
                            <h3 className="font-bold text-yellow-800">Mode Edit Alur</h3>
                            <p className="text-sm text-yellow-900">Alokasikan setiap TP ke semester yang sesuai. AI akan mengurutkan, memberikan justifikasi, dan alokasi waktu secara otomatis.</p>
                        </div>
                        {getSemestersForPhase(data.phase).map(semester => (
                            <div key={semester} className="p-4 bg-white border border-slate-200 rounded-lg">
                                <h4 className="font-bold text-slate-800">{semester}</h4>
                                <div className="mt-2 space-y-2">
                                    {(tpAllocation[semester] || []).map(tpId => {
                                        const tp = data.tujuanPembelajaran.find(t => t.id === tpId);
                                        return (
                                            <div key={tpId} className="flex items-center justify-between p-2 bg-slate-100 rounded-md">
                                                <p className="text-sm text-slate-700">{tp?.id}: {tp?.deskripsi}</p>
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setOpenMenuForTp(openMenuForTp === tpId ? null : tpId); }}
                                                        className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-full"
                                                        aria-label={`Opsi untuk ${tp?.id}`}
                                                        title="Opsi"
                                                    >
                                                        <EllipsisVerticalIcon className="h-5 w-5" />
                                                    </button>
                                                    {openMenuForTp === tpId && (
                                                        <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-20">
                                                            <button
                                                                onClick={() => {
                                                                    handleTpSelectionChange(semester, tpId);
                                                                    setOpenMenuForTp(null);
                                                                }}
                                                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                                <span>Hapus dari Semester</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="relative">
                                        <button data-dropdown-trigger onClick={(e) => handleToggleDropdown(e, semester)} className="w-full text-left p-2 border-2 border-dashed rounded-md bg-white hover:bg-slate-50 text-sm text-teal-600 font-semibold">
                                            + Tambah TP ke semester ini...
                                        </button>
                                        {activeDropdown?.semester === semester && (
                                            <div ref={dropdownMenuRef} className={`absolute w-full bg-white rounded-md shadow-lg border z-20 p-2 max-h-60 overflow-y-auto ${activeDropdown.position === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                                                {data.tujuanPembelajaran.filter(tp => !allAllocatedTpIds.has(tp.id)).map(tp => (
                                                    <button key={tp.id} onClick={() => handleTpSelectionChange(semester, tp.id)} className="w-full text-left p-2 rounded-md hover:bg-slate-100 text-sm">
                                                        {tp.id}: {tp.deskripsi}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="p-4 bg-white border border-slate-200 rounded-lg">
                             <h4 className="font-bold text-slate-800">TP Belum Dialokasikan</h4>
                              <div className="mt-2 space-y-1">
                                {data.tujuanPembelajaran.filter(tp => !allAllocatedTpIds.has(tp.id)).map(tp => (
                                    <p key={tp.id} className="text-sm text-red-600 p-1 bg-red-50 rounded-md">{tp.id}: {tp.deskripsi}</p>
                                ))}
                                {allAllocatedTpIds.size === data.tujuanPembelajaran.length && <p className="text-sm text-green-600">Semua TP sudah dialokasikan!</p>}
                              </div>
                        </div>

                         <div className="flex justify-end items-center gap-2 pt-4 border-t">
                            <button onClick={handleCancelEdit} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Batal</button>
                            <button onClick={handleGenerateWithAi} disabled={!isAllocationComplete} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 disabled:bg-slate-400">
                                <WandIcon className="h-5 w-5" />
                                Simpan & Biarkan AI Menyusun
                            </button>
                        </div>
                     </div>
                 )}
             </div>
         );
    }

    // DISPLAY VIEW
    return (
        <div>
            {showEditChoiceModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowEditChoiceModal(false)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-slate-800">Pilih Mode Edit ATP</h2>
                        <p className="mt-2 text-slate-600">Anda dapat membiarkan AI menyusun ulang dari awal, atau Anda bisa mengatur alokasi TP per semester terlebih dahulu.</p>
                        <div className="mt-6 space-y-3">
                             <button onClick={handleStartMinorEdit} className="w-full text-left p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">
                                <p className="font-bold text-slate-700">Mode Alokasi (Disarankan)</p>
                                <p className="text-sm text-slate-500">Anda menempatkan TP ke dalam semester, lalu AI akan mengurutkan, memberikan justifikasi, dan alokasi waktu secara otomatis.</p>
                            </button>
                            <button onClick={handleFullAiRegenFromModal} className="w-full text-left p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">
                                <p className="font-bold text-slate-700">Mode Otomatis Penuh</p>
                                <p className="text-sm text-slate-500">Biarkan AI menyusun ulang ATP dari awal berdasarkan daftar TP saat ini.</p>
                            </button>
                        </div>
                         <button onClick={() => setShowEditChoiceModal(false)} className="mt-4 w-full px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Batal</button>
                    </div>
                </div>
            )}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-700">Alur Tujuan Pembelajaran (ATP)</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowJustification(!showJustification)}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50 transition-colors"
                            title={showJustification ? "Sembunyikan Justifikasi AI" : "Tampilkan Justifikasi AI"}
                        >
                            {showJustification ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            <span>Justifikasi</span>
                        </button>
                        <button
                            onClick={() => setShowEditChoiceModal(true)}
                            className="flex items-center gap-2 text-sm font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded-md px-3 py-1.5 hover:bg-teal-100 transition-colors"
                        >
                            <PencilIcon className="h-4 w-4" />
                            <span>Ubah Alur</span>
                        </button>
                    </div>
                </div>
                
                <div className="space-y-4">
                    {atpGroupedBySemester.semesterOrder.map(semester => (
                        <div key={semester} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                             <button onClick={() => toggleSemester(semester)} className="w-full font-bold text-lg text-teal-800 flex justify-between items-center">
                                {semester}
                                {openSemesters[semester] ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                            </button>
                            {openSemesters[semester] && (
                                <div className="mt-4 space-y-3">
                                    {atpGroupedBySemester.groups[semester].map((item, index) => (
                                        <div key={item.tpId} className="p-3 bg-white rounded-md border border-slate-200 border-l-4 border-l-teal-400">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-slate-700">{item.tp?.id}: <span className="font-normal">{item.tp?.deskripsi}</span></p>
                                                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                                                        <span><strong className="font-semibold">Alokasi:</strong> {item.mingguKe.split(',').pop()?.trim()}</span>
                                                        <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" /> <strong className="font-semibold">Estimasi:</strong> {item.estimasiWaktu}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {item.prasyaratTpIds && item.prasyaratTpIds.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                                                    <p className="font-semibold text-slate-600">Prasyarat:</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.prasyaratTpIds.map(id => (
                                                            <span key={id} className="px-2 py-0.5 font-semibold bg-yellow-100 text-yellow-800 rounded-full">{id}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {showJustification && item.justifikasi && (
                                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                                                    <p className="font-semibold text-slate-600">Justifikasi AI:</p>
                                                    <p className="italic text-slate-500">{item.justifikasi}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
