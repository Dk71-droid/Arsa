import React, { useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import { Card } from './Card';
import { DocumentReportIcon, DownloadIcon, AlertTriangleIcon } from './icons';
import { Loader } from './Loader';
import * as geminiService from '../services/geminiService';
import type { Student, LearningPlan, AttendanceStatus } from '../types';

const openHtmlInNewTabForPrinting = (htmlContent: string, showAlert: (options: { title: string, message: string }) => void) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        const style = printWindow.document.createElement('style');
        style.textContent = '@media print { .no-print { display: none !important; } }';
        printWindow.document.head.appendChild(style);
        const messageDiv = printWindow.document.createElement('div');
        messageDiv.className = 'no-print';
        messageDiv.innerHTML = `
            <div style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background-color: #e6f7ff; border: 1px solid #91d5ff; padding: 15px; border-radius: 4px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 9999; font-family: sans-serif; width: 90%; max-width: 600px;">
                <strong>Siap untuk Mencetak!</strong>
                <p style="margin: 5px 0 10px 0; font-size: 14px;">Anda dapat menggunakan tombol di bawah, atau fungsi cetak browser (Ctrl+P) untuk menyimpan sebagai PDF atau mencetak langsung.</p>
                <button onclick="window.print()" style="background-color: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 14px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'">
                    Cetak Rapor
                </button>
            </div>
        `;
        if (printWindow.document.body) {
            printWindow.document.body.prepend(messageDiv);
        }
        printWindow.focus();
    } else {
        showAlert({
            title: "Pop-up Diblokir",
            message: "Gagal membuka halaman baru. Mohon izinkan pop-up untuk situs ini di pengaturan peramban Anda."
        });
    }
};

export const ReportView: React.FC = () => {
    const {
        filteredStudents,
        learningPlans,
        activeSemester,
        settings,
        attendanceRecords,
        activeClassProfile,
        showAlert,
    } = useAppData();

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReportHtml, setGeneratedReportHtml] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateReport = async () => {
        const studentToReport = filteredStudents.find(s => s.id === selectedStudentId);
        if (!studentToReport) {
            setError("Siswa yang dipilih tidak ditemukan.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedReportHtml(null);

        try {
            const subjectScores: { subject: string; averageScore: number }[] = [];
            for (const plan of learningPlans) {
                const atp = plan.curriculum.alurTujuanPembelajaran || [];
                const className = activeClassProfile?.name || '';
                const classNumber = className.match(/\d+/)?.[0];
                if (!classNumber) continue;

                const relevantTpIds = new Set(atp.filter(item => item.mingguKe.includes(`Kelas ${classNumber}`) && item.mingguKe.includes(activeSemester)).map(item => item.tpId));
                if (relevantTpIds.size === 0) continue;

                const scoresForSubject = studentToReport.summativeAssessments
                    .filter(sa => relevantTpIds.has(sa.tpId) && sa.score !== null)
                    .map(sa => sa.score);
                
                if (scoresForSubject.length > 0) {
                    const averageScore = scoresForSubject.reduce((a, b) => a + b, 0) / scoresForSubject.length;
                    subjectScores.push({ subject: plan.curriculum.subject, averageScore: Math.round(averageScore) });
                }
            }
            
            let narrative;
            if (subjectScores.length > 0) {
                narrative = await geminiService.generateSingleStudentMultiSubjectReportNarrative(studentToReport.nama, subjectScores);
            } else {
                narrative = { holisticSummary: "Tidak ada data nilai sumatif yang memadai untuk menghasilkan narasi.", strengths: [], areasForImprovement: [] };
            }

            const attendance: Record<AttendanceStatus, number> = { H: 0, S: 0, I: 0, A: 0 };
            const monthStr = new Date().toISOString().slice(0, 7);
            attendanceRecords.filter(r => r.studentId === studentToReport.id && r.date.startsWith(monthStr))
                           .forEach(rec => { attendance[rec.status]++; });

            const reportData = {
                student: studentToReport,
                grades: subjectScores.map(s => ({
                    subject: s.subject,
                    finalGrade: s.averageScore,
                    description: `Ananda ${s.averageScore >= 70 ? 'telah menunjukkan pemahaman yang baik' : 'memerlukan bimbingan lebih lanjut'} pada mata pelajaran ini.`
                })),
                mulokGrades: [], // Placeholder
                extracurriculars: [{ description: "Pramuka" }], // Placeholder
                achievements: [], // Placeholder
                attendance,
                notes: narrative,
                isSecondSemester: activeSemester === 'Semester 2',
                className: activeClassProfile?.name || 'N/A',
                homeroomTeacher: "Nama Guru Wali Kelas", // Placeholder
                parentName: "Nama Orang Tua/Wali", // Placeholder
                schoolName: settings.schoolName || "Nama Sekolah",
                principalName: settings.principalName || "Nama Kepala Sekolah",
                principalNIP: settings.principalNIP || "-",
                academicYear: settings.academicYear || "Tahun Ajaran",
                reportDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            };

            const html = await geminiService.generateReportCardHtml(reportData);
            setGeneratedReportHtml(html);

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Gagal membuat rapor. Silakan coba lagi.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
            {/* Left Panel */}
            <div className="w-full md:w-96 flex-shrink-0 space-y-6 overflow-y-auto scrollbar-hide">
                <Card>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-slate-800">Cetak Rapor Siswa</h2>
                        <p className="text-slate-600 mt-1">
                            Pilih siswa dari kelas <strong>{activeClassProfile?.name || '...'}</strong> untuk membuat rapor <strong>{activeSemester}</strong>.
                        </p>
                    </div>
                    <div className="mt-4 pt-4 border-t flex flex-col gap-4">
                        <select
                            value={selectedStudentId || ''}
                            onChange={(e) => {
                                setSelectedStudentId(Number(e.target.value));
                                setGeneratedReportHtml(null); // Clear preview on student change
                                setError(null);
                            }}
                            className="w-full p-2.5 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">-- Pilih Siswa --</option>
                            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                        </select>
                        <button
                            onClick={handleGenerateReport}
                            disabled={!selectedStudentId || isGenerating}
                            className="w-full flex items-center justify-center gap-2 font-semibold text-white bg-blue-600 rounded-md px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            <DocumentReportIcon className="h-5 w-5" />
                            <span>{isGenerating ? 'Membuat...' : 'Buat Rapor untuk Siswa Ini'}</span>
                        </button>
                    </div>
                </Card>

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-start gap-3">
                        <AlertTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="font-bold">Terjadi Kesalahan:</strong>
                            <p>{error}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex flex-col min-w-0">
                <Card className="flex-grow flex flex-col p-0 overflow-hidden">
                    {isGenerating ? (
                        <div className="flex-grow flex items-center justify-center">
                             <Loader text="AI sedang membuat narasi dan menyusun rapor..." />
                        </div>
                    ) : generatedReportHtml ? (
                        <>
                            <div className="p-4 flex justify-between items-center border-b border-slate-200 flex-shrink-0">
                                <h3 className="text-xl font-bold text-slate-700">Pratinjau Rapor</h3>
                                <button
                                    onClick={() => openHtmlInNewTabForPrinting(generatedReportHtml, showAlert)}
                                    className="flex items-center gap-2 font-semibold text-white bg-blue-600 rounded-md px-4 py-2 hover:bg-blue-700"
                                >
                                    <DownloadIcon className="h-5 w-5" />
                                    Buka Halaman Cetak/PDF
                                </button>
                            </div>
                            <div className="flex-grow w-full bg-slate-200 p-4 overflow-hidden">
                                <div className="w-full h-full bg-white shadow-lg">
                                    <iframe
                                        srcDoc={generatedReportHtml}
                                        className="w-full h-full border-0"
                                        title="Pratinjau Rapor"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-center text-slate-500 p-4">
                             <div>
                                <DocumentReportIcon className="h-16 w-16 mx-auto text-slate-400" />
                                <p className="mt-4 font-semibold">Pratinjau Rapor</p>
                                <p className="text-sm">Pilih siswa dan buat rapor untuk melihat pratinjau di sini.</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
