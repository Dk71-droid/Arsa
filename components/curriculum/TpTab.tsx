import React, { useState, useEffect, useRef } from 'react';
import type { CurriculumData, TujuanPembelajaran } from '../../types';
import { PencilIcon, CheckIcon, TrashIcon, PlusIcon, ClipboardListIcon, ChevronDownIcon } from '../icons';
import { DPL_OPTIONS } from '../../constants';

interface TpTabProps {
    planId: string;
    data: CurriculumData;
    onTpsUpdated: (planId: string, newTps: TujuanPembelajaran[]) => Promise<void>;
    showConfirmation: (options: { title: string; message: string; onConfirm: () => void; }) => void;
}

export const TpTab: React.FC<TpTabProps> = ({ planId, data, onTpsUpdated, showConfirmation }) => {
    const [isTpEditing, setIsTpEditing] = useState(false);
    const [editedTps, setEditedTps] = useState<TujuanPembelajaran[]>([]);
    const [showTpRegenConfirm, setShowTpRegenConfirm] = useState(false);
    const [dplDropdownOpenFor, setDplDropdownOpenFor] = useState<number | null>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dplDropdownOpenFor === null) return;
            const target = event.target as Node;
            if (dropdownMenuRef.current && !dropdownMenuRef.current.contains(target) && !(target instanceof Element && target.closest(`[data-dpl-dropdown-trigger="${dplDropdownOpenFor}"]`))) {
                setDplDropdownOpenFor(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dplDropdownOpenFor]);

    const handleStartTpEdit = () => {
        setEditedTps(JSON.parse(JSON.stringify(data.tujuanPembelajaran)));
        setIsTpEditing(true);
    };

    const handleCancelTpEdit = () => {
        setIsTpEditing(false);
        setEditedTps([]);
    };

    const handleConfirmTpUpdate = async () => {
        await onTpsUpdated(planId, editedTps);
        setShowTpRegenConfirm(false);
        setIsTpEditing(false);
    };

    const handleTpFieldChange = (index: number, field: keyof Omit<TujuanPembelajaran, 'id' | 'kktp' | 'diagnosticData' | 'adaptiveSteps'>, value: any) => {
        const newTps = [...editedTps];
        (newTps[index] as any)[field] = value;
        setEditedTps(newTps);
    };

    const handleDplChange = (index: number, dpl: string) => {
        const newTps = [...editedTps];
        const currentDpls = newTps[index].dplTerkait || [];
        const newDpls = currentDpls.includes(dpl) ? currentDpls.filter(d => d !== dpl) : [...currentDpls, dpl];
        handleTpFieldChange(index, 'dplTerkait', newDpls);
    };

    const handleAddTp = () => {
        const tempId = `TP-NEW-${Date.now()}`;
        setEditedTps([...editedTps, {
            id: tempId,
            deskripsi: '',
            dplTerkait: [],
            saranBentukAsesmen: ''
        }]);
    };

    const handleDeleteTp = (indexToDelete: number) => {
        showConfirmation({
            title: 'Hapus TP',
            message: 'Yakin ingin menghapus TP ini? Semua data penilaian terkait akan dihapus saat disimpan.',
            onConfirm: () => {
                setEditedTps(editedTps.filter((_, index) => index !== indexToDelete));
            }
        });
    };

    return (
        <div>
            {showTpRegenConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-slate-800">Konfirmasi Perubahan TP</h2>
                        <p className="mt-2 text-slate-600">
                            Menyimpan perubahan pada daftar TP akan memicu AI untuk menyusun ulang <strong>ATP dan Unit Pembelajaran</strong> agar tetap sinkron.
                        </p>
                        <p className="mt-4 p-3 text-sm bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                            Aksi ini akan menimpa ATP dan Unit yang ada saat ini. Data penilaian siswa yang terkait dengan TP yang dihapus juga akan ikut terhapus. Lanjutkan?
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setShowTpRegenConfirm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-semibold">
                                Batal
                            </button>
                            <button onClick={handleConfirmTpUpdate} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold">
                                Ya, Simpan & Susun Ulang
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-bold text-slate-700">Tujuan Pembelajaran (TP)</h3>
                {isTpEditing ? (
                    <div className="flex items-center gap-2">
                        <button onClick={handleCancelTpEdit} className="text-sm font-semibold rounded-md px-4 py-2 transition-colors bg-white text-slate-600 border border-slate-300 hover:bg-slate-50">Batal</button>
                        <button onClick={() => setShowTpRegenConfirm(true)} className="text-sm font-semibold rounded-md px-4 py-2 transition-colors bg-teal-600 text-white hover:bg-teal-700 flex items-center justify-center gap-2">
                            <CheckIcon className="h-4 w-4" />
                            Simpan & Susun Ulang
                        </button>
                    </div>
                ) : (
                    <button onClick={handleStartTpEdit} className="flex items-center gap-2 text-sm font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded-md px-3 py-1.5 hover:bg-teal-100 transition-colors">
                        <PencilIcon className="h-4 w-4" />
                        <span>Ubah Daftar TP</span>
                    </button>
                )}
            </div>

            {isTpEditing ? (
                <div className="space-y-4">
                    {editedTps.map((tp, index) => (
                        <div key={tp.id} className="p-4 bg-white rounded-lg border border-slate-300 relative group">
                            <button onClick={() => handleDeleteTp(index)} className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Hapus TP">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor={`tp-desc-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                                        Deskripsi TP <span className="font-normal text-slate-500">(ID: TP-{index + 1})</span>
                                    </label>
                                    <textarea
                                        id={`tp-desc-${index}`}
                                        value={tp.deskripsi}
                                        onChange={e => handleTpFieldChange(index, 'deskripsi', e.target.value)}
                                        rows={3}
                                        className="block w-full p-2 text-base border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">DPL Terkait</label>
                                        <button
                                            data-dpl-dropdown-trigger={index}
                                            onClick={() => setDplDropdownOpenFor(dplDropdownOpenFor === index ? null : index)}
                                            className="w-full text-left p-2 border border-slate-300 rounded-md bg-white flex justify-between items-center"
                                        >
                                            <span className="text-sm text-slate-700 truncate pr-2">
                                                {(tp.dplTerkait && tp.dplTerkait.length > 0) ? tp.dplTerkait.join(', ') : <span className="text-slate-400">Pilih DPL...</span>}
                                            </span>
                                            <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                                        </button>
                                        {dplDropdownOpenFor === index && (
                                            <div ref={dropdownMenuRef} className="absolute top-full mt-1 w-full bg-white rounded-md shadow-lg border z-20 p-2 max-h-60 overflow-y-auto">
                                                {DPL_OPTIONS.map(dpl => (
                                                    <label key={dpl} className="flex items-center p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={(tp.dplTerkait || []).includes(dpl)}
                                                            onChange={() => handleDplChange(index, dpl)}
                                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                        <span className="ml-2 text-sm text-slate-700">{dpl}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor={`tp-asesmen-${index}`} className="block text-sm font-medium text-slate-700 mb-1">Saran Bentuk Asesmen</label>
                                        <input
                                            id={`tp-asesmen-${index}`}
                                            type="text"
                                            value={tp.saranBentukAsesmen || ''}
                                            onChange={e => handleTpFieldChange(index, 'saranBentukAsesmen', e.target.value)}
                                            className="block w-full p-2 text-base border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={handleAddTp} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-teal-600 bg-white border-2 border-dashed border-teal-300 rounded-lg p-3 hover:bg-teal-50 transition-colors shadow-sm">
                        <PlusIcon className="h-5 w-5" />
                        Tambah TP Baru
                    </button>
                </div>
            ) : (
                <ul className="space-y-3">
                    {data.tujuanPembelajaran.map((tp) => (
                        <li key={tp.id} className="p-4 bg-slate-100 rounded-md">
                            <p className="font-semibold text-teal-800">{tp.id}: <span className="text-slate-700 font-normal">{tp.deskripsi}</span></p>
                            {(tp.dplTerkait?.length || tp.saranBentukAsesmen) && (
                                <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                                    {tp.saranBentukAsesmen && (
                                        <div className="flex items-start gap-2 text-sm">
                                            <ClipboardListIcon className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                                            <p className="text-slate-600"><strong className="font-semibold">Saran Asesmen:</strong> {tp.saranBentukAsesmen}</p>
                                        </div>
                                    )}
                                    {tp.dplTerkait && tp.dplTerkait.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {tp.dplTerkait.map(dpl => (
                                                <span key={dpl} className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                    {dpl}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
