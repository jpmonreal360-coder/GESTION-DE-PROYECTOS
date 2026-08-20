'use client';

import React, { useState, useEffect } from 'react';
import { Search, CheckSquare, DollarSign, FileText, X } from 'lucide-react';
import { Task, Expense, Document } from '@/types';

interface SpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  expenses: Expense[];
  documents: Document[];
  onSelectResult?: (view: string) => void;
}

export const SpotlightModal: React.FC<SpotlightModalProps> = ({
  isOpen,
  onClose,
  tasks,
  expenses,
  documents,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const results: { type: string; title: string; desc: string; icon: any; view: string }[] = [];

  tasks.forEach((t) => {
    if (!query || t.title.toLowerCase().includes(query.toLowerCase())) {
      results.push({
        type: 'Tarea',
        title: t.title,
        desc: `${t.priority} • ${t.status}`,
        icon: CheckSquare,
        view: 'tasks',
      });
    }
  });

  expenses.forEach((e) => {
    if (!query || e.concept.toLowerCase().includes(query.toLowerCase())) {
      results.push({
        type: 'Gasto',
        title: e.concept,
        desc: `$${e.amount.toLocaleString()} USD • ${e.category}`,
        icon: DollarSign,
        view: 'expenses',
      });
    }
  });

  documents.forEach((d) => {
    if (!query || d.title.toLowerCase().includes(query.toLowerCase())) {
      results.push({
        type: 'Documento',
        title: d.title,
        desc: 'Wiki / Nota',
        icon: FileText,
        view: 'wiki',
      });
    }
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-start justify-center pt-24 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[580px] max-w-[90vw] rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl overflow-hidden"
      >
        {/* Input Wrapper */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-200/50 dark:border-neutral-800/50">
          <Search className="w-5 h-5 text-blue-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe para buscar tareas, gastos o documentos..."
            className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 text-xs">
              No se encontraron resultados para &quot;{query}&quot;
            </div>
          ) : (
            results.slice(0, 8).map((res, i) => {
              const IconComp = res.icon;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (onSelectResult) onSelectResult(res.view);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-600 hover:text-white transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <IconComp className="w-4 h-4 text-blue-500 group-hover:text-white" />
                    <div>
                      <p className="text-xs font-semibold">{res.title}</p>
                      <p className="text-[10px] text-neutral-400 group-hover:text-white/80">
                        {res.type}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 group-hover:text-white/80">
                    {res.desc}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
