import { GoogleGenAI, Type } from "@google/genai";
import { auth } from '../firebase';
import * as dbService from '../dbService';

export async function getAiClient(): Promise<GoogleGenAI> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Pengguna tidak terautentikasi. Silakan login kembali.");
  }

  const keyData = await dbService.getApiKey(user.uid);
  if (!keyData?.apiKey) {
    throw new Error("Kunci API Gemini belum diatur. Silakan atur di menu Pengaturan.");
  }
  
  // Create a new instance for every call to ensure the latest key is used.
  return new GoogleGenAI({ apiKey: keyData.apiKey });
}

export const DPL_CONTEXT_BLOCK = `
**KONTEKS WAJIB 1: Definisi 8 Dimensi Profil Lulusan (8 DPL)**
Gunakan definisi ini secara ketat untuk menautkan DPL ke tujuan pembelajaran:
1.  **Keimanan dan Ketaqwaan terhadap Tuhan YME:** Menumbuhkan karakter religius dan akhlak mulia.
2.  **Kewargaan:** Menjadi warga negara yang aktif, bertanggung jawab, dan menjunjung nilai-nilai Pancasila.
3.  **Penalaran Kritis:** Mampu berpikir logis, menganalisis informasi secara objektif, dan memecahkan masalah.
4.  **Kreativitas:** Mengembangkan gagasan baru dan inovatif, serta mampu menghasilkan karya.
5.  **Kolaborasi:** Membangun kerja sama yang efektif dalam keberagaman.
6.  **Kemandirian:** Mampu mengambil keputusan dan bertindak secara mandiri, serta berinisiatif.
7.  **Kesehatan:** Menjaga kesehatan fisik dan mental serta keseimbangan hidup.
8.  **Komunikasi:** Mampu menyampaikan gagasan dan informasi secara efektif dan santun.

**KONTEKS WAJIB 2: Prinsip Pedagogis Penautan DPL**
PENTING: Tidak setiap TP harus mencakup semua 8 DPL. Itu tidak realistis. Pilih **1-3 DPL yang PALING RELEVAN DAN KONTEKSTUAL** untuk setiap TP. Tujuannya adalah fokus yang mendalam.

**KONTEKS WAJIB 3: Contoh Penerapan yang Tepat**
- **TP:** "Peserta didik dapat menulis teks eksposisi untuk menyampaikan gagasan tentang pentingnya menjaga kebersihan lingkungan."
- **Analisis:** Menulis teks adalah **Komunikasi**. Menyusun argumen butuh **Penalaran Kritis**. Topik lingkungan menyentuh **Kewargaan**.
- **Kesimpulan:** DPL yang paling relevan untuk TP ini adalah ['Komunikasi', 'Penalaran Kritis', 'Kewargaan'].
`;

// FIX: Moved from materialService.ts to be shared.
export const HTML_DOCUMENT_STYLING_RULES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto+Slab:wght@400;700&display=swap');
    @page {
        size: A4;
        margin: 1.5cm; /* Give a bit more margin for a formal look */
    }
    body {
        font-family: 'Inter', sans-serif;
        line-height: 1.5; /* Slightly more spacious for readability */
        color: #212529; /* A softer black */
        background-color: #ffffff; /* White background as requested */
        margin: 0;
        padding: 0;
        font-size: 10pt; /* A common font size for documents */
    }
    .document-container {
        margin: 0;
        padding: 0;
    }
    .report-page {
        background: white;
        display: block;
        box-shadow: none; /* Removed shadow */
        width: 210mm;
        min-height: 297mm;
        box-sizing: border-box;
        margin: 0 auto;
        padding: 0;
    }
    @media screen { /* For screen view, simulate paper */
        body {
            background-color: #e9ecef; /* Light gray background for contrast */
        }
        .report-page {
             margin: 2rem auto;
             padding: 1.5cm;
             box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.1);
        }
    }
    @media print {
        body {
            margin: 0;
            padding: 0;
            background: white;
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
        }
        .report-page:last-child {
            page-break-after: auto;
        }
        /* Smart page breaking rules */
        h2, h3, h4 {
            break-after: avoid; /* Don't break a page right after a heading */
        }
        table, .activity-box, .info-box {
            break-inside: avoid; /* Avoid breaking these elements in the middle */
        }
        p {
            orphans: 3; /* Minimum 3 lines at the bottom of a page */
            widows: 3;  /* Minimum 3 lines at the top of a page */
        }
    }
    h1, h2, h3, h4 { 
        font-family: 'Roboto Slab', serif; 
        font-weight: 700; 
        color: #000000; /* Black color for formality */
        margin-bottom: 0.5rem;
        margin-top: 1rem;
    }
    h1 { 
        font-size: 18pt; 
        text-align: center; 
        border-bottom: 2px solid #000000; 
        padding-bottom: 0.5rem; 
        margin-bottom: 1.5rem;
    }
    h2.section-header {
      font-size: 14pt;
      background-color: #e9ecef;
      padding: 8px;
      margin-top: 1.5rem;
      margin-bottom: 0;
      border: 1px solid #adb5bd;
      border-bottom: none;
      font-family: 'Inter', sans-serif;
    }
    h2 { 
        font-size: 14pt; 
        border-bottom: 1px solid #dee2e6; /* A subtle separator */
        padding-bottom: 0.25rem;
        margin-top: 1.5rem;
    }
    h3 { 
        font-size: 12pt; 
        font-weight: 700; 
    }
    h4 { 
        font-size: 10pt; 
        font-weight: bold; 
        text-transform: uppercase; 
        color: #495057; 
    }
    p { margin-bottom: 0.75rem; }
    ul, ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
    li { margin-bottom: 0.25rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    th, td { border: 1px solid #adb5bd; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { font-weight: bold; text-align: center; background-color: #f8f9fa; } /* Very light, neutral gray */
    
    .report-header { text-align: center; margin-bottom: 1.5rem; }
    
    .info-table { margin-bottom: 1.5rem; }
    .info-table td { border: none; padding: 2px 0; }
    .info-table td:first-child { font-weight: 600; width: 150px; }
    .info-table td:nth-child(2) { width: 15px; }

    .grades-table th:nth-child(1) { width: 5%; }
    .grades-table th:nth-child(2) { width: 25%; }
    .grades-table th:nth-child(3) { width: 10%; }
    .grades-table th:nth-child(4) { width: 60%; }
    
    .signature-area { display: flex; justify-content: space-between; text-align: center; margin-top: 3cm; page-break-inside: avoid; }
    .signature-col { width: 30%; }
    .signature-col .name { margin-top: 2cm; font-weight: bold; text-decoration: underline; }

    .info-box, .activity-box, .differentiated-section {
        background-color: #ffffff;
        border: 1px solid #dee2e6;
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 4px;
    }
    .info-box h4, .differentiated-section h4 {
        margin-top: 0;
        color: #343a40;
    }
    .student-list {
        font-size: 10pt;
        font-style: italic;
        color: #475569;
    }
    
    .rpp-table { 
      table-layout: fixed; 
      margin-top: 0;
      border-top: none;
    }
    .rpp-table > thead > tr > th:first-child,
    .rpp-table > tbody > tr > td:first-child {
        width: 30%; /* Width for the "Aspek" column */
        font-weight: 600;
        background-color: #f8f9fa;
    }
    .rpp-table > thead > tr > th:last-child,
    .rpp-table > tbody > tr > td:last-child {
        width: 70%; /* Width for the "Uraian" column */
    }
    /* Special width for Pengalaman Belajar */
    .rpp-table.pengalaman-belajar > thead > tr > th:nth-child(1) { width: 20%; }
    .rpp-table.pengalaman-belajar > thead > tr > th:nth-child(2) { width: 25%; }
    .rpp-table.pengalaman-belajar > thead > tr > th:nth-child(3) { width: 55%; }
    .rpp-table.pengalaman-belajar > tbody > tr > td:nth-child(1) { width: 20%; }
    .rpp-table.pengalaman-belajar > tbody > tr > td:nth-child(2) { width: 25%; }
    .rpp-table.pengalaman-belajar > tbody > tr > td:nth-child(3) { width: 55%; }

    .rubric-table {
        margin-top: 1rem;
        table-layout: fixed;
        border: 1px solid #adb5bd;
    }
    .rubric-table th, .rubric-table td {
        word-wrap: break-word; /* Ensure long text wraps */
    }
    .rubric-table th:first-child, .rubric-table td:first-child { /* Indikator column */
        width: 28%;
        font-weight: 600;
        background-color: #f8f9fa;
    }
    .rubric-table th:not(:first-child), .rubric-table td:not(:first-child) { /* Level columns */
        width: 18%;
    }
    .rubric-table thead th {
        text-align: center;
        vertical-align: middle;
    }
    .rubric-table .level-baru-berkembang { background-color: #fee2e2; color: #991b1b; }
    .rubric-table .level-berkembang { background-color: #ffedd5; color: #9a3412; }
    .rubric-table .level-cakap { background-color: #dbeafe; color: #1e40af; }
    .rubric-table .level-mahir { background-color: #dcfce7; color: #166534; }

    .rpp-table td ul { margin-top: 0.5rem; }
    .rpp-table td h4 { margin-top: 0.5rem; font-family: 'Inter', sans-serif; text-transform: none; color: #212529; }
`;

export async function parseJsonResponse<T>(responsePromise: Promise<any>): Promise<T> {
  const response = await responsePromise;
  const jsonString = response.text.trim();
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error("Failed to parse Gemini response:", jsonString, e);
    // Add more context to the error message.
    const error = e instanceof Error ? e.message : String(e);
    let positionInfo = '';
    const match = error.match(/position (\d+)/);
    if (match) {
        const position = parseInt(match[1], 10);
        const context = jsonString.substring(Math.max(0, position - 30), Math.min(jsonString.length, position + 30));
        positionInfo = ` near character ${position}: "...${context}..."`;
    }
    throw new Error(`Received malformed JSON from API. ${error}${positionInfo}`);
  }
}

// Re-export Type for convenience
export { Type };