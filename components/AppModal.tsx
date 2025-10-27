import React from 'react';
import { AlertTriangleIcon, CheckIcon, XIcon } from './icons';

interface AppModalProps {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void;
  onClose: () => void;
  confirmText?: string;
}

export const AppModal: React.FC<AppModalProps> = ({ isOpen, type, title, message, onConfirm, onClose, confirmText = 'Ya, Lanjutkan' }) => {
  if (!isOpen) return null;

  const isConfirm = type === 'confirm';
  const icon = isConfirm ? <AlertTriangleIcon className="h-6 w-6 text-red-600" /> : <CheckIcon className="h-6 w-6 text-teal-600" />;
  const titleColor = isConfirm ? 'text-red-800' : 'text-slate-800';

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <header className="p-4 border-b flex justify-between items-center">
                <h3 className={`text-lg font-bold ${titleColor} flex items-center gap-2`}>{icon} {title}</h3>
                <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"><XIcon className="h-5 w-5"/></button>
            </header>
            <main className="p-6">
                <div className="text-slate-600">{message}</div>
            </main>
            <footer className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                {isConfirm && (
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300">
                        Batal
                    </button>
                )}
                <button 
                    onClick={handleConfirm} 
                    className={`px-4 py-2 text-white font-semibold rounded-md ${isConfirm ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                >
                    {isConfirm ? confirmText : 'OK'}
                </button>
            </footer>
        </div>
    </div>
  );
};
