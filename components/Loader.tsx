
import React from 'react';

export const Loader: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 mt-8 bg-white rounded-lg shadow">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      <p className="mt-4 text-slate-600 font-semibold">{text}</p>
    </div>
  );
};
