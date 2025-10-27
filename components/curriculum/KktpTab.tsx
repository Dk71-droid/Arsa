import React, { useState, useEffect, useMemo } from 'react';
import type { CurriculumData, TujuanPembelajaran, Kktp } from '../../types';
import { PencilIcon, WandIcon, StarIcon, TrashIcon } from '../icons';
import { Loader } from '../Loader';
import { KktpEditorModal } from '../KktpEditorModal';

interface KktpTabProps {
    planId: string;
    data: CurriculumData;
    onGenerateKktp: (tpId: string) => Promise<void>;
    loadingKktpId: string | null;
    onUpdateKktp: (tpId: string, newKktp: Kktp) => void;
    onCreateManualKktp: (planId: string, tpId: string) => void;
    onDeleteKktp: (tpId: string) => void;
    showConfirmation: (options: { title: string; message: string; onConfirm: () => void; }) => void;
}

const LEVEL_HEADERS = [
    { title: 'Mahir', level: 4, color: 'bg-green-50 text-green-800' },
    { title: 'Cakap', level: 3, color: 'bg-blue-50 text-blue-800' },
    { title: 'Layak', level: 2, color: 'bg-yellow-50 text-yellow-800' },
    { title: 'Baru Berkembang', level: 1, color: 'bg-red-50 text-red-800' },
];

export const KktpTab: React.FC<KktpTabProps> = ({ planId, data, onGenerateKktp, loadingKktpId, onUpdateKktp, onCreateManualKktp, onDeleteKktp, showConfirmation }) => {
    const [isKktpModalOpen, setIsKktpModalOpen] = useState(false);
    
    const atpWithTpDetails = useMemo(() => {
        return data.alurTujuanPembelajaran.map(atpItem => {
            const tp = data.tujuanPembelajaran.find(t => t.id === atpItem.tpId);
            return { ...atpItem, tp, semester: atpItem.mingguKe.match(/(Kelas \d+, Semester \d+)/)?.[0] || 'Lainnya' };
        });
    }, [data.alurTujuanPembelajaran, data.tujuanPembelajaran]);

    const tpsBySemester = useMemo(() => {
        const groups: Record<string, TujuanPembelajaran[]> = {};
        const semesterOrder: string[] = [];

        atpWithTpDetails.forEach(item => {
            if (!item.tp || !item.semester) return;
            if (!groups[item.semester]) {
                groups[item.semester] = [];
                semesterOrder.push(item.semester);
            }
            if (!groups[item.semester].find(tp => tp.id === item.tp!.id)) {
                groups[item.semester].push(item.tp);
            }
        });

        semesterOrder.sort();

        const assignedTpIds = new Set(Object.values(groups).flat().map(tp => tp.id));
        const unassignedTps = data.tujuanPembelajaran.filter(tp => !assignedTpIds.has(tp.id));
        if (unassignedTps.length > 0) {
            groups['Belum Dialokasikan'] = unassignedTps;
            semesterOrder.push('Belum Dialokasikan');
        }

        return { groups, semesterOrder };
    }, [atpWithTpDetails, data.tujuanPembelajaran]);

    const orderedTps = useMemo(() => {
        return tpsBySemester.semesterOrder.flatMap(semester => tpsBySemester.groups[semester]);
    }, [tpsBySemester]);
    
    const [selectedTpIdForKktp, setSelectedTpIdForKktp] = useState<string>(orderedTps[0]?.id || '');

    useEffect(() => {
        if (!selectedTpIdForKktp && orderedTps.length > 0) {
            setSelectedTpIdForKktp(orderedTps[0].id);
        }
    }, [selectedTpIdForKktp, orderedTps]);

    const selectedTpForKktp = orderedTps.find(tp => tp.id === selectedTpIdForKktp) || orderedTps[0];

    const handleRegenerateKktp = () => {
        if (!selectedTpForKktp) return;
        showConfirmation({
            title: 'Generate Ulang KKTP',
            message: 'Apakah Anda yakin ingin men-generate ulang KKTP untuk TP ini? Rubrik yang ada saat ini akan diganti dengan versi baru dari AI.',
            onConfirm: () => onGenerateKktp(selectedTpForKktp.id)
        });
    };

    const handleDeleteClick = () => {
        if (!selectedTpForKktp) return;
        showConfirmation({
            title: 'Hapus KKTP',
            message: `Apakah Anda yakin ingin menghapus rubrik KKTP untuk TP ${selectedTpForKktp.id}? Tindakan ini tidak dapat dibatalkan.`,
            onConfirm: () => onDeleteKktp(selectedTpForKktp.id)
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-bold text-slate-700">Rubrik Analitik KKTP</h3>
            </div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
                <label htmlFor="tp-selector" className="text-sm font-medium text-slate-700 shrink-0">Pilih TP untuk Dilihat/Diedit:</label>
                <select
                    id="tp-selector"
                    onChange={(e) => setSelectedTpIdForKktp(e.target.value)}
                    value={selectedTpIdForKktp}
                    className="p-2 border border-slate-300 rounded-md shadow-sm w-full"
                >
                    {tpsBySemester.semesterOrder.map(semester => (
                        <optgroup key={semester} label={semester}>
                            {tpsBySemester.groups[semester].map(tp => (
                                <option key={tp.id} value={tp.id}>
                                    {tp.id}: {tp.deskripsi.substring(0, 80)}...
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {loadingKktpId === selectedTpForKktp?.id ? (
                <div className="py-4">
                    <Loader text={`AI sedang membuat Rubrik Analitik untuk ${selectedTpForKktp.id}...`} />
                </div>
            ) : selectedTpForKktp?.kktp ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={handleDeleteClick} className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-100 transition-colors">
                            <TrashIcon className="h-4 w-4" />
                            <span>Hapus KKTP</span>
                        </button>
                        <button onClick={handleRegenerateKktp} className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50 transition-colors">
                            <WandIcon className="h-4 w-4" />
                            <span>Generate Ulang</span>
                        </button>
                        <button onClick={() => setIsKktpModalOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-white bg-teal-600 border border-teal-600 rounded-md px-3 py-1.5 hover:bg-teal-700 transition-colors">
                            <PencilIcon className="h-4 w-4" />
                            <span>Ubah KKTP</span>
                        </button>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <h4 className="font-bold text-slate-800">Tujuan Pembelajaran (TP) yang Diukur</h4>
                        <p className="mt-1 text-slate-600">{selectedTpForKktp.kktp.tpTerkait}</p>
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <h5 className="font-semibold text-teal-800 flex items-center gap-2">
                                <StarIcon className="h-5 w-5" />
                                Batas Ketercapaian (KKTP)
                            </h5>
                            <p className="mt-1 text-slate-700">{selectedTpForKktp.kktp.batasKetercapaian}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="p-3 font-semibold text-slate-600 border-b border-r w-1/5 align-top">Aspek yang Dinilai</th>
                                    {LEVEL_HEADERS.map(header => (
                                        <th key={header.level} className={`p-3 font-bold border-b border-r w-1/5 align-top ${header.color}`}>
                                            {header.title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {selectedTpForKktp.kktp.rubrik.map((item, aspectIndex) => {
                                    const sortedKriteria = [...item.kriteria].sort((a, b) => b.level - a.level);
                                    return (
                                        <tr key={`${item.aspek}-${aspectIndex}`} className="group hover:bg-slate-50">
                                            <td className="p-3 border-b border-r border-slate-200 font-bold text-teal-800 align-top">
                                                <p>{item.aspek}</p>
                                                <div className="mt-2 space-y-1.5 font-normal text-xs">
                                                    {item.sifatAspek === 'PRASYARAT_KRITIS' && (
                                                        <div><span className="inline-block px-2 py-0.5 font-semibold text-yellow-800 bg-yellow-200 rounded-full">Prasyarat Kritis</span></div>
                                                    )}
                                                    <p className="text-slate-600"><span className="font-semibold text-slate-500">Teknik:</span> {item.teknikAsesmen}</p>
                                                    <p className="text-slate-600"><span className="font-semibold text-slate-500">Instrumen:</span> {item.instrumenAsesmen}</p>
                                                </div>
                                            </td>
                                            {sortedKriteria.map(k => (
                                                <td key={k.level} className="p-3 border-b border-r border-slate-200 text-slate-600 align-top">{k.deskripsi}</td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center p-8 bg-slate-100 rounded-md border-2 border-dashed">
                    <h4 className="text-lg font-bold text-slate-700">KKTP Belum Dibuat</h4>
                    <p className="mt-2 text-slate-500 max-w-lg mx-auto">Buat Kriteria Ketercapaian Tujuan Pembelajaran untuk TP ini. Anda dapat membuatnya secara otomatis dengan AI atau menyusunnya secara manual.</p>
                    <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                        <button onClick={() => onGenerateKktp(selectedTpForKktp.id)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-600 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg hover:bg-teal-700 transition-all transform hover:-translate-y-0.5">
                            <WandIcon className="h-5 w-5" />
                            <span>Generate dengan AI</span>
                        </button>
                        <button onClick={() => onCreateManualKktp(planId, selectedTpForKktp.id)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 font-bold py-2.5 px-6 rounded-lg shadow-lg border border-slate-300 hover:bg-slate-50 transition-all transform hover:-translate-y-0.5">
                            <PencilIcon className="h-5 w-5" />
                            <span>Buat Manual</span>
                        </button>
                    </div>
                </div>
            )}
            {isKktpModalOpen && selectedTpForKktp && (
                <KktpEditorModal
                    key={selectedTpForKktp.id}
                    kktp={selectedTpForKktp.kktp}
                    tpDeskripsi={selectedTpForKktp.deskripsi}
                    onClose={() => setIsKktpModalOpen(false)}
                    onSave={(newKktp) => {
                        onUpdateKktp(selectedTpForKktp.id, newKktp);
                        setIsKktpModalOpen(false);
                    }}
                    onRegenerate={() => {
                        handleRegenerateKktp();
                        setIsKktpModalOpen(false);
                    }}
                    showConfirmation={showConfirmation}
                />
            )}
        </div>
    );
};
