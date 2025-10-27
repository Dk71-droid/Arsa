

import React, { useState } from 'react';
import type { Student, TujuanPembelajaran, AiSessionResult } from '../../types';
import * as geminiService from '../../services/geminiService';
import { WandIcon } from '../icons';
import { Loader } from '../Loader';

export const SessionNoteModal: React.FC<{
  tp: TujuanPembelajaran;
  students: Student[];
  pertemuan: number;
  onSave: (results: AiSessionResult[]) => void;
  onClose: () => void;
}> = ({ tp, students, pertemuan, onSave, onClose }) => {
  const [narrative, setNarrative] = useState('');
  const [view, setView] = useState<'input' | 'loading' | 'verify'>('input');
  const [aiResult, setAiResult] = useState<AiSessionResult[]>([]);
  const [error, setError] = useState('');

  const handleProcessWithAI = async () => {
    setView('loading');
    setError('');
    try {
      const studentList = students.map(s => ({ id: s.id, nama: s.nama }));
      const assessmentsThisSession = students.flatMap(s => s.assessments.filter(a => a.tpId === tp.id && a.pertemuan === pertemuan));
      const assessmentsLastSession = students.flatMap(s => s.assessments.filter(a => a.tpId === tp.id && a.pertemuan === pertemuan - 1));
      
      const result = await geminiService.generateSessionNotes(studentList, tp, pertemuan, assessmentsThisSession, assessmentsLastSession);
      
      // Ensure all students have a result object
      const completeResult = students.map(student => {
          const found = result.find(r => r.studentId === student.id);
          return found || { studentId: student.id, catatanUmum: "", observasiDpl: [] };
      });

      setAiResult(completeResult);
      setView('verify');
    } catch (e) {
      console.error(e);
      setError('Gagal memproses narasi dengan AI. Silakan coba lagi.');
      setView('input');
    }
  };

  const handleResultChange = (studentId: number, field: 'catatanUmum' | string, newNote: string) => {
    setAiResult(prev => prev.map(r => {
        if (r.studentId !== studentId) return r;
        if (field === 'catatanUmum') {
            return { ...r, catatanUmum: newNote };
        }
        // else, it's a DPL note
        const newDpl = (r.observasiDpl || []).map(dplObs => dplObs.dpl === field ? {...dplObs, catatan: newNote} : dplObs);
        return { ...r, observasiDpl: newDpl };
    }));
  };
  
  const handleSaveAll = () => {
    onSave(aiResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-slate-800">Catatan & Analisis Pertemuan {pertemuan}</h3>
          <p className="text-sm text-slate-500">TP: <span className="font-semibold">{tp.id}</span></p>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {view === 'input' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">AI akan menggunakan data penilaian yang sudah Anda input untuk membuat catatan individual. Anda dapat menambahkan observasi naratif di bawah ini untuk referensi pribadi Anda (tidak akan diproses oleh AI).</p>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={8}
                className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                placeholder="Contoh: Andi menunjukkan kemajuan pesat, sudah bisa mandiri. Budi masih perlu bimbingan pada aspek X. Kelompok Citra sangat kolaboratif dan kreatif dalam presentasi mereka."
                autoFocus
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
          )}
          {view === 'loading' && <Loader text="AI sedang menganalisis sesi pertemuan..." />}
          {view === 'verify' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-700">Verifikasi Hasil AI</h4>
              <p className="text-sm text-slate-600">Tinjau dan edit catatan yang dibuat oleh AI. AI telah membandingkan data pertemuan ini dengan pertemuan sebelumnya untuk mendeteksi progres.</p>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 border p-3 rounded-md bg-slate-50">
                {aiResult.map(result => {
                  const student = students.find(s => s.id === result.studentId);
                  return (
                    <div key={result.studentId}>
                      <p className="font-semibold text-slate-800">{student?.nama}</p>
                      <div className="pl-4 space-y-2 mt-1">
                        <div>
                          <label htmlFor={`note-${result.studentId}`} className="block text-xs font-medium text-slate-700">Catatan Umum</label>
                          <input type="text" id={`note-${result.studentId}`} value={result.catatanUmum} onChange={(e) => handleResultChange(result.studentId, 'catatanUmum', e.target.value)} className="w-full p-1.5 border text-sm border-slate-300 rounded-md shadow-sm" />
                        </div>
                        {result.observasiDpl?.map(dplObs => (
                          <div key={dplObs.dpl}>
                            <label htmlFor={`dpl-${result.studentId}-${dplObs.dpl}`} className="block text-xs font-medium text-purple-800">{dplObs.dpl}</label>
                            <input type="text" id={`dpl-${result.studentId}-${dplObs.dpl}`} value={dplObs.catatan} onChange={(e) => handleResultChange(result.studentId, dplObs.dpl, e.target.value)} className="w-full p-1 text-sm border border-slate-300 rounded-md" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
          {view === 'verify' ? (
            <button onClick={() => setView('input')} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300">Kembali</button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300">Batal</button>
          )}

          {view === 'input' && (
            <button onClick={handleProcessWithAI} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold flex items-center gap-2 disabled:bg-slate-400">
              <WandIcon className="h-5 w-5"/> Proses dengan AI
            </button>
          )}
          {view === 'verify' && (
             <button onClick={handleSaveAll} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold">Simpan Semua Catatan</button>
          )}
        </div>
      </div>
    </div>
  );
};