import React, { useState } from 'react';
import { RefreshIcon, XIcon } from './icons';

interface CpReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CpReferenceModal: React.FC<CpReferenceModalProps> = ({ isOpen, onClose }) => {
  const [iframeKey, setIframeKey] = useState(Date.now());

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-slate-50 shadow-xl z-50 flex flex-col transform transition-transform"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Consolidated and Minimized */}
        <div className="p-3 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-800 truncate pr-2">Referensi CP Resmi</h2>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setIframeKey(Date.now())}
                title="Segarkan Referensi"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md px-2 py-1 hover:bg-slate-50 transition-colors"
              >
                <RefreshIcon className="h-3 w-3" />
                <span>Segarkan</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-500 rounded-full hover:bg-slate-200"
                aria-label="Tutup"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-2 p-1.5 text-[11px] leading-tight text-yellow-900 bg-yellow-100 border-l-4 border-yellow-400 rounded-r-lg">
            <p><strong>PENTING:</strong> Jangan klik tautan biru di dalam referensi. Gunakan tombol 'Segarkan' jika halaman error.</p>
          </div>
        </div>

        {/* Content - Maximized Iframe space */}
        <div className="flex-grow bg-white">
          <iframe
            key={iframeKey}
            src="https://guru.kemdikbud.go.id/kurikulum/referensi-penerapan/capaian-pembelajaran/"
            className="w-full h-full border-0"
            title="Referensi Capaian Pembelajaran Kemendikbud"
          ></iframe>
        </div>
      </div>
    </div>
  );
};
