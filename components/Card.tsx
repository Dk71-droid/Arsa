import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-xl border border-slate-200 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl ${className}`}>
      {children}
    </div>
  );
};