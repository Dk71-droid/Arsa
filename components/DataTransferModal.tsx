
import React, { useState } from 'react';

export const DataTransferModal: React.FC<{
  mode: 'import' | 'export';
  data?: string;
  onClose: () => void;
  onImport?: (data: string) => Promise<{success: boolean; message: string}>;
}> = ({ mode, data, onClose, onImport }) => {
    const [importData, setImportData] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [importStatus, setImportStatus] = useState<{success: boolean; message: string} | null>(null);

    const handleCopy = () => {
        if (data) {
            navigator.clipboard.writeText(data).then(() => {
                setCopySuccess('Berhasil disalin!');
                setTimeout(() => setCopySuccess(''), 2000);
            }, () => {
                setCopySuccess('Gagal menyalin.');
            });
        }
    };

    const handleImportClick = async () => {
        if (!onImport || !importData) return;

        if (!isConfirming) {
            setIsConfirming(true);
            return;
        }
        
        const result = await onImport(importData);
        setImportStatus(result);
        if (result.success) {
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    };
    
    const handleClose = () => {
        // If import was successful, the parent component's state will change,
        // so we don't want to allow re-importing or other actions. A simple close is fine.
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-slate-800 mb-4">
                    {mode === 'export' ? 'Ekspor Data Aplikasi' : 'Impor Data Aplikasi'}
                </h2>

                {importStatus ? (
                    <div className={`p-4 rounded-md text-center ${importStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <p className="font-bold">{importStatus.success ? 'Berhasil!' : 'Gagal!'}</p>
                        <p>{importStatus.message}</p>
                    </div>
                ) : (
                    <>
                        <textarea
                            readOnly={mode === 'export'}
                            value={mode === 'export' ? data : importData}
                            onChange={(e) => { setImportData(e.target.value); setIsConfirming(false); }}
                            className="w-full h-64 p-2 border border-slate-300 rounded-md font-mono text-xs"
                            placeholder={mode === 'import' ? 'Tempel (paste) data JSON Anda di sini...' : ''}
                        />
                        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <p className={`text-sm ${isConfirming ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                {mode === 'export'
                                    ? 'Salin teks ini dan simpan di file lokal.'
                                    : isConfirming
                                    ? 'PERINGATAN: Aksi ini akan menimpa semua data yang ada. Yakin?'
                                    : 'Menempel data akan menimpa semua data saat ini.'}
                            </p>
                            <div className="flex gap-2 self-end sm:self-center">
                                 <button onClick={handleClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300">
                                     {importStatus?.success ? 'Tutup' : 'Batal'}
                                 </button>
                                {mode === 'export' ? (
                                    <button onClick={handleCopy} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 min-w-[130px]">{copySuccess || 'Salin ke Clipboard'}</button>
                                ) : (
                                    <button 
                                        onClick={handleImportClick} 
                                        disabled={!importData} 
                                        className={`px-4 py-2 text-white rounded-md transition-colors disabled:bg-slate-400 ${
                                            isConfirming 
                                                ? 'bg-red-600 hover:bg-red-700' 
                                                : 'bg-teal-600 hover:bg-teal-700'
                                        }`}
                                    >
                                        {isConfirming ? 'Ya, Konfirmasi & Timpa' : 'Impor Data'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
