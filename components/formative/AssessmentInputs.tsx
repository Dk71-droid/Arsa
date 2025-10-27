import React, { memo } from 'react';
import type { AspekRubrik } from '../../types';
import { FORMATIVE_LEVEL_INFO } from '../../constants';

// A new component to render the tooltip with fixed positioning, outside the overflow container.
export const FloatingTooltip: React.FC<{
    content: React.ReactNode;
    top: number;
    left: number;
    widthClass?: string;
    position?: 'top' | 'bottom';
}> = ({ content, top, left, widthClass = 'w-64', position = 'bottom' }) => {
    const style = {
        top: top,
        left: left,
        transform: `translateX(-50%) ${position === 'top' ? 'translateY(-100%)' : ''}`,
    };

    const arrowClass = position === 'top'
        ? 'bottom-[-4px]' // Arrow at the bottom of the tooltip, pointing down
        : 'top-[-4px]';   // Arrow at the top of the tooltip, pointing up

    return (
        <div
            style={style}
            role="tooltip"
            className={`fixed bg-slate-800 text-white text-xs rounded-lg shadow-lg p-3 z-50 transition-opacity duration-200 ${widthClass}`}
        >
            <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 ${arrowClass}`}></div>
            {content}
        </div>
    );
};

interface PredicateSelectorProps {
  studentId: number;
  rubrikItem: AspekRubrik;
  currentLevel: number | 0;
  onSelect: (studentId: number, aspek: string, level: 1 | 2 | 3 | 4 | 0) => void;
  isDiscouraged?: boolean;
  discouragementReason?: string;
  onShowTooltip: (content: React.ReactNode, rect: DOMRect, widthClass: string) => void;
  onHideTooltip: () => void;
  prefilledLevel?: number | 0;
  disabled?: boolean;
}

export const PredicateSelector = memo<PredicateSelectorProps>(({ studentId, rubrikItem, currentLevel, onSelect, isDiscouraged = false, discouragementReason = '', onShowTooltip, onHideTooltip, prefilledLevel = 0, disabled = false }) => {
  const levels: (1 | 2 | 3 | 4)[] = [4, 3, 2, 1];

  const handleMouseEnter = (e: React.MouseEvent, content: React.ReactNode, widthClass: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onShowTooltip(content, rect, widthClass);
  };
  
  const discouragementContent = (
      <>
        <p className="font-bold text-yellow-400 text-sm mb-1.5">⚠️ Penilaian Tidak Disarankan</p>
        <p className="text-slate-200 mb-1.5">Prasyarat <strong>'{discouragementReason}'</strong> belum tuntas.</p>
        <p className="text-slate-400 text-[11px]">Anda tetap dapat menginput nilai jika ada observasi khusus dengan cara meng-klik tombolnya.</p>
      </>
  );

  return (
    <div 
      className={`group relative flex justify-center items-center gap-1.5 p-1 ${isDiscouraged ? 'opacity-50' : ''} ${disabled ? 'cursor-not-allowed' : ''}`}
      onMouseEnter={(e) => {
        if (isDiscouraged && !disabled) handleMouseEnter(e, discouragementContent, 'w-72');
      }}
      onMouseLeave={() => {
        if (isDiscouraged && !disabled) onHideTooltip();
      }}
    >
      {levels.map(level => {
        const levelInfo = FORMATIVE_LEVEL_INFO[level];
        const kriteriaDeskripsi = rubrikItem.kriteria.find(k => k.level === level)?.deskripsi || 'Deskripsi tidak ditemukan.';
        
        const isSelectedForCurrent = currentLevel === level;
        const isFromPrevious = prefilledLevel === level;

        const handleClick = () => {
          if (disabled) return;
          const newLevel = isSelectedForCurrent ? 0 : level;
          onSelect(studentId, rubrikItem.aspek, newLevel as (1|2|3|4|0));
        };
        
        const tooltipContent = (
            <>
                <h5 className="font-bold text-indigo-300 text-sm mb-1">{levelInfo.label} (Level {level})</h5>
                <p className="text-slate-200">{kriteriaDeskripsi}</p>
            </>
        );
        
        let buttonClasses = `w-8 h-8 flex items-center justify-center font-bold text-sm rounded-md transition-all duration-200 border`;

        if (isSelectedForCurrent) {
            // Active selection for this session takes precedence with full color.
            buttonClasses += ` ${levelInfo.color}`;
        } else if (isFromPrevious) {
            // If not selected now, but was the value in the previous session, show as muted.
            buttonClasses += ` bg-slate-200 text-slate-600 border-slate-400`;
        } else {
            // Default, unselected state.
            buttonClasses += ` bg-transparent text-slate-400 border-transparent ${!isDiscouraged && !disabled ? 'hover:bg-slate-100 hover:text-slate-600' : ''}`;
        }

        if (disabled) {
            buttonClasses += ` opacity-75`;
        }


        return (
          <div 
            key={level} 
            className="flex items-center justify-center"
            onMouseEnter={(e) => {
                if (!isDiscouraged && !disabled) handleMouseEnter(e, tooltipContent, 'w-64');
            }}
            onMouseLeave={() => {
                if (!isDiscouraged && !disabled) onHideTooltip();
            }}
          >
            <button
              onClick={handleClick}
              disabled={disabled}
              title={disabled ? 'Terkunci' : isDiscouraged ? '' : `${levelInfo.label} - Klik untuk memilih/membatalkan`}
              className={`
                ${buttonClasses}
                ${disabled ? 'cursor-not-allowed' : (isDiscouraged ? 'cursor-help' : '')}
              `}
            >
              {levelInfo.predicate}
            </button>
          </div>
        );
      })}
    </div>
  );
});

export const PredicateBadge: React.FC<{ level: number; }> = ({ level }) => {
    if (level === 0) {
        return <span className="text-slate-400">-</span>;
    }
    const levelInfo = FORMATIVE_LEVEL_INFO[level as 1 | 2 | 3 | 4];
    if (!levelInfo) return null;
    
    const colorClasses = levelInfo.color;

    return (
        <span className={`inline-block w-24 text-center px-2 py-1 text-xs font-bold rounded ${colorClasses}`}>
            {levelInfo.label}
        </span>
    );
};