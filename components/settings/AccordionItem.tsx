import React from 'react';
import { ChevronDownIcon } from '../icons';

interface AccordionItemProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: (id: string | null) => void;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ id, title, icon, children, isOpen, onToggle }) => {
    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
            <button
                onClick={() => onToggle(isOpen ? null : id)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${id}`}
            >
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        {icon}
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                </div>
                <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                id={`accordion-content-${id}`}
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}
            >
                <div className="p-6 border-t border-slate-200 bg-white">
                    {children}
                </div>
            </div>
        </div>
    );
};