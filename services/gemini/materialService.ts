import { getAiClient, parseJsonResponse, Type, HTML_DOCUMENT_STYLING_RULES } from './common';
import type { TujuanPembelajaran, DeepLearningLessonPlan, Student, LearningPlan, AttendanceStatus, PhaseKegiatan } from '../../types';
import { GoogleGenAI, Modality } from "@google/genai";

interface StudentReportData {
    student: Student;
    grades: { subject: string; finalGrade: number | string; description: string }[];
    mulokGrades: { subject: string; finalGrade: number | string; description: string }[];
    extracurriculars: { description: string }[];
    achievements: { description: string }[];
    attendance: Record<AttendanceStatus, number>;
    notes: { holisticSummary: string; strengths: string[]; areasForImprovement: string[] };
    isSecondSemester: boolean;
    className: string;
    homeroomTeacher: string;
    parentName: string;
    schoolName: string;
    principalName: string;
    principalNIP: string;
    academicYear: string;
    reportDate: string;
}

export async function generateReportCardHtml(studentData: StudentReportData): Promise<string> {

    const {
        student, grades, mulokGrades, extracurriculars, achievements, attendance,
        notes, isSecondSemester, className, homeroomTeacher, parentName,
        schoolName, principalName, principalNIP, academicYear, reportDate
    } = studentData;

    const toRoman = (num: number): string => {
        const roman: { [key: string]: number } = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
        let str = '';
        for (const i of Object.keys(roman)) {
            const q = Math.floor(num / roman[i]);
            num -= q * roman[i];
            str += i.repeat(q);
        }
        return str;
    };

    const currentClassNumMatch = className.match(/\d+/);
    let promotionDecisionHtml = '';
    if (isSecondSemester && currentClassNumMatch) {
        const currentClassNum = parseInt(currentClassNumMatch[0], 10);
        const nextClassNum = currentClassNum + 1;
        
        promotionDecisionHtml = `
            <table class="decision-box">
                <tr><td>Berdasarkan pencapaian seluruh kompetensi, peserta didik dinyatakan:</td></tr>
                <tr><td class="decision-text">NAIK KE KELAS ${toRoman(nextClassNum)}</td></tr>
                <tr><td>Selamat, pertahankan prestasi belajar Anda!</td></tr>
            </table>
        `;
    }

    const page1 = `
        <div class="report-page">
            <div class="report-header">
                <h2>LAPORAN HASIL BELAJAR</h2>
                <h3>(RAPOR)</h3>
            </div>

            <table class="info-table" style="width: 100%;">
                <tr>
                    <td style="width: 50%;">
                        <table class="info-table">
                            <tr><td>Nama Sekolah</td><td>:</td><td>${schoolName}</td></tr>
                            <tr><td>Alamat</td><td>:</td><td>-</td></tr>
                        </table>
                    </td>
                    <td style="width: 50%;">
                         <table class="info-table">
                            <tr><td>Kelas</td><td>:</td><td>${className}</td></tr>
                            <tr><td>Tahun Ajaran</td><td>:</td><td>${academicYear}</td></tr>
                        </table>
                    </td>
                </tr>
            </table>
            
             <table class="info-table" style="width: 100%; margin-top: 1rem; margin-bottom: 2rem;">
                <tr>
                    <td><strong>Nama Peserta Didik:</strong> <span style="text-decoration: underline; font-weight: bold;">${student.nama}</span></td>
                </tr>
                <tr>
                    <td><strong>Nomor Induk Siswa:</strong> ${student.nis || '-'}</td>
                </tr>
            </table>

            <h3 style="margin-top: 1rem;">A. Nilai Akademik</h3>
            <table class="grades-table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Mata Pelajaran</th>
                        <th>Nilai</th>
                        <th>Deskripsi</th>
                    </tr>
                </thead>
                <tbody>
                    ${grades.map((g, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${g.subject}</td>
                            <td>${g.finalGrade}</td>
                            <td>${g.description}</td>
                        </tr>
                    `).join('')}
                    ${grades.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Tidak ada nilai untuk ditampilkan.</td></tr>` : ''}
                    
                    ${mulokGrades.length > 0 ? `
                        <tr><td colspan="4" style="background-color: #f1f5f9; font-weight: bold; text-align: center;">Muatan Lokal</td></tr>
                        ${mulokGrades.map((g, i) => `
                            <tr>
                                <td>${grades.length + i + 1}</td>
                                <td>${g.subject}</td>
                                <td>${g.finalGrade}</td>
                                <td>${g.description}</td>
                            </tr>
                        `).join('')}
                    ` : ''}
                </tbody>
            </table>
        </div>
    `;

    const page2 = `
        <div class="report-page">
            <div class="half-width-container">
                <div class="half-width-item">
                    <h3>B. Kegiatan Ekstrakurikuler</h3>
                    <table class="small-table">
                        <thead><tr><th>No</th><th>Keterangan</th></tr></thead>
                        <tbody>
                             ${extracurriculars.map((e, i) => `<tr><td>${i + 1}</td><td>${e.description}</td></tr>`).join('')}
                             ${extracurriculars.length === 0 ? `<tr><td colspan="2">-</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
                <div class="half-width-item">
                    <h3>C. Prestasi</h3>
                    <table class="small-table">
                        <thead><tr><th>No</th><th>Keterangan</th></tr></thead>
                        <tbody>
                             ${achievements.map((a, i) => `<tr><td>${i + 1}</td><td>${a.description}</td></tr>`).join('')}
                             ${achievements.length === 0 ? `<tr><td colspan="2">-</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>

            <h3 style="margin-top: 1rem;">D. Ketidakhadiran</h3>
            <table class="small-table" style="width: 50%;">
                <tbody>
                    <tr><td>Sakit</td><td>: ${attendance.S || 0} hari</td></tr>
                    <tr><td>Izin</td><td>: ${attendance.I || 0} hari</td></tr>
                    <tr><td>Tanpa Keterangan</td><td>: ${attendance.A || 0} hari</td></tr>
                </tbody>
            </table>

            <h3 style="margin-top: 1rem;">E. Catatan Wali Kelas</h3>
            <div class="notes-box">
                <p>${notes.holisticSummary}</p>
                ${notes.strengths.length > 0 ? `
                    <p><strong>Hal yang menonjol:</strong></p>
                    <ul>${notes.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
                ` : ''}
                ${notes.areasForImprovement.length > 0 ? `
                    <p><strong>Hal yang perlu ditingkatkan:</strong></p>
                    <ul>${notes.areasForImprovement.map(a => `<li>${a}</li>`).join('')}</ul>
                ` : ''}
            </div>

            ${promotionDecisionHtml}

            <div class="signature-area">
                <div class="signature-col">
                    <p>Mengetahui,</p>
                    <p>Orang Tua/Wali Murid</p>
                    <p class="name">(${parentName})</p>
                </div>
                <div class="signature-col center">
                     <p>Kepala Sekolah,</p>
                     <p class="name">${principalName}</p>
                     <p>NIP. ${principalNIP || '-'}</p>
                </div>
                <div class="signature-col">
                    <p>${schoolName}, ${reportDate}</p>
                    <p>Wali Kelas</p>
                    <p class="name">${homeroomTeacher}</p>
                </div>
            </div>
        </div>
    `;

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Rapor Siswa - ${student.nama}</title>
    <style>${HTML_DOCUMENT_STYLING_RULES}</style>
</head>
<body>
    <div class="document-container">
        ${page1}
        ${page2}
    </div>
</body>
</html>`;
}



const getBasePrompt = (purpose: string, format: string) => `
    PERAN: Anda adalah seorang desainer instruksional dan pengembang frontend ahli, yang berspesialisasi dalam membuat materi pembelajaran (${purpose}) yang menarik secara visual, modern, dan fungsional.

    TUGAS: Buat **satu file HTML lengkap** yang berfungsi sebagai ${purpose}. Materi ini harus indah, responsif, dan didasarkan pada RPP yang diberikan.

    PERSYARATAN WAJIB (HARUS DIIKUTI):

    1.  **Struktur & Format Output:**
        -   Output HARUS berupa string HTML mentah tunggal yang valid, dimulai dengan \`<!DOCTYPE html>\` dan diakhiri dengan \`</html>\`.
        -   **SANGAT PENTING: JANGAN PERNAH** membungkus output Anda dalam markdown backticks (\`\`\`html ... \`\`\`). Hasilkan HANYA kode HTML mentah.
        -   Gunakan **Tailwind CSS** untuk styling. Sertakan skrip Tailwind CDN di dalam \`<head>\`.
        -   Desain harus **mobile-first dan responsif**.

    2.  **Aturan Konten & Styling (SANGAT PENTING):**
        -   Konten yang dihasilkan HARUS berupa HTML murni. **JANGAN PERNAH** menggunakan sintaks Markdown seperti \`**\` untuk tebal atau \`*\` untuk miring. Gunakan tag HTML yang sesuai (\`<strong>\`, \`<b>\`, \`<em>\`, \`<i>\`).
        -   Gunakan layout yang bersih dan modern dengan latar belakang halaman yang lembut (misal: \`bg-slate-50\`).
        -   Sajikan konten dalam bentuk "kartu" atau \`div\` dengan \`bg-white\`, \`rounded-xl\`, dan \`shadow-md\` untuk memisahkan setiap bagian.
        -   Gunakan **skema warna yang konsisten dan menarik** (misal: warna utama Teal atau Indigo) untuk header, ikon, dan border.
        -   Sertakan **emoji atau ikon sederhana** di samping judul atau poin-poin penting untuk meningkatkan daya tarik visual.
        -   Gunakan font yang mudah dibaca seperti 'Inter' atau 'Poppins' dari Google Fonts (impor di head).

    3.  **Struktur Konten Umum (Wajib Ada):**
        -   **Header Utama:** Judul besar materi, nama mata pelajaran, dan TP.
        -   **Kartu Tujuan Pembelajaran:** Sebuah kartu yang disorot yang dengan jelas menyatakan tujuan pembelajaran.
        -   **Kartu-kartu Konten:** Pecah materi utama menjadi beberapa kartu yang logis. Setiap kartu harus fokus pada satu sub-topik. Gunakan heading, paragraf, dan daftar untuk menyajikan informasi. Format konten yang diharapkan adalah **${format}**.

    4.  **Kemampuan Cetak (Printability):**
        -   Pastikan hasil cetak (print) terlihat **IDENTIK** dengan tampilan di layar desktop. Semua warna latar belakang, bayangan (shadows), dan border HARUS tetap ada saat dicetak.
        -   Sertakan blok \`<style>\` di dalam \`<head>\` dengan aturan \`@media print\` untuk mencapai ini.
        -   **SANGAT PENTING:** Gunakan properti CSS \`-webkit-print-color-adjust: exact;\` dan \`print-color-adjust: exact;\` pada elemen \`body\` untuk memaksa browser mencetak warna latar belakang dan gambar.
        -   Pastikan ada aturan untuk menyembunyikan elemen dengan kelas \`.no-print\` saat mencetak.
        -   Pastikan tidak ada aturan print lain yang menyederhanakan tampilan, seperti menghilangkan bayangan atau border.
        -   Jika kontennya panjang, pecah menjadi beberapa bagian logis dan bungkus setiap bagian dengan \`<div class="report-page">\` untuk memastikan pemisahan halaman yang baik saat dicetak.

    Contoh Inspirasi Struktur:
    \`\`\`html
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${purpose}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; }
            h1, h2, h3 { font-family: 'Poppins', sans-serif; }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print {
                    display: none !important;
                }
            }
        </style>
    </head>
    <body class="bg-slate-50 font-sans p-4 sm:p-8">
        <main class="max-w-4xl mx-auto space-y-6">
            <!-- Header -->
            <header class="text-center p-6 bg-white rounded-xl shadow-md">
                <h1 class="text-3xl font-bold text-teal-700">...</h1>
            </header>
            <!-- Tujuan -->
            <div class="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-xl shadow-md"> ... Tujuan Pembelajaran ... </div>
            <!-- Konten Materi dalam Kartu-kartu -->
            <div class="bg-white p-6 rounded-xl shadow-md space-y-4">
                <h2 class="text-2xl font-bold text-slate-800">🚀 Pembahasan Materi</h2>
                <!-- Sub-topik 1 -->
            </div>
        </main>
    </body>
    </html>
    \`\`\`
`;

// FIX: Add missing 'generateCompleteRppHtml' function.
export async function generateCompleteRppHtml(
    tp: TujuanPembelajaran,
    plan: DeepLearningLessonPlan,
    learningPlan: LearningPlan,
    className: string,
    schoolName: string,
): Promise<string> {
    const ai = await getAiClient();
    
    const prompt = `
    PERAN: Anda adalah seorang ahli administrasi pendidikan dan pengembang frontend yang bertugas membuat dokumen RPP (Rencana Pelaksanaan Pembelajaran) yang formal, lengkap, dan siap cetak berdasarkan data RPP digital.

    TUGAS: Buat **satu file HTML lengkap** yang memformat data RPP JSON menjadi dokumen yang terstruktur, profesional, dan mudah dibaca.

    DATA INPUT (KONTEKS RPP):
    -   **Mata Pelajaran:** ${learningPlan.curriculum.subject}
    -   **Kelas/Semester:** ${className} / ${plan.pertemuanKe > 10 ? 'Semester 2' : 'Semester 1'}
    -   **Materi Pokok:** ${plan.pengalamanBelajar.inti.memahami.judul}
    -   **Alokasi Waktu:** ${plan.alokasiWaktuMenit} menit
    -   **Nama Sekolah:** ${schoolName}
    -   **Tujuan Pembelajaran (TP):** ${tp.deskripsi}
    -   **Data RPP Lengkap (JSON):**
        \`\`\`json
        ${JSON.stringify(plan, null, 2)}
        \`\`\`
    
    ATURAN KETAT (WAJIB DIIKUTI):

    1.  **Struktur & Format Output:**
        -   Output HARUS berupa string HTML mentah tunggal yang valid, dimulai dengan \`<!DOCTYPE html>\` dan diakhiri dengan \`</html>\`.
        -   **SANGAT PENTING: JANGAN PERNAH** membungkus output Anda dalam markdown backticks (\`\`\`html ... \`\`\`). Hasilkan HANYA kode HTML mentah.
        -   **Styling (SANGAT PENTING):** Sisipkan blok \`<style>\` berikut ke dalam \`<head>\` HTML **tanpa modifikasi sama sekali**:
            \`\`\`html
            <style>
            ${HTML_DOCUMENT_STYLING_RULES}
            </style>
            \`\`\`
        -   Seluruh konten visual HARUS berada di dalam SATU elemen tunggal: \`<div class="document-container">\`.

    2.  **Struktur Dokumen RPP:**
        -   Gunakan elemen \`<div class="report-page">\` untuk membungkus seluruh konten RPP.
        -   **Judul:** Buat judul dokumen yang jelas: "RENCANA PELAKSANAAN PEMBELAJARAN (RPP)".
        -   **Identitas RPP:** Buat tabel informasi (\`<table class="info-table">\`) yang berisi:
            -   Nama Sekolah
            -   Mata Pelajaran
            -   Kelas/Semester
            -   Materi Pokok
            -   Alokasi Waktu
        -   **Kompetensi Inti (KI):** Sertakan bagian ini sebagai formalitas (gunakan KI standar Kurikulum Merdeka).
        -   **Tujuan Pembelajaran (TP):** Cantumkan deskripsi TP dengan jelas.
        -   **Kegiatan Pembelajaran:**
            -   Buat tiga sub-bagian dengan heading \`<h2>\`: "Kegiatan Pendahuluan", "Kegiatan Inti", dan "Kegiatan Penutup".
            -   Untuk setiap bagian, format ulang daftar \`kegiatan\` dari JSON menjadi daftar bernomor (\`<ol>\`) yang rapi.
            -   Untuk **Kegiatan Inti**, buat tiga sub-sub-bagian (\`<h3>\`) untuk "Memahami", "Mengaplikasi", dan "Merefleksi".
            -   Di bawah setiap sub-sub-bagian kegiatan inti, jelaskan aktivitas yang dilakukan, termasuk **aktivitas terdiferensiasi** untuk setiap kelompok siswa. Gunakan \`<div class="differentiated-section">\` untuk menyorot aktivitas per kelompok.
        -   **Asesmen:**
            -   Buat bagian \`<h2>\` untuk "ASESMEN (PENILAIAN)".
            -   Buat tiga sub-bagian (\`<h3>\`) untuk "Asesmen Awal", "Asesmen Formatif (Kunci)", dan "Asesmen Akhir".
            -   Jelaskan bentuk asesmen untuk setiap bagian berdasarkan data RPP.
            -   Untuk **Asesmen Formatif Kunci**, tampilkan informasi fokus penilaian untuk setiap kelompok siswa dalam format yang jelas.
        -   **Contoh Rubrik (Jika Ada):** Jika ada \`contohRubrik\` di dalam RPP, format ulang menjadi tabel HTML yang rapi (\`<table class="rubric-table">\`).
        -   **Bagian Tanda Tangan:** Di akhir dokumen, buat area tanda tangan (\`<div class="signature-area">\`) untuk "Mengetahui, Kepala Sekolah" dan "Guru Mata Pelajaran".

    3.  **Kualitas Konten:**
        -   Pastikan semua data dari JSON RPP dirender dengan akurat.
        -   Gunakan heading dan paragraf yang sesuai untuk menyajikan informasi.
        -   Gunakan tag HTML murni, **JANGAN** sintaks Markdown. Gunakan \`<strong>\` untuk teks tebal.
        -   **Metadata Penting:** Tambahkan tag meta di dalam \`<head>\` untuk membantu identifikasi file saat diunduh:
            \`\`\`html
            <meta name="subject" content="${learningPlan.curriculum.subject}">
            <meta name="meeting-number" content="${plan.pertemuanKe}">
            \`\`\`

    **PERINTAH FINAL:** Hasilkan HANYA kode HTML mentah yang valid. Respons Anda HARUS dimulai dengan \`<!DOCTYPE html>\`.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    
    let rawHtml = response.text;
    const htmlStartIndex = rawHtml.indexOf('<!DOCTYPE html>');
    if (htmlStartIndex > -1) {
        rawHtml = rawHtml.substring(htmlStartIndex);
    }
    const cleanHtml = rawHtml.replace(/\n?```$/, '').trim();

    return cleanHtml;
}

export async function generateBahanAjarHtml(
    tp: TujuanPembelajaran,
    plan: DeepLearningLessonPlan,
    phase: string,
    format: 'presentation' | 'article'
): Promise<string> {
    const ai = await getAiClient();
    const prompt = `
        ${getBasePrompt("bahan ajar guru (materi presentasi)", "presentasi slide-by-slide")}
        
        **KONTEKS & DATA INPUT:**
        1.  **Fase Target:** ${phase}
        2.  **Tujuan Pembelajaran (TP):** "${tp.deskripsi}"
        3.  **Rencana Pelaksanaan Pembelajaran (RPP) terkait:**
            \`\`\`json
            ${JSON.stringify(plan, null, 2)}
            \`\`\`

        **Tugas Spesifik:**
        Buatlah materi ajar dalam format **presentasi (slide-by-slide)**. Setiap "slide" harus direpresentasikan oleh sebuah kartu terpisah (\`div\` dengan styling yang sesuai) atau bagian yang jelas di dalam satu kartu besar, dipisahkan oleh heading \`<h2>\`. Kontennya harus visual dan point-based, cocok untuk ditampilkan di proyektor. Sertakan pertanyaan pemantik dan contoh-contoh yang relevan.
        **ATURAN KONTEN:** Pastikan semua konten menggunakan tag HTML, bukan sintaks Markdown. Gunakan \`<strong>\` untuk teks tebal.
        **PENTING:** Sesuaikan kompleksitas bahasa dan kedalaman materi dengan target Fase ${phase}. Untuk Fase A, B, C (SD), gunakan kalimat pendek, contoh konkret, dan bahasa yang ramah anak.
    `;
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    const cleanHtml = response.text.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
    return cleanHtml;
}

export async function generateBahanBacaanSiswaHtml(
    tp: TujuanPembelajaran,
    plan: DeepLearningLessonPlan,
    phase: string
): Promise<string> {
    const ai = await getAiClient();
    const prompt = `
        ${getBasePrompt("bahan bacaan siswa (artikel/handout)", "artikel informatif dengan kuis")}
        
        **KONTEKS & DATA INPUT:**
        1.  **Fase Target:** ${phase}
        2.  **Tujuan Pembelajaran (TP):** "${tp.deskripsi}"
        3.  **Rencana Pelaksanaan Pembelajaran (RPP) terkait:**
            \`\`\`json
            ${JSON.stringify(plan, null, 2)}
            \`\`\`

        **Tugas Spesifik:**
        Buatlah bahan bacaan dalam format **artikel informatif** yang bisa dibaca siswa secara mandiri, diikuti dengan **kuis pemahaman interaktif yang cerdas saat dicetak**.

        **Bagian 1: Artikel Informatif**
        - Gunakan bahasa yang sederhana dan menarik.
        - Sertakan contoh konkret dan relevan.
        - Strukturkan konten dengan jelas menggunakan heading dan paragraf.
        - **ATURAN KONTEN:** Pastikan semua konten menggunakan tag HTML, bukan sintaks Markdown. Gunakan \`<strong>\` untuk teks tebal.

        **Bagian 2: Kuis Pemahaman Interaktif (dengan Fungsionalitas Cetak Cerdas)**
        - Setelah artikel, buat bagian "📝 Kuis Pemahaman" dengan 3-5 pertanyaan.
        - Tipe pertanyaan bisa bervariasi: pilihan ganda, menjodohkan, atau isian singkat.
        - **Sertakan JavaScript (inline dalam tag <script>)** untuk membuat kuis berfungsi.
        - Fungsionalitas JavaScript HARUS mencakup:
            a. Satu tombol "Periksa Jawaban". **Beri tombol ini kelas \`no-print\`**.
            b. Saat tombol diklik, skrip harus mengevaluasi jawaban.
            c. Memberikan umpan balik visual (misalnya, menyorot yang benar/salah). Elemen umpan balik ini (seperti teks "Benar/Salah" atau penjelasan) **HARUS memiliki kelas \`quiz-feedback\`**.
            d. Menampilkan skor akhir. Elemen skor ini juga **HARUS memiliki kelas \`quiz-feedback\`**.
        - **SANGAT PENTING (UNTUK MENCETAK):** Di dalam blok \`<style>\` yang sudah ada, tambahkan aturan \`@media print\` berikut untuk menyembunyikan jawaban dan tombol saat dicetak, sehingga menjadi lembar kerja yang bisa diisi:
          \`\`\`css
          @media print {
              .no-print, .quiz-feedback {
                  display: none !important;
              }
          }
          \`\`\`

        **PENTING:** Sesuaikan kompleksitas bahasa, materi, dan jenis kuis dengan target Fase ${phase}. Untuk Fase A, B, C (SD), gunakan bahasa yang sangat ramah anak, pertanyaan yang lebih visual atau sederhana (seperti menjodohkan), dan hindari isian singkat yang kompleks.
    `;
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    const cleanHtml = response.text.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
    return cleanHtml;
}

export async function generateInfographicQuizHtml(
    tp: TujuanPembelajaran,
    plan: DeepLearningLessonPlan,
    phase: string
): Promise<string> {
    const ai = await getAiClient();
    const prompt = `
        PERAN: Anda adalah seorang desainer instruksional dan pengembang frontend ahli yang berspesialisasi dalam membuat materi pembelajaran digital yang menarik, interaktif, dan responsif untuk siswa Fase ${phase}.

        TUGAS: Buat **satu file HTML lengkap** yang berfungsi sebagai **Infografis dan Kuis Interaktif** untuk Tujuan Pembelajaran (TP) yang diberikan. Outputnya harus berupa halaman web mandiri yang menarik secara visual dan berfungsi penuh.

        KONTEKS PEMBELAJARAN:
        -   **Tujuan Pembelajaran (TP):** "${tp.deskripsi}"
        -   **Rencana Pelaksanaan Pembelajaran (RPP) terkait:** Anda dapat merujuk pada aktivitas dalam RPP ini untuk memahami konteks dan kedalaman materi.
            \`\`\`json
            ${JSON.stringify(plan, null, 2)}
            \`\`\`

        PERSYARATAN WAJIB (HARUS DIIKUTI):

        1.  **Struktur & Format Output:**
            -   Output HARUS berupa string HTML mentah tunggal yang lengkap, dimulai dengan \`<!DOCTYPE html>\` dan diakhiri dengan \`</html>\`.
            -   **SANGAT PENTING: JANGAN PERNAH** membungkus output Anda dalam markdown backticks (\`\`\`html ... \`\`\`). Hasilkan HANYA kode HTML mentah.
            -   Gunakan **Tailwind CSS** untuk styling. Sertakan skrip Tailwind CDN di dalam \`<head>\`.
            -   Desain harus **mobile-first dan responsif**.

        2.  **Aturan Konten & Styling (SANGAT PENTING):**
            -   Konten yang dihasilkan HARUS berupa HTML murni. **JANGAN PERNAH** menggunakan sintaks Markdown seperti \`**\` untuk tebal atau \`*\` untuk miring. Gunakan tag HTML yang sesuai (\`<strong>\`, \`<b>\`, \`<em>\`, \`<i>\`).
        
        3.  **Konten Infografis:**
            -   Buat bagian infografis yang menarik secara visual di bagian atas halaman.
            -   Dekomposisi konsep-konsep kunci dari TP menjadi poin-poin yang mudah dicerna. Gunakan heading, daftar, dan penekanan (bold, warna) untuk kejelasan.
            -   Gunakan **emoji atau ikon sederhana** untuk membuat konten lebih menarik secara visual.
            -   Gunakan skema warna yang menyenangkan dan sesuai untuk materi edukasi.

        4.  **Konten Kuis Interaktif (dengan Fungsionalitas Cetak Cerdas):**
            -   Setelah infografis, buat bagian kuis dengan 3-5 pertanyaan pilihan ganda (A, B, C, D).
            -   Soal harus bervariasi, termasuk soal cerita singkat jika relevan dengan TP.
            -   **Sertakan JavaScript (inline dalam tag \`<script>\`)** untuk membuat kuis berfungsi.
            -   Fungsionalitas JavaScript HARUS mencakup:
                a.  Satu tombol "Cek Jawaban". **Beri tombol ini kelas \`no-print\`**.
                b.  Saat tombol diklik, skrip harus mengevaluasi semua jawaban.
                c.  Memberikan umpan balik visual untuk setiap pertanyaan: menyorot jawaban benar (hijau) dan salah (merah).
                d.  Menampilkan skor akhir.
                e.  Menampilkan **penjelasan singkat** di bawah setiap pertanyaan setelah pengecekan.
                f.  **PENTING:** Semua elemen umpan balik (highlight warna, skor akhir, penjelasan) **HARUS memiliki kelas \`quiz-feedback\`**.
            -   **SANGAT PENTING (UNTUK MENCETAK):** Di dalam blok \`<style>\` di \`<head>\`, tambahkan aturan \`@media print\` berikut untuk menyembunyikan jawaban dan tombol saat dicetak:
              \`\`\`css
              @media print {
                  .no-print, .quiz-feedback {
                      display: none !important;
                  }
              }
              \`\`\`

        5.  **Penyesuaian Fase:**
            - **SANGAT PENTING:** Sesuaikan kompleksitas bahasa, jenis pertanyaan, dan desain visual dengan target **Fase ${phase}**.
            - **Fase A, B, C (SD):** Gunakan bahasa yang sangat sederhana, lebih banyak visual/emoji, dan pertanyaan yang lebih konkret.
            - **Fase D, E, F (SMP/SMA):** Bahasa bisa lebih formal, pertanyaan bisa lebih analitis.

        Contoh struktur dasar untuk diikuti:
        \`\`\`html
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Infografis & Kuis: [Judul Topik dari TP]</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-4 sm:p-8">
            <div class="max-w-5xl mx-auto space-y-8">
                <!-- Header -->
                <!-- Bagian Infografis -->
                <!-- Bagian Kuis -->
            </div>
            <script>
                // Logika JavaScript untuk kuis
            </script>
        </body>
        </html>
        \`\`\`
    `;
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    const cleanHtml = response.text.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
    return cleanHtml;
}

export async function generateGameHtml(
    tp: TujuanPembelajaran,
    plan: DeepLearningLessonPlan,
    learningPlan: LearningPlan,
    classProfileName: string | undefined
): Promise<string> {
    const ai = await getAiClient();
    const getActivitiesFromPhase = (phase: PhaseKegiatan, phaseName: string) => {
        if (!phase || !phase.kelompokAktivitas) return [];
        return phase.kelompokAktivitas.flatMap(kelompok => 
            kelompok.tugasLengkap.map(tugas => `[${phaseName} - ${kelompok.namaKelompok}] ${tugas}`)
        );
    };

    const allActivities = [
        ...getActivitiesFromPhase(plan.pengalamanBelajar.inti.memahami, 'Memahami'),
        ...getActivitiesFromPhase(plan.pengalamanBelajar.inti.mengaplikasi, 'Mengaplikasi'),
        ...getActivitiesFromPhase(plan.pengalamanBelajar.inti.merefleksi, 'Merefleksi'),
    ];

    const activityContext = allActivities.length > 0 
        ? allActivities.map(activity => `- ${activity}`).join('\n')
        : 'Tidak ada aktivitas spesifik yang dirinci dalam RPP. Buat game berdasarkan deskripsi TP saja.';

    const prompt = `
    PERAN: Anda adalah seorang Game Designer Edukatif dan Pengembang Frontend Ahli, yang berspesialisasi dalam membuat game pembelajaran HTML yang ceria, berjenjang, dan berfungsi penuh secara mandiri untuk siswa Fase ${learningPlan.curriculum.phase}.

    TUGAS: Buat **satu file HTML mandiri (self-contained) tunggal** yang berfungsi sebagai **game edukatif berjenjang (tiered)** dengan **alur bercabang**. Game ini harus bisa dimainkan langsung di browser HP siswa tanpa memerlukan server.

    ATURAN TEKNIS KETAT (WAJIB DIIKUTI):
    1.  **Mandiri (Self-Contained):** Semua HTML, CSS, dan JavaScript HARUS berada di dalam satu file.
    2.  **Styling dengan Inline CSS (SANGAT PENTING):**
        -   Anda **HARUS** menggunakan kelas-kelas Tailwind CSS dalam markup HTML Anda (misalnya, \`class="bg-teal-500 text-white font-bold"\`).
        -   Kemudian, Anda **WAJIB** men-generate semua aturan CSS yang diperlukan untuk kelas-kelas tersebut dan menempatkannya di dalam satu tag \`<style>\` di dalam \`<head>\`.
        -   **JANGAN** menggunakan \`<script src="https://cdn.tailwindcss.com"></script>\`. Semua style harus inline.
    3.  **JavaScript Murni:** Gunakan JavaScript murni (vanilla JS) untuk semua fungsionalitas.
    4.  **Struktur Kode:** Semua kode JavaScript HARUS berada di dalam satu tag \`<script>\` di akhir \`<body>\`.
    5.  **LARANGAN KERAS:**
        -   **JANGAN** menggunakan React, JSX, atau framework lainnya.
        -   **JANGAN** menggunakan \`import\` atau \`export\`.
        -   **JANGAN** menggunakan \`<script type="module">\`.
        -   **JANGAN** menyertakan link ke file CSS atau JS eksternal.

    KONTEKS PEMBELAJARAN (DARI RPP):
    -   Mata Pelajaran: ${learningPlan.curriculum.subject}
    -   Kelas: ${classProfileName || `Fase ${learningPlan.curriculum.phase}`}
    -   Materi Utama (TP): ${tp.deskripsi}
    -   Aktivitas & Konsep Kunci dari RPP untuk inspirasi game:
        ${activityContext}

    KONSEP GAME: ALUR BERCABANG (SANGAT PENTING!)
    Game akan memiliki 3 tahap: Diagnostik -> Jalur Berjenjang -> Selesai.

    1.  **Tahap 1: Diagnostik (2-3 Soal)**
        -   Mulai game dengan 2-3 soal "diagnostik" dasar untuk mengukur pemahaman awal.
        -   Soal ini harus menanyakan konsep paling fundamental dari TP.

    2.  **Tahap 2: Penentuan Jalur & Permainan Inti**
        -   Setelah tahap diagnostik, hitung skornya. Berdasarkan skor tersebut, arahkan pemain ke salah satu dari tiga jalur:
            -   **Skor Rendah (0-1 benar):** Masuk ke **"Jalur Penguatan"**.
            -   **Skor Sedang (2 benar):** Masuk ke **"Jalur Latihan"**.
            -   **Skor Tinggi (3 benar):** Masuk ke **"Jalur Tantangan"**.
        -   Tampilkan layar transisi yang memberitahu pemain jalur mana yang mereka masuki.
        -   Setiap jalur akan memiliki **5-7 pertanyaan uniknya sendiri**.

    3.  **Sumber Pertanyaan untuk Setiap Jalur (WAJIB DIIKUTI):**
        -   **Jalur Penguatan:** Ambil inspirasi dari aktivitas **'Memahami'** di RPP. Fokus pada konsep dasar.
        -   **Jalur Latihan:** Ambil inspirasi dari aktivitas **'Mengaplikasi'** di RPP. Buat soal aplikasi standar.
        -   **Jalur Tantangan:** Ambil inspirasi dari aktivitas **'Merefleksi'** di RPP. Buat soal analisis atau studi kasus.

    4.  **Tahap 3: Selesai**
        -   Setelah menyelesaikan jalurnya, tampilkan layar akhir dengan total skor.
        -   Gunakan **localStorage** untuk menyimpan dan menampilkan skor tertinggi (high score).

    TEMPLATE STRUKTUR HTML & JS (IKUTI DENGAN TEPAT):
    \`\`\`html
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Game Edukasi: [Judul Game]</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            /* AI WAJIB MENGISI BLOK STYLE INI DENGAN SEMUA ATURAN CSS TAILWIND YANG DIGUNAKAN */
            body { font-family: 'Poppins', sans-serif; }
            .screen { display: none; }
            .screen.active { display: block; }
        </style>
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">

        <main class="w-full max-w-md mx-auto">
            <div id="start-screen" class="screen active text-center p-6 bg-white rounded-lg shadow-xl">
                <h1 class="text-3xl font-bold text-teal-600">Nama Game</h1>
                <p class="mt-2 text-gray-600">Deskripsi singkat game.</p>
                <button id="start-btn" class="mt-6 w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition-transform transform hover:scale-105">Mulai Main!</button>
            </div>
            
            <div id="transition-screen" class="screen text-center p-6 bg-white rounded-lg shadow-xl">
                 <h2 id="transition-title" class="text-2xl font-bold text-blue-600"></h2>
                 <p id="transition-message" class="mt-2 text-gray-600"></p>
            </div>

            <div id="game-screen" class="screen p-6 bg-white rounded-lg shadow-xl">
                <div class="flex justify-between items-center mb-4">
                    <p class="text-sm font-semibold text-gray-500">Pertanyaan <span id="question-counter">1</span>/<span id="total-questions">10</span></p>
                    <p class="text-lg font-bold text-teal-600">Skor: <span id="score">0</span></p>
                </div>
                <div id="question-text" class="text-lg font-semibold text-gray-800 mb-6 min-h-[60px]"></div>
                <div id="answer-options" class="grid grid-cols-1 gap-4"></div>
            </div>

            <div id="end-screen" class="screen text-center p-6 bg-white rounded-lg shadow-xl">
                 <h2 class="text-3xl font-bold text-teal-600">Game Selesai!</h2>
                 <p class="mt-4 text-xl">Skor Akhir Kamu:</p>
                 <p id="final-score" class="text-5xl font-bold my-2"></p>
                 <p class="text-gray-600">Skor Tertinggi: <span id="high-score">0</span></p>
                 <button id="restart-btn" class="mt-6 w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600">Main Lagi</button>
            </div>
        </main>

        <script>
            // ... (JavaScript logic from previous prompt remains the same) ...
            // 1. DOM Elements
            const startScreen = document.getElementById('start-screen');
            const gameScreen = document.getElementById('game-screen');
            const endScreen = document.getElementById('end-screen');
            const transitionScreen = document.getElementById('transition-screen');
            const startBtn = document.getElementById('start-btn');
            const restartBtn = document.getElementById('restart-btn');
            const questionText = document.getElementById('question-text');
            const answerOptionsContainer = document.getElementById('answer-options');
            const questionCounter = document.getElementById('question-counter');
            const totalQuestionsEl = document.getElementById('total-questions');
            const scoreEl = document.getElementById('score');
            const finalScoreEl = document.getElementById('final-score');
            const highScoreEl = document.getElementById('high-score');
            const transitionTitle = document.getElementById('transition-title');
            const transitionMessage = document.getElementById('transition-message');

            // 2. Game State
            let score = 0;
            let currentQuestionIndex = 0;
            let gameMode = 'diagnostik'; // 'diagnostik', 'penguatan', 'latihan', 'tantangan'
            let totalQuestions = 0;
            
            // 3. Questions Data (HARUS di-hardcode di sini oleh AI)
            const questionPools = {
                diagnostik: [],
                penguatan: [],
                latihan: [],
                tantangan: []
            };
            
            // 4. localStorage Key
            const HIGH_SCORE_KEY = 'game_highscore_${tp.id.replace(/[^a-zA-Z0-9]/g, '_')}';

            // 5. Functions
            function showScreen(screenId) {
                document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
                document.getElementById(screenId).classList.add('active');
            }

            function startGame() {
                score = 0;
                currentQuestionIndex = 0;
                gameMode = 'diagnostik';
                totalQuestions = questionPools.diagnostik.length;
                updateHUD();
                showQuestion();
                showScreen('game-screen');
            }

            function updateHUD() {
                scoreEl.textContent = score;
                questionCounter.textContent = currentQuestionIndex + 1;
                totalQuestionsEl.textContent = totalQuestions;
            }

            function showQuestion() {
                const currentPool = questionPools[gameMode];
                if (!currentPool || currentQuestionIndex >= currentPool.length) {
                    // Handle case where pool is empty or index is out of bounds
                    if (gameMode === 'diagnostik') {
                        evaluateDiagnostic();
                    } else {
                        showFinalScore();
                    }
                    return;
                }
                const questionData = currentPool[currentQuestionIndex];

                questionText.textContent = questionData.question;
                answerOptionsContainer.innerHTML = ''; // Clear previous options

                questionData.options.forEach(option => {
                    const button = document.createElement('button');
                    button.textContent = option;
                    button.className = "w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 hover:border-teal-400 transition";
                    button.onclick = () => selectAnswer(button, option, questionData.correctAnswer);
                    answerOptionsContainer.appendChild(button);
                });
                updateHUD();
            }
            
            function selectAnswer(button, selectedAnswer, correctAnswer) {
                // Disable all buttons to prevent multiple clicks
                const buttons = answerOptionsContainer.querySelectorAll('button');
                buttons.forEach(btn => btn.disabled = true);

                if (selectedAnswer === correctAnswer) {
                    score += 10;
                    button.className = "w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg border-2 border-green-500";
                } else {
                    button.className = "w-full bg-red-500 text-white font-bold py-3 px-4 rounded-lg border-2 border-red-500";
                    // Highlight the correct answer
                    buttons.forEach(btn => {
                        if (btn.textContent === correctAnswer) {
                             btn.className = "w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg border-2 border-green-500";
                        }
                    });
                }
                
                setTimeout(() => {
                    currentQuestionIndex++;
                    const currentPool = questionPools[gameMode];
                    if (currentQuestionIndex < currentPool.length) {
                        showQuestion();
                    } else {
                        if (gameMode === 'diagnostik') {
                            evaluateDiagnostic();
                        } else {
                            showFinalScore();
                        }
                    }
                }, 1500); // 1.5 second delay to see feedback
            }

            function evaluateDiagnostic() {
                let pathTitle = '';
                let pathMessage = '';
                const diagnosticCorrectAnswers = score / 10;

                if (diagnosticCorrectAnswers <= (questionPools.diagnostik.length / 3)) { // Low score
                    gameMode = 'penguatan';
                    pathTitle = 'Jalur Penguatan!';
                    pathMessage = 'Kita akan ulas lagi dasar-dasarnya. Ayo semangat!';
                } else if (diagnosticCorrectAnswers < questionPools.diagnostik.length) { // Medium score
                    gameMode = 'latihan';
                    pathTitle = 'Jalur Latihan!';
                    pathMessage = 'Kamu sudah paham dasarnya. Sekarang, ayo kita berlatih!';
                } else { // High score
                    gameMode = 'tantangan';
                    pathTitle = 'Jalur Tantangan!';
                    pathMessage = 'Wow, pemahamanmu bagus! Siap untuk soal yang lebih menantang?';
                }
                
                transitionTitle.textContent = pathTitle;
                transitionMessage.textContent = pathMessage;
                showScreen('transition-screen');
                
                setTimeout(() => {
                    currentQuestionIndex = 0;
                    totalQuestions += questionPools[gameMode].length;
                    showQuestion();
                    showScreen('game-screen');
                }, 3000);
            }

            function showFinalScore() {
                finalScoreEl.textContent = score;
                const highScore = localStorage.getItem(HIGH_SCORE_KEY) || 0;
                if (score > highScore) {
                    localStorage.setItem(HIGH_SCORE_KEY, score);
                    highScoreEl.textContent = score;
                } else {
                    highScoreEl.textContent = highScore;
                }
                showScreen('end-screen');
             }
            
            // 6. Event Listeners
            startBtn.addEventListener('click', startGame);
            restartBtn.addEventListener('click', startGame);
            
            // Initial load
            highScoreEl.textContent = localStorage.getItem(HIGH_SCORE_KEY) || 0;
        </script>
    </body>
    </html>
    \`\`\`

    **PERINTAH FINAL (SANGAT KRITIS):** Respons Anda **HARUS** dimulai dengan \`<!DOCTYPE html>\` dan diakhiri dengan \`</html>\`. Jangan sertakan teks pembuka, penutup, penjelasan, atau tanda \`\`\`html. Output Anda harus HANYA berupa kode HTML mentah yang valid.
    `;
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    
    // More robust cleanup logic to handle conversational intros.
    let rawHtml = response.text;
    const htmlStartIndex = rawHtml.indexOf('<!DOCTYPE html>');
    if (htmlStartIndex > -1) {
        rawHtml = rawHtml.substring(htmlStartIndex);
    }
    
    // Also remove trailing markdown fence if it exists.
    const cleanHtml = rawHtml.replace(/\n?```$/, '').trim();

    return cleanHtml;
}


export async function generateComprehensiveLkpdHtml(
    tp: TujuanPembelajaran,
    plan: DeepLearningLessonPlan,
    phase: string,
    students: Student[]
): Promise<{ studentHtml: string; observationHtml: string; }> {
    const ai = await getAiClient();
    const studentNames = students.map(s => s.nama);
    
    // Group evidence by aspect
    const evidenceByAspect = new Map<string, Set<string>>();
    const allKelompokAktivitas = [
        ...plan.pengalamanBelajar.inti.memahami.kelompokAktivitas,
        ...plan.pengalamanBelajar.inti.mengaplikasi.kelompokAktivitas,
        ...plan.pengalamanBelajar.inti.merefleksi.kelompokAktivitas,
    ];

    allKelompokAktivitas.forEach(kelompok => {
        (kelompok.buktiKetercapaian || []).forEach(item => {
            if (!evidenceByAspect.has(item.aspek)) {
                evidenceByAspect.set(item.aspek, new Set());
            }
            const buktiSet = evidenceByAspect.get(item.aspek)!;
            item.bukti.forEach(b => buktiSet.add(b));
        });
    });

    const LKPD_STYLING_RULES = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Baloo+2:wght@700&display=swap');
        
        /* Base styles for mobile and print setup */
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.5;
            color: #334155;
            background-color: #f0f9ff; /* A lighter blue background */
            margin: 0;
            padding: 0; /* No padding on body */
            font-size: 11pt;
            -webkit-text-size-adjust: 100%;
            overflow-wrap: break-word;
        }
        .document-container {
            max-width: 100%;
            overflow-x: hidden;
        }
        .report-page {
            background: white;
            padding: 1.25rem; /* More generous padding inside */
            margin: 1rem; /* Margin creates space from screen edge */
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            box-sizing: border-box;
        }

        /* Desktop styles: Re-create the A4 paper look */
        @media screen and (min-width: 840px) { /* Width of A4 (210mm) + some margin */
             body {
                padding: 2rem;
                background-color: #e0f2fe; /* A slightly darker blue */
             }
             .report-page {
                margin: 0 auto 2rem auto;
                padding: 1.5cm;
                width: 210mm;
                min-height: 297mm;
                border-radius: 0; /* Sharp corners for paper look */
                box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.1);
                border: 1px solid #ddd;
             }
        }
        
        /* Print-specific styles */
        @page {
            size: A4;
            margin: 1.5cm;
        }
        @media print {
            body { 
                margin: 0; 
                padding: 0; 
                background: white; 
                font-size: 10pt; 
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .report-page {
                margin: 0;
                padding: 0;
                box-shadow: none;
                page-break-after: always;
                width: 100%;
                min-height: initial;
                border: none;
                border-radius: 0;
            }
            .report-page:last-child { page-break-after: auto; }
            .creative-space-placeholder { display: none; }
            h1,h2,h3,h4,h5 { break-after: avoid; }
            table, .activity-box, .info-box { break-inside: avoid; }
        }
        
        /* General element styling */
        h1, h2, h3, h4 { 
            font-family: 'Baloo 2', cursive;
            font-weight: 700; 
            color: #0d9488;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
        }
        h1 { font-size: 24pt; text-align: center; }
        h2 { font-size: 18pt; color: #0f766e; border-bottom: 2px dashed #99f6e4; padding-bottom: 0.5rem; }
        h3 { font-size: 14pt; color: #115e59; }
        h4 { font-size: 12pt; font-weight: bold; color: #475569; }

        .header-background {
            background-color: #ccfbf1;
            padding: 1rem;
            border-radius: 12px;
            margin: 1rem 0;
        }

        .activity-box {
            background-color: #ffffff;
            border: 2px dashed #5eead4;
            border-radius: 12px;
            padding: 1.25rem;
            margin: 1.5rem 0;
        }

        .info-box { background-color: #f0f9ff; border-left: 5px solid #7dd3fc; border-radius: 0 12px 12px 0; padding: 1.25rem; margin: 1.5rem 0; }
        .differentiated-section { background-color: #fefce8; border-left: 5px solid #fde047; border-radius: 0 12px 12px 0; padding: 1.25rem; margin: 1.5rem 0; }
        .differentiated-section h4 { color: #a16207; margin-top: 0; }

        input[type="text"], textarea {
            border: 2px solid #cbd5e1;
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            font-family: 'Inter', sans-serif;
            font-size: 11pt;
            transition: all 0.2s;
            width: 100%;
            box-sizing: border-box;
        }
        input[type="text"]:focus, textarea:focus {
            outline: none;
            border-color: #14b8a6;
            box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.2);
        }
        .fill-in-the-blank {
            border: none;
            border-bottom: 2px dotted #94a3b8;
            background: transparent;
            padding: 2px;
            margin: 0 4px;
            border-radius: 0;
            text-align: center;
            width: auto;
            min-width: 80px; /* Give some minimum space */
        }
        .fill-in-the-blank:focus {
            outline: none;
            border-bottom-color: #14b8a6;
        }
        input[type="checkbox"], input[type="radio"] {
            width: 1.25rem;
            height: 1.25rem;
            border-radius: 4px;
            border: 2px solid #94a3b8;
            accent-color: #14b8a6;
            flex-shrink: 0;
        }
        label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 11pt;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
            table-layout: fixed; /* Crucial for responsiveness */
        }
        th, td { 
            border: 1px solid #99f6e4; 
            padding: 8px 10px; 
            text-align: left; 
            vertical-align: top;
            word-wrap: break-word; /* Ensure content wraps */
        }
        th { font-weight: bold; text-align: center; background-color: #ccfbf1; color: #115e59; }
        
        .creative-space {
            width: 100%;
            min-height: 200px;
            border: 3px dashed #a5f3fc;
            border-radius: 12px;
            margin-top: 1rem;
            background-color: #f0f9ff !important;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .creative-space-placeholder {
            color: #a1a1aa;
            font-style: italic;
            text-align: center;
        }
    `;

    const prompt = `
        PERAN: Anda adalah seorang desainer instruksional dan pengembang frontend ahli, yang berspesialisasi dalam membuat Lembar Kerja Peserta Didik (LKPD) yang fungsional, siap cetak, dan sangat praktis untuk guru di Fase ${phase}.

        TUGAS: Buat **dua file HTML terpisah** dalam satu output JSON: satu untuk LKPD Siswa, dan satu lagi untuk Lembar Observasi Guru, berdasarkan RPP yang diberikan.

        FILOSOFI & ATURAN STRUKTUR BARU (WAJIB DIIKUTI):
        1.  **STRUKTUR BERBASIS KELOMPOK (SANGAT PENTING):** Anda tidak akan lagi menyusun LKPD berdasarkan fase kegiatan. Sebaliknya, Anda HARUS menyusunnya berdasarkan **kelompok diferensiasi**.
        2.  **ATURAN SARAN GAMBAR (SANGAT PENTING!):**
            -   Jika sebuah aktivitas akan lebih jelas atau menarik dengan adanya gambar (misalnya diagram, ilustrasi, foto), Anda **WAJIB** menyisipkan placeholder di lokasi yang tepat dalam instruksi aktivitas.
            -   Gunakan format yang ketat: \`[Gambar: deskripsi singkat dan jelas tentang gambar tersebut]\`.
            -   Contoh Benar: \`Amati diagram berikut! [Gambar: diagram siklus air dengan label awan, hujan, dan laut]\`
            -   Contoh Benar: \`Perhatikan gambar pahlawan nasional ini. [Gambar: foto potret Pangeran Diponegoro]\`
            -   Placeholder ini akan diganti dengan uploader gambar interaktif.
        3.  **Fokus pada Siswa:** Halaman aktivitas LKPD adalah untuk siswa. Oleh karena itu, **JANGAN SERTAKAN RUBRIK PENILAIAN** di dalam halaman aktivitas.
        4.  **Lembar Observasi Terpisah dan Terpadu:** Setelah SEMUA bundel aktivitas kelompok selesai, Anda HARUS membuat **beberapa halaman observasi terpisah** untuk guru. Setiap halaman didedikasikan untuk **SATU ASPEK** yang diobservasi, dan tabelnya harus **mengonsolidasikan semua bukti kinerja universal** untuk aspek tersebut dari semua kelompok aktivitas.
        5.  **ATURAN PENOMORAN AKTIVITAS (SANGAT PENTING):**
            -   Sebuah pertanyaan/instruksi dan area jawabannya (kotak isian, area gambar, pilihan ganda) adalah **satu kesatuan**.
            -   **JANGAN** memberikan nomor terpisah untuk area jawaban, kotak isian, atau ruang kreatif. Semua itu adalah bagian dari pertanyaan/instruksi yang bernomor.
            -   **CONTOH BENAR:** \`1. Apa ibukota Indonesia? [Kotak Jawaban]\`
            -   **CONTOH SALAH:** \`1. Apa ibukota Indonesia? 2. [Kotak Jawaban]\`
        6.  **Panduan Penilaian:** Di setiap lembar observasi, sertakan panduan konversi untuk membantu guru menerjemahkan observasi menjadi nilai.
        
        ATURAN DESAIN DAN GAYA (WAJIB DIIKUTI SECARA KETAT):

        1.  **Gaya Visual Umum:**
            -   Desain LKPD HARUS **menyenangkan, ceria, dan tidak formal**, terutama untuk Fase A-C. Gunakan gaya visual seperti buku kerja anak-anak yang modern.
            -   Gunakan **banyak ruang putih (whitespace)** agar tidak terlihat padat.
            -   Sertakan **emoji yang relevan** di samping judul atau instruksi untuk membuatnya lebih menarik (misal: 📝, 🤔, ✨, 🚀).
            -   SANGAT PENTING: Untuk area di mana siswa harus menulis, menggambar, atau mengisi (di dalam \`.activity-box\`), **pastikan latar belakangnya selalu putih (\`background-color: #ffffff;\`)** untuk menghemat tinta dan menjaga kejelasan. Gunakan warna latar belakang HANYA untuk kotak instruksi atau header, seperti kelas \`.header-background\`.
            -   **Aturan Konten:** Konten yang dihasilkan HARUS berupa HTML murni. **JANGAN PERNAH** menggunakan sintaks Markdown seperti \`**\` untuk tebal. Gunakan tag HTML \`<strong>\` atau \`<b>\`.
        
        2.  **ATURAN KRITIS #1: TUGAS KREATIF & MENGGAMBAR (SANGAT PENTING!)**
            -   **JIKA** sebuah instruksi meminta siswa untuk menggambar, membuat diagram (seperti diagram batang, garis), membuat peta konsep, atau karya visual lainnya, Anda **DILARANG KERAS** untuk membuatkan kerangka, templat, sumbu X/Y, atau contoh gambar. Anda juga dilarang membuat tabel kosong jika tugasnya adalah membuat diagram.
            -   **SEBALIKNYA**, Anda **WAJIB** menyediakan sebuah kotak kosong yang luas bagi siswa untuk berkreasi.
            -   Gunakan **HANYA** cuplikan HTML berikut untuk area tersebut, jangan gunakan elemen lain:
                \`\`\`html
                <div class="creative-space">
                    <p class="creative-space-placeholder">Gunakan area ini untuk tugas kreatifmu!</p>
                </div>
                \`\`\`
            -   Instruksi untuk tugas tersebut harus ditempatkan **DI LUAR** dan **SEBELUM** div \`.creative-space\` ini.

        3.  **Implementasi Desain untuk Fase A, B, C (SD):**
            -   LKPD HARUS **sangat visual, interaktif, dan seperti permainan**.
            -   Untuk aktivitas isian singkat, JANGAN gunakan \`<input type="text">\` biasa. Gunakan format ini: \`<input type="text" class="fill-in-the-blank" size="10">\`. Ini akan membuat tampilan seperti mengisi titik-titik di buku kerja.
            -   Gunakan elemen formulir HTML untuk aktivitas yang bisa dikerjakan langsung:
                -   **Menjodohkan:** Gunakan tabel dengan dua kolom. Kolom pertama berisi pertanyaan, kolom kedua berisi \`<input type="text" class="fill-in-the-blank" size="5">\` untuk diisi huruf jawaban.
                -   **Pilihan Ganda:** Gunakan \`<label class="flex items-center gap-2 p-2 rounded-lg hover:bg-teal-50"><input type="radio" name="soal1"> ... </label>\`.
                -   **Urutan:** Beri nomor pada kotak isian atau gunakan elemen visual.
            -   **Bahasa:** Gunakan bahasa yang sederhana, sapaan yang ramah ("Ayo kerjakan!", "Hebat!", "Coba perhatikan gambar ini!"), dan instruksi langkah-demi-langkah yang sangat jelas.

        4.  **Implementasi Desain untuk Fase D, E, F (SMP/SMA):**
            -   LKPD bisa lebih analitis dan berbasis teks, namun tetap pertahankan estetika yang bersih dan modern dari CSS di atas.
            -   Gunakan area teks yang lebih besar (\`<textarea class="w-full">\`) untuk jawaban esai.
            -   Gunakan tabel untuk analisis data.
            -   Pertanyaan harus mendorong pemikiran mendalam, namun instruksinya tetap harus jelas.

        KONTEKS PEMBELAJARAN:
        -   **Tujuan Pembelajaran (TP):** "${tp.deskripsi}"
        -   **Daftar Siswa di Kelas:** ${studentNames.join(', ') || 'Tidak ada data siswa'}
        -   **Rencana Pelaksanaan Pembelajaran (RPP) LENGKAP:**
            \`\`\`json
            ${JSON.stringify(plan, null, 2)}
            \`\`\`

        PERSYARATAN TEKNIS & STRUKTUR (WAJIB DIIKUTI):

        1.  **ATURAN STRUKTUR HALAMAN CETAK:**
            -   Gunakan elemen \`<div class="report-page">\` untuk membungkus setiap bagian yang harus berada di halaman terpisah.
            -   **LKPD SISWA:**
                -   **Halaman 1 (Sampul & Petunjuk):** Gunakan SATU \`<div class="report-page">\`. Bagian ini **WAJIB** dibuat ringkas agar muat dalam satu halaman A4. Isi dengan: Header Utama (Judul LKPD), Kotak Informasi Siswa (Nama, Kelas, Tanggal), dan Kartu Tujuan/Petunjuk Pengerjaan Umum.
                -   **Halaman Aktivitas per Kelompok (Mulai Halaman 2):**
                    a.  Identifikasi semua nama kelompok yang unik dari RPP (misal: 'Kelompok Penguatan Konsep', 'Kelompok Mandiri').
                    b.  Untuk **SETIAP NAMA KELOMPOK**, buatlah satu bundel aktivitas. Mulai setiap bundel dengan \`<div class="report-page">\`.
                    c.  Di dalam bundel tersebut, berikan judul yang sangat jelas (misal: \`<h2>Lembar Kerja untuk Kelompok Penguatan Konsep</h2>\`).
                    d.  Kemudian, secara **BERURUTAN**, render semua aktivitas untuk kelompok tersebut dari fase 'Memahami', 'Mengaplikasi', dan 'Merefleksi'. Gunakan \`.activity-box\` untuk setiap tugas.
            -   **LEMBAR OBSERVASI GURU:**
                -   **Halaman Observasi (Halaman Terakhir):** Setelah semua bundel aktivitas kelompok selesai, buat \`<div class="report-page">\` BARU untuk SETIAP aspek yang akan diobservasi.

        2.  **Struktur & Format Output (SANGAT PENTING):**
            -   Output HARUS berupa objek JSON tunggal yang valid, sesuai dengan skema yang diberikan, dengan dua properti: \`lkpdSiswaHtml\` dan \`lembarObservasiHtml\`.
            -   **Untuk \`lkpdSiswaHtml\`:**
                -   Hasilkan string HTML lengkap yang berisi HANYA halaman sampul dan semua halaman aktivitas untuk siswa.
                -   WAJIB gunakan semua aturan styling berikut di dalam tag \`<style>\`. Ini adalah bagian yang harus responsif di perangkat mobile.
                \`\`\`css
                ${LKPD_STYLING_RULES}
                \`\`\`
            -   **Untuk \`lembarObservasiHtml\`:**
                -   Hasilkan string HTML lengkap yang berisi HANYA halaman lembar observasi untuk guru.
                -   WAJIB gunakan semua aturan styling berikut di dalam tag \`<style>\`. Ini adalah bagian yang dioptimalkan untuk cetak A4.
                \`\`\`css
                ${HTML_DOCUMENT_STYLING_RULES}
                \`\`\`
            -   **JANGAN PERNAH** membungkus output JSON Anda dalam markdown backticks.

        3.  **RENDER KONTEN RINCI:**
            -   **Halaman Lembar Observasi Guru (Buat SATU HALAMAN PER ASPEK):**
                -   Untuk setiap aspek yang diobservasi dari RPP, buat \`<div class="report-page">\` baru.
                -   Beri judul yang jelas, misal: \`<h2>Lembar Observasi: [Nama Aspek]</h2>\`.
                -   Buat sebuah \`<table>\`. Header tabel (thead) harus berisi kolom: "No.", "Nama Siswa", diikuti oleh kolom untuk **setiap bukti ketercapaian yang unik yang telah dikonsolidasikan untuk aspek ini dari semua kelompok aktivitas**, dan kolom terakhir "Catatan".
                -   Isi body tabel (tbody) dengan baris untuk **setiap siswa** dari daftar berikut: ${studentNames.join(', ')}. Sel di bawah setiap kolom bukti kinerja harus **kosong** (bisa dengan checkbox) agar guru dapat memberikan tanda.
                -   **PANDUAN PENILAIAN (WAJIB):** Di bawah setiap tabel observasi, tambahkan sebuah \`div\` dengan kelas \`info-box\` yang berisi "Panduan Konversi Penilaian". Di dalamnya, buat daftar yang menjelaskan cara menerjemahkan hasil checklist menjadi nilai akhir, seperti ini:
                    - **Mahir (4):** Jika siswa secara konsisten menunjukkan semua atau hampir semua bukti ketercapaian.
                    - **Cakap (3):** Jika siswa menunjukkan sebagian besar bukti ketercapaian, menandakan pemahaman tuntas.
                    - **Layak (2):** Jika siswa menunjukkan beberapa bukti ketercapaian, namun belum konsisten.
                    - **Baru Berkembang (1):** Jika siswa menunjukkan sangat sedikit atau tidak ada bukti ketercapaian.
    `;

    const lkpdSchema = {
        type: Type.OBJECT,
        properties: {
            lkpdSiswaHtml: { type: Type.STRING, description: "String HTML lengkap untuk LKPD Siswa (halaman sampul dan aktivitas)." },
            lembarObservasiHtml: { type: Type.STRING, description: "String HTML lengkap untuk Lembar Observasi Guru." }
        },
        required: ["lkpdSiswaHtml", "lembarObservasiHtml"]
    };

    const result = await parseJsonResponse<{ lkpdSiswaHtml: string; lembarObservasiHtml: string; }>(ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: lkpdSchema }
    }));

    return { studentHtml: result.lkpdSiswaHtml, observationHtml: result.lembarObservasiHtml };
}

export async function generateImageFromPrompt(description: string): Promise<string> {
    const ai = await getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: description }],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data; // Return the base64 string
      }
    }
    throw new Error("AI tidak menghasilkan gambar.");
}

export async function generateImagePrompt(description: string): Promise<string> {
    const ai = await getAiClient();
    const prompt = `
        You are an expert prompt engineer for advanced text-to-image AI models like Midjourney, DALL-E 3, and Stable Diffusion.
        Your task is to take a simple, user-provided description and expand it into a detailed, high-quality, and effective prompt.

        **User's simple description:** "${description}"

        **Instructions:**
        1.  **Analyze Intent:** Understand the core subject and context of the user's request. Is it for a diagram, a realistic photo, an illustration, a cartoon?
        2.  **Enhance Detail:** Add specific details about the subject, setting, composition, lighting, and style.
        3.  **Add Style Keywords:** Include keywords that define the artistic style (e.g., 'digital illustration', 'photorealistic', 'cartoon style for kids', 'flat icon style', 'watercolor').
        4.  **Technical Parameters (optional but good):** Suggest parameters if applicable, like aspect ratio or specific model features (e.g., '--ar 16:9').
        5.  **Structure:** Keep the output as a single, copyable block of text. Do not add explanations outside of the prompt itself unless they are part of the prompt's structure (like comments).

        **Example:**
        - User's description: "a cat"
        - Your output: "Photorealistic close-up portrait of a fluffy ginger tabby cat with vibrant green eyes, sitting in a sunlit garden. Soft, warm morning light, shallow depth of field, detailed fur texture. Shot on a DSLR camera, 50mm lens, f/1.8. --ar 3:2"

        Now, generate the detailed prompt for the user's description.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text;
}
