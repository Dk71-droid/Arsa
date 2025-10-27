
import React from 'react';
import type { SummativeUnitAnalysisResult } from '../../types';
import { LightbulbIcon } from '../icons';
import { Card } from '../Card';

export const SummativeUnitAnalysisReport: React.FC<{ result: SummativeUnitAnalysisResult }> = ({ result }) => {
    const isReadyToProceed = result.rekomendasiUtama === 'LANJUT_KE_UNIT_BERIKUTNYA';

    return (
        <Card className={`mt-6 ${isReadyToProceed ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-3">
                <LightbulbIcon className={`h-6 w-6 ${isReadyToProceed ? 'text-green-600' : 'text-yellow-600'}`} />
                Analisis & Rekomendasi Unit (AI)
            </h3>
            <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-6 items-start">
                    <div className="md:col-span-1 flex flex-col items-center">
                        <p className="text-sm text-slate-600 mb-1">Tingkat Ketuntasan Unit</p>
                        <div className="text-5xl font-bold text-slate-700">{result.tingkatKetuntasanUnit}%</div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
                            <div 
                                className={`h-2.5 rounded-full ${isReadyToProceed ? 'bg-green-600' : 'bg-yellow-500'}`} 
                                style={{ width: `${result.tingkatKetuntasanUnit}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                        <p className="text-slate-700 leading-relaxed">{result.narasiRekomendasi}</p>
                    </div>
                </div>

                {result.tpPalingMenantang.length > 0 && (
                    <div className="pt-4 border-t">
                        <h4 className="font-semibold text-slate-600">TP Paling Menantang di Unit Ini:</h4>
                        <ul className="list-disc list-inside text-sm text-slate-700">
                           {result.tpPalingMenantang.map(tp => (
                               <li key={tp.tpId}><strong>{tp.tpId}:</strong> {tp.deskripsi} ({tp.persenGagal}% siswa belum tuntas)</li>
                           ))}
                        </ul>
                    </div>
                )}

                 {result.siswaButuhPenguatan.length > 0 && (
                    <div className="pt-4 border-t">
                        <h4 className="font-semibold text-slate-600">Siswa yang Memerlukan Penguatan Spesifik:</h4>
                        <ul className="list-disc list-inside text-sm text-slate-700">
                           {result.siswaButuhPenguatan.map(s => (
                               <li key={s.nama}><strong>{s.nama}:</strong> Fokus pada {s.aspek} ({s.tpId})</li>
                           ))}
                        </ul>
                    </div>
                )}
            </div>
        </Card>
    );
};
