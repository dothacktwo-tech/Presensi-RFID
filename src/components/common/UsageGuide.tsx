import React, { useState } from 'react';
import { HelpCircle, X, BookOpen } from 'lucide-react';

interface UsageGuideProps {
  title: string;
  steps: string[];
}

export const UsageGuide: React.FC<UsageGuideProps> = ({ title, steps }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold rounded-lg transition-all"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>Panduan Penggunaan</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="space-y-3">
              {steps.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-sky-600 min-w-[20px]">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
