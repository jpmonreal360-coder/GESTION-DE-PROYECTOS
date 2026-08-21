'use client';

import React from 'react';
import { X, Download } from 'lucide-react';
import { Document, Project } from '@/types';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  projects: Project[];
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  document,
  projects,
}) => {
  if (!isOpen || !document) return null;

  const prj = projects.find((p) => p.id === document.projectId);
  const imageUrl = document.previewUrl || document.fileUrl || '';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[85vh] flex flex-col items-center relative"
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white border-none transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="max-w-full max-h-[72vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black flex items-center justify-center">
          <img
            src={imageUrl}
            alt={document.title}
            className="max-w-full max-h-[72vh] object-contain"
          />
        </div>

        <div className="mt-4 w-full max-w-[600px] bg-neutral-900/80 backdrop-blur-xl p-3 px-5 rounded-2xl border border-white/15 text-white flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold">{document.title}</h4>
            <p className="text-xs text-neutral-400">
              📁 {prj ? prj.name : document.projectId} • 📅 {document.date || document.updatedAt}
            </p>
          </div>

          <a
            href={imageUrl}
            download={`${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Foto</span>
          </a>
        </div>
      </div>
    </div>
  );
};
