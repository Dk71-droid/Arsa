import React, { useState, useMemo } from 'react';
import { WandIcon, ExternalLinkIcon, AlertTriangleIcon } from './icons';
import { FASE_OPTIONS } from '../constants';
import { CpReferenceModal } from './CpReferenceModal';
import { useAppData } from '../hooks/useAppData';

interface PhaseSelectorProps {
  onGenerate: (params: { subject: string; cp: string; phase: string; }) => void;
  isLoading: boolean;
}

export const PhaseSelector: React.FC<PhaseSelectorProps> = ({
  onGenerate,
  isLoading,
}) => {
  const { userApiKey, setActiveView } = useAppData();
  const [subject, setSubject] = useState('');
  const [phase, setPhase] = useState('');
  const [cp, setCp] = useState('');
  const [isCpModalOpen, setIsCpModalOpen] = useState(false);

  const canGenerate = userApiKey && subject.trim() && cp.trim() && phase && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canGenerate) {
      onGenerate({ subject: subject.trim(), cp: cp.trim(), phase });
    }
  };

  return (
    <>
      <div className="p-6 bg-white rounded-xl">
        <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <WandIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">Buat Rencana Pembelajaran Baru</h2>
                <p className="text-slate-500 mt-1">Input Fase, Mata Pelajaran, dan Capaian Pembelajaran (CP) untuk generate TP, ATP, dan Unit Pembelajaran.</p>
            </div>
        </div>
        
        {!userApiKey && (
             <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 flex items-start gap-3">
                <AlertTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-bold">Kunci API Gemini Diperlukan</p>
                    <p>Untuk menggunakan fitur AI, Anda perlu mengatur kunci API Gemini Anda terlebih dahulu.
                        <button onClick={() => setActiveView('settings')} className="ml-1 font-semibold underline hover:text-yellow-900">
                            Buka Pengaturan
                        </button>
                    </p>
                </div>
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="manual-subject" className="block text-sm font-medium text-slate-700 mb-1">
                        Mata Pelajaran <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="manual-subject"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={isLoading || !userApiKey}
                        placeholder="Contoh: Matematika"
                        className="block w-full p-2 text-base border-2 border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="phase-select" className="block text-sm font-medium text-slate-700 mb-1">
                        Fase <span className="text-red-500">*</span>
                    </label>
                    <select 
                        id="phase-select" 
                        value={phase} 
                        onChange={e => setPhase(e.target.value)}
                        disabled={isLoading || !userApiKey}
                        className="block w-full p-2 text-base border-2 border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"
                        required
                    >
                        <option value="">Pilih Fase</option>
                        {FASE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label htmlFor="manual-cp" className="block text-sm font-medium text-slate-700">
                        Teks Capaian Pembelajaran (CP) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCpModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
                      disabled={!userApiKey}
                    >
                      Lihat Referensi CP
                      <ExternalLinkIcon className="h-4 w-4" />
                    </button>
                </div>
                <textarea
                    id="manual-cp"
                    rows={12}
                    value={cp}
                    onChange={(e) => setCp(e.target.value)}
                    disabled={isLoading || !userApiKey}
                    placeholder="Salin dan tempel teks lengkap Capaian Pembelajaran di sini..."
                    className="block w-full p-2 text-base border-2 border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 scrollbar-none [&::-webkit-scrollbar]:hidden disabled:bg-slate-100"
                    required
                />
                <p className="text-xs text-slate-500 mt-1">Pastikan CP yang dimasukkan sesuai dengan Fase yang dipilih untuk hasil terbaik.</p>
            </div>
            <div className="flex justify-end pt-2">
            <button
                type="submit"
                disabled={!canGenerate}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:from-indigo-600 hover:to-violet-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:bg-slate-400 disabled:shadow-none disabled:transform-none disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed"
                title={!userApiKey ? 'Harap atur kunci API Anda di Pengaturan' : ''}
            >
                <WandIcon className="h-5 w-5" />
                <span>{isLoading ? 'Membuat...' : 'Generate TP & ATP'}</span>
            </button>
            </div>
        </form>
      </div>
      <CpReferenceModal isOpen={isCpModalOpen} onClose={() => setIsCpModalOpen(false)} />
    </>
  );
};