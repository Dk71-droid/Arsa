import React, { useState, useEffect } from 'react';
import type { Student, AttendanceRecord, AttendanceStatus, HolidayRecord } from '../types';
import { XIcon, TrashIcon } from './icons';

interface DailyAttendanceModalProps {
  date: Date;
  students: Student[];
  recordsForDate: AttendanceRecord[];
  holidayForDate: HolidayRecord | null;
  onSave: (records: AttendanceRecord[]) => void;
  onSaveHoliday: (holiday: HolidayRecord) => void;
  onDeleteHoliday: (date: string) => void;
  onClose: () => void;
  showConfirmation: (options: { title: string; message: string; onConfirm: () => void; }) => void;
}

const formatDateToYYYYMMDD = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const STATUS_BUTTONS: { status: AttendanceStatus, label: string, color: string, hoverColor: string }[] = [
    { status: 'H', label: 'Hadir', color: 'bg-green-600', hoverColor: 'bg-green-700' },
    { status: 'S', label: 'Sakit', color: 'bg-yellow-500', hoverColor: 'bg-yellow-600' },
    { status: 'I', label: 'Izin', color: 'bg-blue-500', hoverColor: 'bg-blue-600' },
    { status: 'A', label: 'Alpha', color: 'bg-red-600', hoverColor: 'bg-red-600' },
];

export const DailyAttendanceModal: React.FC<DailyAttendanceModalProps> = ({ date, students, recordsForDate, holidayForDate, onSave, onSaveHoliday, onDeleteHoliday, onClose, showConfirmation }) => {
    const [tempRecords, setTempRecords] = useState<Map<number, AttendanceStatus>>(new Map());
    const [isHolidayMode, setIsHolidayMode] = useState(false);
    const [holidayDescription, setHolidayDescription] = useState('');

    useEffect(() => {
        const initialMap = new Map<number, AttendanceStatus>();
        recordsForDate.forEach(record => {
            initialMap.set(record.studentId, record.status);
        });
        setTempRecords(initialMap);

        if (holidayForDate) {
            setIsHolidayMode(true);
            setHolidayDescription(holidayForDate.description);
        }
    }, [recordsForDate, holidayForDate]);

    const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
        setTempRecords(prev => new Map(prev).set(studentId, status));
    };

    const handleMarkAllPresent = () => {
        const newMap = new Map<number, AttendanceStatus>();
        students.forEach(student => {
            newMap.set(student.id, 'H');
        });
        setTempRecords(newMap);
    };

    const handleSave = () => {
        const dateStr = formatDateToYYYYMMDD(date);
        const recordsToSave: AttendanceRecord[] = [];
        students.forEach(student => {
            const status = tempRecords.get(student.id) || 'H';
            recordsToSave.push({
                id: `${student.id}-${dateStr}`,
                studentId: student.id,
                date: dateStr,
                status,
            });
        });
        onSave(recordsToSave);
        onClose();
    };
    
    const handleSaveHoliday = () => {
        if (holidayDescription.trim()) {
            const dateStr = formatDateToYYYYMMDD(date);
            onSaveHoliday({
                id: dateStr,
                date: dateStr,
                description: holidayDescription.trim()
            });
            onClose();
        }
    };
    
    const handleDeleteHolidayClick = () => {
        showConfirmation({
            title: 'Hapus Hari Libur',
            message: 'Apakah Anda yakin ingin menghapus penanda libur untuk tanggal ini?',
            onConfirm: () => {
                const dateStr = formatDateToYYYYMMDD(date);
                onDeleteHoliday(dateStr);
                onClose();
            }
        });
    };

    const dateString = date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {isHolidayMode ? 'Tandai Hari Libur' : 'Input Absensi'}
                            </h2>
                            <p className="text-sm text-slate-500">{dateString}</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" aria-label="Tutup"><XIcon className="h-6 w-6" /></button>
                    </div>
                </header>
                
                <main className="flex-grow p-4 overflow-y-auto">
                    {isHolidayMode ? (
                        <div className="space-y-4">
                            <label htmlFor="holiday-desc" className="block text-sm font-medium text-slate-700">
                                Deskripsi Libur (Contoh: Libur Nasional, Cuti Bersama)
                            </label>
                             <input
                                id="holiday-desc"
                                type="text"
                                value={holidayDescription}
                                onChange={e => setHolidayDescription(e.target.value)}
                                placeholder="Contoh: Hari Kemerdekaan"
                                className="w-full p-2 border border-slate-300 rounded-md shadow-sm"
                                autoFocus
                            />
                            {holidayForDate && (
                                <button
                                    onClick={handleDeleteHolidayClick}
                                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-600 bg-red-100 p-2 rounded-md hover:bg-red-200"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                    Hapus Penanda Libur
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-end mb-4">
                                <button onClick={handleMarkAllPresent} className="px-3 py-1.5 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
                                    Tandai Semua Hadir
                                </button>
                            </div>
                            <div className="space-y-2">
                                {students.map(student => {
                                    const currentStatus = tempRecords.get(student.id) || 'H';
                                    return (
                                        <div key={student.id} className="p-3 bg-slate-50 rounded-md flex justify-between items-center">
                                            <span className="font-medium text-slate-800">{student.nama}</span>
                                            <div className="flex items-center gap-1.5">
                                                {STATUS_BUTTONS.map(({ status, label, color, hoverColor }) => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleStatusChange(student.id, status)}
                                                        title={label}
                                                        className={`w-8 h-8 font-bold text-white text-sm rounded-md transition-all ${
                                                            currentStatus === status 
                                                                ? `${color} ring-2 ring-offset-1 ring-black` 
                                                                : `bg-slate-300 hover:${color}`
                                                        }`}
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </main>

                <footer className="p-4 bg-slate-100 border-t flex justify-between items-center flex-shrink-0">
                     <div>
                        {!holidayForDate && (
                             <button onClick={() => setIsHolidayMode(!isHolidayMode)} className="px-4 py-2 text-sm text-slate-600 font-semibold rounded-md hover:bg-slate-200 transition-colors">
                                {isHolidayMode ? 'Batalkan & Isi Absensi' : 'Tandai Hari Ini Sebagai Libur'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-semibold">Batal</button>
                        {isHolidayMode ? (
                             <button onClick={handleSaveHoliday} disabled={!holidayDescription.trim()} className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-semibold disabled:bg-slate-400">Simpan Libur</button>
                        ) : (
                            <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold">Simpan Absensi</button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};
