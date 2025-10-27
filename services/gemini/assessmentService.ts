import { getAiClient, DPL_CONTEXT_BLOCK, parseJsonResponse, Type, HTML_DOCUMENT_STYLING_RULES } from './common';
import type { TujuanPembelajaran, Kktp, SummativeAnalysisResult, UnitPembelajaran, SummativeUnitAnalysisResult, Assessment, Student, LearningPlan } from '../../types';


const kktpSchema = {
    type: Type.OBJECT,
    description: "KKTP dalam format Rubrik Analitik yang detail.",
    properties: {
      tpTerkait: { type: Type.STRING, description: "Deskripsi lengkap dari Tujuan Pembelajaran yang diukur." },
      elemenCp: { type: Type.STRING, description: "Elemen CP yang relevan, misal: 'Pemahaman Biologi'."},
      asesmenUntuk: { type: Type.STRING, description: "Jenis asesmen yang sesuai, misal: 'Sumatif Akhir Unit'."},
      batasKetercapaian: { type: Type.STRING, description: "Deskripsi singkat dan jelas mengenai batas minimal ketercapaian TP berdasarkan rubrik. Contoh: 'Peserta didik dianggap tuntas jika semua aspek mencapai minimal level 'Cakap' (3).'" },
      rubrik: {
        type: Type.ARRAY,
        description: "Array yang merepresentasikan baris-baris rubrik, di mana setiap item adalah satu aspek yang dinilai.",
        items: {
          type: Type.OBJECT,
          properties: {
            aspek: { type: Type.STRING, description: "Nama aspek yang dinilai (indikator kunci), diturunkan dari Kompetensi dan Lingkup Materi TP. Contoh: 'Kemampuan Membaca Bilangan'." },
            sifatAspek: { type: Type.STRING, description: "Sifat ketergantungan aspek: 'PRASYARAT_KRITIS' jika menjadi fondasi untuk aspek lain, atau 'LEPAS' jika independen." },
            dplTerkait: {
                type: Type.ARRAY,
                description: "Daftar 1-2 Dimensi Profil Lulusan (DPL) yang paling relevan dengan aspek ini. Contoh: ['Penalaran Kritis', 'Komunikasi']",
                items: { type: Type.STRING }
            },
            teknikAsesmen: { type: Type.STRING, description: "Rekomendasi teknik asesmen yang paling sesuai untuk aspek ini. Contoh: 'Tes Tertulis', 'Kinerja', 'Observasi'." },
            instrumenAsesmen: { type: Type.STRING, description: "Rekomendasi instrumen spesifik untuk teknik asesmen yang dipilih. Contoh: 'Soal Uraian', 'Rubrik Kinerja', 'Lembar Observasi'." },
            kriteria: {
              type: Type.ARRAY,
              description: "Array berisi 4 deskripsi kriteria untuk aspek ini, satu untuk setiap level ketercapaian (4, 3, 2, 1).",
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.NUMBER, description: "Level ketercapaian (4, 3, 2, atau 1)." },
                  deskripsi: { type: Type.STRING, description: "Deskripsi kualitatif yang detail dan progresif untuk level dan aspek ini." }
                },
                required: ["level", "deskripsi"]
              }
            }
          },
          required: ["aspek", "sifatAspek", "dplTerkait", "teknikAsesmen", "instrumenAsesmen", "kriteria"]
        }
      }
    },
    required: ["tpTerkait", "elemenCp", "asesmenUntuk", "batasKetercapaian", "rubrik"]
};

const summativeAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        tingkatKetuntasanKelas: {
            type: Type.NUMBER,
            description: "Angka persentase (0-100) yang merepresentasikan jumlah siswa yang 'Tuntas' dibagi total siswa."
        },
        rekomendasiUtama: {
            type: Type.STRING,
            description: "Rekomendasi utama berdasarkan tingkat ketuntasan. Harus bernilai 'LANJUT' jika tingkatKetuntasanKelas >= 70, atau 'PENGUATAN' jika < 70."
        },
        narasiRekomendasi: {
            type: Type.STRING,
            description: "Narasi 2-3 kalimat yang menjelaskan rekomendasi. Jika 'PENGUATAN', sebutkan aspek mana yang paling banyak gagal. Jika 'LANJUT', berikan semangat dan sebutkan TP berikutnya yang relevan."
        },
        siswaPerluPerhatian: {
            type: Type.ARRAY,
            description: "Daftar nama siswa yang statusnya 'BELUM_TUNTAS'. Kosongkan jika semua tuntas.",
            items: { type: Type.STRING }
        }
    },
    required: ["tingkatKetuntasanKelas", "rekomendasiUtama", "narasiRekomendasi", "siswaPerluPerhatian"]
};

const summativeUnitAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        timestamp: { type: Type.NUMBER },
        tingkatKetuntasanUnit: { type: Type.NUMBER, description: "Persentase (0-100) siswa yang tuntas seluruh TP di unit ini." },
        rekomendasiUtama: { type: Type.STRING, description: "Rekomendasi: 'LANJUT_KE_UNIT_BERIKUTNYA' atau 'PENGUATAN_UNIT_INI'." },
        narasiRekomendasi: { type: Type.STRING, description: "Narasi 2-3 kalimat yang merangkum kondisi kelas dan alasan rekomendasi." },
        siswaButuhPenguatan: {
            type: Type.ARRAY,
            description: "Daftar spesifik siswa yang belum tuntas dan pada TP/aspek mana mereka paling kesulitan.",
            items: {
                type: Type.OBJECT,
                properties: {
                    nama: { type: Type.STRING },
                    tpId: { type: Type.STRING },
                    aspek: { type: Type.STRING, description: "Aspek paling krusial yang gagal." }
                },
                required: ["nama", "tpId", "aspek"]
            }
        },
        tpPalingMenantang: {
            type: Type.ARRAY,
            description: "Daftar 1-3 TP yang paling banyak siswa gagal, diurutkan dari yang paling sulit.",
            items: {
                type: Type.OBJECT,
                properties: {
                    tpId: { type: Type.STRING },
                    deskripsi: { type: Type.STRING },
                    persenGagal: { type: Type.NUMBER, description: "Persentase siswa yang gagal pada TP ini." }
                },
                required: ["tpId", "deskripsi", "persenGagal"]
            }
        }
    },
    required: ["timestamp", "tingkatKetuntasanUnit", "rekomendasiUtama", "narasiRekomendasi", "siswaButuhPenguatan", "tpPalingMenantang"]
};

const summativeSemesterAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        tingkatKetuntasanSemester: { type: Type.NUMBER, description: "Persentase (0-100) siswa yang tuntas seluruh TP di semester ini." },
        narasiRekomendasi: { type: Type.STRING, description: "Narasi 2-3 kalimat yang merangkum kondisi kelas, memberikan rekomendasi umum, dan menyoroti temuan kunci." },
        siswaPerluPerhatian: {
            type: Type.ARRAY,
            description: "Daftar siswa yang belum tuntas di semester ini, diurutkan dari yang paling banyak jumlah TP belum tuntas.",
            items: {
                type: Type.OBJECT,
                properties: {
                    nama: { type: Type.STRING },
                    jumlahTpBelumTuntas: { type: Type.NUMBER }
                },
                required: ["nama", "jumlahTpBelumTuntas"]
            }
        },
        tpPalingMenantang: {
            type: Type.ARRAY,
            description: "Daftar 1-3 TP yang paling banyak siswa gagal, diurutkan dari yang paling sulit.",
            items: {
                type: Type.OBJECT,
                properties: {
                    tpId: { type: Type.STRING },
                    deskripsi: { type: Type.STRING },
                    persenGagal: { type: Type.NUMBER, description: "Persentase siswa yang gagal pada TP ini." }
                },
                required: ["tpId", "deskripsi", "persenGagal"]
            }
        }
    },
    required: ["tingkatKetuntasanSemester", "narasiRekomendasi", "siswaPerluPerhatian", "tpPalingMenantang"]
};

const studentSemesterReportNarrativeSchema = {
    type: Type.OBJECT,
    properties: {
        holisticSummary: { type: Type.STRING, description: "Ringkasan 2-3 kalimat tentang performa umum siswa di semester ini di semua mata pelajaran, ditulis dengan bahasa yang positif, membangun, dan mudah dipahami orang tua." },
        strengths: { type: Type.ARRAY, description: "Daftar 2-3 poin kekuatan utama siswa berdasarkan mata pelajaran dengan skor tertinggi atau pola positif yang terlihat. Sebutkan nama mata pelajarannya.", items: { type: Type.STRING } },
        areasForImprovement: { type: Type.ARRAY, description: "Daftar 1-2 area spesifik yang perlu ditingkatkan berdasarkan mata pelajaran dengan skor terendah. Sebutkan nama mata pelajarannya dan berikan saran praktis yang bisa dilakukan di rumah.", items: { type: Type.STRING } }
    },
    required: ["holisticSummary", "strengths", "areasForImprovement"]
};

export async function generateKktpForTp(tp: TujuanPembelajaran, cp: string, semuaTps: TujuanPembelajaran[], phase: string, kelas: string): Promise<Kktp> {
    const ai = await getAiClient();
    const prompt = `
      PERAN: Anda adalah seorang Ahli Perancangan Asesmen dalam Kurikulum Merdeka yang sangat teliti dan memahami prinsip pedagogis.

      TUGAS: Buat Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) dalam bentuk Rubrik Analitik yang detail, valid, dan berkualitas tinggi, berdasarkan Tujuan Pembelajaran (TP) yang diberikan.

      KONTEKS UTAMA (WAJIB DIGUNAKAN):
      1. CAPAIAN PEMBELAJARAN (CP) INDUK: ${cp}
      2. TUJUAN PEMBELAJARAN (TP) SPESIFIK: "${tp.deskripsi}"
      3. KONTEKS SISWA: Fase ${phase} / ${kelas}
      ${DPL_CONTEXT_BLOCK}

      PROSES PERANCANGAN RUBRIK (WAJIB DIIKUTI DALAM 5 LANGKAH):

      LANGKAH 1: ANALISIS & DEKONSTRUKSI TP
      - Pertama, pecah TP di atas menjadi dua komponen utama:
        1. Kompetensi: Kata kerja yang menunjukkan kemampuan yang harus didemonstrasikan siswa (Contoh: menggunakan, menganalisis, menciptakan).
        2. Lingkup Materi: Konten/topik yang harus dikuasai siswa (Contoh: kosakata kiasan, kalimat langsung & tidak langsung).

      LANGKAH 2: DEFINISIKAN ASPEK PENILAIAN
      - Berdasarkan analisis di Langkah 1, turunkan 3-4 'aspek' penilaian yang paling kritis dan terukur. Aspek ini akan menjadi baris dalam rubrik. Pastikan aspek-aspek ini mencakup kompetensi dan semua lingkup materi dari TP.
      - Untuk setiap 'aspek', tentukan 'sifatAspek'-nya:
        - 'PRASYARAT_KRITIS': Jika penguasaan aspek ini adalah fondasi mutlak untuk aspek lainnya.
        - 'LEPAS': Jika aspek ini bisa dinilai secara independen.
      - Untuk setiap 'aspek', tautkan 1-2 DPL ('dplTerkait') yang paling relevan.
      - Untuk setiap 'aspek', sarankan 'teknikAsesmen' dan 'instrumenAsesmen' yang paling cocok.

      LANGKAH 3: KEMBANGKAN DESKRIPSI KINERJA (INTI RUBRIK)
      - Gunakan empat (4) level ketercapaian berikut untuk kolom rubrik:
        - Level 1: Baru Berkembang (Butuh bimbingan intensif)
        - Level 2: Layak (Penguasaan dasar, ada beberapa kesalahan)
        - Level 3: Cakap (Tuntas, mampu secara mandiri)
        - Level 4: Mahir (Melebihi ekspektasi, menunjukkan penguasaan mendalam)
      - Untuk setiap 'aspek' di setiap level, tuliskan deskripsi kualitatif ('deskripsi') yang detail dan progresif. Deskripsi HARUS:
        a. Menunjukkan Peningkatan Jelas: Perbedaan antar level harus terlihat pada kompleksitas, akurasi, dan kemandirian.
        b. Sesuai Fase: Gunakan bahasa dan ekspektasi yang sesuai untuk siswa Fase ${phase}.
        c. Terukur & Dapat Diobservasi: Gunakan kata kerja aksi yang menunjukkan bukti kinerja.
        d. Level 'Mahir': Deskripsi di Level 4 harus menunjukkan kemampuan melebihi target (misal: menerapkan dalam konteks baru, menganalisis, memberikan justifikasi).

      LANGKAH 4: TETAPKAN BATAS KETERCAPAIAN
      - Rumuskan kalimat untuk 'batasKetercapaian' yang menyatakan bahwa peserta didik dianggap tuntas jika mencapai minimal level 'Cakap' (Level 3) pada SEMUA aspek penilaian.

      LANGKAH 5: FINALISASI OUTPUT JSON
      - Susun semua hasil di atas ke dalam format JSON tunggal yang valid sesuai skema yang diberikan.
    `;

    return parseJsonResponse<Kktp>(ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: kktpSchema },
    }));
}

export async function generateSessionNotes(
    studentList: { id: number; nama: string }[],
    tp: TujuanPembelajaran,
    pertemuan: number,
    assessmentsThisSession: Assessment[],
    assessmentsLastSession: Assessment[]
): Promise<{ studentId: number; catatanUmum: string; observasiDpl?: { dpl: string; catatan: string }[] }[]> {
    const ai = await getAiClient();
    const sessionNotesSchema = {
        type: Type.ARRAY,
        description: "Daftar catatan dan observasi DPL untuk setiap siswa.",
        items: {
            type: Type.OBJECT,
            properties: {
                studentId: { type: Type.NUMBER },
                catatanUmum: { type: Type.STRING, description: "Catatan umum 1-2 kalimat tentang progres atau kesulitan siswa di pertemuan ini, membandingkan dengan pertemuan sebelumnya jika ada data." },
                observasiDpl: {
                    type: Type.ARRAY,
                    description: "Observasi DPL yang paling menonjol. HANYA JIKA ADA BUKTI KUAT. Kosongkan jika tidak ada.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            dpl: { type: Type.STRING },
                            catatan: { type: Type.STRING, description: "Catatan singkat 1 kalimat yang menjadi bukti observasi DPL." }
                        },
                        required: ["dpl", "catatan"]
                    }
                }
            },
            required: ["studentId", "catatanUmum"]
        }
    };
    
    const prompt = `
        Anda adalah seorang asisten guru AI yang sangat peka dan ahli dalam membuat catatan perkembangan siswa yang ringkas namun bermakna.
        
        ${DPL_CONTEXT_BLOCK}

        **Konteks & Data Input:**
        - **Tujuan Pembelajaran (TP):** ${tp.id} - "${tp.deskripsi}"
        - **KKTP untuk TP ini:** ${JSON.stringify(tp.kktp, null, 2)}
        - **Pertemuan Saat Ini:** ke-${pertemuan}
        - **Daftar Siswa di Kelas:**
          ${studentList.map(s => `- ID: ${s.id}, Nama: ${s.nama}`).join('\n')}
        - **Data Penilaian Pertemuan INI (ke-${pertemuan}):**
          ${JSON.stringify(assessmentsThisSession, null, 2)}
        - **Data Penilaian Pertemuan SEBELUMNYA (ke-${pertemuan - 1}) (jika ada):**
          ${assessmentsLastSession.length > 0 ? JSON.stringify(assessmentsLastSession, null, 2) : "Tidak ada data pertemuan sebelumnya."}

        **Tugas Anda:**
        Untuk SETIAP siswa dalam daftar, analisis data penilaian yang diberikan dan buat dua jenis catatan:

        1.  **Catatan Umum (\`catatanUmum\`):**
            - Buat 1-2 kalimat ringkas yang merangkum performa siswa di pertemuan ini.
            - **WAJIB:** Bandingkan dengan pertemuan sebelumnya (jika ada data). Apakah ada progres, stagnasi, atau kemunduran pada aspek tertentu? Sebutkan aspeknya.
            - Jika siswa mencapai 'Mahir' pada suatu aspek, berikan pujian. Jika masih 'Baru Berkembang', sebutkan aspek yang perlu perhatian.

        2.  **Observasi DPL (\`observasiDpl\`):**
            - Analisis data penilaian dan KKTP untuk mencari BUKTI KONKRET yang menunjukkan salah satu dari 8 DPL.
            - **SANGAT PENTING:** JANGAN memaksakan observasi DPL. Hanya tambahkan jika ada bukti yang kuat dan relevan dari data. Jika tidak ada, biarkan array \`observasiDpl\` kosong.
            - Buat catatan singkat (1 kalimat) yang menjadi bukti observasi.
            - Contoh: Jika seorang siswa yang sebelumnya kesulitan mampu menjelaskan konsepnya (aspek 'Pemahaman Konsep'), ini bisa jadi bukti 'Penalaran Kritis' atau 'Komunikasi'. Catatannya: "Mampu menjelaskan kembali konsep X dengan bahasanya sendiri."

        **Output:** Hasilkan output dalam format JSON array yang valid sesuai skema. Pastikan setiap siswa dalam daftar memiliki entrinya sendiri.
    `;

    return parseJsonResponse<any[]>(ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: sessionNotesSchema,
        },
    }));
}

export async function generateSummativeAnalysis(
  studentCompletionStatus: { nama: string; status: string }[],
  currentTp: TujuanPembelajaran,
  nextTp: TujuanPembelajaran | null
): Promise<SummativeAnalysisResult> {
    const ai = await getAiClient();
    const prompt = `
        Anda adalah seorang konsultan pedagogis AI yang ahli dalam menafsirkan data sumatif kelas untuk memberikan rekomendasi pembelajaran selanjutnya yang actionable.

        **Konteks & Data Input:**
        - **TP yang Baru Saja Diselesaikan:** ${currentTp.id}: "${currentTp.deskripsi}"
        - **TP Berikutnya dalam Alur (jika ada):** ${nextTp ? `${nextTp.id}: "${nextTp.deskripsi}"` : "Ini adalah TP terakhir dalam alur."}
        - **Data Ketuntasan Siswa untuk TP Saat Ini:**
          ${JSON.stringify(studentCompletionStatus, null, 2)}
        - **Kriteria Ketuntasan Kelas:** Sebuah kelas dianggap siap melanjutkan ke materi berikutnya jika minimal 70% siswanya mencapai status 'TUNTAS'.

        **Tugas Anda (Ikuti dengan Ketat):**

        1.  **Hitung Tingkat Ketuntasan Kelas:** Hitung persentase siswa dengan status 'TUNTAS' dari total siswa. Bulatkan ke bilangan bulat terdekat.
        2.  **Tentukan Rekomendasi Utama:**
            - Jika persentase tuntas >= 70, set \`rekomendasiUtama\` menjadi \`'LANJUT'\`.
            - Jika persentase tuntas < 70, set \`rekomendasiUtama\` menjadi \`'PENGUATAN'\`.
        3.  **Buat Narasi Rekomendasi:**
            - **Jika 'LANJUT':** Buat narasi positif yang menyatakan kelas secara umum telah menguasai materi dan siap untuk tantangan berikutnya di ${nextTp ? nextTp.id : 'materi pengayaan'}.
            - **Jika 'PENGUATAN':** Buat narasi yang konstruktif, menyatakan bahwa sebagian besar siswa masih memerlukan penguatan pada TP "${currentTp.id}" sebelum melanjutkan. Identifikasi juga **aspek kunci** dari TP (berdasarkan deskripsinya) yang kemungkinan besar menjadi kendala. Contoh: "Disarankan untuk melakukan sesi penguatan singkat, fokus pada [sebutkan 1-2 kemungkinan aspek dari deskripsi TP], sebelum melanjutkan ke materi berikutnya."
        4.  **Identifikasi Siswa Perlu Perhatian:** Kumpulkan semua nama siswa dengan status 'BELUM_TUNTAS' ke dalam array \`siswaPerluPerhatian\`.

        **Output:** Hasilkan output dalam format JSON yang valid sesuai skema yang diberikan.
    `;

    return parseJsonResponse<SummativeAnalysisResult>(ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: summativeAnalysisSchema,
        },
    }));
}

export async function generateSummativeUnitAnalysis(
  unit: UnitPembelajaran,
  tpsInUnit: TujuanPembelajaran[],
  studentsWithStatus: Array<{ nama: string, statusUnit: 'TUNTAS' | 'BELUM_TUNTAS', rincianSkor: Array<{ tpId: string, aspek: string, skor: number | null }> }>
): Promise<SummativeUnitAnalysisResult> {
    const ai = await getAiClient();
    const prompt = `
        Anda adalah seorang analis data pendidikan AI. Tugas Anda adalah menganalisis data asesmen sumatif untuk satu Unit Pembelajaran dan memberikan rekomendasi yang actionable.

        **Konteks & Data Input:**
        - **Unit Pembelajaran yang Dianalisis:** ${unit.id} - ${unit.nama}
        - **Tujuan Pembelajaran (TP) dalam Unit Ini:**
          ${tpsInUnit.map(tp => `- ${tp.id}: ${tp.deskripsi}`).join('\n')}
        - **Data Ketuntasan Siswa untuk Unit Ini (Skor < 70 dianggap 'BELUM TUNTAS'):**
          ${JSON.stringify(studentsWithStatus, null, 2)}
        - **Kriteria Kesiapan Kelas:** Kelas dianggap siap lanjut ke unit berikutnya jika minimal 70% siswa mencapai status 'TUNTAS' pada unit ini.

        **Tugas Anda (Ikuti dengan Ketat):**

        1.  **Timestamp:** Masukkan timestamp saat ini.
        2.  **Hitung Tingkat Ketuntasan Unit (\`tingkatKetuntasanUnit\`):** Hitung persentase siswa dengan status 'TUNTAS' dari total siswa.
        3.  **Tentukan Rekomendasi Utama (\`rekomendasiUtama\`):**
            - Jika persentase tuntas >= 70, set menjadi \`'LANJUT_KE_UNIT_BERIKUTNYA'\`.
            - Jika persentase tuntas < 70, set menjadi \`'PENGUATAN_UNIT_INI'\`.
        4.  **Buat Narasi Rekomendasi (\`narasiRekomendasi\`):**
            - Jika 'LANJUT', buat narasi positif.
            - Jika 'PENGUATAN', jelaskan bahwa kelas butuh penguatan dan sebutkan TP atau konsep umum yang menjadi kendala.
        5.  **Identifikasi Siswa Butuh Penguatan (\`siswaButuhPenguatan\`):** Untuk setiap siswa dengan status 'BELUM_TUNTAS', identifikasi satu TP dan aspek dengan skor terendah sebagai titik fokus intervensi.
        6.  **Identifikasi TP Paling Menantang (\`tpPalingMenantang\`):** Hitung untuk setiap TP, berapa persen siswa yang gagal (memiliki setidaknya satu skor < 70 pada TP tsb). Urutkan 1-3 TP yang paling sulit bagi kelas.

        **Output:** Hasilkan output JSON yang valid sesuai skema.
    `;

    return parseJsonResponse<SummativeUnitAnalysisResult>(ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: summativeUnitAnalysisSchema,
        },
    }));
}

export async function generateSummativeSemesterAnalysis(
  semester: string,
  tpsInSemester: TujuanPembelajaran[],
  studentData: { nama: string; isTuntasSemester: boolean; jumlahTpBelumTuntas: number; rincianTp: { tpId: string; isTuntas: boolean }[] }[]
): Promise<any> {
    const ai = await getAiClient();
    const prompt = `
        Anda adalah seorang analis data pendidikan AI. Tugas Anda adalah menganalisis data asesmen sumatif untuk satu semester penuh dan memberikan laporan komprehensif.

        **Konteks & Data Input:**
        - **Laporan untuk:** ${semester}
        - **Tujuan Pembelajaran (TP) dalam Semester Ini:**
          ${tpsInSemester.map(tp => `- ${tp.id}: ${tp.deskripsi}`).join('\n')}
        - **Data Ketuntasan Siswa:**
          ${JSON.stringify(studentData, null, 2)}
        - **Kriteria Ketuntasan Semester:** Seorang siswa dianggap tuntas semester jika \`isTuntasSemester\` bernilai \`true\`. Kelas dianggap siap jika tingkat ketuntasan semester >= 70%.

        **Tugas Anda (Ikuti dengan Ketat):**

        1.  **Hitung Tingkat Ketuntasan Semester (\`tingkatKetuntasanSemester\`):** Hitung persentase siswa dengan \`isTuntasSemester: true\`.
        2.  **Buat Narasi Rekomendasi (\`narasiRekomendasi\`):** Buat narasi 2-3 kalimat yang merangkum performa kelas. Jika di bawah 70%, sarankan area fokus untuk semester berikutnya. Jika di atas 70%, berikan apresiasi dan saran pengayaan.
        3.  **Identifikasi Siswa Perlu Perhatian (\`siswaPerluPerhatian\`):** Kumpulkan semua siswa dengan \`isTuntasSemester: false\`. Urutkan dari yang paling banyak jumlah TP belum tuntas.
        4.  **Identifikasi TP Paling Menantang (\`tpPalingMenantang\`):** Untuk setiap TP, hitung berapa persen siswa yang gagal (berdasarkan \`rincianTp[].isTuntas: false\`). Urutkan 1-3 TP yang paling sulit bagi kelas.

        **Output:** Hasilkan output JSON yang valid sesuai skema.
    `;

    return parseJsonResponse<any>(ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: summativeSemesterAnalysisSchema,
        },
    }));
}

export async function generateSingleStudentMultiSubjectReportNarrative(
    studentName: string,
    subjectScores: { subject: string, averageScore: number }[]
): Promise<{ holisticSummary: string; strengths: string[]; areasForImprovement: string[] }> {
    const ai = await getAiClient();
    const prompt = `
        Anda adalah seorang guru wali kelas yang bijaksana dan berpengalaman, sedang menulis catatan naratif untuk rapor akhir semester.
        **Tugas:** Tulis narasi rapor yang holistik, personal, konstruktif, dan mudah dipahami oleh orang tua untuk siswa berikut.

        **Konteks & Data:**
        - Nama Siswa: ${studentName}
        - Data Nilai Akhir (Rata-rata Sumatif) per Mata Pelajaran:
          \`\`\`json
          ${JSON.stringify(subjectScores, null, 2)}
          \`\`\`

        **Instruksi Penulisan (WAJIB DIIKUTI):**
        1.  **Analisis Holistik & Sintesis:** Lihat semua nilai siswa. Jangan hanya melaporkan per mata pelajaran. Cari pola. Apakah Ananda kuat di bidang numerik (Matematika, IPA)? Atau di bidang bahasa (Bahasa Indonesia, Inggris)?
        2.  **Tulis Ringkasan Holistik (\`holisticSummary\`):** Buat 2-3 kalimat yang merangkum performa umum Ananda di semester ini secara keseluruhan. Gunakan bahasa yang positif dan membangun. Awali dengan pencapaian atau karakter positif, lalu sebutkan secara umum area yang perlu dikembangkan.
        3.  **Identifikasi Kekuatan (\`strengths\`):** Temukan 2-3 kekuatan utama Ananda. Ini bisa berupa mata pelajaran dengan nilai tertinggi, atau pola keterampilan yang terlihat (misal: "Menunjukkan kemampuan analisis yang kuat, terlihat dari nilainya yang baik di Matematika dan IPS."). Sebutkan nama mata pelajarannya secara eksplisit.
        4.  **Identifikasi Area Peningkatan (\`areasForImprovement\`):** Temukan 1-2 area yang paling perlu ditingkatkan berdasarkan nilai terendah. **WAJIB** sertakan saran praktis, sederhana, dan actionable yang bisa dilakukan orang tua di rumah untuk membantu. Contoh: "Perlu meningkatkan pemahaman konsep pada pelajaran IPA. Mengajak Ananda berdiskusi tentang fenomena alam sehari-hari dapat membantu membangun intuisi ilmiahnya."
        5.  **Gaya Bahasa:** Gunakan sapaan "Ananda" untuk merujuk pada siswa. Gunakan bahasa yang empatik, hindari jargon teknis, dan fokus pada pertumbuhan (growth mindset). Tujuannya adalah memberdayakan orang tua untuk menjadi mitra dalam pendidikan anak.

        **Output:** Hasilkan HANYA satu objek JSON yang valid sesuai skema yang diberikan.
    `;

    return parseJsonResponse<any>(ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: studentSemesterReportNarrativeSchema,
        },
    }));
}

export async function generateSummativeInstrumentHtml(
    tpsWithKktp: TujuanPembelajaran[],
    phase: string,
    kelas?: string
): Promise<string> {
    const ai = await getAiClient();
    const prompt = `
      Anda adalah seorang **Ahli Evaluasi Pendidikan dan Pembuat Soal** yang sangat teliti dan cerdas.
      Tugas Anda adalah membuat **satu file HTML lengkap** sebagai instrumen asesmen sumatif **multi-modal** yang siap cetak dan profesional.

      **KONTEKS & DATA INPUT:**
      1.  **Fase & Kelas Target:** ${phase}${kelas ? ` / ${kelas}` : ''}
      2.  **DATA KRITIS: Daftar TP beserta Rubrik KKTP-nya:**
          \`\`\`json
          ${JSON.stringify(tpsWithKktp, null, 2)}
          \`\`\`
            
      **ATURAN GENERASI (WAJIB DIIKUTI SECARA KETAT):**

      1.  **Analisis KKTP Otomatis (TIDAK PERLU BERTANYA):**
          - Anda **HARUS** menganalisis field \`teknikAsesmen\` untuk setiap \`aspek\` di dalam setiap KKTP yang diberikan.
          - Kelompokkan aspek-aspek tersebut berdasarkan tekniknya (misal: semua yang 'Tes Tertulis' bersama, semua yang 'Kinerja' bersama, dll.).

      2.  **Buat Dokumen Multi-Modal:**
          - Berdasarkan pengelompokan di atas, buatlah sebuah dokumen asesmen yang terpadu.
          - Jika ada beberapa teknik, buat beberapa bagian dalam dokumen. Gunakan heading \`<h1>\` atau \`.section-header\` yang jelas untuk setiap bagian, contoh: "Bagian A: Tes Tertulis", "Bagian B: Tugas Kinerja".
          - Untuk setiap bagian, buat butir-butir asesmen yang sesuai.

      3.  **Keselarasan Soal dengan Aspek KKTP (VALIDITAS):**
          - Untuk **SETIAP ASPEK** dari **SETIAP KKTP** yang diberikan, buat minimal satu butir soal/tugas yang secara spesifik mengukurnya.
          - Di bawah setiap nomor soal, tambahkan paragraf kecil dengan \`font-style: italic; color: #6b7280;\` yang menjelaskan aspek yang diukur. Contoh: *Mengukur: TP-1, Aspek: Kemampuan Membaca Bilangan*.

      4.  **Pembuatan Rubrik Penilaian HTML (HANYA untuk Esai/Proyek/Kinerja):**
          - Jika ada soal non-objektif, buat rubrik penilaian dalam bentuk \`<table>\`.
          - Header tabel (<thead>) harus berisi kolom "Aspek yang Dinilai", "Mahir (4)", "Cakap (3)", "Layak (2)", "Baru Berkembang (1)".
          - Deskripsi untuk setiap skor dalam rubrik HARUS diturunkan langsung dari deskripsi kriteria pada level yang sesuai dari aspek KKTP yang diukur.
          
      5.  **Kualitas Konten:** Soal dan rubrik harus sesuai dengan level kognitif (HOTS/LOTS) dan konteks bahasa untuk Fase ${phase}${kelas ? ` dan Kelas ${kelas}` : ''}. Distraktor pada pilihan ganda harus masuk akal.

      6.  **Output Format & Styling (SANGAT PENTING):**
          - Hasilkan **satu file HTML lengkap**, dimulai dengan \`<!DOCTYPE html>\` dan diakhiri dengan \`</html>\`. JANGAN membungkus output dalam markdown backticks.
          - Sisipkan blok \`<style>\` berikut ke dalam \`<head>\` HTML tanpa modifikasi: \`\`\`html
<style>
${HTML_DOCUMENT_STYLING_RULES}
</style>
\`\`\`
          - Seluruh konten visual HARUS berada di dalam SATU elemen tunggal: \`<div class="document-container">\`.
          - Gunakan kelas CSS yang disediakan (misal: \`.title\`, \`.section-header\`, \`.activity-box\`) untuk menata konten.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    return response.text.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
}