import { getAiClient, DPL_CONTEXT_BLOCK, parseJsonResponse, Type } from './common';
import type { CurriculumData, TujuanPembelajaran, AlurTujuanPembelajaran, UnitPembelajaran } from '../../types';

// Schemas for modular generation
const curriculumSchema = {
  type: Type.OBJECT,
  properties: {
    capaianPembelajaran: {
      type: Type.STRING,
      description: "Teks lengkap dan utuh dari Capaian Pembelajaran (CP) yang relevan berdasarkan fase dan mata pelajaran dari sumber resmi Kemdikbud. Jangan diringkas.",
    },
    tujuanPembelajaran: {
      type: Type.ARRAY,
      description: "Daftar Tujuan Pembelajaran (TP) yang komprehensif yang diturunkan dari CP untuk mencakup seluruh durasi fase.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID unik untuk TP, formatnya 'TP-1', 'TP-2', dst." },
          deskripsi: { type: Type.STRING, description: "Deskripsi lengkap dan terukur dari Tujuan Pembelajaran." },
          dplTerkait: {
            type: Type.ARRAY,
            description: "Daftar 1-3 Dimensi Profil Lulusan (DPL) yang paling relevan dengan TP ini.",
            items: { type: Type.STRING }
          },
           saranBentukAsesmen: {
            type: Type.STRING,
            description: "Rekomendasi bentuk asesmen atau bukti performa yang paling sesuai untuk mengukur TP ini, contoh: 'Projek', 'Laporan Tertulis', 'Presentasi', 'Praktik/Kinerja'."
          }
        },
        required: ["id", "deskripsi", "dplTerkait", "saranBentukAsesmen"],
      },
    },
     alurTujuanPembelajaran: {
        type: Type.ARRAY,
        description: "Alur Tujuan Pembelajaran (ATP) yang menyusun TP secara logis dan progresif, dipecah per tingkatan kelas dan semester dalam satu fase.",
        items: {
          type: Type.OBJECT,
          properties: {
            mingguKe: { type: Type.STRING, description: "Urutan atau alokasi minggu/semester, harus mencakup Kelas dan Semester. Contoh: 'Kelas 5, Semester 1, Minggu 1-2'." },
            tpId: { type: Type.STRING, description: "ID dari Tujuan Pembelajaran yang dirujuk dari daftar TP yang diberikan." },
            estimasiWaktu: { type: Type.STRING, description: "Estimasi waktu atau jam pelajaran, contoh: '8 JP'." },
            justifikasi: { type: Type.STRING, description: "Justifikasi singkat (1-2 kalimat) mengapa TP ini ditempatkan di sini, berdasarkan logika progresif." },
            prasyaratTpIds: {
                type: Type.ARRAY,
                description: "Array berisi ID dari TP-TP yang menjadi prasyarat LANGSUNG untuk TP ini. Kosongkan jika tidak ada prasyarat langsung.",
                items: { type: Type.STRING }
            }
          },
          required: ["mingguKe", "tpId", "estimasiWaktu"],
        },
    },
    unitPembelajaran: {
        type: Type.ARRAY,
        description: "Daftar Unit Pembelajaran tematik yang mengelompokkan TP-TP yang relevan berdasarkan alokasi semester di ATP.",
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: "ID unik untuk unit, formatnya 'UNIT-1', 'UNIT-2', dst." },
                nama: { type: Type.STRING, description: "Nama tematik yang deskriptif untuk unit pembelajaran." },
                deskripsi: { type: Type.STRING, description: "Deskripsi singkat 1-2 kalimat yang menjelaskan fokus dari unit ini." },
                capaianPembelajaran: {
                    type: Type.STRING,
                    description: "Kutipan LANGSUNG dari Capaian Pembelajaran global yang relevan secara spesifik untuk unit ini. Jangan parafrase atau meringkas; salin teks yang sesuai apa adanya."
                },
                tpIds: {
                    type: Type.ARRAY,
                    description: "Array berisi ID dari TP-TP yang termasuk dalam unit ini. Semua TP dalam satu unit HARUS berasal dari semester yang sama berdasarkan ATP.",
                    items: { type: Type.STRING }
                },
                dplFokus: {
                    type: Type.ARRAY,
                    description: "Daftar 5-8 Dimensi Profil Lulusan (DPL) yang menjadi FOKUS UTAMA pada unit ini.",
                    items: { type: Type.STRING }
                },
            },
            required: ["id", "nama", "deskripsi", "capaianPembelajaran", "tpIds", "dplFokus"],
        }
    }
  },
  required: ["capaianPembelajaran", "tujuanPembelajaran", "alurTujuanPembelajaran", "unitPembelajaran"],
};

const atpSchema = {
    type: Type.ARRAY,
    description: "Alur Tujuan Pembelajaran (ATP) yang menyusun TP secara logis dan progresif, dipecah per tingkatan kelas dan semester dalam satu fase.",
    items: {
      type: Type.OBJECT,
      properties: {
        mingguKe: { type: Type.STRING, description: "Urutan atau alokasi minggu/semester, harus mencakup Kelas dan Semester. Contoh: 'Kelas 5, Semester 1, Minggu 1-2'." },
        tpId: { type: Type.STRING, description: "ID dari Tujuan Pembelajaran yang dirujuk dari daftar TP yang diberikan." },
        estimasiWaktu: { type: Type.STRING, description: "Estimasi waktu atau jam pelajaran, contoh: '8 JP'." },
        justifikasi: { type: Type.STRING, description: "Justifikasi singkat (1-2 kalimat) mengapa TP ini ditempatkan di sini, berdasarkan logika progresif." },
        prasyaratTpIds: {
            type: Type.ARRAY,
            description: "Array berisi ID dari TP-TP yang menjadi prasyarat LANGSUNG untuk TP ini. Kosongkan jika tidak ada prasyarat langsung.",
            items: { type: Type.STRING }
        }
      },
      required: ["mingguKe", "tpId", "estimasiWaktu"],
    },
};

const FASE_TO_KELAS_MAP: Record<string, string> = {
    'A': 'Kelas 1 dan 2',
    'B': 'Kelas 3 dan 4',
    'C': 'Kelas 5 dan 6',
    'D': 'Kelas 7, 8, dan 9',
    'E': 'Kelas 10',
    'F': 'Kelas 11 dan 12',
};

type CurriculumGenerationResult = Omit<CurriculumData, 'phase' | 'subject'>;

export async function generateCpAndTps(phase: string, subject: string): Promise<CurriculumGenerationResult> {
  const ai = await getAiClient();
  const prompt = `
    Anda adalah seorang Pakar Pengembangan Kurikulum Merdeka yang menguasai prinsip Understanding by Design (UbD) dan Panduan Pembelajaran dan Asesmen terbaru.
    ${DPL_CONTEXT_BLOCK}

    **Input:**
    - Fase: ${phase} (${FASE_TO_KELAS_MAP[phase]})
    - Mata Pelajaran: ${subject}

    **Instruksi Utama (WAJIB DIIKUTI dalam 4 TAHAP SECARA BERURUTAN):**

    **TAHAP 1: Generate CP & TP Berkualitas Tinggi**
    1.  **Cari Capaian Pembelajaran (CP):** Temukan dan cantumkan **teks lengkap dan utuh** dari Capaian Pembelajaran (CP) resmi Kemdikbud untuk fase dan mata pelajaran yang diberikan.
    2.  **Generate Tujuan Pembelajaran (TP) Berkualitas Tinggi:** Berdasarkan CP, buat **serangkaian TP yang komprehensif dan bermakna**. Pastikan semua kompetensi dan lingkup materi penting dalam CP terwakili. Setiap TP harus mengandung **(1) Kompetensi HOTS** yang menuntut performa terukur dan **(2) Lingkup Materi**. Beri ID unik 'TP-1', 'TP-2', dst.
    3.  **Tautkan DPL & Saran Asesmen ke Setiap TP:** Untuk setiap TP, tautkan 1-3 DPL paling relevan dan berikan \`saranBentukAsesmen\` yang sesuai.

    **TAHAP 2: Susun Alur Tujuan Pembelajaran (ATP) Lintas Kelas & Semester**
    Setelah TP dibuat, susun **seluruh TP** ke dalam sebuah **Alur Tujuan Pembelajaran (ATP)** yang logis dan progresif.
    1.  **Alokasikan TP ke Kelas & Semester:** Distribusikan TP ke dalam kelas dan semester yang sesuai dengan cakupan fase (misal: Fase C mencakup Kelas 5 & 6). Gunakan field \`mingguKe\` dengan format "Kelas 5, Semester 1, Minggu 1-2".
    2.  **Terapkan Logika Progresif:** Urutkan TP dari yang mudah ke sulit, konkret ke abstrak, dan pastikan TP prasyarat diletakkan lebih awal.
    3.  **Lengkapi Detail ATP:** Untuk setiap entri, tentukan \`estimasiWaktu\`, \`justifikasi\` singkat, dan **analisis prasyarat mendalam** untuk field \`prasyaratTpIds\`.

    **TAHAP 3: Rancang Unit Pembelajaran BERDASARKAN ATP (SANGAT PENTING!)**
    Setelah ATP selesai disusun, lakukan langkah berikut:
    1.  **Analisis Pengelompokan Semester:** Lihat ATP yang sudah Anda buat. Identifikasi kelompok TP yang berada di semester yang sama (misal: semua TP di "Kelas 5, Semester 1").
    2.  **Bentuk Unit per Semester:** Kelompokkan TP-TP dari semester yang sama ke dalam beberapa **"Unit Pembelajaran"** yang tematik dan logis. **PASTIKAN SEMUA TP DALAM SATU UNIT BERASAL DARI KELAS DAN SEMESTER YANG SAMA.**
    3.  **Lengkapi Detail Unit:** Beri \`nama\` tematik, \`deskripsi\`, \`dplFokus\`, dan kutip bagian CP yang relevan untuk setiap unit.

    **TAHAP 4: Finalisasi Output**
    - Hasilkan output dalam format JSON tunggal yang valid dan lengkap. Pastikan JSON berisi \`capaianPembelajaran\`, \`tujuanPembelajaran\`, \`alurTujuanPembelajaran\`, dan \`unitPembelajaran\`.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: curriculumSchema },
  });

  return parseJsonResponse<CurriculumGenerationResult>(Promise.resolve(response));
}

export async function generateTpsFromCp(cp: string, phase: string, subject: string): Promise<CurriculumGenerationResult> {
  const ai = await getAiClient();
  const prompt = `
    Anda adalah seorang Pakar Pengembangan Kurikulum Merdeka yang menguasai prinsip Understanding by Design (UbD) dan Panduan Pembelajaran dan Asesmen terbaru.
    ${DPL_CONTEXT_BLOCK}

    **Input:**
    - Fase: ${phase} (${FASE_TO_KELAS_MAP[phase]})
    - Mata Pelajaran: ${subject}
    - Capaian Pembelajaran (CP) yang diberikan oleh pengguna:
    ---
    ${cp}
    ---
    
    **Instruksi Utama (WAJIB DIIKUTI dalam 4 TAHAP SECARA BERURUTAN):**

    **TAHAP 1: Generate TP Berkualitas Tinggi dari CP Pengguna**
    1.  **Gunakan CP yang diberikan:** Jadikan CP dari pengguna sebagai satu-satunya sumber.
    2.  **Generate Tujuan Pembelajaran (TP) Berkualitas Tinggi:** Berdasarkan CP, buat **serangkaian TP yang komprehensif dan bermakna**. Pastikan semua kompetensi dan lingkup materi penting dalam CP terwakili. Setiap TP harus mengandung **(1) Kompetensi HOTS** yang menuntut performa terukur dan **(2) Lingkup Materi**. Beri ID unik 'TP-1', 'TP-2', dst.
    3.  **Tautkan DPL & Saran Asesmen ke Setiap TP:** Untuk setiap TP, tautkan 1-3 DPL paling relevan dan berikan \`saranBentukAsesmen\` yang sesuai.

    **TAHAP 2: Susun Alur Tujuan Pembelajaran (ATP) Lintas Kelas & Semester**
    Setelah TP dibuat, susun **seluruh TP** ke dalam sebuah **Alur Tujuan Pembelajaran (ATP)** yang logis dan progresif.
    1.  **Alokasikan TP ke Kelas & Semester:** Distribusikan TP ke dalam kelas dan semester yang sesuai dengan cakupan fase (misal: Fase C mencakup Kelas 5 & 6). Gunakan field \`mingguKe\` dengan format "Kelas 5, Semester 1, Minggu 1-2".
    2.  **Terapkan Logika Progresif:** Urutkan TP dari yang mudah ke sulit, konkret ke abstrak, dan pastikan TP prasyarat diletakkan lebih awal.
    3.  **Lengkapi Detail ATP:** Untuk setiap entri, tentukan \`estimasiWaktu\`, \`justifikasi\` singkat, dan **analisis prasyarat mendalam** untuk field \`prasyaratTpIds\`.

    **TAHAP 3: Rancang Unit Pembelajaran BERDASARKAN ATP (SANGAT PENTING!)**
    Setelah ATP selesai disusun, lakukan langkah berikut:
    1.  **Analisis Pengelompokan Semester:** Lihat ATP yang sudah Anda buat. Identifikasi kelompok TP yang berada di semester yang sama.
    2.  **Bentuk Unit per Semester:** Kelompokkan TP-TP dari semester yang sama ke dalam beberapa **"Unit Pembelajaran"** yang tematik. **PASTIKAN SEMUA TP DALAM SATU UNIT BERASAL DARI KELAS DAN SEMESTER YANG SAMA.**
    3.  **Lengkapi Detail Unit:** Beri \`nama\` tematik, \`deskripsi\`, \`dplFokus\`, dan kutip bagian CP yang relevan untuk setiap unit.

    **TAHAP 4: Finalisasi Output**
    - Hasilkan output dalam format JSON tunggal yang valid dan lengkap. JSON harus berisi \`capaianPembelajaran\` (salin dari input pengguna), \`tujuanPembelajaran\`, \`alurTujuanPembelajaran\`, dan \`unitPembelajaran\`.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: curriculumSchema },
  });

  return parseJsonResponse<CurriculumGenerationResult>(Promise.resolve(response));
}

export async function generateAtp(tps: TujuanPembelajaran[], phase: string, subject: string): Promise<AlurTujuanPembelajaran[]> {
  const ai = await getAiClient();
  const kelasContext = FASE_TO_KELAS_MAP[phase] || `Fase ${phase}`;
  const prompt = `
    Anda adalah seorang **Pakar Desain Kurikulum dan Perencanaan Pembelajaran** yang sangat memahami prinsip penyusunan Alur Tujuan Pembelajaran (ATP) dalam Kurikulum Merdeka.
    
    **Konteks (SANGAT PENTING):**
    - **Mata Pelajaran:** ${subject}
    - **Fase:** ${phase} (yang mencakup **${kelasContext}**)
    - **Daftar Tujuan Pembelajaran (TP) untuk diurutkan:**
      ${tps.map(tp => `- ${tp.id}: ${tp.deskripsi}`).join('\n')}

    **Tugas Utama:**
    Susun **seluruh TP** yang diberikan ke dalam sebuah Alur Tujuan Pembelajaran (ATP) yang **logis, progresif, dan terbagi per kelas dan per semester**. Pastikan alur ini memastikan Capaian Pembelajaran (CP) fase ini tercapai secara utuh di akhir fase.

    **Kriteria Pengurutan Wajib (Logika Progresif Lintas Kelas):**
    Terapkan kombinasi prinsip pengurutan berikut untuk memastikan progres kompetensi berjalan dari tahap dasar (di kelas yang lebih rendah) menuju tahap penguasaan yang kompleks (di kelas yang lebih tinggi):
    1.  **Hierarki/Prasyarat:** TP yang menjadi dasar pengetahuan/keterampilan harus diletakkan lebih awal.
    2.  **Mudah ke Sulit:** Mulai dari konten dan kompetensi yang paling sederhana ke yang paling sulit.
    3.  **Konkret ke Abstrak:** Mulai dari pemahaman yang berwujud nyata di kelas awal menuju pemahaman teori atau simbolis yang lebih abstrak di kelas akhir.

    **Struktur Output JSON:**
    Hasilkan output dalam format JSON array. Setiap objek dalam array mewakili satu langkah dalam ATP dan harus berisi:
    1.  \`mingguKe\`: String yang **wajib** mencakup **Kelas** dan **Semester** yang sesuai dengan cakupan fase. Contoh: "Kelas 7, Semester 1, Minggu 1-2", "Kelas 9, Semester 2, Minggu 10-12".
    2.  \`tpId\`: ID dari TP yang sesuai.
    3.  \`estimasiWaktu\`: Alokasi waktu dalam Jam Pelajaran (JP). Contoh: "8 JP".
    4.  \`justifikasi\`: (Opsional tapi sangat direkomendasikan) Justifikasi singkat (1 kalimat) mengapa TP ini ditempatkan di sini, berdasarkan logika progresif yang Anda terapkan. Contoh: "Prasyarat: Membangun pemahaman dasar tentang bilangan sebelum operasi hitung kompleks." atau "Konkret ke Abstrak: Mengaplikasikan konsep dari semester 1 ke dalam studi kasus."
    5.  **Analisis Prasyarat Mendalam (SANGAT PENTING):** Untuk setiap TP yang Anda tempatkan dalam alur, jangan hanya mengurutkan. Anda HARUS menganalisis **konten dan kompetensi** dari semua TP lain untuk menentukan mana yang menjadi prasyarat *langsung*. Sebuah TP A adalah prasyarat untuk TP B jika kompetensi di A **mutlak diperlukan** untuk memulai pengerjaan kompetensi di B. Berdasarkan analisis konten ini, isi field \`prasyaratTpIds\` secara akurat. **Jangan berasumsi urutan sama dengan prasyarat.** Jika tidak ada prasyarat langsung, biarkan array kosong ([]).

    Pastikan **semua TP** dari input terdistribusi dalam alur.
  `;

  return parseJsonResponse<AlurTujuanPembelajaran[]>(ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: atpSchema },
  }));
}

export async function regenerateAtpBasedOnOrder(
    tpAllocation: Record<string, string[]>,
    allTps: TujuanPembelajaran[],
    phase: string,
    subject: string
): Promise<AlurTujuanPembelajaran[]> {
    const ai = await getAiClient();
    const kelasContext = FASE_TO_KELAS_MAP[phase] || `Fase ${phase}`;
    const allTpsContext = allTps.map(tp => `- ${tp.id}: ${tp.deskripsi}`).join('\n');

    const prompt = `
        Anda adalah seorang **Pakar Desain Kurikulum dan Perencanaan Pembelajaran** yang sangat ahli.
        
        **Konteks:**
        - **Mata Pelajaran:** ${subject}
        - **Fase:** ${phase} (mencakup **${kelasContext}**)
        - **Daftar Lengkap Tujuan Pembelajaran (TP) yang Tersedia:**
          ${allTpsContext}
        - **Input dari Guru (Pengelompokan TP per Semester):**
          Guru telah mengelompokkan TP ke dalam semester-semester berikut. Ini adalah **aturan yang tidak boleh dilanggar**.
          \`\`\`json
          ${JSON.stringify(tpAllocation, null, 2)}
          \`\`\`

        **Tugas Utama:**
        Berdasarkan pengelompokan semester yang diberikan oleh guru, buatlah Alur Tujuan Pembelajaran (ATP) yang lengkap dan detail.
        
        **Langkah-Langkah Wajib:**
        1.  **Hormati Pengelompokan Guru:** Anda HARUS menempatkan setiap TP di dalam semester yang telah ditentukan oleh guru.
        2.  **Urutkan TP di Dalam Setiap Semester:** Untuk setiap semester, analisis TP yang ada di dalamnya dan **urutkan secara logis dan progresif** (mudah ke sulit, konkret ke abstrak, prasyarat dulu).
        3.  **Alokasikan Waktu & Minggu:** Untuk setiap TP yang sudah diurutkan di dalam semesternya, tentukan:
            a.  \`mingguKe\`: Alokasi minggu yang spesifik di dalam semester tersebut. Contoh: "Kelas 7, Semester 1, Minggu 1-2".
            b.  \`estimasiWaktu\`: Alokasi waktu yang realistis dalam Jam Pelajaran (JP). Contoh: "8 JP".
        4.  **Berikan Justifikasi:** Untuk setiap TP, berikan \`justifikasi\` singkat (1 kalimat) yang menjelaskan mengapa TP tersebut ditempatkan pada urutan tersebut **di dalam semesternya**. Contoh: "Memulai semester dengan konsep dasar X sebagai fondasi."
        5.  **Analisis Prasyarat Mendalam (SANGAT PENTING):** Untuk setiap TP, analisis **konten dan kompetensi** dari semua TP lain (terutama yang berada di semester yang sama atau sebelumnya) untuk menentukan prasyarat *langsung*. Sebuah TP A adalah prasyarat untuk TP B jika kompetensi di A **mutlak diperlukan** untuk memulai B. Berdasarkan analisis ini, isi field \`prasyaratTpIds\` secara akurat. Jangan berasumsi urutan sama dengan prasyarat.

        **Struktur Output JSON:**
        Hasilkan output dalam format JSON array yang valid. Setiap objek harus sesuai dengan skema ATP. Pastikan semua TP yang dialokasikan oleh guru muncul dalam hasil akhir.
    `;

  return parseJsonResponse<AlurTujuanPembelajaran[]>(ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: atpSchema },
    }));
}

export async function regenerateAtpAndUnits(tps: TujuanPembelajaran[], phase: string, subject: string, cp: string): Promise<{ alurTujuanPembelajaran: AlurTujuanPembelajaran[], unitPembelajaran: UnitPembelajaran[] }> {
  const ai = await getAiClient();
  const kelasContext = FASE_TO_KELAS_MAP[phase] || `Fase ${phase}`;
  const tpsContext = tps.map(tp => `- ${tp.id}: ${tp.deskripsi}`).join('\n');
  
  const prompt = `
    Anda adalah seorang Pakar Pengembangan Kurikulum Merdeka yang sangat ahli dalam menyusun struktur pembelajaran.
    
    **Konteks:**
    - Fase: ${phase} (mencakup **${kelasContext}**)
    - Mata Pelajaran: ${subject}
    - Capaian Pembelajaran (CP) Global: "${cp}"
    
    **Input (WAJIB DIGUNAKAN):**
    Guru telah menyediakan daftar Tujuan Pembelajaran (TP) final berikut ini. Anda HARUS menggunakan daftar ini secara eksklusif dan lengkap:
    ---
    ${tpsContext}
    ---
    
    **Tugas Ganda Anda (WAJIB DIIKUTI SECARA BERURUTAN):**
    
    **1. Susun Alur Tujuan Pembelajaran (ATP) DULU:**
       - Susun SEMUA TP yang diberikan ke dalam sebuah Alur Tujuan Pembelajaran (ATP) yang logis, progresif, dan terbagi per kelas dan per semester sesuai cakupan Fase ${phase} (${kelasContext}).
       - Terapkan prinsip hierarki (prasyarat) dan mudah ke sulit.
       - Untuk setiap entri ATP, berikan \`mingguKe\`, \`tpId\`, \`estimasiWaktu\`, dan \`justifikasi\` singkat.
       - **Analisis Prasyarat Mendalam (SANGAT PENTING):** Untuk setiap entri ATP, analisis **konten dan kompetensi** dari semua TP lain untuk menentukan prasyarat *langsung*. Sebuah TP A adalah prasyarat untuk TP B jika kompetensi di A **mutlak diperlukan** untuk memulai B. Berdasarkan analisis ini, isi field \`prasyaratTpIds\` secara akurat. **Jangan berasumsi urutan sama dengan prasyarat.**

    **2. Rancang Unit Pembelajaran BERDASARKAN ATP YANG BARU DIBUAT:**
       - Setelah ATP selesai disusun, analisis pengelompokan semester di dalamnya.
       - Kelompokkan TP-TP dari semester yang sama ke dalam "Unit Pembelajaran" yang tematik. **PASTIKAN SEMUA TP DALAM SATU UNIT BERASAL DARI SEMESTER YANG SAMA.**
       - Untuk setiap unit, berikan \`nama\`, \`deskripsi\`, \`dplFokus\`, dan kutip bagian CP yang relevan.

    **Output:** Hasilkan output dalam format JSON yang valid, berisi \`unitPembelajaran\` dan \`alurTujuanPembelajaran\`.
  `;

  const atpAndUnitSchema = {
    type: Type.OBJECT,
    properties: {
        unitPembelajaran: curriculumSchema.properties.unitPembelajaran,
        alurTujuanPembelajaran: atpSchema,
    },
    required: ["unitPembelajaran", "alurTujuanPembelajaran"],
  };

  return parseJsonResponse<any>(ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: atpAndUnitSchema },
  }));
}