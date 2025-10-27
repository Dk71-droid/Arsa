import React from 'react';
import type { SummativeUnitAnalysisResult } from '../types';
import { Card } from './Card';
import { LightbulbIcon } from './icons';

export const SummativeAnalysisCard: React.FC<{ result: SummativeUnitAnalysisResult }> = ({ result }) => {
    const isReadyToProceed = result.rekomendasiUtama === 'LANJUT_KE_UNIT_BERIKUTNYA';
    return (
        <Card className={`mt-6 ${isReadyToProceed ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-3">
                <LightbulbIcon className={`h-6 w-6 ${isReadyToProceed ? 'text-green-600' : 'text-yellow-600'}`} />
                Rekomendasi Pembelajaran Lanjutan (AI)
            </h3>
            <div className="grid md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-1 flex flex-col items-center">
                    <p className="text-sm text-slate-600 mb-1">Tingkat Ketuntasan Kelas</p>
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
                    {result.siswaButuhPenguatan.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-slate-600">Siswa yang memerlukan perhatian ekstra:</h4>
                            <p className="text-sm text-slate-500">{result.siswaButuhPenguatan.map(s => s.nama).join(', ')}</p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};