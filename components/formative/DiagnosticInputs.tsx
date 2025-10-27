import React, { memo } from 'react';
import { FloatingTooltip } from './AssessmentInputs'; // Reusing the FloatingTooltip component

interface DiagnosticLevelSelectorProps {
    studentId: number;
    kriteria: { level: string; deskripsi: string }[];
    currentLevel: number | 0; // 3: Mahir, 2: Cakap, 1: Baru Berkembang, 0: Belum dinilai
    onSelect: (studentId: number, level: number | 0) => void;
    onShowTooltip: (content: React.ReactNode, rect: DOMRect, widthClass: string) => void;
    onHideTooltip: () => void;
}

const DIAGNOSTIC_LEVELS = [
    { level: 3, label: "Mahir", color: "bg-green-100 text-green-800 border-green-300", short: "M" },
    { level: 2, label: "Cakap", color: "bg-blue-100 text-blue-800 border-blue-300", short: "C" },
    { level: 1, label: "Baru Berkembang", color: "bg-yellow-100 text-yellow-800 border-yellow-300", short: "B" },
];

export const DiagnosticLevelSelector = memo<DiagnosticLevelSelectorProps>(({ studentId, kriteria, currentLevel, onSelect, onShowTooltip, onHideTooltip }) => {
    
    const handleMouseEnter = (e: React.MouseEvent, content: React.ReactNode, widthClass: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onShowTooltip(content, rect, widthClass);
    };

    return (
        <div className="group relative flex justify-center items-center gap-1.5 p-1">
            {DIAGNOSTIC_LEVELS.map(({ level, label, color, short }) => {
                const isSelected = currentLevel === level;
                const deskripsi = kriteria.find(k => k.level === label)?.deskripsi || "Deskripsi tidak tersedia.";

                const handleClick = () => {
                    const newLevel = isSelected ? 0 : level;
                    onSelect(studentId, newLevel);
                };
                
                const tooltipContent = (
                    <>
                        <h5 className="font-bold text-teal-300 text-sm mb-1">{label} (Kelompok {level})</h5>
                        <p className="text-slate-200">{deskripsi}</p>
                    </>
                );

                return (
                    <div
                        key={level}
                        className="flex items-center justify-center"
                        onMouseEnter={(e) => handleMouseEnter(e, tooltipContent, 'w-64')}
                        onMouseLeave={onHideTooltip}
                    >
                        <button
                            onClick={handleClick}
                            title={`${label} - Klik untuk memilih/membatalkan`}
                            className={`
                                w-8 h-8 flex items-center justify-center font-bold text-sm rounded-md transition-all duration-200
                                border
                                ${isSelected
                                    ? color
                                    : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600'
                                }
                            `}
                        >
                            {short}
                        </button>
                    </div>
                );
            })}
        </div>
    );
});