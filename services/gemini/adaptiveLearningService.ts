// services/gemini/adaptiveLearningService.ts

import { getAiClient, parseJsonResponse, Type, DPL_CONTEXT_BLOCK } from './common';
import type {
  TujuanPembelajaran,
  Student,
  DiagnosticRecommendation,
  DeepLearningLessonPlan,
  AdaptiveLessonStep,
  Assessment,
  AspekRubrik,
  KelompokAktivitas,
} from '../../types';
import { FORMATIVE_LEVEL_INFO } from '../../constants';

// Schemas for AI responses

const diagnosticRecommendationSchema = {
  type: Type.OBJECT,
  properties: {
    tujuan: { type: Type.STRING, description: "Tujuan dari asesmen diagnostik ini, dalam 1-2 kalimat." },
    saranAktivitas: { type: Type.STRING, description: "Saran aktivitas singkat dan menarik yang bisa digunakan guru untuk mendiagnosis pemahaman awal siswa terkait konsep prasyarat atau fundamental." },
    kriteriaPengelompokan: {
      type: Type.ARRAY,
      description: "Rubrik sederhana untuk mengelompokkan siswa ke dalam tiga kategori berdasarkan performa mereka pada aktivitas diagnostik.",
      items: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.STRING, description: "Level kelompok: 'Mahir', 'Cakap', atau 'Baru Berkembang'." },
          deskripsi: { type: Type.STRING, description: "Deskripsi performa siswa yang jelas untuk masuk ke dalam kelompok ini." }
        },
        required: ["level", "deskripsi"]
      }
    }
  },
  required: ["tujuan", "saranAktivitas", "kriteriaPengelompokan"]
};

const kelompokAktivitasSchema = {
    type: Type.OBJECT,
    properties: {
        namaKelompok: { type: Type.STRING, description: "Nama deskriptif untuk kelompok aktivitas, misal: 'Aktivitas Penguatan Konsep' atau 'Proyek Eksplorasi Mandiri'." },
        deskripsiKelompok: { type: Type.STRING, description: "Deskripsi singkat tentang untuk siapa aktivitas ini (misal: 'Untuk siswa yang memerlukan bimbingan lebih')." },
        siswaDiKelompok: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Daftar nama siswa yang termasuk dalam kelompok ini." },
        tugasLengkap: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array berisi langkah-langkah instruksi yang lengkap dan mandiri untuk tugas kelompok ini." },
        buktiKetercapaian: { 
            type: Type.ARRAY,
            description: "Daftar bukti kinerja yang terikat pada aspek spesifik.",
            items: {
                type: Type.OBJECT,
                properties: {
                    aspek: { type: Type.STRING, description: "Nama aspek dari KKTP yang sedang dilatih/diobservasi." },
                    bukti: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array berisi 1-3 bukti kinerja spesifik yang dapat diobservasi guru untuk aspek ini." }
                },
                required: ["aspek", "bukti"]
            }
        }
    },
    required: ["namaKelompok", "deskripsiKelompok", "siswaDiKelompok", "tugasLengkap", "buktiKetercapaian"]
};


const fokusAsesmenFormatifSchema = {
    type: Type.OBJECT,
    properties: {
        kelompokSiswa: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Daftar nama siswa dalam kelompok ini."
        },
        deskripsiKelompok: { 
            type: Type.STRING, 
            description: "Deskripsi singkat tentang kebutuhan atau karakteristik kelompok ini. Contoh: 'Kelompok perlu penguatan pada aspek X'."
        },
        fokusPenilaian: {
            type: Type.ARRAY,
            description: "Aspek-aspek dari KKTP yang menjadi fokus penilaian untuk kelompok ini.",
            items: {
                type: Type.OBJECT,
                properties: {
                    aspek: { type: Type.STRING },
                    deskripsiSingkat: { type: Type.STRING, description: "Bukti ketercapaian yang bisa diamati." },
                    teknikAsesmen: { type: Type.STRING },
                    instrumenAsesmen: { type: Type.STRING },
                },
                required: ["aspek", "deskripsiSingkat", "teknikAsesmen", "instrumenAsesmen"]
            }
        }
    },
    required: ["kelompokSiswa", "deskripsiKelompok", "fokusPenilaian"]
};

const asesmenFormatifKunciSchema = {
    type: Type.OBJECT,
    description: "Satu blok asesmen formatif kunci yang terfokus untuk seluruh pertemuan.",
    properties: {
        faseFokus: { type: Type.STRING, description: "Fase kegiatan inti ('memahami', 'mengaplikasi', 'merefleksi') di mana asesmen kunci ini dilakukan." },
        deskripsiAktivitasAsesmen: { type: Type.STRING, description: "Deskripsi aktivitas spesifik di mana asesmen ini dilakukan." },
        fokusPenilaian: { type: Type.ARRAY, items: fokusAsesmenFormatifSchema }
    },
    required: ["faseFokus", "deskripsiAktivitasAsesmen", "fokusPenilaian"]
};

const contohRubrikSchema = {
    type: Type.OBJECT,
    properties: {
        nama: { type: Type.STRING },
        tujuan: { type: Type.STRING },
        indikator: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    nama: { type: Type.STRING },
                    baruMemulai: { type: Type.STRING },
                    berkembang: { type: Type.STRING },
                    cakap: { type: Type.STRING },
                    mahir: { type: Type.STRING },
                },
                required: ["nama", "baruMemulai", "berkembang", "cakap", "mahir"]
            }
        }
    },
    required: ["nama", "tujuan", "indikator"]
};

const phaseKegiatanSchema = {
    type: Type.OBJECT,
    properties: {
        judul: { type: Type.STRING },
        kelompokAktivitas: { type: Type.ARRAY, items: kelompokAktivitasSchema },
        pengecekanPemahamanCepat: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Saran aktivitas ringan untuk umpan balik instan, BUKAN untuk penilaian formal." },
        contohRubrik: contohRubrikSchema,
    },
    required: ["judul", "kelompokAktivitas"]
};


const deepLearningPlanSchema = {
  type: Type.OBJECT,
  properties: {
    pertemuanKe: { type: Type.NUMBER },
    alokasiWaktuMenit: { type: Type.NUMBER },
    disclaimer: { type: Type.STRING },
    catatanKontekstual: { type: Type.STRING },
    pengalamanBelajar: {
      type: Type.OBJECT,
      properties: {
        awal: {
          type: Type.OBJECT,
          properties: {
            prinsip: { type: Type.STRING },
            kegiatan: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["prinsip", "kegiatan"]
        },
        inti: {
          type: Type.OBJECT,
          properties: {
            memahami: phaseKegiatanSchema,
            mengaplikasi: phaseKegiatanSchema,
            merefleksi: phaseKegiatanSchema,
          },
          required: ["memahami", "mengaplikasi", "merefleksi"]
        },
        penutup: {
          type: Type.OBJECT,
          properties: {
            prinsip: { type: Type.STRING },
            kegiatan: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["prinsip", "kegiatan"]
        }
      },
      required: ["awal", "inti", "penutup"]
    },
    asesmenFormatifKunci: asesmenFormatifKunciSchema,
    asesmenPembelajaran: {
      type: Type.OBJECT,
      properties: {
        awal: { type: Type.STRING },
        akhir: { type: Type.STRING }
      },
      required: ["awal", "akhir"]
    }
  },
  required: ["pertemuanKe", "alokasiWaktuMenit", "disclaimer", "pengalamanBelajar", "asesmenPembelajaran"]
};

const adaptiveLessonStepSchema = {
  type: Type.OBJECT,
  properties: {
    recommendationType: { type: Type.STRING, description: "Harus 'PROCEED' atau 'INTERVENTION'." },
    summaryNarrative: { type: Type.STRING, description: "Narasi singkat 2-3 kalimat yang menjelaskan kondisi kelas dan alasan rekomendasi." },
    nextPlan: deepLearningPlanSchema,
    diagnosticForNextTp: diagnosticRecommendationSchema,
    nextTpId: { type: Type.STRING, description: "ID dari TP berikutnya jika rekomendasi adalah 'PROCEED'." }
  },
  required: ["recommendationType", "summaryNarrative"]
};

export async function generateDiagnosticRecommendation(
    tp: TujuanPembelajaran,
    students: Student[],
    previousTpData: { tp: TujuanPembelajaran; tuntasCount: number; totalStudents: number } | null
): Promise<DiagnosticRecommendation> {
    const ai = await getAiClient();
    const prompt = `
        Anda adalah seorang ahli pedagogi yang merancang asesmen diagnostik awal yang praktis untuk guru.

        **KONTEKS:**
        - **TP yang akan diajarkan:** "${tp.deskripsi}"
        - **Rubrik KKTP (untuk identifikasi prasyarat):** ${JSON.stringify(tp.kktp, null, 2)}
        - **Konteks TP Sebelumnya:** ${previousTpData ? `Pada TP "${previousTpData.tp.deskripsi}", ${previousTpData.tuntasCount} dari ${previousTpData.totalStudents} siswa tuntas.` : "Ini adalah TP pertama dalam alur."}

        **TUGAS ANDA (Ikuti 3 Langkah):**

        1.  **Identifikasi Konsep Prasyarat:** Analisis TP dan aspek pertama dari rubrik KKTP. Tentukan **SATU konsep atau keterampilan paling fundamental** yang harus dikuasai siswa SEBELUM mereka bisa mulai mempelajari TP ini.
        2.  **Rancang Aktivitas Diagnostik Singkat:** Berdasarkan konsep prasyarat tersebut, rancang **satu aktivitas sederhana dan cepat** (\`saranAktivitas\`) yang bisa dilakukan guru di awal pelajaran untuk memetakan pemahaman siswa. Contoh: "Minta siswa menulis satu kalimat tentang...", "Berikan soal hitungan sederhana...", "Tunjukkan sebuah gambar dan ajukan pertanyaan...".
        3.  **Buat Kriteria Pengelompokan yang Jelas:** Buat kriteria (\`kriteriaPengelompokan\`) untuk membantu guru mengelompokkan siswa ke dalam tiga kategori berdasarkan performa mereka pada aktivitas tersebut. Tujuannya adalah untuk pembelajaran terdiferensiasi.
            - **Mahir:** Deskripsikan performa siswa yang sudah sangat paham konsep prasyarat dan siap menerima tantangan.
            - **Cakap:** Deskripsikan performa siswa yang sudah paham dasar-dasarnya tapi mungkin perlu sedikit pengulangan.
            - **Baru Berkembang:** Deskripsikan performa siswa yang menunjukkan miskonsepsi atau belum menguasai konsep prasyarat sama sekali.

        **Output:** Hasilkan output dalam format JSON tunggal yang valid sesuai skema yang diberikan.
    `;
    return parseJsonResponse<DiagnosticRecommendation>(ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: diagnosticRecommendationSchema },
    }));
}

export async function generateDeepLearningPlan(
    tp: TujuanPembelajaran,
    students: Student[],
    studentDiagnosticData: string,
    waktu: { awal: number, inti: number, penutup: number },
    previousTpData: any,
    phase: string,
    pertemuanKe: number,
    fokusAspek?: string[],
    catatanGuru?: string,
): Promise<DeepLearningLessonPlan> {
    const ai = await getAiClient();
    const studentGroups = JSON.parse(studentDiagnosticData) as Record<string, string[]>;
    const activeGroups = Object.keys(studentGroups).filter(
        groupName => studentGroups[groupName] && studentGroups[groupName].length > 0
    );

    const prompt = `
        PERAN: Anda adalah desainer RPP (Rencana Pelaksanaan Pembelajaran) berbasis AI yang sangat ahli, teliti, dan memahami pedagogi diferensiasi secara mendalam. Misi utama Anda adalah merancang RPP yang **terlahir terdiferensiasi (born differentiated)**.

        **FILOSOFI INTI (WAJIB DIIKUTI):**
        Diferensiasi bukanlah catatan tambahan. Untuk setiap fase kegiatan inti (Memahami, Mengaplikasi, Merefleksi), Anda TIDAK AKAN membuat satu aktivitas umum. Sebaliknya, Anda akan merancang **beberapa versi aktivitas yang berbeda**, masing-masing merupakan **tugas lengkap dan mandiri** yang ditujukan untuk kelompok siswa dengan kebutuhan berbeda.

        **ATURAN PEDAGOGIS BERDASARKAN FASE (WAJIB DIIKUTI):**
        - **Fase A, B, C (SD Kelas 1-6):** Rancang aktivitas yang **konkret, berbasis permainan, dan hands-on**. Gunakan bahasa yang sederhana, instruksi yang jelas, dan contoh yang relevan dengan dunia anak-anak. Fokus pada pengalaman belajar langsung.
        - **Fase D, E, F (SMP/SMA):** Rancang aktivitas yang menuntut **penalaran kritis, analisis, dan pemecahan masalah yang lebih abstrak**. Bahasa bisa lebih formal dan akademis. Dorong diskusi, debat, dan proyek penelitian mini.
        
        **ATURAN DIFERENSIASI KUNCI (WAJIB DIIKUTI):**
        - Data diagnostik menunjukkan bahwa hanya kelompok berikut yang memiliki siswa: ${JSON.stringify(activeGroups)}.
        - Anda **HARUS HANYA** merancang \`kelompokAktivitas\` untuk kelompok-kelompok tersebut.
        - **JANGAN** membuat aktivitas untuk kelompok yang tidak ada dalam daftar di atas. Jika hanya ada satu kelompok (misalnya, semua siswa 'Cakap'), maka RPP ini tidak akan terdiferensiasi, dan itu adalah hasil yang benar dan diharapkan.

        **KONTEKS UTAMA:**
        - **Fase:** ${phase}
        - **Pertemuan ke:** ${pertemuanKe}
        - **Tujuan Pembelajaran (TP):** "${tp.deskripsi}"
        - **Alokasi Waktu:** Total ${waktu.awal + waktu.inti + waktu.penutup} menit
        - **DATA KRITIS: Rubrik KKTP untuk TP ini:**
          \`\`\`json
          ${JSON.stringify(tp.kktp, null, 2)}
          \`\`\`
        - **DATA HASIL DIAGNOSTIK (PENGELOMPOKAN SISWA):**
          ${studentDiagnosticData}
        - **FOKUS ASPEK DARI GURU (Opsional, PRIORITAS TINGGI):**
          ${fokusAspek && fokusAspek.length > 0 ? `Guru meminta RPP ini secara spesifik berfokus pada pelatihan dan asesmen aspek berikut: ${fokusAspek.join(', ')}.` : "Tidak ada fokus spesifik dari guru."}
        - **CATATAN/MATERI INTI DARI GURU (Opsional, PRIORITAS TINGGI):**
          ${catatanGuru ? `Guru memberikan catatan penting berikut untuk diintegrasikan ke dalam RPP: "${catatanGuru}"` : "Tidak ada catatan dari guru."}
        
        **INSTRUKSI DETIL (WAJIB DIIKUTI SECARA BERURUTAN):**

        1.  **Gunakan Kelompok yang Diberikan:**
            - Data diagnostik sudah memberikan Anda kelompok siswa dan nama-nama siswanya. Anda **WAJIB** menggunakan pengelompokan ini sesuai 'ATURAN DIFERENSIASI KUNCI'.
            - Untuk setiap kelompok aktif, rancanglah aktivitas yang sesuai dengan level mereka. Contoh: Kelompok 'Baru Berkembang' mendapatkan aktivitas penguatan konsep, sementara kelompok 'Mahir' mendapatkan aktivitas tantangan/eksplorasi.

        2.  **Rancang Aktivitas Inti yang Terdiferensiasi (INTI TUGAS):**
            - Untuk setiap fase (\`memahami\`, \`mengaplikasi\`, \`merefleksi\`), Anda HARUS mengisi array \`kelompokAktivitas\`.
            - Untuk **setiap kelompok aktif**, rancanglah sebuah **tugas yang lengkap dan mandiri** di dalam properti \`tugasLengkap\`. Pastikan tugas ini secara eksplisit melatih aspek KKTP dan sesuai dengan aturan pedagogis berdasarkan fase.
            - **SANGAT PENTING (BUKTI KINERJA UNIVERSAL):** Untuk setiap tugas yang Anda rancang, Anda HARUS menganalisis aspek KKTP mana yang sedang dilatih. Kemudian, untuk setiap aspek yang dilatih, definisikan 1-3 bukti kinerja spesifik yang dapat diobservasi guru dan masukkan ke dalam properti \`buktiKetercapaian\`.

        3.  **Rancang Asesmen Formatif Kunci:**
            - Analisis RPP yang baru Anda buat. Tentukan pada fase kegiatan inti mana (\`memahami\`, \`mengaplikasi\`, atau \`merefleksi\`) asesmen formatif paling krusial akan dilakukan (\`faseFokus\`).
            - Deskripsikan aktivitas spesifik di mana asesmen ini terjadi (\`deskripsiAktivitasAsesmen\`).
            - Buat \`fokusPenilaian\` yang terdiferensiasi. Untuk setiap kelompok siswa, identifikasi aspek KKTP yang paling penting untuk diobservasi dan bukti ketercapaiannya. Jika guru memberikan 'FOKUS ASPEK', prioritaskan aspek-aspek tersebut.

        4.  **Lengkapi Rincian Lainnya:**
            - Isi \`disclaimer\` dengan pernyataan standar tentang RPP AI yang perlu adaptasi.
            - Tulis \`catatanKontekstual\` yang merangkum logika diferensiasi Anda.
            - Isi bagian kegiatan \`awal\` dan \`penutup\`.
            - Rancang \`asesmenPembelajaran\` untuk awal dan akhir sesi.

        **Output:** Hasilkan output dalam format JSON tunggal yang valid dan lengkap sesuai skema yang diberikan.
    `;

    return parseJsonResponse<DeepLearningLessonPlan>(ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: deepLearningPlanSchema },
    }));
}

export async function generateAdaptiveLessonStep(
    currentTp: TujuanPembelajaran,
    students: Student[],
    latestPlanForTp: DeepLearningLessonPlan,
    waktu: { awal: number; inti: number; penutup: number },
    nextTpInLine: TujuanPembelajaran | null,
    currentPertemuan: number
): Promise<Omit<AdaptiveLessonStep, 'timestamp'>> {
    const ai = await getAiClient();

    const studentAssessments = students.map(s => {
        const assessmentsForTp = s.assessments.filter(a => a.tpId === currentTp.id && a.pertemuan === currentPertemuan);
        return {
            nama: s.nama,
            assessments: assessmentsForTp.map(a => ({ aspek: a.aspek, level: a.level }))
        };
    });

    const prompt = `
        Anda adalah seorang ahli pedagogi adaptif AI. Tugas Anda adalah menganalisis data asesmen formatif dari sebuah pertemuan dan merekomendasikan langkah pembelajaran berikutnya yang paling efektif.

        **Konteks & Data Input:**
        - **TP yang sedang diajarkan:** ${currentTp.id} - "${currentTp.deskripsi}"
        - **KKTP untuk TP ini:** ${JSON.stringify(currentTp.kktp, null, 2)}
        - **RPP yang baru saja dilaksanakan:** ${JSON.stringify(latestPlanForTp, null, 2)}
        - **TP Berikutnya dalam Alur (jika ada):** ${nextTpInLine ? `${nextTpInLine.id} - "${nextTpInLine.deskripsi}"` : "Ini adalah TP terakhir."}
        - **Data Asesmen Formatif dari Pertemuan Ini:**
          \`\`\`json
          ${JSON.stringify(studentAssessments, null, 2)}
          \`\`\`
        - **Kriteria Ketuntasan:** Seorang siswa dianggap tuntas jika semua aspek pada KKTP mencapai minimal level 3 ('Cakap'). Kelas dianggap siap lanjut jika >= 70% siswa tuntas.

        **Tugas Anda (Ikuti 3 Langkah):**

        1.  **Analisis Performa Kelas:**
            - Hitung jumlah siswa yang tuntas dan tidak tuntas berdasarkan data asesmen.
            - Identifikasi aspek-aspek pada KKTP yang menjadi kesulitan umum (paling banyak siswa gagal).

        2.  **Tentukan Rekomendasi Utama (\`recommendationType\`):**
            - Jika persentase siswa tuntas >= 70%, rekomendasikan \`'PROCEED'\` untuk lanjut ke TP berikutnya.
            - Jika persentase siswa tuntas < 70%, rekomendasikan \`'INTERVENTION'\` untuk melakukan sesi penguatan pada TP saat ini.

        3.  **Buat Rencana Tindak Lanjut Sesuai Rekomendasi:**
            - **Jika 'PROCEED':**
                a.  Tulis \`summaryNarrative\` yang positif, menyatakan kelas siap lanjut.
                b.  Set \`nextTpId\` ke ID TP berikutnya (${nextTpInLine?.id || 'null'}).
                c.  Buat \`diagnosticForNextTp\` (menggunakan skema yang sama seperti fungsi diagnostik) untuk TP berikutnya, sebagai persiapan pertemuan selanjutnya.
                d.  Biarkan \`nextPlan\` bernilai \`null\`.
            - **Jika 'INTERVENTION':**
                a.  Tulis \`summaryNarrative\` yang menjelaskan mengapa intervensi diperlukan dan apa fokusnya (berdasarkan aspek yang paling sulit).
                b.  Rancang sebuah RPP intervensi (\`nextPlan\`) yang lengkap untuk pertemuan berikutnya. RPP ini HARUS:
                    - Berfokus pada penguatan aspek yang paling sulit.
                    - Menggunakan diferensiasi berdasarkan data siswa yang diberikan (kelompokkan siswa yang masih kesulitan dan yang sudah tuntas).
                    - Mengalokasikan waktu yang diberikan: ${JSON.stringify(waktu)}.
                    - Menjadi RPP yang lengkap dengan kegiatan awal, inti (memahami, mengaplikasi, merefleksi), dan penutup, serta asesmen.
                c.  Biarkan \`diagnosticForNextTp\` dan \`nextTpId\` bernilai \`null\`.

        **Output:** Hasilkan output JSON tunggal yang valid sesuai skema \`adaptiveLessonStepSchema\`.
    `;

    return parseJsonResponse<Omit<AdaptiveLessonStep, 'timestamp'>>(ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: adaptiveLessonStepSchema },
    }));
}