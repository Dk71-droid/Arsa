import type { Student, Predicate, ScorePredicateInfo } from './types';

export const FASE_OPTIONS = [
  { value: 'A', label: 'Fase A (Kelas 1-2 SD)' },
  { value: 'B', label: 'Fase B (Kelas 3-4 SD)' },
  { value: 'C', label: 'Fase C (Kelas 5-6 SD)' },
  { value: 'D', label: 'Fase D (Kelas 7-9 SMP)' },
  { value: 'E', label: 'Fase E (Kelas 10 SMA)' },
  { value: 'F', label: 'Fase F (Kelas 11-12 SMA)' },
];

export const FASE_TO_GRADES_MAP: Record<string, string[]> = {
  A: ['1', '2'],
  B: ['3', '4'],
  C: ['5', '6'],
  D: ['7', '8', '9'],
  E: ['10'],
  F: ['11', '12'],
};

export const MATA_PELAJARAN_OPTIONS = [
  'Bahasa Indonesia',
  'Matematika',
  'IPA',
  'IPS',
  'Seni Budaya',
  'Pendidikan Jasmani',
  'Bahasa Inggris',
];

export const MOCK_STUDENTS: Student[] = [];

export const DPL_OPTIONS = [
    "Keimanan dan Ketaqwaan terhadap Tuhan YME",
    "Kewargaan",
    "Penalaran Kritis",
    "Kreativitas",
    "Kolaborasi",
    "Kemandirian",
    "Kesehatan",
    "Komunikasi",
];

export const FORMATIVE_LEVEL_INFO: Record<number, { label: string; score: number; predicate: Exclude<Predicate, ''>; color: string }> = {
    4: { label: 'Mahir', score: 95, predicate: 'A', color: 'bg-green-100 text-green-800 border-green-300' },
    3: { label: 'Cakap', score: 85, predicate: 'B', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    2: { label: 'Layak', score: 75, predicate: 'C', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    1: { label: 'Baru Berkembang', score: 65, predicate: 'D', color: 'bg-red-100 text-red-800 border-red-300' },
};

export const SCORE_PREDICATE_MAP: { minScore: number; info: ScorePredicateInfo }[] = [
  { minScore: 90, info: { predicate: 'A', label: 'Mahir', level: 4, color: 'bg-green-100', textColor: 'text-green-800' } },
  { minScore: 80, info: { predicate: 'B', label: 'Cakap', level: 3, color: 'bg-blue-100', textColor: 'text-blue-800' } },
  { minScore: 70, info: { predicate: 'C', label: 'Layak', level: 2, color: 'bg-yellow-100', textColor: 'text-yellow-800' } },
  { minScore: 0, info: { predicate: 'D', label: 'Baru Berkembang', level: 1, color: 'bg-red-100', textColor: 'text-red-800' } },
];

export const getPredicateForScore = (score: number | null): ScorePredicateInfo | null => {
  if (score === null || score < 0 || score > 100) return null;
  return SCORE_PREDICATE_MAP.find(item => score >= item.minScore)?.info || null;
};