'use client';

import React, { useState } from 'react';
import { WikiDoc, Document } from '@/types';
import { FileText, Plus } from 'lucide-react';

interface KnowledgeBaseProps {
  wikiDocs?: WikiDoc[];
  documents?: Document[];
  activeProjectFilter: string;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  wikiDocs = [],
  documents = [],
  activeProjectFilter,
}) => {
  const combinedDocs: WikiDoc[] = wikiDocs.length > 0
    ? wikiDocs
    : documents.map(d => ({
        id: d.id,
        title: d.title,
        projectId: d.projectId,
        updatedAt: d.updatedAt || d.date || '2026-08-19',
        content: d.content || d.description || ''
      }));

  const filteredDocs = combinedDocs.filter(
    (d) => activeProjectFilter === 'all' || d.projectId === activeProjectFilter
  );

  const [activeDocId, setActiveDocId] = useState<string>(
    filteredDocs.length > 0 ? filteredDocs[0].id : 'doc-1'
  );

  const currentDoc =
    filteredDocs.find((d) => d.id === activeDocId) || filteredDocs[0];

  const [title, setTitle] = useState(currentDoc ? currentDoc.title : '');
  const [content, setContent] = useState(currentDoc ? currentDoc.content : '');

  const handleSelectDoc = (doc: WikiDoc) => {
    setActiveDocId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Base de Conocimientos Wiki
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Documentación técnica y notas del proyecto libres de distracciones
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-220px)]">
        {/* Document Tree Sidebar */}
        <div className="p-4 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 flex flex-col gap-2 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200/40 dark:border-neutral-800/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Documentos
            </span>
            <button className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {filteredDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition ${
                  doc.id === activeDocId
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-blue-600 dark:text-blue-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">{doc.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="md:col-span-3 p-8 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 flex flex-col gap-4 overflow-y-auto">
          {currentDoc ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent outline-none text-neutral-900 dark:text-neutral-100 border-b border-neutral-200/40 dark:border-neutral-800/40 pb-2"
                placeholder="Título del documento..."
              />
              <p className="text-[11px] text-neutral-400">
                Última actualización: {currentDoc.updatedAt}
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full bg-transparent outline-none text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 resize-none font-sans min-h-[300px]"
                placeholder="Empieza a escribir la documentación..."
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 text-xs">
              <FileText className="w-8 h-8 mb-2" />
              <span>Selecciona un documento para editar</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
