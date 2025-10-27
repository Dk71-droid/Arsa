import React, { useState, useEffect } from 'react';
import type { Kktp, AspekRubrik } from '../types';
import { XIcon, PlusIcon, TrashIcon, WandIcon } from './icons';

interface KktpEditorModalProps {
  kktp: Kktp | null | undefined;
  tpDeskripsi: string;
  onClose: () => void;
  onSave: (newKktp: Kktp) => void;
  onRegenerate: () => void;
  showConfirmation: (options: { title: string; message: string; onConfirm: () => void; }) => void;
}

const LEVEL_HEADERS = [
    { title: 'Mahir', level: 4, color: 'bg-emerald-100 text-emerald-800' },
    { title: 'Cakap', level: 3, color: 'bg-indigo-100 text-indigo-800' },
    { title: 'Layak', level: 2, color: 'bg-amber-100 text-amber-800' },
    { title: 'Baru Berkembang', level: 1, color: 'bg-red-100 text-red-800' },
];

export const KktpEditorModal: React.FC<KktpEditorModalProps> = ({ kktp, tpDeskripsi, onClose, onSave, onRegenerate, showConfirmation }) => {
  const [editedKktp, setEditedKktp] = useState<Kktp | null>(null);

  useEffect(() => {
    if (kktp) {
      setEditedKktp(JSON.parse(JSON.stringify(kktp)));
    }
  }, [kktp]);

  const handleFieldChange = (field: keyof Omit<Kktp, 'rubrik'>, value: string) => {
    if (!editedKktp) return;
    setEditedKktp({ ...editedKktp, [field]: value });
  };
  
  const handleRubrikChange = (aspectIndex: number, field: keyof AspekRubrik | 'kriteria', value: any, kriteriaLevel?: number) => {
    if (!editedKktp) return;
    const newRubrik = [...editedKktp.rubrik];
    if (field === 'kriteria' && kriteriaLevel !== undefined) {
      const kriteriaIndex = newRubrik[aspectIndex].kriteria.findIndex(k => k.level === kriteriaLevel);
      if (kriteriaIndex > -1) {
        newRubrik[aspectIndex].kriteria[kriteriaIndex].deskripsi = value;
      }
    } else if (field !== 'kriteria') {
      (newRubrik[aspectIndex] as any)[field] = value;
    }
    setEditedKktp({ ...editedKktp, rubrik: newRubrik });
  };

  const handleAddAspect = () => {
    if (!editedKktp) return;
    const newAspect: AspekRubrik = {
      aspek: `Aspek Baru ${editedKktp.rubrik.length + 1}`,
      sifatAspek: 'LEPAS',
      dplTerkait: [],
      teknikAsesmen: 'Observasi',
      instrumenAsesmen: 'Lembar Observasi',
      kriteria: [
        { level: 4, deskripsi: "" },
        { level: 3, deskripsi: "" },
        { level: 2, deskripsi: "" },
        { level: 1, deskripsi: "" },
      ]
    };
    setEditedKktp({ ...editedKktp, rubrik: [...editedKktp.rubrik, newAspect] });
  };

  const handleDeleteAspect = (aspectIndex: number) => {
    if (!editedKktp) return;
    showConfirmation({
        title: 'Hapus Aspek',
        message: 'Apakah Anda yakin ingin menghapus aspek ini?',
        onConfirm: () => {
            const newRubrik = editedKktp.rubrik.filter((_, index) => index !== aspectIndex);
            setEditedKktp({ ...editedKktp, rubrik: newRubrik });
        }
    });
  };

  const handleSaveClick = () => {
    if (editedKktp) {
      onSave(editedKktp);
    }
  };

  if (!editedKktp) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex flex-col items-center justify-center p-4" onClick={onClose}>
        <div className="bg-slate-50 rounded-lg shadow-2xl w-full max-w-6xl h-full flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <header className="p-4 border-b bg-white rounded-t-lg flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Ubah Rubrik KKTP</h2>
                        <p className="text-sm text-slate-500 truncate" title={tpDeskripsi}>{tpDeskripsi}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><XIcon className="h-6 w-6" /></button>
                </div>
            </header>
            
            {/* Scrollable Body */}
            <main className="flex-grow p-6 overflow-y-auto space-y-6 bg-slate-100">
                <div className="p-4 border rounded-lg bg-white border-t-4 border-indigo-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="elemenCp" className="block text-sm font-medium text-slate-700">Elemen CP</label>
                            <input id="elemenCp" type="text" value={editedKktp.elemenCp} onChange={e => handleFieldChange('elemenCp', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="asesmenUntuk" className="block text-sm font-medium text-slate-700">Asesmen Untuk</label>
                            <input id="asesmenUntuk" type="text" value={editedKktp.asesmenUntuk} onChange={e => handleFieldChange('asesmenUntuk', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="batasKetercapaian" className="block text-sm font-medium text-slate-700">Batas Ketercapaian</label>
                            <textarea id="batasKetercapaian" value={editedKktp.batasKetercapaian} onChange={e => handleFieldChange('batasKetercapaian', e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                    </div>
                </div>

                {editedKktp.rubrik.map((aspek, aspectIndex) => (
                    <div key={aspectIndex} className="p-4 border rounded-lg bg-white relative group shadow-md border-l-4 border-indigo-400">
                         <button onClick={() => handleDeleteAspect(aspectIndex)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Hapus Aspek"><TrashIcon className="h-5 w-5" /></button>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                             <div className="md:col-span-3">
                                 <label htmlFor={`aspek-nama-${aspectIndex}`} className="block text-sm font-semibold text-slate-800">Nama Aspek</label>
                                 <input id={`aspek-nama-${aspectIndex}`} type="text" value={aspek.aspek} onChange={e => handleRubrikChange(aspectIndex, 'aspek', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-lg font-semibold" />
                             </div>
                             <div>
                                 <label htmlFor={`aspek-teknik-${aspectIndex}`} className="block text-sm font-medium text-slate-700">Teknik Asesmen</label>
                                 <input id={`aspek-teknik-${aspectIndex}`} type="text" value={aspek.teknikAsesmen} onChange={e => handleRubrikChange(aspectIndex, 'teknikAsesmen', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" />
                             </div>
                             <div>
                                 <label htmlFor={`aspek-instrumen-${aspectIndex}`} className="block text-sm font-medium text-slate-700">Instrumen Asesmen</label>
                                 <input id={`aspek-instrumen-${aspectIndex}`} type="text" value={aspek.instrumenAsesmen} onChange={e => handleRubrikChange(aspectIndex, 'instrumenAsesmen', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" />
                             </div>
                              <div className="flex items-center space-x-2 pb-1">
                                <input
                                    id={`aspek-prasyarat-${aspectIndex}`}
                                    type="checkbox"
                                    checked={aspek.sifatAspek === 'PRASYARAT_KRITIS'}
                                    onChange={e => handleRubrikChange(aspectIndex, 'sifatAspek', e.target.checked ? 'PRASYARAT_KRITIS' : 'LEPAS')}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor={`aspek-prasyarat-${aspectIndex}`} className="text-sm font-medium text-slate-700">
                                    Jadikan Prasyarat Kritis
                                </label>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {LEVEL_HEADERS.map(header => {
                                const kriteria = aspek.kriteria.find(k => k.level === header.level);
                                return (
                                <div key={header.level} className="flex flex-col">
                                    <label htmlFor={`kriteria-${aspectIndex}-${header.level}`} className={`block text-sm font-bold p-2 rounded-t-md ${header.color}`}>{header.title}</label>
                                    <textarea
                                        id={`kriteria-${aspectIndex}-${header.level}`}
                                        value={kriteria?.deskripsi || ''}
                                        onChange={e => handleRubrikChange(aspectIndex, 'kriteria', e.target.value, header.level)}
                                        rows={4}
                                        className="mt-0 block w-full p-2 rounded-md border-slate-300 shadow-sm rounded-t-none flex-grow"
                                    />
                                </div>
                                )
                            })}
                         </div>
                    </div>
                ))}
                
                <button onClick={handleAddAspect} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 bg-white border-2 border-dashed border-indigo-300 rounded-lg p-3 hover:bg-indigo-50 transition-colors shadow-sm">
                    <PlusIcon className="h-5 w-5" />
                    Tambah Aspek Penilaian
                </button>
            </main>

            {/* Footer */}
            <footer className="p-4 border-t bg-white rounded-b-lg flex justify-between items-center flex-shrink-0">
                <button onClick={onRegenerate} className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50 transition-colors">
                    <WandIcon className="h-4 w-4" />
                    <span>Generate Ulang KKTP</span>
                </button>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-semibold">Batal</button>
                    <button onClick={handleSaveClick} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold">Simpan Perubahan</button>
                </div>
            </footer>
        </div>
    </div>
  );
};