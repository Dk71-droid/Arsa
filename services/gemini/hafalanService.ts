import { getAiClient, parseJsonResponse, Type } from './common';
import type { HafalanPackage } from '../../types';

const hafalanPackageSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "ID unik untuk paket ini, formatnya 'pkg_timestamp'." },
    name: { type: Type.STRING, description: "Nama deskriptif untuk paket hafalan, dibuat dari topik yang diberikan." },
    description: { type: Type.STRING, description: "Deskripsi singkat tentang isi paket hafalan." },
    items: {
      type: Type.ARRAY,
      description: "Daftar item hafalan yang telah dipecah menjadi beberapa bagian.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID unik untuk item ini, formatnya 'item_timestamp_index'." },
          name: { type: Type.STRING, description: "Nama atau label untuk bagian hafalan ini (misal: 'An-Naba' 1-10')." },
          content: { type: Type.STRING, description: "Teks atau konten LENGKAP dari item hafalan yang akan digunakan guru sebagai panduan koreksi." }
        },
        required: ["id", "name", "content"]
      }
    }
  },
  required: ["id", "name", "description", "items"]
};


export async function generateHafalanPackage(
    topic: string,
    levels: number,
    description: string,
    name: string,
): Promise<HafalanPackage> {
    const ai = await getAiClient();

    const prompt = `
        Anda adalah seorang ahli kurikulum dan guru yang berpengalaman dalam merancang materi hafalan yang progresif dan logis.
        Tugas Anda adalah mengambil sebuah topik hafalan, memecahnya menjadi beberapa bagian (level) yang bisa dikelola, dan mengembalikannya dalam format JSON yang ketat.

        **Input dari Guru:**
        - Topik Utama: "${topic}"
        - Jumlah Bagian/Level yang Diinginkan: ${levels}
        - Nama Paket: "${name}"
        - Deskripsi Paket: "${description}"

        **Instruksi (WAJIB DIIKUTI):**
        1.  **Pahami Topik:** Analisis topik yang diberikan. Jika itu adalah surat dalam Al-Quran, pecah berdasarkan kelompok ayat. Jika itu puisi, pecah per bait. Jika itu tabel perkalian, pecah per angka. Gunakan logika yang paling sesuai dengan materi.
        2.  **Pecah Menjadi Bagian:** Bagi topik utama menjadi persis ${levels} bagian yang logis dan berurutan.
        3.  **Buat Nama Item:** Untuk setiap bagian, buat properti \`name\` yang singkat dan jelas. Contoh: "An-Naba' ayat 1-10", "Bait 1-2", "Perkalian 3".
        4.  **Isi Konten (WAJIB):** Anda **WAJIB** mengisi properti \`content\` dengan teks lengkap dari materi hafalan untuk setiap bagian. Ini akan digunakan guru sebagai panduan koreksi. Jika topiknya adalah 'Tabel Perkalian 7', kontennya harus berisi tabel perkalian 7 (7x1=7, 7x2=14, dst.). Jika surat Al-Quran, kontennya harus berisi ayat-ayatnya dengan nomor ayat.
        5.  **Format Output:** Hasilkan satu objek JSON yang valid sesuai dengan skema yang diberikan. Beri ID unik untuk paket dan setiap itemnya.
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: hafalanPackageSchema
        }
    });

    return parseJsonResponse<HafalanPackage>(Promise.resolve(response));
}