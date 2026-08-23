'use client';

import React, { useState } from 'react';
import { Document, Project } from '@/types';
import { Plus, ExternalLink, Filter, Clipboard, Edit2, Trash2, Eye } from 'lucide-react';

interface ProjectDocumentsProps {
  documents: Document[];
  projects: Project[];
  activeProjectFilter: string;
  onAddDocument?: () => void;
  onEditDocument?: (doc: Document) => void;
  onDeleteDocument?: (id: string) => void;
  onOpenLightbox?: (doc: Document) => void;
}

export const ProjectDocuments: React.FC<ProjectDocumentsProps> = ({
  documents,
  projects,
  activeProjectFilter,
  onAddDocument,
  onEditDocument,
  onDeleteDocument,
  onOpenLightbox,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('all');

  const filteredDocs = documents.filter((doc) => {
    const matchesProject =
      activeProjectFilter === 'all' || doc.projectId === activeProjectFilter;
    
    const docTypeStr = doc.docType ? doc.docType.toLowerCase() : '';
    const formatStr = doc.format || doc.fileType || '';

    const matchesFormat =
      selectedFormat === 'all' ||
      formatStr === selectedFormat ||
      docTypeStr.includes(selectedFormat);

    return matchesProject && matchesFormat;
  });

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 break-words">
            Documentos del Proyecto
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Pega capturas (Ctrl+V), sube PDF o fotos y visualízalas en HD en 1 clic
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-200/60 dark:bg-neutral-800 border border-neutral-300/40 dark:border-neutral-700/50 text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none"
          >
            <option value="all">Todos los Formatos</option>
            <option value="pdf">📕 PDF</option>
            <option value="image">🖼️ Fotos / Screenshots</option>
            <option value="sheets">📊 Google Sheets</option>
          </select>

          <button
            onClick={onAddDocument}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Documento</span>
          </button>
        </div>
      </div>

      {/* Quick Paste Banner */}
      <div 
        onClick={onAddDocument}
        className="p-3.5 sm:p-4 rounded-2xl apple-glass border-l-4 border-l-purple-500 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer hover:bg-white/50 dark:hover:bg-neutral-800/40 transition gap-3 min-w-0"
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <Clipboard className="w-5 h-5 text-purple-500 shrink-0 mt-0.5 sm:mt-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold break-words">📋 Pega capturas o fotos directamente con Ctrl+V</p>
            <p className="text-[11px] text-neutral-400">Copia cualquier imagen al portapapeles y presiona Ctrl+V en esta pantalla</p>
          </div>
        </div>
        <button className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition shrink-0 w-full sm:w-auto text-center">
          Pegar Foto
        </button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0">
        {filteredDocs.map((doc) => {
          const prj = projects.find((p) => p.id === doc.projectId);
          const isPdf = doc.format === 'pdf' || doc.fileType === 'pdf' || doc.docType === 'PDF';
          const isImage = doc.format === 'image' || doc.fileType === 'image' || doc.docType === 'IMAGE';
          const isSheets = doc.format === 'sheets' || doc.fileType === 'sheets' || doc.docType === 'GOOGLE_SHEETS';

          return (
            <div
              key={doc.id}
              className="p-4 sm:p-5 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between hover:shadow-md transition space-y-4 min-w-0"
            >
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isPdf && (
                      <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-[10px] shrink-0">
                        📕 PDF
                      </span>
                    )}
                    {isImage && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold text-[10px] shrink-0">
                        🖼️ Foto
                      </span>
                    )}
                    {isSheets && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] shrink-0">
                        📊 Sheets
                      </span>
                    )}
                    {!isPdf && !isImage && !isSheets && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[10px] shrink-0">
                        🔗 Doc Cloud
                      </span>
                    )}
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {onEditDocument && (
                      <button
                        onClick={() => onEditDocument(doc)}
                        className="action-btn-sm"
                        title="Editar Documento & Fecha"
                      >
                        <Edit2 className="w-3 h-3 text-neutral-400" />
                      </button>
                    )}
                    {onDeleteDocument && (
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="action-btn-sm action-btn-danger"
                        title="Eliminar Documento"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Image Thumbnail Preview */}
                {isImage && (doc.previewUrl || doc.fileUrl) && (
                  <div 
                    onClick={() => onOpenLightbox && onOpenLightbox(doc)}
                    className="w-full h-36 rounded-xl overflow-hidden mb-3 border border-neutral-200/50 dark:border-neutral-800/50 bg-black flex items-center justify-center cursor-pointer hover:opacity-90 transition"
                    title="Haz clic para abrir visor de fotos HD"
                  >
                    <img
                      src={doc.previewUrl || doc.fileUrl}
                      alt={doc.title}
                      className="w-full h-full object-contain hover:scale-105 transition duration-300"
                    />
                  </div>
                )}

                <h3 className="text-xs sm:text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-100 mb-1 break-words">
                  {doc.title}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 break-words">
                  {doc.description || doc.content}
                </p>
                <div className="text-[11px] text-neutral-400 mt-2 font-mono">📅 Fecha: {doc.date || doc.updatedAt}</div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-200/40 dark:border-neutral-800/40 gap-2">
                <span className="text-xs font-semibold text-blue-500 truncate max-w-[140px]">
                  📁 {prj ? prj.name : doc.projectId}
                </span>

                {isImage ? (
                  <button
                    onClick={() => onOpenLightbox && onOpenLightbox(doc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition shadow-sm shrink-0"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Ver Foto</span>
                  </button>
                ) : (
                  <a
                    href={doc.fileUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-blue-600 hover:text-white transition shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{isSheets ? 'Sheets' : 'Ver PDF'}</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
