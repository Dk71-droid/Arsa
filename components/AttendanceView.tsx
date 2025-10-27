import React, { useState, useMemo } from 'react';
import type { Student, AttendanceRecord, AttendanceStatus, HolidayRecord } from '../types';
import { DailyAttendanceModal } from './DailyAttendanceModal';
import { Card } from './Card';
import { ChevronDownIcon, CheckIconSolid, CalendarIcon, ClipboardListIcon } from './icons';
import { useAppData } from '../hooks/useAppData';

const formatDateToYYYYMMDD = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const getCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    // Day of the week (0=Sun, 1=Mon, ..., 6=Sat). We want Monday to be the first day.
    const startOffset = (firstDay.getDay() + 6) % 7; 

    // Add days from the previous month
    for (let i = 0; i < startOffset; i++) {
        const prevMonthDay = new Date(year, month, 0);
        prevMonthDay.setDate(prevMonthDay.getDate() - i);
        days.unshift(prevMonthDay);
    }

    // Add days of the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i));
    }
    
    // Add days from the next month to fill the grid
    const remaining = 42 - days.length; // 6 weeks grid
    for (let i = 1; i <= remaining; i++) {
        days.push(new Date(year, month + 1, i));
    }
    
    return days;
};

const STATUS_INFO: Record<AttendanceStatus, { label: string; color: string }> = {
    'H': { label: 'Hadir', color: 'text-green-600' },
    'S': { label: 'Sakit', color: 'text-yellow-600' },
    'I': { label: 'Izin', color: 'text-blue-600' },
    'A': { label: 'Alpha', color: 'text-red-600' },
};

type SchoolWeekType = '5day' | '6day';

export const AttendanceView: React.FC = () => {
    const { 
        filteredStudents, 
        attendanceRecords, 
        holidays, 
        handleSaveAttendanceBatch: onSave, 
        handleSaveHoliday: onSaveHoliday, 
        handleDeleteHoliday: onDeleteHoliday,
        showConfirmation
    } = useAppData();

    const [activeTab, setActiveTab] = useState<'calendar' | 'recap'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [modalDate, setModalDate] = useState<Date | null>(null);
    const [schoolWeekType, setSchoolWeekType] = useState<SchoolWeekType>('6day');

    const recordsByDate = useMemo(() => {
        const map = new Map<string, AttendanceRecord[]>();
        attendanceRecords.forEach(record => {
            if (!map.has(record.date)) {
                map.set(record.date, []);
            }
            map.get(record.date)!.push(record);
        });
        return map;
    }, [attendanceRecords]);

    const holidaysByDate = useMemo(() => {
        const map = new Map<string, HolidayRecord>();
        holidays.forEach(holiday => {
            map.set(holiday.date, holiday);
        });
        return map;
    }, [holidays]);
    
    const calendarDays = useMemo(() => getCalendarDays(currentDate), [currentDate]);

    const totalSchoolDaysInMonth = useMemo(() => {
        let count = 0;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const day = new Date(year, month, i);
            const dayOfWeek = day.getDay();
            const dateStr = formatDateToYYYYMMDD(day);

            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            const isWeekendHoliday = isSunday || (isSaturday && schoolWeekType === '5day');
            
            if (!isWeekendHoliday && !holidaysByDate.has(dateStr)) {
                count++;
            }
        }
        return count;
    }, [currentDate, schoolWeekType, holidaysByDate]);
    
    const monthlySummary = useMemo(() => {
        const summary: Record<number, Record<AttendanceStatus, number>> = {};
        filteredStudents.forEach(s => {
            summary[s.id] = { 'H': 0, 'S': 0, 'I': 0, 'A': 0 };
        });
        
        const monthStr = currentDate.toISOString().slice(0, 7);
        const recordsForCurrentMonth = attendanceRecords.filter(r => r.date.startsWith(monthStr));

        recordsForCurrentMonth.forEach(record => {
            if (summary[record.studentId]) {
                summary[record.studentId][record.status]++;
            }
        });
        return summary;
    }, [filteredStudents, attendanceRecords, currentDate]);


    const changeMonth = (delta: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };
    
    if (filteredStudents.length === 0) {
        return (
             <Card>
                <div className="text-center p-8 bg-slate-50 rounded-lg">
                    <p className="text-slate-500">
                        Tidak ada siswa di kelas yang aktif. Silakan pilih kelas di pengaturan atau tambahkan siswa di Dashboard.
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Common Header */}
             <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800">
                    {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 border border-slate-300 bg-white rounded-md text-sm font-semibold hover:bg-slate-50">Hari Ini</button>
                    <button onClick={() => changeMonth(-1)} className="p-2 border border-slate-300 bg-white rounded-md hover:bg-slate-50"><ChevronDownIcon className="h-5 w-5 rotate-90" /></button>
                    <button onClick={() => changeMonth(1)} className="p-2 border border-slate-300 bg-white rounded-md hover:bg-slate-50"><ChevronDownIcon className="h-5 w-5 -rotate-90" /></button>
                </div>
            </div>
            
             <div className="flex-shrink-0 mb-4">
                <div className="text-sm font-semibold text-slate-600 mb-2">Pola Hari Sekolah:</div>
                <div className="flex items-center gap-2">
                    {(['6day', '5day'] as SchoolWeekType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setSchoolWeekType(type)}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${
                                schoolWeekType === type
                                    ? 'bg-teal-600 text-white ring-2 ring-offset-2 ring-teal-500'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                        >
                            {type === '6day' ? '6 Hari (Senin-Sabtu)' : '5 Hari (Senin-Jumat)'}
                        </button>
                    ))}
                </div>
            </div>


            {/* Tab Navigation */}
            <div className="flex-shrink-0 border-b border-slate-200">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`flex items-center gap-2 px-3 py-2 font-semibold text-sm rounded-t-lg border-b-2 ${
                            activeTab === 'calendar'
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <CalendarIcon className="h-5 w-5" />
                        Kalender Absensi
                    </button>
                    <button
                        onClick={() => setActiveTab('recap')}
                        className={`flex items-center gap-2 px-3 py-2 font-semibold text-sm rounded-t-lg border-b-2 ${
                            activeTab === 'recap'
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ClipboardListIcon className="h-5 w-5" />
                        Rekap Bulanan
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-grow pt-4 overflow-y-auto min-h-0 pb-16 md:pb-0">
                {activeTab === 'calendar' && (
                    <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                            <div key={day} className="text-center py-2 bg-slate-100 text-xs font-semibold text-slate-600">{day}</div>
                        ))}
                        {calendarDays.map((day, i) => {
                            const dateStr = formatDateToYYYYMMDD(day);
                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const dailyRecords = recordsByDate.get(dateStr) || [];
                            const holidayInfo = holidaysByDate.get(dateStr);
                            const allPresent = dailyRecords.length > 0 && dailyRecords.length >= filteredStudents.length && dailyRecords.every(r => r.status === 'H');

                            const dayOfWeek = day.getDay(); // 0=Sun, 6=Sat
                            const isSunday = dayOfWeek === 0;
                            const isSaturday = dayOfWeek === 6;
                            const isWeekendHoliday = isSunday || (isSaturday && schoolWeekType === '5day');
                            
                            let dayClasses = 'p-2 h-24 flex flex-col items-start text-left group transition-colors';
                            if (!isCurrentMonth) {
                                dayClasses += ' bg-slate-100 text-slate-400';
                            } else if (isWeekendHoliday) {
                                dayClasses += ' bg-red-500 text-white cursor-not-allowed';
                            } else if (holidayInfo) {
                                dayClasses += ' bg-orange-100 hover:bg-orange-200';
                            } else {
                                dayClasses += ' bg-white hover:bg-teal-50';
                            }
                            
                            const summary: Record<string, number> = {};
                            if (!allPresent) {
                                dailyRecords.forEach(rec => {
                                    if (rec.status !== 'H') {
                                        summary[rec.status] = (summary[rec.status] || 0) + 1;
                                    }
                                });
                            }

                            return (
                                <button 
                                    key={i} 
                                    onClick={() => !isWeekendHoliday && setModalDate(day)}
                                    disabled={isWeekendHoliday}
                                    className={dayClasses}
                                >
                                    <span className="font-semibold">{day.getDate()}</span>
                                    {isCurrentMonth && holidayInfo && (
                                         <div className="text-xs mt-1 w-full font-bold text-orange-800">
                                            {holidayInfo.description}
                                        </div>
                                    )}
                                    {isCurrentMonth && !isWeekendHoliday && !holidayInfo && dailyRecords.length > 0 && (
                                        <div className="text-xs mt-1 space-y-0.5 w-full">
                                            {allPresent ? (
                                                <div className="flex items-center gap-1 text-green-600">
                                                <CheckIconSolid className="h-4 w-4" />
                                                <span className="font-bold">Hadir Semua</span>
                                                </div>
                                            ) : (
                                                Object.entries(summary).map(([status, count]) => (
                                                    <p key={status} className={`font-bold ${STATUS_INFO[status as AttendanceStatus]?.color}`}>
                                                        {count} {STATUS_INFO[status as AttendanceStatus]?.label}
                                                    </p>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
                {activeTab === 'recap' && (
                     <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 sticky top-0">
                                <tr>
                                    <th className="p-3 font-semibold text-slate-600 text-left">Nama Siswa</th>
                                    {Object.values(STATUS_INFO).map(s => <th key={s.label} className={`p-3 font-semibold text-center ${s.color}`}>{s.label}</th>)}
                                    <th className="p-3 font-semibold text-slate-600 text-center">% Hadir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredStudents.map(student => {
                                    const summary = monthlySummary[student.id];
                                    const expectedDays = totalSchoolDaysInMonth - summary.I - summary.S;
                                    const attendancePercentage = expectedDays > 0 ? (summary.H / expectedDays) * 100 : summary.H > 0 ? 100 : 0;

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50">
                                            <td className="p-2 font-medium text-slate-800">{student.nama}</td>
                                            {Object.keys(STATUS_INFO).map(status => (
                                                <td key={status} className="p-2 text-center font-semibold text-slate-700">{summary[status as AttendanceStatus]}</td>
                                            ))}
                                            <td className={`p-2 text-center font-bold ${attendancePercentage > 90 ? 'text-green-600' : attendancePercentage > 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {totalSchoolDaysInMonth > 0 ? `${attendancePercentage.toFixed(0)}%` : '-'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modalDate && (
                <DailyAttendanceModal
                    date={modalDate}
                    students={filteredStudents}
                    recordsForDate={recordsByDate.get(formatDateToYYYYMMDD(modalDate)) || []}
                    holidayForDate={holidaysByDate.get(formatDateToYYYYMMDD(modalDate)) || null}
                    onSave={onSave}
                    onClose={() => setModalDate(null)}
                    onSaveHoliday={onSaveHoliday}
                    onDeleteHoliday={onDeleteHoliday}
                    showConfirmation={showConfirmation}
                />
            )}
        </div>
    );
};
