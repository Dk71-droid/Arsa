import React, { useState, useEffect, useMemo } from 'react';
import { FASE_OPTIONS, FASE_TO_GRADES_MAP } from '../constants';
import { useAppData } from '../hooks/useAppData';
import type { Student, ClassProfile } from '../types';
import { DocumentReportIcon, CheckIcon, UsersIcon, PlusCircleIcon, PencilIcon, TrashIcon, XIcon, LockIcon, LogOutIcon, MailIcon } from './icons';
import { StudentManager } from './settings/StudentManager';
import { AccordionItem } from './settings/AccordionItem';
import { useAuth } from '../contexts/AuthContext';

interface AppSettings {
    schoolName?: string;
    principalName?: string;
    principalNIP?: string;
    academicYear?: string;
}

const ApiKeyManager: React.FC = () => {
    const { userApiKey, handleSaveApiKey, showAlert } = useAppData();
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKeyInput.trim()) return;
        setIsSaving(true);
        await handleSaveApiKey(apiKeyInput.trim());
        setIsSaving(false);
        setApiKeyInput('');
        showAlert({ title: "Berhasil", message: "Kunci API Gemini berhasil disimpan." });
    };

    return (
        <section>
            <p className="text-sm text-slate-500 mb-4">Kunci API Anda disimpan secara lokal di perangkat ini dan tidak pernah dikirim ke server kami.</p>
            <div>
                {userApiKey ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                        <p><strong>Status:</strong> Kunci API sudah diatur dan siap digunakan.</p>
                    </div>
                ) : (
                     <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                        <p><strong>Status:</strong> Kunci API belum diatur. Fitur AI tidak akan berfungsi.</p>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="mt-4 space-y-2">
                    <div>
                        <label htmlFor="api-key" className="block text-sm font-medium text-slate-700 mb-1">{userApiKey ? 'Perbarui Kunci API Anda' : 'Masukkan Kunci API Anda'}</label>
                        <input
                            id="api-key"
                            type="password"
                            value={apiKeyInput}
                            onChange={e => setApiKeyInput(e.target.value)}
                            placeholder="Tempel kunci API Gemini Anda di sini"
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                    <button type="submit" disabled={!apiKeyInput.trim() || isSaving} className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-slate-400 font-semibold">
                        {isSaving ? 'Menyimpan...' : 'Simpan Kunci API'}
                    </button>
                </form>
            </div>
        </section>
    );
};


export const SettingsView: React.FC = () => {
    const {
        settings: currentSettings,
        handleSaveSettings: onSaveAppSettings,
        masterStudents,
        classProfiles,
        addClassProfile,
        updateClassProfile,
        deleteClassProfile,
        handleBulkAddStudents,
        handleUpdateStudent,
        handleDeleteStudent,
    } = useAppData();
    const { user, logout } = useAuth();
    
    const [openAccordion, setOpenAccordion] = useState<string | null>('kelas');
    const [appSettings, setAppSettings] = useState<AppSettings>({});
    const [isSaved, setIsSaved] = useState(true);
    const [editingClass, setEditingClass] = useState<ClassProfile | null>(null);
    const [isAddingClass, setIsAddingClass] = useState(false);
    const [managingStudentsFor, setManagingStudentsFor] = useState<string | null>(null);

    useEffect(() => {
        setAppSettings({
            schoolName: currentSettings.schoolName || '',
            principalName: currentSettings.principalName || '',
            principalNIP: currentSettings.principalNIP || '',
            academicYear: currentSettings.academicYear || '',
        });
        setIsSaved(true);
    }, [currentSettings]);

    const handleAppSettingsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveAppSettings(appSettings);
        setIsSaved(true);
    };

    const handleInputChange = (field: keyof AppSettings, value: string) => {
        setAppSettings(prev => ({ ...prev, [field]: value }));
        setIsSaved(false);
    };

    const handleSaveClass = async (profile: ClassProfile) => {
        if (profile.id) {
            await updateClassProfile(profile.id, profile);
        } else {
            await addClassProfile(profile);
        }
        setEditingClass(null);
        setIsAddingClass(false);
    };

    return (
        <div className="h-full overflow-y-auto pb-4 scrollbar-hide space-y-4">
            <AccordionItem
                id="api"
                title="Manajemen Kunci API Gemini"
                icon={<LockIcon className="h-5 w-5 text-indigo-600" />}
                isOpen={openAccordion === 'api'}
                onToggle={setOpenAccordion}
            >
                <ApiKeyManager />
            </AccordionItem>
            
            <AccordionItem
                id="kelas"
                title="Manajemen Kelas & Siswa"
                icon={<UsersIcon className="h-5 w-5 text-indigo-600" />}
                isOpen={openAccordion === 'kelas'}
                onToggle={setOpenAccordion}
            >
                <section>
                    <p className="text-sm text-slate-500 mb-4">Kelola semua kelas yang Anda ampu dan daftar siswa di dalamnya.</p>
                    <div className="space-y-3">
                        {classProfiles.map(profile => (
                            <div key={profile.id} className="p-3 bg-slate-50 border rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800">{profile.name}</p>
                                        <p className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full inline-block mt-1">
                                            Fase {profile.phase} | Kelas {profile.grade}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setManagingStudentsFor(managingStudentsFor === profile.id ? null : profile.id)} className="text-sm font-semibold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-md hover:bg-indigo-200">Kelola Siswa</button>
                                        <button onClick={() => setEditingClass(profile)} className="p-2 rounded-full hover:bg-slate-200"><PencilIcon className="h-4 w-4 text-slate-600" /></button>
                                        <button onClick={() => deleteClassProfile(profile.id)} className="p-2 rounded-full hover:bg-red-100"><TrashIcon className="h-4 w-4 text-red-500" /></button>
                                    </div>
                                </div>
                                {managingStudentsFor === profile.id && (
                                    <StudentManager
                                        classProfile={profile}
                                        students={masterStudents.filter(s => s.kelas === profile.name)}
                                        onAdd={(newStudents) => handleBulkAddStudents(newStudents, profile.name)}
                                        onUpdate={handleUpdateStudent}
                                        onDelete={handleDeleteStudent}
                                    />
                                )}
                            </div>
                        ))}
                        <button onClick={() => setIsAddingClass(true)} className="w-full flex justify-center items-center gap-2 p-3 border-2 border-dashed rounded-lg text-indigo-600 font-semibold hover:bg-indigo-50">
                            <PlusCircleIcon className="h-5 w-5" /> Tambah Kelas Baru
                        </button>
                    </div>
                </section>
            </AccordionItem>

            <AccordionItem
                id="rapor"
                title="Informasi Rapor"
                icon={<DocumentReportIcon className="h-5 w-5 text-indigo-600" />}
                isOpen={openAccordion === 'rapor'}
                onToggle={setOpenAccordion}
            >
                <form onSubmit={handleAppSettingsSubmit} className="space-y-6">
                    <section>
                        <p className="text-sm text-slate-500 mb-4">Data ini akan digunakan saat mencetak rapor siswa.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" value={appSettings.schoolName} onChange={e => handleInputChange('schoolName', e.target.value)} placeholder="Nama Sekolah" className="p-2 border rounded-md"/>
                            <input type="text" value={appSettings.academicYear} onChange={e => handleInputChange('academicYear', e.target.value)} placeholder="Tahun Ajaran" className="p-2 border rounded-md"/>
                            <input type="text" value={appSettings.principalName} onChange={e => handleInputChange('principalName', e.target.value)} placeholder="Nama Kepala Sekolah" className="p-2 border rounded-md"/>
                            <input type="text" value={appSettings.principalNIP} onChange={e => handleInputChange('principalNIP', e.target.value)} placeholder="NIP Kepala Sekolah (Opsional)" className="p-2 border rounded-md"/>
                        </div>
                    </section>
                    <div className="flex justify-end pt-4 border-t">
                        <button type="submit" disabled={isSaved} className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400">
                            {isSaved ? <><CheckIcon className="h-5 w-5" /> Tersimpan</> : 'Simpan Info Rapor'}
                        </button>
                    </div>
                </form>
            </AccordionItem>
            
             <button
                onClick={logout}
                className="w-full flex justify-between items-center p-4 text-left bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <MailIcon className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Akun & Keluar</h2>
                        <p className="text-sm text-slate-500 truncate" title={user?.email || ''}>{user?.email}</p>
                    </div>
                </div>
                <LogOutIcon className="h-6 w-6 text-red-500" />
            </button>


            {(isAddingClass || editingClass) && (
                <ClassEditorModal
                    classProfile={isAddingClass ? { id: '', name: '', phase: '', grade: '' } : editingClass}
                    onClose={() => { setIsAddingClass(false); setEditingClass(null); }}
                    onSave={handleSaveClass}
                />
            )}
        </div>
    );
};

const ClassEditorModal: React.FC<{
    classProfile: ClassProfile | null;
    onClose: () => void;
    onSave: (profile: ClassProfile) => void;
}> = ({ classProfile, onClose, onSave }) => {
    const [profile, setProfile] = useState<ClassProfile | null>(null);

    useEffect(() => {
        setProfile(classProfile ? { ...classProfile } : null);
    }, [classProfile]);

    const availableGrades = useMemo(() => {
        if (!profile?.phase) return [];
        return FASE_TO_GRADES_MAP[profile.phase] || [];
    }, [profile?.phase]);

    useEffect(() => {
        // Reset grade if phase changes and current grade is no longer valid
        if (profile && !FASE_TO_GRADES_MAP[profile.phase]?.includes(profile.grade)) {
            setProfile(p => p ? { ...p, grade: '' } : null);
        }
    }, [profile?.phase]);

    if (!profile) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(profile);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className="p-4 border-b"><h3 className="text-lg font-bold text-slate-800">{profile.id ? 'Ubah Kelas' : 'Tambah Kelas Baru'}</h3></header>
                    <main className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="class-phase" className="block text-sm font-medium text-slate-700 mb-1">Fase</label>
                                <select id="class-phase" value={profile.phase} onChange={e => setProfile({ ...profile, phase: e.target.value })} required className="w-full p-2 border rounded-md">
                                    <option value="">Pilih Fase</option>
                                    {FASE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="class-grade" className="block text-sm font-medium text-slate-700 mb-1">Kelas yang Diampu</label>
                                <select id="class-grade" value={profile.grade} onChange={e => setProfile({ ...profile, grade: e.target.value })} required disabled={availableGrades.length === 0} className="w-full p-2 border rounded-md disabled:bg-slate-100">
                                    <option value="">Pilih Kelas</option>
                                    {availableGrades.map(grade => <option key={grade} value={grade}>Kelas {grade}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="class-name" className="block text-sm font-medium text-slate-700 mb-1">Nama Kelas (Deskriptif)</label>
                            <input id="class-name" type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required placeholder="Contoh: 5A IPA, Kelas 7 Unggulan" className="w-full p-2 border rounded-md" />
                        </div>
                    </main>
                    <footer className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-md">Batal</button>
                        <button type="submit" disabled={!profile.name || !profile.phase || !profile.grade} className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:bg-slate-400">Simpan</button>
                    </footer>
                </form>
            </div>
        </div>
    );
};