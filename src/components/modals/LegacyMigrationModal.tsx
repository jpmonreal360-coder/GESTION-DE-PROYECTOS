'use client';

import React, { useState } from 'react';
import { Responsible, Task } from '@/types';
import { X, ShieldCheck, UserCheck, Loader2 } from 'lucide-react';

interface LegacyMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  responsibles: Responsible[];
  tasks: Task[];
  onExecuteMigration: () => Promise<void>;
}

export const LegacyMigrationModal: React.FC<LegacyMigrationModalProps> = ({
  isOpen,
  onClose,
  responsibles,
  tasks,
  onExecuteMigration
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Calculate legacy assignments in memory
  const existingNames = new Set(responsibles.map(r => r.name.trim().toLowerCase()));
  const unmigratedTasks = tasks.filter(t => {
    if (!t.assigneeName && !t.assignee) return false;
    // Already has assigneeIds array
    if (t.assigneeIds && t.assigneeIds.length > 0) return false;
    return true;
  });

  const legacyNamesToCreate = new Set<string>();
  unmigratedTasks.forEach(t => {
    const name = (t.assigneeName || t.assignee || '').trim();
    if (name && !existingNames.has(name.toLowerCase())) {
      legacyNamesToCreate.add(name);
    }
  });

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onExecuteMigration();
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[85dvh] overflow-y-auto p-4 sm:p-6 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl space-y-4 text-neutral-900 dark:text-neutral-100"
      >
        <div className="flex items-center justify-between border-b border-neutral-200/40 dark:border-neutral-800/40 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base sm:text-lg font-bold">Migración Manual de Responsables</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
          Esta acción convierte los nombres de responsables heredados guardados en texto dentro de las tareas hacia registros del catálogo de responsables con IDs estables.
        </p>

        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold">
            <span>Responsables nuevos a agregar al catálogo:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-xs font-mono">
              {legacyNamesToCreate.size}
            </span>
          </div>

          <div className="flex items-center justify-between font-bold">
            <span>Tareas heredadas a vincular con IDs:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-mono">
              {unmigratedTasks.length}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 space-y-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Garantías de Seguridad de Datos:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Crea y verifica un respaldo inmutable en Redis antes de modificar tareas.</li>
            <li>Si el respaldo o la validación falla, la migración se cancela de inmediato.</li>
            <li>Idempotente: preserva intactos los textos heredados y no duplica responsables.</li>
            <li>No altera Proyectos, Gastos, Tablas por Período ni Documentos.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-300 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || unmigratedTasks.length === 0}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 ${
              isProcessing || unmigratedTasks.length === 0
                ? 'bg-neutral-400 cursor-not-allowed opacity-50'
                : 'bg-purple-600 hover:bg-purple-500 shadow-md cursor-pointer'
            }`}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            <span>{isProcessing ? 'Procesando...' : 'Ejecutar Migración (Con Backup)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
