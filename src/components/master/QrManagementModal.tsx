import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Printer, RefreshCw } from 'lucide-react';
import { Student } from '../../types';
import { StorageService } from '../../services/storage';

interface QrManagementModalProps {
  student: Student;
  onClose: () => void;
  onNotify: (type: 'success' | 'error', title: string, message: string) => void;
}

export const QrManagementModal: React.FC<QrManagementModalProps> = ({ student, onClose, onNotify }) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleGenerate = () => {
    StorageService.generateQrToken(student.id);
    onNotify('success', 'QR Diperbarui', 'Token QR siswa telah diperbarui.');
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('svg');
    if (!canvas) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(canvas);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${student.name}.svg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">QR Code Siswa</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div ref={qrRef} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-inner">
            <QRCodeSVG value={student.qrCode} size={200} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">{student.name}</p>
            <p className="text-xs text-slate-500 font-mono">NIS: {student.nis}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleGenerate} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl text-slate-800">
            <RefreshCw className="w-4 h-4" /> Ulang
          </button>
          <button onClick={handleDownload} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>
    </div>
  );
};
