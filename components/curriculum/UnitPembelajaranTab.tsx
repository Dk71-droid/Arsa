import React from 'react';
import type { CurriculumData } from '../../types';

interface UnitPembelajaranTabProps {
    data: CurriculumData;
}

export const UnitPembelajaranTab: React.FC<UnitPembelajaranTabProps> = ({ data }) => {
    if (!data.unitPembelajaran) {
        return <p>Data Unit Pembelajaran tidak tersedia.</p>;
    }

    return (
        <div>
            <h3 className="text-xl font-bold text-slate-700 mb-3">Unit Pembelajaran</h3>
            <div className="space-y-4">
                {data.unitPembelajaran.map(unit => {
                    const tpsInUnit = data.tujuanPembelajaran.filter(tp => unit.tpIds.includes(tp.id));
                    return (
                        <div key={unit.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-lg text-teal-800">{unit.nama} <span className="font-normal text-slate-500 text-base">({unit.id})</span></h4>
                            <p className="text-sm text-slate-600 mt-1">{unit.deskripsi}</p>
                            {unit.capaianPembelajaran && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                    <h5 className="font-semibold text-sm text-slate-600 mb-2">Capaian Pembelajaran Terkait:</h5>
                                    <blockquote className="text-sm text-slate-700 italic bg-white p-3 rounded border border-slate-200 pl-4 border-l-4 border-l-teal-300">
                                        "{unit.capaianPembelajaran}"
                                    </blockquote>
                                </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <h5 className="font-semibold text-sm text-slate-600 mb-2">DPL Fokus:</h5>
                                <div className="flex flex-wrap gap-2">
                                    {unit.dplFokus.map(dpl => (
                                        <span key={dpl} className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                            {dpl}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <h5 className="font-semibold text-sm text-slate-600 mb-2">Tujuan Pembelajaran di Unit Ini:</h5>
                                <ul className="space-y-2 list-disc list-inside">
                                    {tpsInUnit.map(tp => (
                                        <li key={tp.id} className="text-sm text-slate-700"><span className="font-semibold">{tp.id}:</span> {tp.deskripsi}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
