import React, { useState, useMemo } from 'react';
import type { TujuanPembelajaran, UnitPembelajaran } from '../../types';
import { XIcon } from '../icons';

interface CreateSummativeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: { name: string, tpIds: string[] }) => void;
    tpsInSemester: TujuanPembelajaran[];
    unitsInSemester: UnitPembelajaran[];
}

export const CreateSummativeModal: React.FC<CreateSummativeModalProps> = ({
    isOpen, onClose, onCreate, tpsInSemester, unitsInSemester
}) => {
    const [name, setName] = useState('');
    const [selectedTpIds, setSelectedTpIds] = useState<Set<string>>(new Set());

    const tpsGroupedByUnit = useMemo(() => {
        return unitsInSemester.map(unit => ({
            unit,
            tps: tpsInSemester.filter(tp => unit.tpIds.includes(tp.id))
        })).filter(group => group.tps.length > 0);
    }, [tpsInSemester, unitsInSemester]);

    const handleToggleTp = (tpId: string) => {
        setSelectedTpIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tpId)) {
                newSet.delete(tpId);
            } else {
                newSet.add(tpId);
            }
            return newSet;
        });
    };
    
    const handleToggleUnit = (tpIdsInUnit: string[]) => {
        const areAllSelected = tpIdsInUnit.every(id => selectedTpIds.has(id));
        setSelectedTpIds(prev => {
            const newSet = new Set(prev);
            if (areAllSelected) {
                tpIdsInUnit.forEach(id => newSet.delete(id));
            } else {
                tpIdsInUnit.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };

    const handleCreate = () => {
        if (name.trim() && selectedTpIds.size > 0) {
            // Sort selected IDs based on their order in tpsInSemester (ATP order)
            const sortedIds = tpsInSemester
                .filter(tp => selectedTpIds.has(tp.id))
                .map(tp => tp.id);
            onCreate({ name: name.trim(), tpIds: sortedIds });
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Buat Paket Asesmen Sumatif Baru</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
                </header>
                <main className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label htmlFor="package-name" className="block text-sm font-medium text-slate-700 mb-1">
                            Nama Paket Sumatif <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="package-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Ulangan Harian Bab 1, Sumatif Tengah Semester"
                            className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div>
                        <p className="block text-sm font-medium text-slate-700 mb-2">
                            Pilih Tujuan Pembelajaran (TP) yang akan dinilai <span className="text-red-500">*</span>
                        </p>
                        <div className="space-y-3 p-3 border rounded-md max-h-80 overflow-y-auto bg-slate-50">
                            {tpsGroupedByUnit.map(({ unit, tps }) => {
                                const tpIdsInUnit = tps.map(tp => tp.id);
                                const areAllSelected = tpIdsInUnit.length > 0 && tpIdsInUnit.every(id => selectedTpIds.has(id));
                                return (
                                <div key={unit.id}>
                                    <div className="flex items-center p-2 rounded-md bg-slate-200">
                                         <input
                                            id={`unit-select-${unit.id}`}
                                            type="checkbox"
                                            checked={areAllSelected}
                                            onChange={() => handleToggleUnit(tpIdsInUnit)}
                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <label htmlFor={`unit-select-${unit.id}`} className="ml-2 font-semibold text-slate-700 text-sm cursor-pointer">{unit.nama}</label>
                                    </div>
                                    <div className="space-y-1 pl-4 pt-2">
                                        {tps.map(tp => (
                                            <label key={tp.id} className="flex items-start p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTpIds.has(tp.id)}
                                                    onChange={() => handleToggleTp(tp.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 mt-0.5"
                                                />
                                                <span className="ml-3 text-sm text-slate-700">
                                                    <strong>{tp.id}:</strong> {tp.deskripsi}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                </main>
                <footer className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">Batal</button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim() || selectedTpIds.size === 0}
                        className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 disabled:bg-slate-400"
                    >
                        Buat Paket
                    </button>
                </footer>
            </div>
        </div>
    );
};
