import React from 'react';
import type { CurriculumData } from '../../types';

interface CpTabProps {
    data: CurriculumData;
}

export const CpTab: React.FC<CpTabProps> = ({ data }) => {
    return (
        <div>
            <h3 className="text-xl font-bold text-slate-700 mb-3">Capaian Pembelajaran (CP)</h3>
            <p className="text-slate-600 leading-relaxed bg-slate-100 p-4 rounded-md">{data.capaianPembelajaran}</p>
        </div>
    );
};
