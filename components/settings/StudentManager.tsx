import React, { useState } from 'react';
import type { Student, ClassProfile } from '../../types';
import { PlusCircleIcon, PencilIcon, TrashIcon, CheckIcon, XIcon } from '../icons';

const capitalizeWords = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const StudentManager: React.FC<{
    classProfile: ClassProfile;
    students: Student[];
    onAdd: (students: Omit<Student, 'id'>[]) => void;
    onUpdate: (id: number, updates: Partial<Student>) => void;
    onDelete: (id: number) => void;
}> = ({ classProfile, students, onAdd, onUpdate, onDelete }) => {
    const [newStudentsInput, setNewStudentsInput] = useState('');
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const handleBulkAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const studentsToAdd = newStudentsInput.trim().split('\n').filter(Boolean).map(line => {
            const [name, nis] = line.split(',').map(s => s.trim());
            return { nama: capitalizeWords(name), nis, kelas: classProfile.name, assessments: [], summativeAssessments: [] };
        });
        if (studentsToAdd.length > 0) {
            onAdd(studentsToAdd);
            setNewStudentsInput('');
        }
    };

    const handleSaveEdit = () => {
        if (editingStudent && editingStudent.id) {
            onUpdate(editingStudent.id, { nama: capitalizeWords(editingStudent.nama), nis: editingStudent.nis });
            setEditingStudent(null);
        }
    };

    return (
        <div className="mt-4 text-left">
            <h3 className="font-bold text-slate-800 text-center md:text-left">Siswa di {classProfile.name}</h3>
            <form onSubmit={handleBulkAdd} className="my-2 space-y-2">
                <textarea value={newStudentsInput} onChange={e => setNewStudentsInput(e.target.value)} placeholder="Satu nama per baris. Opsional, tambahkan NIS setelah koma..." rows={3} className="w-full p-2 border rounded-md" />
                <button type="submit" disabled={!newStudentsInput.trim()} className="w-full flex justify-center items-center gap-2 bg-teal-600 text-white p-2 rounded-md hover:bg-teal-700 disabled:bg-slate-400 font-semibold">
                    <PlusCircleIcon className="h-5 w-5" /> Tambah Siswa
                </button>
            </form>
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {students.map(s => (
                    <div key={s.id} className="p-2 bg-slate-100 rounded-md flex items-center justify-between group">
                        {editingStudent?.id === s.id ? (
                            <div className="w-full flex items-center gap-2">
                                <input type="text" value={editingStudent.nama} onChange={e => setEditingStudent({ ...editingStudent, nama: e.target.value })} className="flex-grow p-1 border rounded" />
                                <input type="text" value={editingStudent.nis || ''} onChange={e => setEditingStudent({ ...editingStudent, nis: e.target.value || '' })} placeholder="NIS" className="w-20 p-1 border rounded" />
                                <button onClick={handleSaveEdit} className="p-1 text-green-600"><CheckIcon className="h-5 w-5" /></button>
                                <button onClick={() => setEditingStudent(null)} className="p-1 text-red-600"><XIcon className="h-5 w-5" /></button>
                            </div>
                        ) : (
                            <>
                                <div><span className="font-medium text-slate-800">{s.nama}</span>{s.nis && <span className="text-xs text-slate-500 ml-2">(NIS: {s.nis})</span>}</div>
                                <div className="opacity-0 group-hover:opacity-100"><button onClick={() => setEditingStudent(s)} className="p-1"><PencilIcon className="h-4 w-4" /></button><button onClick={() => onDelete(s.id!)} className="p-1 text-red-500"><TrashIcon className="h-4 w-4" /></button></div>
                            </>
                        )}
                    </div>
                ))}
                 {students.length === 0 && newStudentsInput.length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-4">Belum ada siswa.</p>
                )}
            </div>
        </div>
    );
};
