import React, { useState, useEffect, useMemo } from 'react';
import { getPredicateForScore, FORMATIVE_LEVEL_INFO } from '../../constants';
import { FloatingTooltip } from '../formative/AssessmentInputs';
import type { KriteriaKktp } from '../../types';

export const ScoreInput: React.FC<{ value: number | null; onChange: (score: number | null) => void; }> = ({ value, onChange }) => {
    const [displayValue, setDisplayValue] = useState(value === null ? '' : String(value));
    const predicateInfo = getPredicateForScore(value);

    useEffect(() => { setDisplayValue(value === null ? '' : String(value)); }, [value]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        setDisplayValue(rawValue);
        if (rawValue === '') { onChange(null); } 
        else {
            const num = parseInt(rawValue, 10);
            if (!isNaN(num) && num >= 0 && num <= 100) onChange(num);
        }
    };
    
    const handleBlur = () => {
        const num = parseInt(displayValue, 10);
        if (isNaN(num) || num < 0 || num > 100) {
            onChange(null);
            setDisplayValue('');
        }
    };

    return (
         <div className="relative">
            <input
                type="number" min="0" max="100" value={displayValue}
                onChange={handleChange} onBlur={handleBlur}
                className="w-20 text-center p-2 rounded-md border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-transparent"
            />
            {predicateInfo && <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none ${predicateInfo.textColor}`}>{predicateInfo.predicate}</span>}
        </div>
    );
};

interface LevelInputProps {
    value: number | null;
    onChange: (score: number | null) => void;
    kriteria: KriteriaKktp[] | undefined;
    onShowTooltip: (content: React.ReactNode, rect: DOMRect, widthClass: string) => void;
    onHideTooltip: () => void;
}


export const LevelInput: React.FC<LevelInputProps> = ({ value, onChange, kriteria, onShowTooltip, onHideTooltip }) => {
    const levels: (1 | 2 | 3 | 4)[] = [4, 3, 2, 1];
    const currentLevel = useMemo(() => {
        if (value === null) return 0;
        const found = Object.entries(FORMATIVE_LEVEL_INFO).find(([, info]) => info.score === value);
        return found ? parseInt(found[0], 10) : 0;
    }, [value]);

    const handleSelect = (level: 1 | 2 | 3 | 4) => {
        const isSelected = currentLevel === level;
        onChange(isSelected ? null : FORMATIVE_LEVEL_INFO[level].score);
    };

    const handleMouseEnter = (e: React.MouseEvent, content: React.ReactNode) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onShowTooltip(content, rect, 'w-64');
    };

    return (
        <div className="flex justify-center items-center gap-1.5 p-1">
            {levels.map(level => {
                const info = FORMATIVE_LEVEL_INFO[level];
                const kriteriaDeskripsi = kriteria?.find(k => k.level === level)?.deskripsi || 'Deskripsi tidak ditemukan.';

                const tooltipContent = (
                    <>
                        <h5 className="font-bold text-indigo-300 text-sm mb-1">{info.label} (Level {level})</h5>
                        <p className="text-slate-200">{kriteriaDeskripsi}</p>
                    </>
                );

                return (
                     <div 
                        key={level} 
                        className="flex items-center justify-center"
                        onMouseEnter={(e) => handleMouseEnter(e, tooltipContent)}
                        onMouseLeave={onHideTooltip}
                      >
                        <button key={level} onClick={() => handleSelect(level)} title={`${info.label} (${info.score})`}
                            className={`w-8 h-8 flex items-center justify-center font-bold text-sm rounded-md transition-all border ${currentLevel === level ? info.color : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600'}`}>
                            {info.predicate}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};