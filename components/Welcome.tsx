

import React from 'react';
import { Card } from './Card';
import { BookOpenIcon, WandIcon } from './icons';

export const Welcome: React.FC = () => {
  return (
    <div className="mt-8">
      <Card>
        <div className="text-center">
            <BookOpenIcon className="mx-auto h-12 w-12 text-indigo-500" />
            <h2 className="mt-4 text-2xl font-bold text-slate-800">Selamat Datang di Arsa</h2>
            <p className="mt-2 text-lg text-slate-600">
                Alat bantu cerdas untuk meringankan beban administrasi dan mempertajam analisis pembelajaran Anda.
            </p>
        </div>
        <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-center text-slate-700">Mulai dalam 3 Langkah Mudah:</h3>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">1</div>
                    <h4 className="mt-4 font-semibold">Pilih Fase & Mapel</h4>
                    <p className="mt-1 text-sm text-slate-500">Tentukan target jenjang dan mata pelajaran Anda pada panel di atas.</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">2</div>
                    <h4 className="mt-4 font-semibold">Generate dengan AI</h4>
                    <p className="mt-1 text-sm text-slate-500">Klik tombol "Generate" dan biarkan AI menyusun CP, TP, ATP, dan Rubrik KKTP untuk Anda.</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">3</div>
                    <h4 className="mt-4 font-semibold">Analisis & Tindak Lanjut</h4>
                    <p className="mt-1 text-sm text-slate-500">Gunakan rubrik untuk menilai siswa dan dapatkan rekomendasi remedial berbasis data.</p>
                </div>
            </div>
        </div>
      </Card>
    </div>
  );
};