// FIX: Replaced file content with actual type definitions to resolve circular dependencies and missing type exports.
export type Predicate = 'A' | 'B' | 'C' | 'D' | '';

export interface ScorePredicateInfo {
    predicate: Exclude<Predicate, ''>;
    label: string;
    level: number;
    color: string;
    textColor: string;
}

export interface Assessment {
    tpId: string;
    aspek: string;
    level: 1 | 2 | 3 | 4 | 0; // 0 for notes
    timestamp: number;
    pertemuan: number;
    catatan?: string;
}

export interface SummativeAssessment {
    tpId: string;
    aspek: string;
    score: number | null;
}

export type HafalanStatus = 'lancar' | 'mengulang' | 'belum';

export interface HafalanRecord {
    studentId: number;
    itemId: string;
    status: HafalanStatus;
    timestamp: number;
}


export interface DplObservation {
    dpl: string;
    catatan: string;
    timestamp: number;
    tpId: string;
    aspek: string;
    pertemuan: number;
}

export interface Student {
    id: number;
    nama: string;
    nis?: string;
    kelas: string;
    assessments: Assessment[];
    summativeAssessments: SummativeAssessment[];
    dplObservations?: DplObservation[];
    hafalanRecords?: HafalanRecord[];
}

export type AttendanceStatus = 'H' | 'S' | 'I' | 'A';

export interface AttendanceRecord {
    id: string; // studentId-date
    studentId: number;
    date: string; // YYYY-MM-DD
    status: AttendanceStatus;
}

export interface HolidayRecord {
    id: string; // date string
    date: string; // YYYY-MM-DD
    description: string;
}

export interface ClassProfile {
    id: string;
    name: string;
    phase: string;
    grade: string;
}

export interface KriteriaKktp {
    level: 1 | 2 | 3 | 4;
    deskripsi: string;
}

export interface AspekRubrik {
    aspek: string;
    sifatAspek: 'PRASYARAT_KRITIS' | 'LEPAS';
    dplTerkait: string[];
    teknikAsesmen: string;
    instrumenAsesmen: string;
    kriteria: KriteriaKktp[];
}

export interface Kktp {
    tpTerkait: string;
    elemenCp: string;
    asesmenUntuk: string;
    batasKetercapaian: string;
    rubrik: AspekRubrik[];
}

// NEW: Updated DiagnosticRecommendation to focus on student grouping.
export interface DiagnosticRecommendation {
    tujuan: string;
    saranAktivitas: string;
    kriteriaPengelompokan: {
        level: 'Mahir' | 'Cakap' | 'Baru Berkembang';
        deskripsi: string;
    }[];
}

export interface KelompokAktivitas {
    namaKelompok: string;
    deskripsiKelompok: string;
    siswaDiKelompok: string[];
    tugasLengkap: string[];
    buktiKetercapaian: {
        aspek: string;
        bukti: string[];
    }[];
}

export interface ContohRubrik {
    nama: string;
    tujuan: string;
    indikator: {
        nama: string;
        baruMemulai: string;
        berkembang: string;
        cakap: string;
        mahir: string;
    }[];
}

export interface PhaseKegiatan {
    judul: string;
    kelompokAktivitas: KelompokAktivitas[];
    pengecekanPemahamanCepat?: string[];
    contohRubrik?: ContohRubrik;
}

export interface FokusAsesmenFormatif {
    kelompokSiswa: string[];
    deskripsiKelompok: string;
    fokusPenilaian: {
        aspek: string;
        deskripsiSingkat: string;
        teknikAsesmen: string;
        instrumenAsesmen: string;
    }[];
}

export interface AsesmenFormatifKunci {
    faseFokus: string;
    deskripsiAktivitasAsesmen: string;
    fokusPenilaian: FokusAsesmenFormatif[];
}


export interface DeepLearningLessonPlan {
    pertemuanKe: number;
    alokasiWaktuMenit: number;
    disclaimer: string;
    catatanKontekstual: string;
    pengalamanBelajar: {
        awal: { prinsip: string; kegiatan: string[] };
        inti: {
            memahami: PhaseKegiatan;
            mengaplikasi: PhaseKegiatan;
            merefleksi: PhaseKegiatan;
        };
        penutup: { prinsip: string; kegiatan: string[] };
    };
    asesmenFormatifKunci?: AsesmenFormatifKunci;
    asesmenPembelajaran: {
        awal: string;
        akhir: string;
    };
    generatedHtml?: {
        bahanAjar?: string;
        bahanBacaanSiswa?: string;
        infographicQuiz?: string;
        lkpd?: { [key: string]: string };
        rppLengkap?: string;
        game?: string;
    };
}

export interface AdaptiveLessonStep {
    timestamp: number;
    recommendationType: 'PROCEED' | 'INTERVENTION';
    summaryNarrative: string;
    nextPlan?: DeepLearningLessonPlan | null;
    diagnosticForNextTp?: DiagnosticRecommendation | null;
    nextTpId?: string;
}

export interface TujuanPembelajaran {
    id: string;
    deskripsi: string;
    dplTerkait: string[];
    saranBentukAsesmen: string;
    kktp?: Kktp;
    diagnosticData?: {
        recommendation: DiagnosticRecommendation;
        summary?: string; // JSON string of results
        plan?: DeepLearningLessonPlan;
        timestamp: number;
    };
    adaptiveSteps?: AdaptiveLessonStep[];
    plannedSessions?: { pertemuan: number, timestamp: number }[];
}

export interface AlurTujuanPembelajaran {
    mingguKe: string;
    tpId: string;
    estimasiWaktu: string;
    justifikasi?: string;
    prasyaratTpIds?: string[];
}

export interface UnitPembelajaran {
    id: string;
    nama: string;
    deskripsi: string;
    capaianPembelajaran: string;
    tpIds: string[];
    dplFokus: string[];
}

export interface SummativePackage {
    id: string;
    name: string;
    tpIds: string[];
    instrumentHtml?: string;
}

export interface HafalanItem {
    id: string;
    name: string;
    content?: string; // e.g., the text of a poem or verse
}

export interface HafalanPackage {
    id: string;
    name: string;
    description: string;
    items: HafalanItem[];
}


export interface CurriculumData {
    phase: string;
    subject: string;
    capaianPembelajaran: string;
    tujuanPembelajaran: TujuanPembelajaran[];
    alurTujuanPembelajaran: AlurTujuanPembelajaran[];
    unitPembelajaran: UnitPembelajaran[];
    summativePackages?: SummativePackage[];
    hafalanPackages?: HafalanPackage[];
}

// FIX: Added missing LearningPlan interface, which is referenced in multiple components.
export interface LearningPlan {
    id: string;
    name: string;
    curriculum: CurriculumData;
}

export type Session = { tpId: string; pertemuan: number; } | null;

export interface AiSessionResult {
    studentId: number;
    catatanUmum: string;
    observasiDpl?: {
        dpl: string;
        catatan: string;
    }[];
}

export interface SummativeAnalysisResult {
    tingkatKetuntasanKelas: number;
    rekomendasiUtama: 'LANJUT' | 'PENGUATAN';
    narasiRekomendasi: string;
    siswaPerluPerhatian: string[];
}

export interface SummativeUnitAnalysisResult {
    timestamp: number;
    tingkatKetuntasanUnit: number;
    rekomendasiUtama: 'LANJUT_KE_UNIT_BERIKUTNYA' | 'PENGUATAN_UNIT_INI';
    narasiRekomendasi: string;
    siswaButuhPenguatan: {
        nama: string;
        tpId: string;
        aspek: string;
    }[];
    tpPalingMenantang: {
        tpId: string;
        deskripsi: string;
        persenGagal: number;
    }[];
}