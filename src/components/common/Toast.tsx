import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
}

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none lg:bottom-4 lg:left-auto lg:right-4 lg:w-96">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-lg shadow-lg flex items-start gap-3 animate-fade-in ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900' :
            toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-900' :
            toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-900' :
            'bg-indigo-500/10 border-indigo-500/20 text-indigo-900'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-600 shrink-0" />}
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-extrabold">{toast.title}</h4>
            {toast.message && <p className="text-xs opacity-80 mt-0.5">{toast.message}</p>}
          </div>
          
          <button onClick={() => onDismiss(toast.id)} className="p-1 rounded-lg hover:bg-black/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
