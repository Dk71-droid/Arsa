import React, { useState } from 'react';
import { Card } from '../Card';
import { ChartBarIcon } from '../icons';

interface ProgressChartCardProps {
  data: { tpId: string; completion: number }[];
  totalStudents: number;
  className?: string;
}

export const ProgressChartCard: React.FC<ProgressChartCardProps> = ({ data, totalStudents, className = '' }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; tpId: string; completion: number } | null>(null);

  const SVG_WIDTH = 500;
  const SVG_HEIGHT = 200;
  const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };
  const CHART_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
  const CHART_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;
  
  const dataPointsCount = data.length;

  const getCoords = (index: number, completion: number) => {
    const x = PADDING.left + (dataPointsCount > 1 ? (index / (dataPointsCount - 1)) * CHART_WIDTH : CHART_WIDTH / 2);
    const y = PADDING.top + CHART_HEIGHT - (completion / 100) * CHART_HEIGHT;
    return { x, y };
  };

  const linePoints = data.map((d, index) => {
    const { x, y } = getCoords(index, d.completion);
    return `${x},${y}`;
  }).join(' ');

  const yAxisLabels = [0, 25, 50, 75, 100];

  return (
    <Card className={`flex flex-col ${className}`}>
      <h3 className="text-xl font-bold text-slate-700 mb-2 flex items-center gap-3">
        <ChartBarIcon className="h-6 w-6 text-teal-600" />
        Grafik Kemajuan Formatif Lintas TP ({totalStudents} Siswa)
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Perkembangan ketuntasan kelas untuk setiap TP yang telah dinilai pada semester ini.
      </p>
      <div className="flex-grow flex items-center justify-center relative min-h-[200px]">
        {data.length > 0 ? (
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full">
            {yAxisLabels.map(label => {
              const y = PADDING.top + CHART_HEIGHT - (label / 100) * CHART_HEIGHT;
              return (
                <g key={label}>
                  <line x1={PADDING.left} y1={y} x2={PADDING.left + CHART_WIDTH} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                  <text x={PADDING.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">{label}%</text>
                </g>
              );
            })}
            
            {data.map(({ tpId }, index) => {
              const { x } = getCoords(index, 0);
              return <text key={tpId} x={x} y={PADDING.top + CHART_HEIGHT + 15} textAnchor="middle" fontSize="10" fill="#64748b">{tpId}</text>;
            })}

            {data.length > 1 && (
              <polyline points={linePoints} fill="none" stroke="#14b8a6" strokeWidth="2" />
            )}

            {data.map((d, index) => {
              const { x, y } = getCoords(index, d.completion);
              return (
                <circle
                  key={d.tpId}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#14b8a6"
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={() => setTooltip({ x, y, tpId: d.tpId, completion: d.completion })}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}

            {tooltip && (
              <g transform={`translate(${tooltip.x}, ${tooltip.y - 10})`}>
                <rect x="-45" y="-20" width="90" height="22" rx="4" fill="rgba(15, 23, 42, 0.8)" />
                <text x="0" y="-5" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                  {tooltip.tpId}: {tooltip.completion.toFixed(0)}% Tuntas
                </text>
                <path d="M 0 2 L -4 -2 L 4 -2 Z" fill="rgba(15, 23, 42, 0.8)" />
              </g>
            )}
          </svg>
        ) : (
          <p className="text-slate-500">Belum ada data progres untuk ditampilkan. Mulai lakukan penilaian formatif.</p>
        )}
      </div>
    </Card>
  );
};