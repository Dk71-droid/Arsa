import React from 'react';
import { Card } from '../Card';
import { WandIcon } from '../icons';
import { useAppData } from '../../hooks/useAppData';

export const UtilityCard = () => {
    const { showHtmlPreview } = useAppData();
    
    return (
        <Card>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-700">Utilitas Tambahan</h3>
                    <p className="text-sm text-slate-500 mt-1">Gunakan alat ini untuk merender dan mencetak materi dari AI.</p>
                </div>
                <button
                    onClick={() => showHtmlPreview('')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 shadow-md transition-transform transform hover:-translate-y-0.5"
                >
                    <WandIcon className="h-5 w-5" />
                    Render & Cetak Materi (HTML)
                </button>
            </div>
        </Card>
    )
}